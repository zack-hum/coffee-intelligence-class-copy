"""CRM logic: validation, search/filter, enrichment, CSV round-trip and the seed list.

Pure functions over a CRMStore so they're easy to test without HTTP.
"""

from __future__ import annotations

import csv
import io
import json
import re
import time
import unicodedata
import uuid
from datetime import date, timedelta
from pathlib import Path

from . import cupping, schema
from .store import CRMStore

SEED_FILE = Path(__file__).parent / "seed_cr.json"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Client-generated ids (Field mode creates records offline): short, URL-safe.
ID_RE = re.compile(r"^[A-Za-z0-9_-]{6,64}$")


class Invalid(ValueError):
    pass


def fold(text: str) -> str:
    """Lowercase and strip accents so 'rio blanco' finds 'Río Blanco'."""
    return "".join(c for c in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(c))


# ------------------------------------------------------------------ validation

def _coerce(field: tuple, val):
    key, label, typ, extra = field
    if val is None or (isinstance(val, str) and val.strip() == ""):
        return False if typ == "bool" else None
    if typ == "bool":
        if isinstance(val, bool):
            return val
        return str(val).strip().lower() in ("1", "true", "yes", "y", "on")
    if typ == "number":
        try:
            return float(str(val).replace(",", ""))
        except ValueError:
            raise Invalid(f"{label}: not a number") from None
    if typ == "json":
        if isinstance(val, str):
            try:
                return json.loads(val)
            except ValueError:
                raise Invalid(f"{label}: invalid JSON") from None
        return val
    val = str(val).strip()
    if typ == "date" and not DATE_RE.match(val):
        raise Invalid(f"{label}: use YYYY-MM-DD")
    if typ == "email" and not EMAIL_RE.match(val):
        raise Invalid(f"{label}: not a valid email")
    if typ == "url" and not val.startswith(("http://", "https://")):
        val = "https://" + val
    if typ == "select" and val not in {v for v, _ in extra["options"]}:
        raise Invalid(f"{label}: must be one of {[v for v, _ in extra['options']]}")
    return val


def validate(st: CRMStore, kind: str, data: dict, existing: dict | None = None) -> dict:
    """Merge `data` onto `existing` (PATCH semantics) and return a clean document."""
    if kind not in schema.FIELDS:
        raise Invalid(f"unknown kind {kind}")
    spec = schema.spec(kind)
    doc = dict(existing or {})
    if existing is None:
        for k, f in spec.items():
            if "default" in f[3]:
                doc[k] = f[3]["default"]
    for k, v in data.items():
        if k in spec:
            doc[k] = _coerce(spec[k], v)
    for k, f in spec.items():
        doc.setdefault(k, False if f[2] == "bool" else None)
        if f[3].get("required") and doc[k] in (None, ""):
            raise Invalid(f"{f[1]} is required")
        if f[2] == "ref" and doc[k] and not st.get(f[3]["target"], doc[k]):
            raise Invalid(f"{f[1]}: no such record")
    if kind == "cuppings":
        sc = doc.get("scores")
        if doc["form"] != "quick" and not sc:
            doc["total"] = None  # scores not entered yet
        else:
            try:
                doc["total"] = cupping.score(doc["form"], sc if isinstance(sc, dict) else None, doc.get("total"))
            except cupping.ScoreError as e:
                raise Invalid(f"Scores: {e}") from None
    now = time.time()
    doc["id"] = doc.get("id") or data.get("id") or uuid.uuid4().hex[:12]
    doc["created"] = doc.get("created") or now
    doc["updated"] = now
    return doc


# ---------------------------------------------------------------- list & query

def _matches(kind: str, d: dict, q: str | None, filters: dict) -> bool:
    for k, v in filters.items():
        dv = d.get(k)
        if isinstance(dv, bool):
            if dv != (str(v).lower() in ("1", "true", "yes")):
                return False
        elif str(dv if dv is not None else "") != str(v):
            return False
    if q:
        hay = fold(" ".join(str(d.get(f) or "") for f in schema.SEARCH[kind]))
        if not all(t in hay for t in fold(q).split()):
            return False
    return True


def deal_value(d: dict) -> float | None:
    if d.get("price_usd_lb") is None or d.get("volume_kg") is None:
        return None
    return round(d["price_usd_lb"] * d["volume_kg"] * schema.LB_PER_KG, 2)


def best_coe(o: dict) -> dict | None:
    lots = [x for x in (o.get("coe") or []) if x.get("score")]
    return max(lots, key=lambda x: x["score"]) if lots else None


def list_docs(st: CRMStore, kind: str, q: str | None = None, **filters) -> list[dict]:
    spec = schema.spec(kind)
    filters = {k: v for k, v in filters.items() if v not in (None, "") and k in spec}
    docs = [d for d in st.all(kind) if _matches(kind, d, q, filters)]
    return enrich(st, kind, docs)


def enrich(st: CRMStore, kind: str, docs: list[dict]) -> list[dict]:
    """Add display fields (org_name, value, next activity, counts) the UI needs."""
    if not docs:
        return docs
    orgs = {o["id"]: o for o in st.all("orgs")}
    people = {p["id"]: p for p in st.all("people")} if kind != "orgs" else {}
    deals = st.all("deals") if kind in ("orgs", "people", "activities", "samples") else []
    deal_by_id = {d["id"]: d for d in deals}
    acts = [a for a in st.all("activities") if not a.get("done")] if kind in ("orgs", "deals", "people") else []
    people_per_org: dict[str, int] = {}
    if kind == "orgs":
        for p in st.all("people"):
            people_per_org[p.get("org_id")] = people_per_org.get(p.get("org_id"), 0) + 1

    def next_act(key, id_):
        mine = sorted((a for a in acts if a.get(key) == id_), key=lambda a: a.get("due") or "9999")
        return {k: mine[0].get(k) for k in ("id", "subject", "type", "due")} if mine else None

    out = []
    for d in docs:
        d = dict(d)
        if d.get("org_id"):
            d["org_name"] = orgs.get(d["org_id"], {}).get("name")
        if d.get("person_id"):
            d["person_name"] = people.get(d["person_id"], {}).get("name")
        if d.get("deal_id"):
            d["deal_title"] = deal_by_id.get(d["deal_id"], {}).get("title")
        if kind == "orgs":
            d["open_deals"] = sum(1 for x in deals if x.get("org_id") == d["id"] and x.get("status") == "open")
            d["people_count"] = people_per_org.get(d["id"], 0)
            d["best_coe"] = best_coe(d)
            d["next_activity"] = next_act("org_id", d["id"])
        if kind == "deals":
            d["value_usd"] = deal_value(d)
            d["next_activity"] = next_act("deal_id", d["id"])
        if kind == "people":
            d["next_activity"] = next_act("person_id", d["id"])
        out.append(d)
    sort_key = {"activities": lambda x: (bool(x.get("done")), x.get("due") or "9999"),
                "notes": lambda x: -x.get("created", 0)}.get(kind, lambda x: str(x.get("name") or x.get("title") or x.get("lot") or "").lower())
    return sorted(out, key=sort_key)


def due_soon(st: CRMStore, days: int = 7, today: date | None = None) -> dict:
    today = today or date.today()
    horizon = (today + timedelta(days=days)).isoformat()
    t = today.isoformat()
    acts = [a for a in st.all("activities") if not a.get("done") and a.get("due") and a["due"] <= horizon]
    acts = enrich(st, "activities", acts)
    for a in acts:
        a["overdue"] = a["due"] < t
        a["today"] = a["due"] == t
    return {"today": t, "overdue": [a for a in acts if a["overdue"]], "upcoming": [a for a in acts if not a["overdue"]]}


REF_KEY = {"orgs": "org_id", "people": "person_id", "deals": "deal_id", "samples": "sample_id", "visits": "visit_id"}
# Deleting an organization deletes what only makes sense under it; anything else is unlinked.
ORG_CASCADE = ("deals", "samples", "activities", "notes", "visits", "cuppings")


def delete(st: CRMStore, kind: str, id_: str) -> dict:
    """Delete a record. Orgs cascade to their deals, samples, activities, notes, visits and
    cuppings; people, deals, samples and visits are unlinked from the records that point at them."""
    if not st.get(kind, id_):
        return {"deleted": 0}
    n = int(st.delete(kind, id_))
    key = REF_KEY.get(kind)
    if not key:
        return {"deleted": n}
    for k in schema.KINDS:
        if key not in schema.spec(k):
            continue
        for d in st.all(k):
            if d.get(key) != id_:
                continue
            if kind == "orgs" and k in ORG_CASCADE:
                n += delete(st, k, d["id"])["deleted"]
            else:
                st.put(k, {**d, key: None, "updated": time.time()})
    return {"deleted": n}


# ----------------------------------------------------------------------- sync

def sync(st: CRMStore, ops: list[dict]) -> list[dict]:
    """Apply a batch of offline writes in order (Field mode outbox).

    Each op is {"op": "upsert"|"delete", "kind", "id", "data"}. Ids are generated on the
    phone, so replaying the same batch after a dropped connection never duplicates records:
    an upsert of an existing id is a PATCH, a delete of a missing id is a no-op. Later ops may
    reference records created by earlier ones. Each op succeeds or fails on its own; a failed
    op is reported with its error so the phone can show it instead of retrying forever."""
    out = []
    for op in ops:
        kind, id_, action = op.get("kind"), str(op.get("id") or ""), op.get("op", "upsert")
        res = {"kind": kind, "id": id_, "op": action}
        try:
            if kind not in schema.FIELDS:
                raise Invalid(f"unknown kind {kind!r}")
            if not ID_RE.match(id_):
                raise Invalid("id must be 6-64 letters, digits, '-' or '_'")
            if action == "delete":
                res.update(ok=True, deleted=delete(st, kind, id_)["deleted"])
            elif action == "upsert":
                data = {k: v for k, v in (op.get("data") or {}).items() if k not in schema.SYSTEM}
                existing = st.get(kind, id_)
                doc = validate(st, kind, data if existing else {**data, "id": id_}, existing)
                st.put(kind, doc)
                res.update(ok=True, doc=doc)
            else:
                raise Invalid(f"unknown op {action!r}")
        except Invalid as e:
            res.update(ok=False, error=str(e))
        out.append(res)
    return out


# ------------------------------------------------------------------------ CSV

def _cell(v):
    if isinstance(v, (list, dict)):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return "" if v is None else str(v)


def to_csv(st: CRMStore, kind: str) -> str:
    cols = schema.columns(kind)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(cols)
    for d in sorted(st.all(kind), key=lambda x: x.get("created", 0)):
        w.writerow([_cell(d.get(c)) for c in cols])
    return buf.getvalue()


def from_csv(st: CRMStore, kind: str, text: str) -> dict:
    """Import rows (create or update by id). Validates every row first; all-or-nothing."""
    rows = list(csv.DictReader(io.StringIO(text.lstrip("﻿"))))
    docs, errors = [], []
    for i, row in enumerate(rows, start=2):
        try:
            existing = st.get(kind, row["id"]) if row.get("id") else None
            # refs may point at rows of the same import; check after staging
            doc = validate(_Staged(st, kind, docs), kind, row, existing)
            if row.get("id"):
                doc["id"] = row["id"]
            if row.get("created"):
                doc["created"] = float(row["created"])
            docs.append(doc)
        except (Invalid, ValueError) as e:
            errors.append(f"row {i}: {e}")
    if errors:
        raise Invalid("; ".join(errors[:10]))
    st.put_many(kind, docs)
    return {"imported": len(docs)}


class _Staged(CRMStore):
    """Read-through view that also sees rows staged in the current import."""

    def __init__(self, st, kind, staged):
        self.st, self.kind, self.staged = st, kind, staged

    def get(self, kind, id_):
        if kind == self.kind:
            for d in self.staged:
                if d["id"] == id_:
                    return d
        return self.st.get(kind, id_)


# ----------------------------------------------------------------------- seed

def seed_records() -> list[dict]:
    """Public Costa Rican suppliers (ACE Cup of Excellence 2024–26 winners, co-ops and exporters).
    Every record carries its source link and verified=False until Z meets them."""
    raw = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    out = []
    for r in raw:
        notes = r.get("notes") or ""
        out.append({
            "name": r["name"], "type": r["type"], "country": "Costa Rica",
            "region": f"cr.{r['region']}" if r.get("region") else None,
            "town": r.get("town"), "website": r.get("website"), "producer": r.get("producer"),
            "altitude_m": r.get("altitude_m"), "processing": r.get("processing"), "varieties": r.get("varieties"),
            "source": {"ACE": "Cup of Excellence (ACE)", "PROCOMER": "PROCOMER · Buy from Costa Rica"}.get(r["source"], r["source"]),
            "source_url": r["source_url"], "verified": False, "icafe_registered": "unknown",
            "coe": r.get("coe") or [], "notes": notes,
            "seed_key": "cr:" + re.sub(r"[^a-z0-9]+", "-", r["name"].lower()).strip("-"),
        })
    return out


def seed(st: CRMStore) -> dict:
    """Idempotent: adds seed orgs whose seed_key isn't present yet."""
    have = {o.get("seed_key") for o in st.all("orgs")}
    new = [validate(st, "orgs", r) for r in seed_records() if r["seed_key"] not in have]
    st.put_many("orgs", new)
    return {"added": len(new), "skipped": len(have & {r["seed_key"] for r in seed_records()})}


def counts(st: CRMStore) -> dict:
    return {k: len(st.all(k)) for k in schema.KINDS}
