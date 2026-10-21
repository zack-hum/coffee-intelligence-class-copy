"""Sourcing CRM (#8): CRUD, validation, cascade, due-soon, CSV round-trip, seed, both backends."""

import csv
import io
import os
from datetime import date, timedelta

import pytest

os.environ.setdefault("APP_MODE", "demo")

from fastapi.testclient import TestClient  # noqa: E402

from app.crm import router as crm_router  # noqa: E402
from app.crm import schema, service  # noqa: E402
from app.crm.store import FirestoreCRM, SQLiteCRM, set_crm  # noqa: E402


@pytest.fixture()
def st():
    s = SQLiteCRM(":memory:")
    set_crm(s)
    crm_router._seeded["done"] = True  # tests seed explicitly
    yield s
    set_crm(None)


@pytest.fixture()
def client(st):
    from app.main import app
    return TestClient(app)


def mk(client, kind, **data):
    r = client.post(f"/api/crm/{kind}", json=data)
    assert r.status_code == 201, r.text
    return r.json()


def test_crud_orgs_people_deals(client):
    org = mk(client, "orgs", name="Finca Prueba", type="micro_mill", region="cr.tarrazu", email="hola@prueba.cr",
             phone="+506 8888 0000", website="prueba.cr", eudr_geo=True, price_per_fanega="95,000")
    assert org["country"] == "Costa Rica" and org["website"] == "https://prueba.cr"
    assert org["eudr_geo"] is True and org["price_per_fanega"] == 95000.0 and org["verified"] is False
    p = mk(client, "people", name="Ana Mora", org_id=org["id"], title="Owner", email="ana@prueba.cr")
    assert p["org_name"] == "Finca Prueba"
    d = mk(client, "deals", title="Geisha honey 2026/27", org_id=org["id"], person_id=p["id"],
           price_usd_lb=8.5, volume_kg=690)
    assert d["stage"] == "prospect" and d["status"] == "open"
    assert d["value_usd"] == pytest.approx(8.5 * 690 * schema.LB_PER_KG, rel=1e-6)

    r = client.patch(f"/api/crm/deals/{d['id']}", json={"stage": "cupped", "id": "hijack"})
    assert r.status_code == 200 and r.json()["stage"] == "cupped" and r.json()["id"] == d["id"]
    assert client.get(f"/api/crm/deals/{d['id']}").json()["title"] == "Geisha honey 2026/27"

    orgs = client.get("/api/crm/orgs").json()
    assert orgs[0]["people_count"] == 1 and orgs[0]["open_deals"] == 1
    assert client.get("/api/crm/deals?stage=cupped").json()[0]["id"] == d["id"]
    assert client.get("/api/crm/deals?stage=prospect").json() == []
    assert client.get("/api/crm/meta").json()["counts"]["deals"] == 1


def test_validation_errors(client):
    assert client.post("/api/crm/orgs", json={"type": "farm"}).status_code == 422          # name required
    assert client.post("/api/crm/orgs", json={"name": "X", "type": "spaceship"}).status_code == 422
    assert client.post("/api/crm/people", json={"name": "X", "email": "nope"}).status_code == 422
    assert client.post("/api/crm/deals", json={"title": "X", "org_id": "missing"}).status_code == 422
    assert client.post("/api/crm/activities", json={"subject": "X", "due": "19/10/2026"}).status_code == 422
    assert client.post("/api/crm/deals", json={"title": "X"}).status_code == 422             # org required
    assert client.get("/api/crm/widgets").status_code == 404
    assert client.get("/api/crm/orgs/nope").status_code == 404


def test_search_and_filters(client):
    mk(client, "orgs", name="CoopeAlfa", type="coop", region="cr.tarrazu", varieties="Caturra, Catuai")
    mk(client, "orgs", name="Beta Exports", type="exporter", region="cr.westvalley", verified=True)
    assert [o["name"] for o in client.get("/api/crm/orgs?q=caturra").json()] == ["CoopeAlfa"]
    mk(client, "orgs", name="Río Blanco")
    assert [o["name"] for o in client.get("/api/crm/orgs?q=rio blanco").json()] == ["Río Blanco"]
    assert [o["name"] for o in client.get("/api/crm/orgs?region=cr.westvalley").json()] == ["Beta Exports"]
    assert [o["name"] for o in client.get("/api/crm/orgs?verified=true").json()] == ["Beta Exports"]
    assert [o["name"] for o in client.get("/api/crm/orgs?verified=false&type=coop").json()] == ["CoopeAlfa"]


def test_due_soon_and_overdue(client):
    org = mk(client, "orgs", name="Mill")
    t = date.today()
    mk(client, "activities", subject="Late call", type="call", due=(t - timedelta(days=2)).isoformat(), org_id=org["id"])
    mk(client, "activities", subject="Visit", type="visit", due=(t + timedelta(days=3)).isoformat(), org_id=org["id"])
    mk(client, "activities", subject="Far off", due=(t + timedelta(days=30)).isoformat())
    mk(client, "activities", subject="Done", done=True, due=(t - timedelta(days=5)).isoformat())
    d = client.get("/api/crm/due").json()
    assert [a["subject"] for a in d["overdue"]] == ["Late call"] and d["overdue"][0]["org_name"] == "Mill"
    assert [a["subject"] for a in d["upcoming"]] == ["Visit"]
    assert client.get("/api/crm/orgs").json()[0]["next_activity"]["subject"] == "Late call"


def test_delete_cascades_from_org_and_unlinks_people(client, st):
    org = mk(client, "orgs", name="Gone")
    p = mk(client, "people", name="Keeps", org_id=org["id"])
    d = mk(client, "deals", title="Lot", org_id=org["id"])
    mk(client, "samples", lot="S1", org_id=org["id"], deal_id=d["id"])
    mk(client, "notes", body="hi", org_id=org["id"])
    a = mk(client, "activities", subject="call", person_id=p["id"])
    assert client.delete(f"/api/crm/orgs/{org['id']}").json()["deleted"] == 4
    assert st.all("deals") == [] and st.all("samples") == [] and st.all("notes") == []
    assert st.get("people", p["id"])["org_id"] is None
    client.delete(f"/api/crm/people/{p['id']}")
    assert st.get("activities", a["id"])["person_id"] is None
    assert client.delete(f"/api/crm/orgs/{org['id']}").status_code == 404


def test_csv_round_trips_all_fields(client, st):
    org = mk(client, "orgs", name='Finca "Comillas", S.A.', type="farm", region="cr.brunca", eudr_geo=True,
             notes="line one\nline two", coe=[{"year": 2026, "rank": 1, "score": 90.1}], price_per_fanega=101000.5)
    mk(client, "people", name="Ñandú Pérez", org_id=org["id"], whatsapp="+506 1234")
    mk(client, "deals", title="Lot 1", org_id=org["id"], price_usd_lb=6.25, volume_kg=345, expected_close="2027-01-15")
    before = {k: sorted(st.all(k), key=lambda d: d["id"]) for k in schema.KINDS}
    dumps = {k: client.get(f"/api/crm/export/{k}.csv").text for k in schema.KINDS}
    assert next(csv.reader(io.StringIO(dumps["orgs"]))) == schema.columns("orgs")

    fresh = SQLiteCRM(":memory:")
    set_crm(fresh)
    for k in ("orgs", "people", "deals", "activities", "notes", "samples"):
        r = client.post(f"/api/crm/import/{k}", content=dumps[k].encode(), headers={"content-type": "text/csv"})
        assert r.status_code == 200, r.text
    for k in schema.KINDS:
        after = sorted(fresh.all(k), key=lambda d: d["id"])
        assert [{c: d.get(c) for c in schema.columns(k) if c != "updated"} for d in after] == \
               [{c: d.get(c) for c in schema.columns(k) if c != "updated"} for d in before[k]]

    bad = "id,name,type\n,Bad Type,rocket\n"
    r = client.post("/api/crm/import/orgs", content=bad.encode())
    assert r.status_code == 422 and "row 2" in r.json()["detail"]


def test_seed_is_public_linked_unverified_and_idempotent(client, st):
    recs = service.seed_records()
    assert len(recs) >= 30
    assert all(r["source_url"].startswith("https://") and r["verified"] is False for r in recs)
    assert all(r["region"] is None or r["region"] in dict(schema.REGIONS) for r in recs)
    assert all(r["type"] in dict(schema.ORG_TYPES) for r in recs)
    assert not any(r.get("email") or r.get("phone") for r in recs)  # no personal contact data in the seed
    first = client.post("/api/crm/seed").json()
    assert first["added"] == len(recs)
    assert client.post("/api/crm/seed").json()["added"] == 0
    tz = client.get("/api/crm/orgs?region=cr.tarrazu").json()
    assert tz and any(o["best_coe"] for o in tz)


def test_firestore_backend():
    mf = pytest.importorskip("mockfirestore")
    fs = FirestoreCRM(mf.MockFirestore())
    org = service.validate(fs, "orgs", {"name": "Cloud Farm"})
    fs.put("orgs", org)
    deal = service.validate(fs, "deals", {"title": "Lot", "org_id": org["id"]})
    fs.put("deals", deal)
    assert fs.get("orgs", org["id"])["name"] == "Cloud Farm"
    assert service.list_docs(fs, "orgs")[0]["open_deals"] == 1
    assert service.delete(fs, "orgs", org["id"])["deleted"] == 2
    assert fs.all("deals") == [] and fs.get("orgs", org["id"]) is None


def test_standalone_app_serves_crm(st):
    from app.crm.standalone import app
    c = TestClient(app)
    assert "data-standalone" in c.get("/").text
    assert c.get("/crm/static/crm.js").status_code == 200
    assert c.get("/static/app.css").status_code == 200
    assert c.get("/api/crm/meta").json()["stages"][0]["value"] == "prospect"
