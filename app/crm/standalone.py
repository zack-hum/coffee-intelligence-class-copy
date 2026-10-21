"""Standalone Sourcing CRM: the CRM on its own, for demos and testing.

    APP_MODE=demo uvicorn app.crm.standalone:app --port 8081     (or ./dev.sh crm)

It shares the same module, API and data file as the full platform (where it's the
"Sourcing" tab), so anything entered here shows up there too and nothing needs
porting to merge.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .. import settings  # noqa: F401  (loads .env and APP_MODE defaults first)
from ..main import basic_auth
from .router import router

HERE = Path(__file__).parent
app = FastAPI(title="Coffee Sourcing CRM", docs_url=None, redoc_url=None)
app.middleware("http")(basic_auth)
app.include_router(router)
app.mount("/crm/static", StaticFiles(directory=HERE / "static"), name="crm-static")
app.mount("/static", StaticFiles(directory=HERE.parent / "static"), name="static")


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/")
def index():
    return FileResponse(HERE / "static" / "standalone.html", headers={"Cache-Control": "no-cache"})
