"""Field mode (#10): cupping score math, offline sync (idempotent replay), visits/cuppings
as CRM records, cascade rules and the installable shell."""

import os

import pytest

os.environ.setdefault("APP_MODE", "demo")

from fastapi.testclient import TestClient  # noqa: E402

from app.crm import cupping  # noqa: E402
from app.crm import router as crm_router  # noqa: E402
from app.crm.store import SQLiteCRM, set_crm  # noqa: E402

CVA = ["fragrance", "aroma", "flavor", "aftertaste", "acidity", "sweetness", "mouthfeel", "overall"]
CLASSIC = ["fragrance_aroma", "flavor", "aftertaste", "acidity", "body", "balance", "overall"]


@pytest.fixture()
def st():
    s = SQLiteCRM(":memory:")
    set_crm(s)
    crm_router._seeded["done"] = True
    yield s
    set_crm(None)


@pytest.fixture()
def client(st):
    from app.main import app
    return TestClient(app)


def sync(client, *ops):
    r = client.post("/api/crm/sync", json={"ops": list(ops)})
    assert r.status_code == 200, r.text
    return r.json()


def up(kind, id_, **data):
    return {"op": "upsert", "kind": kind, "id": id_, "data": data}


# ------------------------------------------------------------------ scoring

def test_cva_score_range_and_penalties():
    assert cupping.score("cva", dict.fromkeys(CVA, 9)) == 100
    assert cupping.score("cva", dict.fromkeys(CVA, 1)) == 58
    six = cupping.score("cva", dict.fromkeys(CVA, 6))
    assert six == 84.25
    assert cupping.score("cva", {**dict.fromkeys(CVA, 6), "nonuniform": 1, "defective": 1}) == six - 6


def test_classic_score_cups_and_defects():
    base = dict.fromkeys(CLASSIC, 7.5)
    assert cupping.score("classic", base) == 82.5  # 7 x 7.5 + 3 x 10 (all cups good)
    assert cupping.score("classic", {**base, "uniformity": 4, "fault_cups": 1}) == 82.5 - 2 - 4
    assert cupping.score("classic", dict.fromkeys(CLASSIC, 10)) == 100


def test_quick_and_validation():
    assert cupping.score("quick", None, 86.5) == 86.5
    assert cupping.score("quick", None, None) is None
    for bad in [("cva", {**dict.fromkeys(CVA, 5), "acidity": 10}), ("cva", {"aroma": 5}),
                ("classic", {**dict.fromkeys(CLASSIC, 7), "fault_cups": 6}), ("nope", {})]:
        with pytest.raises(cupping.ScoreError):
            cupping.score(*bad)
    with pytest.raises(cupping.ScoreError):
        cupping.score("quick", None, 101)


def test_meta_exposes_forms(client):
    m = client.get("/api/crm/meta").json()
    assert set(m["cupping_forms"]) == {"cva", "classic", "quick"}
    assert [a["key"] for a in m["cupping_forms"]["cva"]["attrs"]] == CVA
    assert {"visits", "cuppings"} <= set(m["kinds"])


# ------------------------------------------------------------------ offline sync

def test_offline_batch_creates_linked_records_and_replays_without_duplicates(client, st):
    ops = [
        up("orgs", "forg-001", name="Finca La Loma", type="farm", region="cr.tarrazu", verified=True, source="Field mode"),
        up("people", "fper-001", name="Doña Ana", org_id="forg-001", whatsapp="+506 8888 0000", title="Owner"),
        up("visits", "fvis-001", org_id="forg-001", person_id="fper-001", date="2027-01-06", lat=9.66, lon=-84.02,
           altitude_m=1650, harvest_status="peak", price_discussed=4.1, price_unit="usd_lb",
           checklist={"fob": {"done": True, "note": "4.10 FOB, 10 bags min"}}),
        up("cuppings", "fcup-001", lot="Geisha honey L3", session="Flight Jan 6", date="2027-01-06", form="cva",
           org_id="forg-001", person_id="fper-001", visit_id="fvis-001", variety="Geisha", moisture_pct=10.8,
           scores=dict.fromkeys(CVA, 7), descriptors="jasmine, stone fruit", total=1),
        up("cuppings", "fcup-002", lot="Catuaí washed", session="Flight Jan 6", date="2027-01-06", form="quick",
           org_id="forg-001", total=84.5),
    ]
    first = sync(client, *ops)
    assert first["failed"] == 0 and first["ok"] == 5
    again = sync(client, *ops)  # the phone lost the response and retries
    assert again["failed"] == 0
    assert len(st.all("orgs")) == 1 and len(st.all("people")) == 1 and len(st.all("visits")) == 1
    assert len(st.all("cuppings")) == 2
    c = st.get("cuppings", "fcup-001")
    assert c["total"] == round(0.65625 * 56 + 52.75, 2)  # server recomputes; client total ignored
    assert c["visit_id"] == "fvis-001" and c["moisture_pct"] == 10.8
    assert st.get("cuppings", "fcup-002")["total"] == 84.5
    v = client.get("/api/crm/visits").json()[0]
    assert v["org_name"] == "Finca La Loma" and v["person_name"] == "Doña Ana"
    assert v["checklist"]["fob"]["note"].startswith("4.10")


def test_sync_upsert_is_patch_and_errors_are_per_op(client, st):
    sync(client, up("orgs", "forg-002", name="Micro-mill X", type="micro_mill"))
    res = sync(client,
               up("orgs", "forg-002", notes="met the owner"),            # patch keeps name/type
               up("visits", "fvis-002", org_id="nope-nope", date="2027-01-07"),  # bad ref
               up("cuppings", "fcup-003", lot="x", date="2027-01-07", form="cva", scores={"aroma": 12}),
               {"op": "upsert", "kind": "orgs", "id": "a b", "data": {"name": "bad id"}},
               {"op": "upsert", "kind": "widgets", "id": "fwid-001", "data": {}},
               {"op": "delete", "kind": "visits", "id": "fvis-404"})       # delete of missing id is a no-op
    assert [r["ok"] for r in res["results"]] == [True, False, False, False, False, True]
    o = st.get("orgs", "forg-002")
    assert o["name"] == "Micro-mill X" and o["type"] == "micro_mill" and o["notes"] == "met the owner"
    assert "no such record" in res["results"][1]["error"]
    assert "Scores" in res["results"][2]["error"]


def test_sync_rejects_bad_payload(client):
    assert client.post("/api/crm/sync", json={"ops": "x"}).status_code == 422
    assert client.post("/api/crm/sync", json={"ops": [{}] * 501}).status_code == 422


def test_cupping_without_scores_is_allowed_as_draft(client, st):
    sync(client, up("cuppings", "fcup-004", lot="Draft", date="2027-01-08", form="classic"))
    assert st.get("cuppings", "fcup-004")["total"] is None


def test_org_delete_cascades_to_visits_and_cuppings_person_delete_unlinks(client, st):
    sync(client,
         up("orgs", "forg-003", name="Coop Y"), up("people", "fper-003", name="Luis", org_id="forg-003"),
         up("samples", "fsmp-003", lot="AA", org_id="forg-003"),
         up("visits", "fvis-003", org_id="forg-003", person_id="fper-003", date="2027-01-09"),
         up("cuppings", "fcup-005", lot="AA", date="2027-01-09", form="quick", total=85, org_id="forg-003",
            person_id="fper-003", sample_id="fsmp-003", visit_id="fvis-003"),
         up("orgs", "forg-004", name="Other"),
         up("cuppings", "fcup-006", lot="Other lot", date="2027-01-09", form="quick", total=80,
            org_id="forg-004", person_id="fper-003", sample_id="fsmp-003", visit_id="fvis-003"))
    sync(client, {"op": "delete", "kind": "people", "id": "fper-003"})
    assert st.get("visits", "fvis-003")["person_id"] is None
    assert st.get("cuppings", "fcup-005")["person_id"] is None
    sync(client, {"op": "delete", "kind": "orgs", "id": "forg-003"})
    assert st.get("visits", "fvis-003") is None and st.get("cuppings", "fcup-005") is None
    assert st.get("samples", "fsmp-003") is None
    other = st.get("cuppings", "fcup-006")  # different org: kept, links to deleted records cleared
    assert other and other["sample_id"] is None and other["visit_id"] is None


def test_csv_export_includes_field_kinds(client):
    sync(client, up("orgs", "forg-005", name="Finca Z"),
         up("cuppings", "fcup-007", lot="L1", date="2027-01-10", form="cva", org_id="forg-005", scores=dict.fromkeys(CVA, 8)))
    text = client.get("/api/crm/export/cuppings.csv").text
    header, row = text.splitlines()[:2]
    assert "scores" in header.split(",") and "total" in header.split(",")
    assert "L1" in row and "94.75" in row  # 0.65625 x (8 x 8) + 52.75


# ------------------------------------------------------------------ installable shell

def test_field_shell_manifest_and_service_worker(client):
    assert client.get("/field", follow_redirects=False).status_code in (307, 302)
    page = client.get("/field/")
    assert page.status_code == 200 and "/field/manifest.webmanifest" in page.text and "apple-touch-icon" in page.text
    sw = client.get("/field/sw.js")
    assert sw.status_code == 200 and "javascript" in sw.headers["content-type"]
    assert sw.headers.get("service-worker-allowed") == "/field/"
    man = client.get("/field/manifest.webmanifest")
    assert man.headers["content-type"].startswith("application/manifest+json")
    assert man.json()["scope"] == "/field/" and man.json()["display"] == "standalone"
    for f in ("field.js", "field.css", "icon-180.png", "icon-512.png"):
        assert client.get(f"/field/static/{f}").status_code == 200
    # every file the service worker pre-caches must exist, or install fails on the phone
    import re
    for path in re.findall(r"'(/field/[^']*)'", sw.text.split("];")[0]):
        assert client.get(path).status_code == 200, path


def test_standalone_app_serves_field_too():
    from app.crm.standalone import app as standalone
    c = TestClient(standalone)
    assert c.get("/field/").status_code == 200
    assert c.get("/field/sw.js").status_code == 200
