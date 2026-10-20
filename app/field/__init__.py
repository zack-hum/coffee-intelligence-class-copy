"""Field mode (issue #10): an installable, offline-first phone app for farm visits and cuppings.

The page lives at /field/ with its own service worker (scope /field/). It keeps a local copy
of the CRM in IndexedDB, queues every write in an outbox, and replays the outbox to
POST /api/crm/sync when the phone has signal. Records it creates are ordinary CRM records
(kinds `visits` and `cuppings`, plus orgs/people/samples) defined in app/crm/schema.py.
"""
