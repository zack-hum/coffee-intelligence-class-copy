"""CRM document storage.

Every record is a small JSON document keyed by (kind, id). Personal-scale data
(hundreds to a few thousand records), so filtering happens in Python and both
backends stay tiny:

  * SQLiteCRM    - one `crm_docs` table in the same SQLite file as the archive
  * FirestoreCRM - one collection per kind (`crm_orgs`, `crm_people`, ...)

Backend choice follows the archive (STORE=sqlite|firestore, see app/store.py).
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading


class CRMStore:
    def all(self, kind: str) -> list[dict]: ...
    def get(self, kind: str, id_: str) -> dict | None: ...
    def put(self, kind: str, doc: dict) -> dict: ...
    def delete(self, kind: str, id_: str) -> bool: ...

    def put_many(self, kind: str, docs: list[dict]) -> int:
        for d in docs:
            self.put(kind, d)
        return len(docs)


class SQLiteCRM(CRMStore):
    def __init__(self, path: str):
        self._lock = threading.Lock()
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("""CREATE TABLE IF NOT EXISTS crm_docs (
            kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, updated REAL,
            PRIMARY KEY (kind, id))""")
        self.db.commit()

    def all(self, kind):
        with self._lock:
            rows = self.db.execute("SELECT data FROM crm_docs WHERE kind=?", (kind,)).fetchall()
        return [json.loads(r[0]) for r in rows]

    def get(self, kind, id_):
        with self._lock:
            r = self.db.execute("SELECT data FROM crm_docs WHERE kind=? AND id=?", (kind, id_)).fetchone()
        return json.loads(r[0]) if r else None

    def put(self, kind, doc):
        with self._lock:
            self.db.execute("INSERT OR REPLACE INTO crm_docs (kind, id, data, updated) VALUES (?,?,?,?)",
                            (kind, doc["id"], json.dumps(doc, ensure_ascii=False), doc.get("updated")))
            self.db.commit()
        return doc

    def put_many(self, kind, docs):
        with self._lock:
            self.db.executemany("INSERT OR REPLACE INTO crm_docs (kind, id, data, updated) VALUES (?,?,?,?)",
                                [(kind, d["id"], json.dumps(d, ensure_ascii=False), d.get("updated")) for d in docs])
            self.db.commit()
        return len(docs)

    def delete(self, kind, id_):
        with self._lock:
            n = self.db.execute("DELETE FROM crm_docs WHERE kind=? AND id=?", (kind, id_)).rowcount
            self.db.commit()
        return n > 0

    def reset(self):
        with self._lock:
            self.db.execute("DELETE FROM crm_docs")
            self.db.commit()


class FirestoreCRM(CRMStore):
    def __init__(self, client):
        self.db = client

    def _col(self, kind):
        return self.db.collection(f"crm_{kind}")

    def all(self, kind):
        return [s.to_dict() for s in self._col(kind).stream()]

    def get(self, kind, id_):
        snap = self._col(kind).document(id_).get()
        return snap.to_dict() if snap.exists else None

    def put(self, kind, doc):
        self._col(kind).document(doc["id"]).set(doc)
        return doc

    def delete(self, kind, id_):
        ref = self._col(kind).document(id_)
        if not ref.get().exists:
            return False
        ref.delete()
        return True


_crm: CRMStore | None = None


def get_crm() -> CRMStore:
    global _crm
    if _crm is None:
        kind = os.getenv("STORE") or ("firestore" if os.getenv("K_SERVICE") else "sqlite")
        if kind == "firestore":
            from google.cloud import firestore  # lazy: dev doesn't need it
            _crm = FirestoreCRM(firestore.Client(project=os.getenv("GOOGLE_CLOUD_PROJECT"),
                                                 database=os.getenv("FIRESTORE_DB", "(default)")))
        else:
            _crm = SQLiteCRM(os.getenv("SQLITE_PATH", "coffee.db"))
    return _crm


def set_crm(store: CRMStore | None) -> None:
    """Swap the backend (tests)."""
    global _crm
    _crm = store
