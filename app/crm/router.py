"""Sourcing CRM API (/api/crm/*). Mounted by app.main and by the standalone app."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse

from .. import settings
from . import schema, service
from .store import get_crm

router = APIRouter(prefix="/api/crm", tags=["crm"])
_seeded = {"done": False}


def crm():
    st = get_crm()
    # Demo mode starts with the public Costa Rica seed list; live mode offers it as a button.
    if not _seeded["done"]:
        _seeded["done"] = True
        if settings.APP_MODE == "demo" and not st.all("orgs"):
            service.seed(st)
    return st


def _kind(kind: str) -> str:
    if kind not in schema.FIELDS:
        raise HTTPException(404, f"unknown collection {kind!r}; use one of {schema.KINDS}")
    return kind


@router.get("/meta")
def meta():
    return {**schema.meta(), "counts": service.counts(crm()), "mode": settings.APP_MODE}


@router.get("/due")
def due(days: int = 7):
    return service.due_soon(crm(), min(max(days, 0), 90), date.today())


@router.post("/seed")
def seed():
    return service.seed(crm())


@router.get("/export/{kind}.csv")
def export_csv(kind: str):
    _kind(kind)
    return PlainTextResponse(service.to_csv(crm(), kind), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": f'attachment; filename="sourcing-{kind}-{date.today()}.csv"'})


@router.post("/import/{kind}")
async def import_csv(kind: str, request: Request):
    _kind(kind)
    text = (await request.body()).decode("utf-8-sig")
    try:
        return service.from_csv(crm(), kind, text)
    except service.Invalid as e:
        raise HTTPException(422, str(e)) from None


@router.get("/{kind}")
def list_kind(kind: str, request: Request, q: str | None = None):
    _kind(kind)
    filters = {k: v for k, v in request.query_params.items() if k != "q"}
    return service.list_docs(crm(), kind, q=q, **filters)


@router.post("/{kind}", status_code=201)
def create(kind: str, data: dict):
    _kind(kind)
    st = crm()
    data.pop("id", None)
    try:
        doc = service.validate(st, kind, data)
    except service.Invalid as e:
        raise HTTPException(422, str(e)) from None
    st.put(kind, doc)
    return service.enrich(st, kind, [doc])[0]


@router.get("/{kind}/{id_}")
def get_one(kind: str, id_: str):
    _kind(kind)
    st = crm()
    doc = st.get(kind, id_)
    if not doc:
        raise HTTPException(404, "not found")
    return service.enrich(st, kind, [doc])[0]


@router.patch("/{kind}/{id_}")
def update(kind: str, id_: str, data: dict):
    _kind(kind)
    st = crm()
    existing = st.get(kind, id_)
    if not existing:
        raise HTTPException(404, "not found")
    try:
        doc = service.validate(st, kind, {k: v for k, v in data.items() if k not in schema.SYSTEM}, existing)
    except service.Invalid as e:
        raise HTTPException(422, str(e)) from None
    st.put(kind, doc)
    return service.enrich(st, kind, [doc])[0]


@router.delete("/{kind}/{id_}")
def remove(kind: str, id_: str):
    _kind(kind)
    res = service.delete(crm(), kind, id_)
    if not res["deleted"]:
        raise HTTPException(404, "not found")
    return res
