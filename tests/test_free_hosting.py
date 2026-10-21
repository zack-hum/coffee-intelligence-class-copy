"""Free hosting (Render + Firebase Spark + GitHub Actions cron), issue #13.

Covers Firestore credential loading and keeps the deploy files consistent with
the app: index fields match what deploy.sh creates, the workflow calls real
endpoints, and the ingest script skips cleanly until its secrets exist."""

import base64
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from app.store import firestore_settings

ROOT = Path(__file__).resolve().parent.parent
KEY = {"type": "service_account", "project_id": "coffee-spark", "client_email": "x@y",
       "private_key": "placeholder-not-a-key"}


def test_credentials_from_json_env():
    s = firestore_settings({"GOOGLE_CREDENTIALS_JSON": json.dumps(KEY)})
    assert s["project"] == "coffee-spark"
    assert s["credentials_info"] == KEY
    assert s["database"] == "(default)"


def test_credentials_from_base64_env():
    raw = base64.b64encode(json.dumps(KEY).encode()).decode()
    s = firestore_settings({"GOOGLE_CREDENTIALS_JSON": raw, "FIRESTORE_DB": "coffee"})
    assert s["credentials_info"]["project_id"] == "coffee-spark"
    assert s["database"] == "coffee"


def test_explicit_project_wins():
    s = firestore_settings({"GOOGLE_CREDENTIALS_JSON": json.dumps(KEY),
                            "GOOGLE_CLOUD_PROJECT": "other"})
    assert s["project"] == "other"


def test_project_from_key_file(tmp_path):
    p = tmp_path / "key.json"
    p.write_text(json.dumps(KEY), encoding="utf-8")
    s = firestore_settings({"GOOGLE_APPLICATION_CREDENTIALS": str(p)})
    assert s == {"project": "coffee-spark", "database": "(default)", "credentials_info": None}


def test_missing_key_file_is_left_to_google_auth(tmp_path):
    s = firestore_settings({"GOOGLE_APPLICATION_CREDENTIALS": str(tmp_path / "nope.json")})
    assert s["project"] is None


def test_cloud_run_needs_nothing():
    assert firestore_settings({}) == {"project": None, "database": "(default)",
                                      "credentials_info": None}


@pytest.mark.parametrize("bad", ["{not json", "!!!", json.dumps({"type": "authorized_user"})])
def test_bad_credentials_fail_loudly(bad):
    with pytest.raises(ValueError, match="GOOGLE_CREDENTIALS_JSON"):
        firestore_settings({"GOOGLE_CREDENTIALS_JSON": bad})


def test_indexes_match_deploy_sh():
    idx = json.loads((ROOT / "firestore.indexes.json").read_text(encoding="utf-8"))
    got = {(i["collectionGroup"], i["fields"][0]["fieldPath"]) for i in idx["indexes"]}
    loop = re.search(r"for f in ([\w ]+); do", (ROOT / "deploy.sh").read_text(encoding="utf-8"))
    assert got == {("articles", f) for f in loop.group(1).split()}
    for i in idx["indexes"]:
        assert i["fields"][0]["arrayConfig"] == "CONTAINS"
        assert i["fields"][1] == {"fieldPath": "published", "order": "DESCENDING"}
    fb = json.loads((ROOT / "firebase.json").read_text(encoding="utf-8"))
    assert fb["firestore"]["indexes"] == "firestore.indexes.json"


def test_render_blueprint_is_free_and_keeps_secrets_out():
    text = (ROOT / "render.yaml").read_text(encoding="utf-8")
    assert re.search(r"^\s+plan: free\b", text, re.M)
    assert "healthCheckPath: /healthz" in text
    for key in ("DASH_PASSWORD", "GOOGLE_CREDENTIALS_JSON"):
        assert re.search(rf"key: {key}\n\s+sync: false", text), key
    assert re.search(r"key: INGEST_TOKEN\n\s+generateValue: true", text)
    assert re.search(r"key: APP_MODE\n\s+value: cloud", text)


def test_workflow_routes_every_schedule_to_a_real_endpoint():
    from app.main import app

    wf = (ROOT / ".github/workflows/ingest.yml").read_text(encoding="utf-8")
    crons = re.findall(r'- cron: "([^"]+)"', wf)
    assert len(crons) == 4
    for c in crons:
        assert f'"{c}")' in wf, f"schedule {c} not routed"
    # Included routers (e.g. the CRM) appear as router objects without a `path`.
    routes = {getattr(r, "path", None) for r in app.routes}
    for path in re.findall(r'path="([^"?]+)', wf):
        assert path in routes, path
    assert "secrets.APP_URL" in wf and "secrets.INGEST_TOKEN" in wf


@pytest.mark.skipif(os.name == "nt" or not shutil.which("bash"), reason="needs bash")
def test_ingest_script_skips_without_secrets():
    env = {k: v for k, v in os.environ.items() if k not in ("APP_URL", "INGEST_TOKEN")}
    r = subprocess.run(["bash", str(ROOT / ".github/scripts/ingest.sh"), "/tasks/ingest/news"],
                       env=env, capture_output=True, text=True, timeout=30)
    assert r.returncode == 0
    assert "skipping" in r.stdout


@pytest.mark.skipif(os.name == "nt" or not shutil.which("bash") or not shutil.which("curl"),
                    reason="needs bash + curl")
def test_ingest_script_fails_when_unreachable():
    env = {**os.environ, "APP_URL": "http://127.0.0.1:9", "INGEST_TOKEN": "t",
           "WAKE_ATTEMPTS": "1", "WAKE_SLEEP": "0"}
    r = subprocess.run(["bash", str(ROOT / ".github/scripts/ingest.sh"), "/tasks/ingest/news"],
                       env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode != 0
    assert "did not answer" in r.stdout
