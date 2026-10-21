"""Sourcing CRM schema: the single source of truth for fields.

The API validates against it, CSV export/import uses it for columns, and the
frontend builds its forms from it (served at /api/crm/meta). To add a field,
add it here; nothing else needs to change.

Field spec: (key, label, type, extra)
  type: text | textarea | email | phone | url | number | date | bool | select | ref | json
  extra: options for select, target kind for ref, {"required": True}, {"group": "..."}
"""

from __future__ import annotations

from .. import config

ORG_TYPES = [
    ("farm", "Farm / producer"), ("micro_mill", "Micro-mill"), ("coop", "Cooperative"),
    ("exporter", "Exporter"), ("dry_mill", "Dry mill"), ("importer", "Importer"),
    ("roaster", "Roaster / buyer"), ("association", "Association"), ("other", "Other"),
]
REGIONS = [(f"cr.{r['id']}", r["name"]) for r in config.CR_REGIONS] + [("other", "Other / outside CR")]
YES_NO = [("unknown", "Unknown"), ("yes", "Yes"), ("no", "No")]
PROCESSES = [("washed", "Washed"), ("honey", "Honey"), ("natural", "Natural"),
             ("anaerobic", "Anaerobic / experimental"), ("mixed", "Mixed")]

# Green-coffee buying pipeline (one deal = one lot you're buying), Pipedrive-style.
STAGES = [
    ("prospect", "Prospect"), ("sample_requested", "Sample requested"), ("sample_received", "Sample received"),
    ("cupped", "Cupped"), ("negotiation", "Offer / negotiation"), ("contracted", "Contracted"),
    ("shipped", "Shipped"), ("arrived", "Arrived"),
]
DEAL_STATUS = [("open", "Open"), ("won", "Won"), ("lost", "Lost")]
INCOTERMS = [("FOB", "FOB"), ("FCA", "FCA"), ("EXW", "EXW / farm gate"), ("FOT", "FOT"),
             ("CIF", "CIF"), ("DAP", "DAP"), ("DDP", "DDP")]
ACTIVITY_TYPES = [("call", "Call"), ("whatsapp", "WhatsApp"), ("email", "Email"), ("visit", "Visit"),
                  ("meeting", "Meeting"), ("task", "Task"), ("deadline", "Deadline")]
SAMPLE_STATUS = [("requested", "Requested"), ("received", "Received"), ("cupped", "Cupped"),
                 ("approved", "Approved"), ("rejected", "Rejected")]

REQ = {"required": True}

FIELDS: dict[str, list[tuple]] = {
    "orgs": [
        ("name", "Name", "text", {**REQ, "group": "Details"}),
        ("type", "Type", "select", {"options": ORG_TYPES, "group": "Details"}),
        ("country", "Country", "text", {"group": "Details", "default": "Costa Rica"}),
        ("region", "Region", "select", {"options": REGIONS, "group": "Details"}),
        ("town", "Town / location", "text", {"group": "Details"}),
        ("address", "Address", "text", {"group": "Details"}),
        ("website", "Website", "url", {"group": "Details"}),
        ("email", "Email", "email", {"group": "Details"}),
        ("phone", "Phone", "phone", {"group": "Details"}),
        ("owner", "Owner", "text", {"group": "Details"}),
        ("producer", "Producer (as published)", "text", {"group": "Coffee profile"}),
        ("altitude_m", "Altitude (m)", "text", {"group": "Coffee profile"}),
        ("processing", "Processing", "text", {"group": "Coffee profile"}),
        ("varieties", "Varieties", "text", {"group": "Coffee profile"}),
        ("certifications", "Certifications", "text", {"group": "Coffee profile"}),
        ("annual_volume", "Annual volume", "text", {"group": "Coffee profile"}),
        ("exporter_of_record", "Exporter of record", "text", {"group": "Trade & compliance"}),
        ("dry_mill", "Dry mill", "text", {"group": "Trade & compliance"}),
        ("icafe_registered", "ICAFE-registered", "select", {"options": YES_NO, "group": "Trade & compliance"}),
        ("icafe_reg_no", "ICAFE registration no.", "text", {"group": "Trade & compliance"}),
        ("eudr_geo", "EUDR geolocation on file", "bool", {"group": "Trade & compliance"}),
        ("price_per_fanega", "Liquidación (₡/fanega)", "number", {"group": "Trade & compliance"}),
        ("source", "Source", "text", {"group": "Source"}),
        ("source_url", "Source link", "url", {"group": "Source"}),
        ("verified", "Verified in person", "bool", {"group": "Source"}),
        ("notes", "Notes", "textarea", {"group": "Notes"}),
        ("coe", "Cup of Excellence results", "json", {"hidden": True}),
        ("seed_key", "Seed key", "text", {"hidden": True}),
    ],
    "people": [
        ("name", "Name", "text", REQ),
        ("org_id", "Organization", "ref", {"target": "orgs"}),
        ("title", "Title / role", "text", {}),
        ("email", "Email", "email", {}),
        ("phone", "Phone", "phone", {}),
        ("whatsapp", "WhatsApp", "phone", {}),
        ("location", "Location", "text", {}),
        ("languages", "Languages", "text", {}),
        ("owner", "Owner", "text", {}),
        ("notes", "Notes", "textarea", {}),
    ],
    "deals": [
        ("title", "Title", "text", REQ),
        ("org_id", "Organization", "ref", {**REQ, "target": "orgs"}),
        ("person_id", "Contact person", "ref", {"target": "people"}),
        ("stage", "Stage", "select", {"options": STAGES, "default": "prospect"}),
        ("status", "Status", "select", {"options": DEAL_STATUS, "default": "open"}),
        ("lot", "Lot / mark", "text", {}),
        ("harvest", "Harvest", "text", {}),
        ("process", "Process", "select", {"options": PROCESSES}),
        ("variety", "Variety", "text", {}),
        ("price_usd_lb", "Price (USD/lb)", "number", {}),
        ("volume_kg", "Volume (kg)", "number", {}),
        ("incoterm", "Incoterm", "select", {"options": INCOTERMS}),
        ("expected_close", "Expected close", "date", {}),
        ("lost_reason", "Lost reason", "text", {}),
        ("owner", "Owner", "text", {}),
        ("notes", "Notes", "textarea", {}),
    ],
    "activities": [
        ("subject", "Subject", "text", REQ),
        ("type", "Type", "select", {"options": ACTIVITY_TYPES, "default": "task"}),
        ("due", "Due date", "date", {}),
        ("done", "Done", "bool", {}),
        ("org_id", "Organization", "ref", {"target": "orgs"}),
        ("person_id", "Person", "ref", {"target": "people"}),
        ("deal_id", "Deal", "ref", {"target": "deals"}),
        ("notes", "Notes / outcome", "textarea", {}),
    ],
    "notes": [
        ("body", "Note", "textarea", REQ),
        ("org_id", "Organization", "ref", {"target": "orgs"}),
        ("person_id", "Person", "ref", {"target": "people"}),
        ("deal_id", "Deal", "ref", {"target": "deals"}),
    ],
    "samples": [
        ("lot", "Lot name", "text", REQ),
        ("org_id", "Organization", "ref", {**REQ, "target": "orgs"}),
        ("deal_id", "Deal", "ref", {"target": "deals"}),
        ("status", "Status", "select", {"options": SAMPLE_STATUS, "default": "requested"}),
        ("process", "Process", "select", {"options": PROCESSES}),
        ("variety", "Variety", "text", {}),
        ("weight_g", "Weight (g)", "number", {}),
        ("requested", "Requested on", "date", {}),
        ("received", "Received on", "date", {}),
        ("notes", "Notes", "textarea", {}),
    ],
}
KINDS = list(FIELDS)
SYSTEM = ["id", "created", "updated"]
# Searchable text per kind (q=...).
SEARCH = {
    "orgs": ["name", "producer", "town", "region", "type", "country", "varieties", "notes"],
    "people": ["name", "title", "email", "phone", "location", "notes"],
    "deals": ["title", "lot", "variety", "harvest", "notes"],
    "activities": ["subject", "notes"],
    "notes": ["body"],
    "samples": ["lot", "variety", "notes"],
}
LB_PER_KG = 2.2046226218


def spec(kind: str) -> dict[str, tuple]:
    return {f[0]: f for f in FIELDS[kind]}


def columns(kind: str) -> list[str]:
    return SYSTEM + [f[0] for f in FIELDS[kind]]


def meta() -> dict:
    """Everything the frontend needs to render lists and forms."""
    def opt(o):
        return [{"value": v, "label": lbl} for v, lbl in o]
    return {
        "kinds": {k: [{"key": f[0], "label": f[1], "type": f[2],
                       **{x: (opt(y) if x == "options" else y) for x, y in f[3].items()}} for f in fs]
                  for k, fs in FIELDS.items()},
        "stages": opt(STAGES), "org_types": opt(ORG_TYPES), "regions": opt(REGIONS),
        "activity_types": opt(ACTIVITY_TYPES), "sample_status": opt(SAMPLE_STATUS),
        "lb_per_kg": LB_PER_KG,
    }
