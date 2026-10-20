/* Field mode (#10): offline-first visits, contacts and cuppings on the phone.

   How it stays usable with no signal:
   - sw.js caches this page, so it opens offline once it has been loaded with signal.
   - IndexedDB holds a copy of the CRM records the field needs (orgs, people, samples,
     visits, cuppings) plus an OUTBOX of every write made on the phone.
   - Every record gets its id here, so the outbox can be replayed to POST /api/crm/sync
     any number of times without creating duplicates. iOS has no Background Sync, so we
     sync when the app opens, when the phone comes back online and when it returns to view.
   Score math mirrors app/crm/cupping.py (the server recomputes and stores the total). */
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const nowLabel = () => new Date().toLocaleString('en-US', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false});
const uid = () => 'f' + Date.now().toString(36) + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => (b % 36).toString(36)).join('');
const KINDS = ['orgs', 'people', 'samples', 'visits', 'cuppings'];
const ORG_TYPES = [['farm', 'Farm / producer'], ['micro_mill', 'Micro-mill'], ['coop', 'Cooperative'], ['exporter', 'Exporter'],
  ['dry_mill', 'Dry mill'], ['importer', 'Importer'], ['roaster', 'Roaster / buyer'], ['association', 'Association'], ['other', 'Other']];
// Default visit checklist (agent/research/2026-10-17-costa-rica-sourcing-specifics.md).
const CHECKLIST = [
  ['exporter', 'Registered exporter? Who exports and dry-mills for you?'],
  ['fanega', 'Paid / received per fanega this season (advance vs. expected liquidación)?'],
  ['fob', 'FOB $/lb for this lot, minimum lot size, ready to ship when (Limón / Caldera)?'],
  ['lot', 'Processing, altitude, variety, picking dates, moisture / water activity?'],
  ['eudr', 'Farm geolocation for EUDR and ICAFE registration number?'],
  ['samples', 'Pre-shipment / arrival samples: how many grams, how sent, whose cost?'],
];
const DESCRIPTORS = ['floral', 'jasmine', 'citrus', 'lemon', 'orange', 'stone fruit', 'red fruit', 'berry', 'tropical', 'grape',
  'caramel', 'honey', 'brown sugar', 'chocolate', 'cocoa', 'nutty', 'almond', 'spice', 'cinnamon', 'black tea', 'winey', 'fermented',
  'herbal', 'grassy', 'woody', 'earthy', 'juicy', 'silky', 'creamy', 'bright', 'clean', 'sweet', 'astringent', 'flat'];

// ------------------------------------------------------------------ IndexedDB
let dbp = null;
function db() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('coffee-field', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('docs', {keyPath: 'key'}).createIndex('kind', 'kind');
      d.createObjectStore('outbox', {keyPath: 'seq', autoIncrement: true});
      d.createObjectStore('kv');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const done = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
async function tx(store, mode, fn) {
  const t = (await db()).transaction(store, mode);
  const out = await fn(t.objectStore(store));
  await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
  return out;
}
const kvGet = k => tx('kv', 'readonly', s => done(s.get(k)));
const kvSet = (k, v) => tx('kv', 'readwrite', s => done(s.put(v, k)));
const all = kind => tx('docs', 'readonly', s => done(s.index('kind').getAll(kind))).then(rs => rs.map(r => r.doc));
const getDoc = (kind, id) => tx('docs', 'readonly', s => done(s.get(kind + ':' + id))).then(r => r?.doc);
const putDoc = (kind, doc) => tx('docs', 'readwrite', s => done(s.put({key: kind + ':' + doc.id, kind, doc})));
const outbox = () => tx('outbox', 'readonly', s => done(s.getAll()));

// Save locally and queue for the server. Returns the local record.
async function save(kind, data, id) {
  id ||= data.id || uid();
  const prev = await getDoc(kind, id);
  const doc = {...(prev || {}), ...data, id, _pending: true};
  await putDoc(kind, doc);
  await tx('outbox', 'readwrite', s => done(s.add({op: 'upsert', kind, id, data: strip(data), ts: Date.now()})));
  badge();
  sync();
  return doc;
}
async function removeDoc(kind, id) {
  await tx('docs', 'readwrite', s => done(s.delete(kind + ':' + id)));
  await tx('outbox', 'readwrite', s => done(s.add({op: 'delete', kind, id, ts: Date.now()})));
  badge();
  sync();
}
const strip = d => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith('_') && !['id', 'created', 'updated', 'org_name', 'person_name'].includes(k)));

// ------------------------------------------------------------------ sync
let syncing = null;
const online = () => navigator.onLine !== false;
function sync() { return syncing ||= doSync().finally(() => { syncing = null; badge(); }); }
async function doSync() {
  if (!online()) return;
  try {
    const ops = await outbox();
    const fresh = ops.filter(o => !o.error);
    if (fresh.length) {
      const r = await fetch('/api/crm/sync', {method: 'POST', headers: {'content-type': 'application/json'}, credentials: 'same-origin',
        body: JSON.stringify({ops: fresh.map(({op, kind, id, data}) => ({op, kind, id, data}))})});
      if (!r.ok) throw new Error('sync ' + r.status);
      const {results} = await r.json();
      await tx('outbox', 'readwrite', s => Promise.all(fresh.map((o, i) => results[i].ok ? done(s.delete(o.seq)) : done(s.put({...o, error: results[i].error})))));
      for (const res of results) if (res.ok && res.doc) await putDoc(res.kind, res.doc);
    }
    await pull();
    await kvSet('lastSync', Date.now());
  } catch (e) {
    console.warn('sync failed; will retry', e);
  }
}
async function pull() {
  const get = p => fetch('/api/crm' + p, {credentials: 'same-origin'}).then(r => { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); });
  const [meta, ...lists] = await Promise.all([get('/meta'), ...KINDS.map(k => get('/' + k))]);
  const pending = new Set((await outbox()).map(o => o.kind + ':' + o.id));
  await tx('docs', 'readwrite', async s => {
    const keys = await done(s.getAllKeys());
    await Promise.all(keys.filter(k => KINDS.includes(k.split(':')[0]) && !pending.has(k)).map(k => done(s.delete(k))));
    await Promise.all(KINDS.flatMap((kind, i) => lists[i].filter(d => !pending.has(kind + ':' + d.id)).map(d => done(s.put({key: kind + ':' + d.id, kind, doc: d})))));
  });
  await kvSet('meta', meta);
}

async function badge() {
  const b = $('#syncbtn');
  if (!b) return;
  const ops = await outbox().catch(() => []);
  const errs = ops.filter(o => o.error).length, n = ops.length - errs;
  b.className = 'pill' + (n || errs ? ' pending' : !online() ? ' offline' : '');
  b.textContent = errs ? `⚠ ${errs} need attention` : n ? `${n} waiting to sync` : online() ? '✓ Synced' : 'Offline';
}

// ------------------------------------------------------------------ small UI helpers
const toast = msg => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); };
const opt = (pairs, v, blank = '—') => (blank != null ? `<option value="">${blank}</option>` : '') + pairs.map(([k, l]) => `<option value="${esc(k)}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`).join('');
const byName = (a, b) => String(a.name || a.lot || '').localeCompare(String(b.name || b.lot || ''));
let nInp = 0;
const inp = (name, label, v, type = 'text', extra = '') => { const id = `i_${name}_${++nInp}`;
  return `<label for="${id}">${label}</label><input id="${id}" name="${name}" type="${type}" value="${esc(v ?? '')}" ${type === 'number' ? 'step="any" inputmode="decimal"' : ''} ${extra}>`; };
const formData = root => Object.fromEntries($$('[name]', root).filter(el => !el.closest('[data-skip]')).map(el => [el.name,
  el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value]));
let META = null;
const metaOpts = name => (META?.[name] || []).map(o => [o.value, o.label]);
const REGIONS = () => metaOpts('regions');
const PROCESSES = [['washed', 'Washed'], ['honey', 'Honey'], ['natural', 'Natural'], ['anaerobic', 'Anaerobic / experimental'], ['mixed', 'Mixed']];

// Org + person pickers with an inline "+ New" form, so a farm or farmer missing from the list
// can be added on the spot, offline.
async function orgPicker(root, {orgId, personId, onChange} = {}) {
  const orgs = (await all('orgs')).sort(byName), people = await all('people');
  root.innerHTML = `
    <label for="p_org">Farm / organization</label>
    <div class="pick"><select id="p_org" name="org_id">${opt(orgs.map(o => [o.id, o.name + (o.town ? ' · ' + o.town : '')]), orgId, '— choose —')}</select>
      <button type="button" class="btn sm" data-new-org>+ New</button></div>
    <div data-org-form data-skip hidden></div>
    <label for="p_person">Person (farmer, producer, contact)</label>
    <div class="pick"><select id="p_person" name="person_id"></select><button type="button" class="btn sm" data-new-person>+ New</button></div>
    <div data-person-form data-skip hidden></div>`;
  const orgSel = $('#p_org', root), perSel = $('#p_person', root);
  const fillPeople = sel => {
    const mine = people.filter(p => !orgSel.value || p.org_id === orgSel.value || !p.org_id).sort(byName);
    perSel.innerHTML = opt(mine.map(p => [p.id, p.name + (p.title ? ' · ' + p.title : '')]), sel, '— none —');
  };
  fillPeople(personId);
  orgSel.onchange = () => { fillPeople(); onChange?.(orgSel.value); };
  $('[data-new-org]', root).onclick = () => {
    const f = $('[data-org-form]', root);
    f.hidden = false;
    f.className = 'inline-new';
    f.innerHTML = `${inp('n_name', 'Name *', '')}<label>Type</label><select name="n_type">${opt(ORG_TYPES, 'farm', null)}</select>
      <label>Region</label><select name="n_region">${opt(REGIONS(), '')}</select>${inp('n_town', 'Town / location', '')}
      ${inp('n_producer', 'Producer name', '')}<div class="row" style="margin-top:10px"><button type="button" class="btn primary sm" data-ok>Add organization</button><button type="button" class="btn sm" data-cancel>Cancel</button></div>`;
    $('[data-cancel]', f).onclick = () => { f.hidden = true; f.innerHTML = ''; };
    $('[data-ok]', f).onclick = async () => {
      const v = n => $(`[name=n_${n}]`, f).value.trim();
      if (!v('name')) { toast('Name is required'); return; }
      const o = await save('orgs', {name: v('name'), type: v('type'), region: v('region') || null, town: v('town') || null,
        producer: v('producer') || null, country: v('region') && v('region') !== 'other' ? 'Costa Rica' : null, verified: true, source: 'Field mode'});
      orgs.push(o);
      orgSel.insertAdjacentHTML('beforeend', `<option value="${o.id}">${esc(o.name)}</option>`);
      orgSel.value = o.id; f.hidden = true; f.innerHTML = '';
      fillPeople(); onChange?.(o.id);
    };
  };
  $('[data-new-person]', root).onclick = () => {
    const f = $('[data-person-form]', root);
    f.hidden = false;
    f.className = 'inline-new';
    f.innerHTML = `${inp('n_name', 'Name *', '')}${inp('n_title', 'Role (owner, mill manager…)', '')}${inp('n_phone', 'Phone', '', 'tel')}
      ${inp('n_whatsapp', 'WhatsApp', '', 'tel')}${inp('n_email', 'Email', '', 'email')}${inp('n_languages', 'Languages', '')}
      <div class="row" style="margin-top:10px"><button type="button" class="btn primary sm" data-ok>Add person</button><button type="button" class="btn sm" data-cancel>Cancel</button></div>`;
    $('[data-cancel]', f).onclick = () => { f.hidden = true; f.innerHTML = ''; };
    $('[data-ok]', f).onclick = async () => {
      const v = n => $(`[name=n_${n}]`, f).value.trim();
      if (!v('name')) { toast('Name is required'); return; }
      if (v('email') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('email'))) { toast('Check the email address'); return; }
      const p = await save('people', {name: v('name'), title: v('title') || null, phone: v('phone') || null, whatsapp: v('whatsapp') || null,
        email: v('email') || null, languages: v('languages') || null, org_id: orgSel.value || null});
      people.push(p); fillPeople(p.id); f.hidden = true; f.innerHTML = '';
    };
  };
}

// ------------------------------------------------------------------ pages
async function pageHome(view) {
  const [visits, cups, orgs, ops, last] = await Promise.all([all('visits'), all('cuppings'), all('orgs'), outbox(), kvGet('lastSync')]);
  const orgName = id => (orgs.find(o => o.id === id) || {}).name || '—';
  const flights = {};
  cups.forEach(c => { const k = c.session || c.date; (flights[k] ||= []).push(c); });
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ready = navigator.serviceWorker?.controller && last;
  const errs = ops.filter(o => o.error);
  view.innerHTML = `
    ${standalone ? '' : `<div class="card note"><b>Install for offline use</b><p class="small muted">iPhone: tap <b>Share</b> → <b>Add to Home Screen</b>, then open Field from the home screen. Installed, your data isn't cleared by Safari.</p></div>`}
    <div class="card"><div class="row"><b>${ready ? '<span class="ok">Available offline ✓</span>' : '<span class="warn">Open once with signal to use offline</span>'}</b><span class="spacer"></span>
      <span class="small muted" id="persist"></span></div>
      <p class="small warn" id="persistwhy" hidden>Not installed yet: Safari may clear data it thinks is unused after about a week. Add Field to the home screen before the trip and sync before each farm visit.</p>
      <div class="small muted">${orgs.length} organizations on this phone · last synced ${last ? new Date(last).toLocaleString() : 'never'}</div></div>
    ${errs.length ? `<div class="card note"><b class="bad">${errs.length} change${errs.length > 1 ? 's' : ''} the server refused</b><p class="small">${errs.map(e => esc(`${e.kind}: ${e.error}`)).join('<br>')}</p>
      <button class="btn sm" id="clearerr">Discard them</button></div>` : ''}
    <div class="grid2">
      <a class="btn big primary" href="#/visit/new"><span>📍</span>New visit</a>
      <a class="btn big primary" href="#/cup/new"><span>☕</span>New cupping</a>
      <a class="btn big" href="#/org/new"><span>🏡</span>Add farm / org</a>
      <a class="btn big" href="#/person/new"><span>👤</span>Add person</a>
    </div>
    <a class="btn block" href="#/people-orgs" style="margin-top:10px">🔎 Farms & people · search and edit</a>
    <h2>Recent visits</h2>
    <div class="card list">${visits.length ? visits.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 15).map(v =>
      `<a class="item" href="#/visit/${v.id}"><span>${esc(orgName(v.org_id))}</span><span class="muted small">${esc(v.date || '')}${v._pending ? ' · ⏳' : ''}</span></a>`).join('')
      : '<span class="muted small">No visits yet.</span>'}</div>
    <h2>Cupping flights</h2>
    <div class="card list">${Object.keys(flights).length ? Object.entries(flights).sort((a, b) => (b[1][0].date || '').localeCompare(a[1][0].date || '')).slice(0, 15).map(([k, cs]) =>
      `<a class="item" href="#/flight/${encodeURIComponent(k)}"><span>${esc(k)}</span><span class="muted small">${cs.length} sample${cs.length > 1 ? 's' : ''}${cs.some(c => c._pending) ? ' · ⏳' : ''}</span></a>`).join('')
      : '<span class="muted small">No cuppings yet.</span>'}</div>
    <h2>Backup</h2>
    <button class="btn block" id="dl">Download my field data (JSON)</button>
    <p class="small muted">Works offline. Keep a copy if your phone might be lost or reset. Full CRM: <a href="/#/sourcing">Sourcing</a>.</p>`;
  $('#dl').onclick = download;
  $('#clearerr') && ($('#clearerr').onclick = async () => {
    if (!confirm('Discard the refused changes? They stay on this phone until the next sync replaces them.')) return;
    await tx('outbox', 'readwrite', s => Promise.all(errs.map(e => done(s.delete(e.seq)))));
    route();
  });
  if (navigator.storage?.persisted) navigator.storage.persisted().then(p => {
    const el = $('#persist');
    if (el) el.innerHTML = p ? 'storage: kept ✓' : 'storage: may be cleared <span title="The phone can delete website data it thinks is unused. Installed to the home screen, Field asks to keep it; iPhone grants that automatically for installed apps.">ⓘ</span>';
    if (!p && !standalone) $('#persistwhy')?.removeAttribute('hidden');
  });
}

async function download() {
  const data = {exported: new Date().toISOString(), outbox: await outbox()};
  for (const k of KINDS) data[k] = await all(k);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  a.download = `field-data-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
}

// Farms & people on this phone: search, then tap to edit (seeded or added in the field).
async function pageDirectory(view, params) {
  const [orgs, people, visits, cups] = await Promise.all([all('orgs'), all('people'), all('visits'), all('cuppings')]);
  let tab = params.get('tab') === 'people' ? 'people' : 'orgs', q = params.get('q') || '';
  const counts = id => [visits, cups].map(xs => xs.filter(x => x.org_id === id).length);
  const fold = t => String(t || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const orgName = id => (orgs.find(o => o.id === id) || {}).name || '';
  view.innerHTML = `<h1>Farms & people</h1>
    <div class="grid2 tabs"><button class="btn sm" data-tab="orgs">Farms / orgs (${orgs.length})</button><button class="btn sm" data-tab="people">People (${people.length})</button></div>
    <input type="search" id="dq" placeholder="Search name, town, producer, role…" value="${esc(q)}" aria-label="Search">
    <div class="card list" id="dlist"></div>
    <div class="grid2"><a class="btn" href="#/org/new">+ Farm / org</a><a class="btn" href="#/person/new">+ Person</a></div>`;
  const draw = () => {
    $$('[data-tab]').forEach(b => b.classList.toggle('primary', b.dataset.tab === tab));
    const terms = fold(q).split(/\s+/).filter(Boolean);
    const hit = hay => terms.every(t => fold(hay).includes(t));
    const rows = tab === 'orgs'
      ? orgs.filter(o => hit([o.name, o.town, o.producer, o.region, o.type].join(' '))).sort(byName).map(o => {
        const [nv, nc] = counts(o.id);
        return `<a class="item" href="#/org/${o.id}"><span>${esc(o.name)}<br><span class="small muted">${esc([o.town, o.producer].filter(Boolean).join(' · '))}</span></span>
          <span class="small muted">${[nv && `${nv} visit${nv > 1 ? 's' : ''}`, nc && `${nc} cupped`].filter(Boolean).join(' · ')}${o.verified ? ' ✓' : ''}${o._pending ? ' ⏳' : ''}</span></a>`; })
      : people.filter(p => hit([p.name, p.title, p.location, orgName(p.org_id)].join(' '))).sort(byName).map(p =>
        `<a class="item" href="#/person/${p.id}"><span>${esc(p.name)}<br><span class="small muted">${esc([p.title, orgName(p.org_id)].filter(Boolean).join(' · '))}</span></span>
          <span class="small muted">${p._pending ? '⏳' : ''}</span></a>`);
    $('#dlist').innerHTML = rows.slice(0, 200).join('') + (rows.length > 200 ? `<p class="small muted">${rows.length - 200} more — refine the search.</p>` : '')
      || '<span class="muted small">No matches. Add it below — it syncs when you have signal.</span>';
    history.replaceState(null, '', `#/people-orgs?tab=${tab}${q ? '&q=' + encodeURIComponent(q) : ''}`);
  };
  $$('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });
  $('#dq').oninput = e => { q = e.target.value; draw(); };
  draw();
}

// Visits and cupped lots already logged for an org or person (shown under its edit form).
async function historyFor(key, id) {
  const [visits, cups] = await Promise.all([all('visits'), all('cuppings')]);
  const vs = visits.filter(v => v[key] === id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const cs = cups.filter(c => c[key] === id).sort((a, b) => (b.total ?? -1) - (a.total ?? -1));
  if (!vs.length && !cs.length) return '';
  return `<h2>Visits</h2><div class="card list">${vs.map(v => `<a class="item" href="#/visit/${v.id}"><span>${esc(v.date || '')}</span>
      <span class="small muted">${esc(lbl('harvest_status', v.harvest_status) || '')}</span></a>`).join('') || '<span class="muted small">None yet.</span>'}</div>
    <h2>Cupped lots</h2><div class="card list">${cs.map(c => `<a class="item" href="#/flight/${encodeURIComponent(c.session || c.date)}"><span>${esc(c.lot)}<br><span class="small muted">${esc(c.session || c.date || '')}</span></span>
      <b>${c.total == null ? '—' : Number(c.total).toFixed(2)}</b></a>`).join('') || '<span class="muted small">None yet.</span>'}</div>`;
}
const lbl = (name, v) => (metaOpts(name).find(([k]) => k === v) || [])[1] || '';
const nulls = d => { Object.keys(d).forEach(k => { if (d[k] === '') d[k] = null; }); return d; };

async function pageOrg(view, id = 'new') {
  const isNew = id === 'new', o = isNew ? {type: 'farm'} : await getDoc('orgs', id);
  if (!o) { view.innerHTML = '<p class="pad muted">Organization not found on this phone. <a href="#/people-orgs">Farms & people</a></p>'; return; }
  view.innerHTML = `<h1>${isNew ? 'Add farm / organization' : 'Edit ' + esc(o.name)}</h1>
    ${!isNew && o.source && o.source !== 'Field mode' ? `<p class="small muted">From ${o.source_url ? `<a href="${esc(o.source_url)}" target="_blank" rel="noopener">${esc(o.source)}</a>` : esc(o.source)}. Your edits are kept with the record.</p>` : ''}
    <form id="f" class="card">
    ${inp('name', 'Name *', o.name, 'text', 'required')}
    <label>Type</label><select name="type">${opt(ORG_TYPES, o.type, null)}</select>
    <label>Region</label><select name="region">${opt(REGIONS(), o.region)}</select>
    ${inp('town', 'Town / location', o.town)}${inp('producer', 'Producer name', o.producer)}
    ${inp('phone', 'Phone', o.phone, 'tel')}${inp('email', 'Email', o.email, 'email')}${inp('website', 'Website', o.website, 'url')}
    ${inp('altitude_m', 'Altitude (m)', o.altitude_m)}${inp('varieties', 'Varieties', o.varieties)}${inp('processing', 'Processing', o.processing)}
    ${inp('exporter_of_record', 'Exporter of record', o.exporter_of_record)}${inp('dry_mill', 'Dry mill', o.dry_mill)}${inp('icafe_reg_no', 'ICAFE registration no.', o.icafe_reg_no)}
    ${inp('price_per_fanega', 'Liquidación (₡/fanega)', o.price_per_fanega, 'number')}
    <div class="check"><input type="checkbox" name="eudr_geo" id="eudr" ${o.eudr_geo ? 'checked' : ''}><label for="eudr" style="margin:2px 0">EUDR geolocation on file</label></div>
    ${isNew ? '' : `<div class="check"><input type="checkbox" name="verified" id="ver" ${o.verified ? 'checked' : ''}><label for="ver" style="margin:2px 0">Verified in person</label></div>`}
    <label>Notes</label><textarea name="notes">${esc(o.notes || '')}</textarea>
    <div class="row" style="margin-top:14px"><button class="btn primary block">Save</button></div></form>
    ${isNew ? '' : `<div class="grid2"><a class="btn" href="#/visit/new?org=${o.id}">📍 New visit</a><a class="btn" href="#/cup/new?org=${o.id}">☕ Cup a sample</a></div>
      ${await historyFor('org_id', o.id)}`}`;
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const d = nulls(formData($('#f')));
    if (d.icafe_reg_no) d.icafe_registered = 'yes';
    if (d.region && d.region !== 'other' && !o.country) d.country = 'Costa Rica';
    if (isNew) Object.assign(d, {verified: true, source: 'Field mode'});
    const saved = await save('orgs', d, isNew ? null : id);
    toast('Saved'); location.hash = isNew ? '#/' : '#/org/' + saved.id;
  };
}

async function pagePerson(view, id = 'new') {
  const isNew = id === 'new', p = isNew ? {} : await getDoc('people', id);
  if (!p) { view.innerHTML = '<p class="pad muted">Person not found on this phone. <a href="#/people-orgs?tab=people">Farms & people</a></p>'; return; }
  view.innerHTML = `<h1>${isNew ? 'Add person' : 'Edit ' + esc(p.name)}</h1><form id="f" class="card"><div id="pick"></div>
    ${inp('name', 'Name *', p.name, 'text', 'required')}${inp('title', 'Role (owner, mill manager…)', p.title)}${inp('phone', 'Phone', p.phone, 'tel')}
    ${inp('whatsapp', 'WhatsApp', p.whatsapp, 'tel')}${inp('email', 'Email', p.email, 'email')}${inp('location', 'Location', p.location)}${inp('languages', 'Languages', p.languages)}
    <label>Notes</label><textarea name="notes">${esc(p.notes || '')}</textarea>
    <div class="row" style="margin-top:14px"><button class="btn primary block">Save</button></div></form>
    ${isNew ? '' : `${p.whatsapp ? `<a class="btn block" href="https://wa.me/${esc(String(p.whatsapp).replace(/\D/g, ''))}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
      ${await historyFor('person_id', p.id)}`}`;
  await orgPicker($('#pick'), {orgId: p.org_id});
  $('[name=person_id]').closest('.pick').previousElementSibling.remove();
  $('[name=person_id]').closest('.pick').remove();
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const d = nulls(formData($('#f')));
    if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) { toast('Check the email address'); return; }
    const saved = await save('people', d, isNew ? null : id);
    toast('Saved'); location.hash = isNew ? '#/' : '#/person/' + saved.id;
  };
}

async function pageVisit(view, id, params = new URLSearchParams()) {
  const v = id === 'new' ? {date: today(), price_unit: 'usd_lb', checklist: {}, org_id: params.get('org')} : await getDoc('visits', id);
  if (!v) { view.innerHTML = '<p class="pad muted">Visit not found on this phone.</p>'; return; }
  const ck = v.checklist || {};
  view.innerHTML = `<h1>${id === 'new' ? 'New visit' : 'Visit'}</h1><form id="f">
    <div class="card"><div id="pick"></div>${inp('date', 'Date', v.date, 'date', 'required')}</div>
    <div class="card"><div class="row"><b>Location</b><span class="spacer"></span><button type="button" class="btn sm" id="gps">📍 Use GPS</button></div>
      <div class="grid2">${inp('lat', 'Latitude', v.lat, 'number')}${inp('lon', 'Longitude', v.lon, 'number')}</div>
      <div class="grid2">${inp('altitude_m', 'Altitude (m)', v.altitude_m, 'number')}${inp('gps_accuracy_m', 'GPS accuracy (m)', v.gps_accuracy_m, 'number')}</div>
      <p class="small muted" id="gpsmsg"></p></div>
    <div class="card">${inp('varieties', 'Varieties seen', v.varieties)}
      <label>Process</label><select name="process">${opt(PROCESSES, v.process)}</select>
      <label>Harvest status</label><select name="harvest_status">${opt(metaOpts('harvest_status'), v.harvest_status)}</select>
      <div class="grid2">${inp('price_discussed', 'Price discussed', v.price_discussed, 'number')}
        <div><label>Unit</label><select name="price_unit">${opt(metaOpts('price_units'), v.price_unit, null)}</select></div></div></div>
    <div class="card" data-skip><b>Questions to ask</b>${CHECKLIST.map(([k, q]) => `<div class="check"><input type="checkbox" data-ck="${k}" ${ck[k]?.done ? 'checked' : ''} aria-label="asked">
      <div><div class="small">${esc(q)}</div><input type="text" data-ckn="${k}" value="${esc(ck[k]?.note || '')}" placeholder="Answer"></div></div>`).join('')}</div>
    <div class="card"><label>Notes</label><textarea name="notes" rows="5">${esc(v.notes || '')}</textarea></div>
    <button class="btn primary block">Save visit</button>
    ${id !== 'new' ? `<div class="row" style="margin-top:10px"><a class="btn block" href="#/cup/new?visit=${v.id}">☕ Cup samples from this visit</a></div>
      <div class="row" style="margin-top:10px"><button type="button" class="btn danger sm" id="del">Delete visit</button></div>` : ''}
  </form>`;
  await orgPicker($('#pick'), {orgId: v.org_id, personId: v.person_id});
  $('#gps').onclick = () => {
    const msg = $('#gpsmsg');
    if (!navigator.geolocation) { msg.textContent = 'GPS not available on this device.'; return; }
    msg.textContent = 'Getting location… (works without signal, may take a minute outdoors)';
    navigator.geolocation.getCurrentPosition(p => {
      const c = p.coords, set = (n, x) => { if (x != null) $(`[name=${n}]`).value = Math.round(x * 1e6) / 1e6; };
      set('lat', c.latitude); set('lon', c.longitude); set('gps_accuracy_m', Math.round(c.accuracy));
      if (c.altitude != null) $('[name=altitude_m]').value = Math.round(c.altitude);
      msg.textContent = `Got it (±${Math.round(c.accuracy)} m).`;
    }, err => { msg.textContent = 'Could not get location: ' + err.message; }, {enableHighAccuracy: true, timeout: 60000, maximumAge: 60000});
  };
  $('#del') && ($('#del').onclick = async () => { if (confirm('Delete this visit?')) { await removeDoc('visits', v.id); location.hash = '#/'; } });
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const d = formData($('#f'));
    Object.keys(d).forEach(k => { if (d[k] === '') d[k] = null; });
    if (!d.org_id) { toast('Choose or add the farm / organization'); return; }
    d.checklist = Object.fromEntries(CHECKLIST.map(([k]) => [k, {done: $(`[data-ck=${k}]`).checked, note: $(`[data-ckn=${k}]`).value.trim()}]));
    const saved = await save('visits', d, id === 'new' ? null : id);
    toast('Visit saved'); location.hash = '#/visit/' + saved.id;
  };
}

// ------------------------------------------------------------------ cupping
function scoreOf(formId, s, total) {
  const F = META?.cupping_forms?.[formId];
  if (!F) return null;
  if (formId === 'quick') return total === '' || total == null || isNaN(total) ? null : Math.round(Number(total) * 100) / 100;
  const a = F.attrs.reduce((t, x) => t + Number(s[x.key] ?? F.default), 0);
  if (formId === 'cva') return Math.round((0.65625 * a + 52.75 - 2 * (s.nonuniform || 0) - 4 * (s.defective || 0)) * 100) / 100;
  const cups = F.cup_attrs.reduce((t, x) => t + 2 * Number(s[x.key] ?? F.cups), 0);
  return Math.round((a + cups - 2 * (s.taint_cups || 0) - 4 * (s.fault_cups || 0)) * 100) / 100;
}

function sampleCard(c, n, formId, samples) {
  const F = META.cupping_forms[formId], s = c.scores || {};
  const sv = (k, d) => s[k] ?? d;
  const chosen = new Set((c.descriptors || '').split(',').map(x => x.trim()).filter(Boolean));
  const scoreUI = formId === 'quick'
    ? `${inp('total', 'Score (0–100)', c.total, 'number', 'min="0" max="100"')}`
    : F.attrs.map(x => `<div class="attr"><div><p class="name">${esc(x.label)}</p><input type="range" data-score="${x.key}" min="${F.min}" max="${F.max}" step="${F.step}" value="${sv(x.key, F.default)}"></div><b data-out="${x.key}">${sv(x.key, F.default)}</b></div>`).join('')
      + F.cup_attrs.map(x => stepper(x.key, x.label, sv(x.key, F.cups))).join('')
      + F.counts.map(x => stepper(x.key, x.label, sv(x.key, 0))).join('');
  return `<div class="card sample" data-id="${c.id}">
    <div class="sample-head"><h3>Sample ${n}</h3><span class="total" data-total>—</span><button type="button" class="btn sm danger" data-rm aria-label="Remove sample">✕</button></div>
    ${inp('lot', 'Sample / lot name *', c.lot)}
    <div data-pick></div>
    <label>CRM sample (optional)</label><select name="sample_id">${opt(samples.map(x => [x.id, x.lot + (x.org_name ? ' · ' + x.org_name : '')]), c.sample_id)}</select>
    <details ${c.variety || c.moisture_pct ? 'open' : ''}><summary>Bean details</summary>
      ${inp('variety', 'Variety', c.variety)}<label>Process</label><select name="process">${opt(PROCESSES, c.process)}</select>
      <div class="grid2">${inp('altitude_m', 'Altitude (m)', c.altitude_m, 'number')}${inp('harvest', 'Harvest', c.harvest)}</div>
      <div class="grid2">${inp('moisture_pct', 'Moisture (%)', c.moisture_pct, 'number')}${inp('water_activity', 'Water activity (aw)', c.water_activity, 'number')}</div>
      <div class="grid2">${inp('density_g_l', 'Density (g/L)', c.density_g_l, 'number')}${inp('screen_size', 'Screen size', c.screen_size)}</div>
      ${inp('roast_level', 'Roast level', c.roast_level)}
    </details>
    <h2>Scores</h2><div data-scores>${scoreUI}</div>
    <h2>Descriptors</h2><div class="chips">${DESCRIPTORS.map(d => `<button type="button" class="chip ${chosen.has(d) ? 'on' : ''}" data-chip="${esc(d)}">${esc(d)}</button>`).join('')}</div>
    ${inp('extra_desc', 'Other descriptors', [...chosen].filter(d => !DESCRIPTORS.includes(d)).join(', '))}
    <label>Notes</label><textarea name="notes">${esc(c.notes || '')}</textarea>
  </div>`;
}
const stepper = (k, label, v) => `<div class="stepper"><span>${esc(label)}</span><button type="button" data-step="${k}" data-d="-1" aria-label="minus">−</button><output data-count="${k}">${v}</output><button type="button" data-step="${k}" data-d="1" aria-label="plus">+</button></div>`;

function readCard(el, formId) {
  const F = META.cupping_forms[formId];
  const val = n => $(`[name=${n}]`, el)?.value ?? '';
  const num = n => val(n) === '' ? null : Number(val(n));
  const scores = {};
  $$('[data-score]', el).forEach(r => { scores[r.dataset.score] = Number(r.value); });
  $$('[data-count]', el).forEach(o => { scores[o.dataset.count] = Number(o.value || o.textContent); });
  const chips = $$('.chip.on', el).map(b => b.dataset.chip);
  const extra = val('extra_desc').split(',').map(x => x.trim()).filter(Boolean);
  return {
    lot: val('lot').trim(), org_id: val('org_id') || null, person_id: val('person_id') || null, sample_id: val('sample_id') || null,
    variety: val('variety') || null, process: val('process') || null, altitude_m: num('altitude_m'), harvest: val('harvest') || null,
    moisture_pct: num('moisture_pct'), water_activity: num('water_activity'), density_g_l: num('density_g_l'),
    screen_size: val('screen_size') || null, roast_level: val('roast_level') || null,
    scores: formId === 'quick' ? null : scores, total: formId === 'quick' ? num('total') : scoreOf(formId, scores),
    descriptors: [...chips, ...extra].join(', ') || null, notes: val('notes') || null, form: formId, _F: F,
  };
}

async function pageCup(view, key, params) {
  const existing = key === 'new' ? [] : (await all('cuppings')).filter(c => (c.session || c.date) === key);
  const visit = params.get('visit') ? await getDoc('visits', params.get('visit')) : null;
  const samples = await all('samples');
  let formId = existing[0]?.form || (await kvGet('lastForm')) || 'cva';
  let cards = existing.length ? existing : [{id: uid(), org_id: visit?.org_id || params.get('org'), person_id: visit?.person_id}];
  const session = existing[0]?.session || key !== 'new' && key || `Flight ${nowLabel()}`;
  const date = existing[0]?.date || visit?.date || today();
  const visitId = existing[0]?.visit_id || visit?.id || null;
  const forms = Object.entries(META?.cupping_forms || {}).map(([k, f]) => [k, f.label]);
  view.innerHTML = `<h1>${key === 'new' ? 'New cupping' : 'Cupping'}</h1>
    <div class="card">${inp('session', 'Flight / session name', session)}${inp('date', 'Date', date, 'date')}
      <label>Cupping form</label><select id="form">${opt(forms, formId, null)}</select>
      <p class="small muted">CVA = current SCA affective scale (1–9). Classic = 2004 SCA form (6–10). Quick = just the overall score.</p></div>
    <div id="cards"></div>
    <button type="button" class="btn block" id="add">+ Add sample</button>
    <p class="err" id="err"></p>
    <button type="button" class="btn primary block" id="save">Save flight</button>`;
  const host = $('#cards');
  const draw = async () => {
    host.innerHTML = cards.map((c, i) => sampleCard(c, i + 1, formId, samples)).join('');
    for (const el of $$('.sample', host)) {
      const c = cards.find(x => x.id === el.dataset.id);
      await orgPicker($('[data-pick]', el), {orgId: c.org_id, personId: c.person_id});
      wire(el);
    }
  };
  const wire = el => {
    const upd = () => { const t = readCard(el, formId).total; $('[data-total]', el).textContent = t == null ? '—' : t.toFixed(2); };
    $$('[data-score]', el).forEach(r => r.oninput = () => { $(`[data-out="${r.dataset.score}"]`, el).textContent = r.value; upd(); });
    $$('[data-step]', el).forEach(b => b.onclick = () => {
      const o = $(`[data-count="${b.dataset.step}"]`, el);
      o.value = o.textContent = String(Math.min(5, Math.max(0, Number(o.textContent) + Number(b.dataset.d)))); upd();
    });
    $('[name=total]', el) && ($('[name=total]', el).oninput = upd);
    $$('[data-chip]', el).forEach(b => b.onclick = () => b.classList.toggle('on'));
    $('[data-rm]', el).onclick = () => {
      if (cards.length === 1) { toast('A flight needs at least one sample'); return; }
      if (!confirm('Remove this sample?')) return;
      keep(); cards = cards.filter(c => c.id !== el.dataset.id); draw();
    };
    upd();
  };
  // Keep what's typed when re-drawing (adding a sample or switching forms).
  const keep = () => { cards = cards.map(c => { const el = $(`.sample[data-id="${c.id}"]`, host); if (!el) return c; const r = readCard(el, formId); delete r._F; return {...c, ...r, scores: r.scores || c.scores}; }); };
  $('#form').onchange = () => { keep(); formId = $('#form').value; cards = cards.map(c => ({...c, scores: c.form === formId ? c.scores : null})); kvSet('lastForm', formId); draw(); };
  $('#add').onclick = () => { keep(); const last = cards[cards.length - 1] || {}; cards.push({id: uid(), org_id: last.org_id, person_id: last.person_id}); draw().then(() => $$('.sample', host).pop().scrollIntoView({behavior: 'smooth'})); };
  $('#save').onclick = async () => {
    keep();
    const sess = $('[name=session]').value.trim() || `Flight ${nowLabel()}`, d = $('[name=date]').value || today();
    const bad = cards.findIndex(c => !c.lot);
    if (bad >= 0) { $('#err').textContent = `Sample ${bad + 1}: give it a name (lot, farm or code).`; return; }
    for (const c of cards) {
      const {id, _pending, created, updated, org_name, person_name, ...rest} = c; // eslint-disable-line no-unused-vars
      await save('cuppings', {...rest, form: formId, session: sess, date: d, visit_id: visitId}, id);
    }
    for (const old of existing) if (!cards.some(c => c.id === old.id)) await removeDoc('cuppings', old.id);
    toast(`Saved ${cards.length} sample${cards.length > 1 ? 's' : ''}`);
    location.hash = '#/flight/' + encodeURIComponent(sess);
  };
  await draw();
}

// Flight comparison: samples ranked by score, then every attribute side by side with the
// best value in each row marked (in text, not colour alone), then the bean data.
async function pageFlight(view, key) {
  const [cupsAll, orgs] = await Promise.all([all('cuppings'), all('orgs')]);
  const cups = cupsAll.filter(c => (c.session || c.date) === key);
  if (!cups.length) { view.innerHTML = '<p class="pad muted">Flight not found on this phone. <a href="#/">Home</a></p>'; return; }
  const orgName = id => (orgs.find(o => o.id === id) || {}).name || '';
  const ranked = cups.slice().sort((a, b) => (b.total ?? -1) - (a.total ?? -1) || String(a.lot).localeCompare(String(b.lot)));
  const scored = ranked.filter(c => c.total != null);
  const top = scored[0]?.total, low = scored[scored.length - 1]?.total;
  const forms = [...new Set(ranked.map(c => c.form || 'cva'))];
  const F = id => META.cupping_forms[id] || {attrs: [], cup_attrs: [], counts: []};
  const rows = [];
  for (const fid of forms) {
    const f = F(fid);
    for (const a of [...f.attrs, ...f.cup_attrs]) rows.push({label: a.label, form: fid, get: c => c.form === fid ? c.scores?.[a.key] : null, best: 'max'});
    for (const a of f.counts) rows.push({label: a.label, form: fid, get: c => c.form === fid ? c.scores?.[a.key] : null, best: 'min'});
  }
  const bean = [['Process', c => (PROCESSES.find(([k]) => k === c.process) || [])[1] || c.process], ['Variety', c => c.variety], ['Altitude (m)', c => c.altitude_m],
    ['Moisture (%)', c => c.moisture_pct], ['aw', c => c.water_activity], ['Density (g/L)', c => c.density_g_l], ['Screen', c => c.screen_size], ['Roast', c => c.roast_level]]
    .filter(([, g]) => ranked.some(c => g(c) != null && g(c) !== ''));
  const head = `<tr><th></th>${ranked.map((c, i) => `<th title="${esc(c.lot)}">#${i + 1}<br><span class="small">${esc(String(c.lot).slice(0, 14))}</span></th>`).join('')}</tr>`;
  const scoreRow = r => {
    const vals = ranked.map(r.get), nums = vals.filter(v => v != null && v !== '').map(Number);
    const best = nums.length > 1 && new Set(nums).size > 1 ? (r.best === 'min' ? Math.min(...nums) : Math.max(...nums)) : null;
    return `<tr><th>${esc(r.label)}${forms.length > 1 ? ` <span class="small muted">${esc(r.form)}</span>` : ''}</th>${vals.map(v => v == null || v === '' ? '<td class="muted">–</td>'
      : `<td${Number(v) === best ? ' class="best" title="best in flight"' : ''}>${esc(v)}${Number(v) === best ? '<span class="sr"> (best)</span>' : ''}</td>`).join('')}</tr>`;
  };
  view.innerHTML = `<h1>${esc(key)}</h1>
    <p class="small muted">${esc(ranked[0].date || '')} · ${ranked.length} sample${ranked.length > 1 ? 's' : ''} · ${forms.map(f => esc(F(f).label || f)).join(', ')}
      ${scored.length > 1 ? ` · spread ${(top - low).toFixed(2)} pts` : ''}</p>
    <div class="row"><a class="btn sm" href="#/cup/${encodeURIComponent(key)}">✎ Edit flight</a><a class="btn sm" href="#/">Home</a></div>
    <h2>Ranking</h2>
    <div class="card">${ranked.map((c, i) => `<div class="rank">
      <span class="rk">${c.total == null ? '–' : i + 1}</span>
      <div class="rbody"><div class="row"><b>${esc(c.lot)}</b><span class="spacer"></span><b class="rscore">${c.total == null ? 'not scored' : Number(c.total).toFixed(2)}</b></div>
        ${c.total != null ? `<div class="sbar" aria-hidden="true"><i style="width:${Math.max(4, Math.min(100, (c.total - 60) / 40 * 100))}%"></i></div>` : ''}
        <div class="small muted">${esc([orgName(c.org_id), c.descriptors].filter(Boolean).join(' · '))}</div></div></div>`).join('')}
      <p class="small muted">Bars run from 60 to 100 points.</p></div>
    ${rows.length ? `<h2>Attributes</h2><div class="cmp"><table>${head}${rows.map(scoreRow).join('')}
      <tr class="tot"><th>Score</th>${ranked.map(c => `<td>${c.total == null ? '–' : Number(c.total).toFixed(2)}</td>`).join('')}</tr></table></div>
      <p class="small muted">▲ marks the best value in each row (highest score, fewest defective cups).</p>` : ''}
    ${bean.length ? `<h2>Bean</h2><div class="cmp"><table>${head}${bean.map(([l, g]) => `<tr><th>${esc(l)}</th>${ranked.map(c => `<td>${esc(g(c) ?? '–')}</td>`).join('')}</tr>`).join('')}</table></div>` : ''}`;
}

// ------------------------------------------------------------------ router
async function route() {
  const view = $('#view');
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  META ||= await kvGet('meta');
  try {
    if (!parts.length) await pageHome(view);
    else if (!META) view.innerHTML = '<p class="pad">Open Field once with signal so it can download your organizations and the cupping forms. After that it works offline. <a href="#/">Home</a></p>';
    else if (parts[0] === 'visit') await pageVisit(view, parts[1] || 'new', params);
    else if (parts[0] === 'flight') await pageFlight(view, parts.slice(1).join('/'));
    else if (parts[0] === 'people-orgs') await pageDirectory(view, params);
    else if (parts[0] === 'cup') await pageCup(view, parts.slice(1).join('/') || 'new', params);
    else if (parts[0] === 'org') await pageOrg(view, parts[1] || 'new');
    else if (parts[0] === 'person') await pagePerson(view, parts[1] || 'new');
    else view.innerHTML = '<p class="pad muted">Not found. <a href="#/">Home</a></p>';
  } catch (e) {
    view.innerHTML = `<p class="pad err">Something went wrong: ${esc(e.message)}</p>`;
    console.error(e);
  }
  window.scrollTo(0, 0);
}

async function start() {
  const atHome = () => (location.hash || '#/') === '#/';
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/field/sw.js', {scope: '/field/'}).catch(e => console.warn('SW', e));
    // First visit: the worker takes control after install; refresh the "Available offline" line.
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (atHome()) route(); });
  }
  // Ask the phone to keep our storage (granted automatically for installed apps on iOS 17+).
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  $('#syncbtn').onclick = () => sync().then(() => { toast(online() ? 'Synced' : 'Offline — will sync when you have signal'); if (!location.hash || location.hash === '#/') route(); });
  addEventListener('online', () => sync().then(badge));
  addEventListener('offline', badge);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
  addEventListener('hashchange', route);
  badge();
  META = await kvGet('meta');
  if (!META) await sync(); // first run: need the forms + lists
  else sync().then(() => { if (atHome()) route(); });
  route();
}
start();
})();
