"""Serves the Field mode shell. The service worker must be served from /field/ so its scope
covers the page; everything else is plain static files."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse, RedirectResponse

STATIC = Path(__file__).parent / "static"
router = APIRouter(tags=["field"])
NO_CACHE = {"Cache-Control": "no-cache"}


@router.get("/field", include_in_schema=False)
def field_redirect():
    return RedirectResponse("/field/")


@router.get("/field/", include_in_schema=False)
def field_index():
    return FileResponse(STATIC / "index.html", headers=NO_CACHE)


@router.get("/field/sw.js", include_in_schema=False)
def service_worker():
    return FileResponse(STATIC / "sw.js", media_type="text/javascript",
                        headers={**NO_CACHE, "Service-Worker-Allowed": "/field/"})


@router.get("/field/manifest.webmanifest", include_in_schema=False)
def manifest():
    return FileResponse(STATIC / "manifest.webmanifest", media_type="application/manifest+json", headers=NO_CACHE)
