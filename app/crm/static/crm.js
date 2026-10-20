/* Sourcing CRM — Pipedrive-style organizations, people, deals, activities, notes and samples.
   Runs inside the platform (window.CRM.page is called by app.js for #/sourcing…) or on its own
   (standalone.html sets <body data-standalone>, and this file installs its own router).
   Forms are built from the schema served at /api/crm/meta — add fields in app/crm/schema.py. */
(() => {
'use strict';

// ------------------------------------------------------------------ helpers
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n, d = 2) => n == null || isNaN(n) ? '—' : Number(n).toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
const money = n => n == null ? '—' : '$' + (Math.abs(n) >= 1e6 ? fmt(n / 1e6, 2) + 'M' : Math.abs(n) >= 1e4 ? fmt(n / 1e3, 1) + 'k' : fmt(n, 0));
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const plusDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const nice = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {month: 'short', day: 'numeric', ...(y !== new Date().getFullYear() ? {year: 'numeric'} : {})}); };
const when = ts => ts ? new Date(ts * 1000).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : '';
const ROOT = '#/sourcing';

async function api(path, opts = {}) {
  const r = await fetch('/api/crm' + path, {headers: {'content-type': 'application/json'}, ...opts,
    body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body});
  if (!r.ok) { let m = r.status + ''; try { const j = await r.json(); m = j.detail || m; } catch {} throw new Error(m); }
  return r.json();
}
let M = null;
const opts = name => M[name] || [];
const lbl = (name, v) => (opts(name).find(o => o.value === v) || {}).label || v || '';
const ACT_ICON = {call: '☎', whatsapp: '💬', email: '✉', visit: '📍', meeting: '👥', task: '✓', deadline: '⚑'};
const dueCls = d => !d ? 'faint' : d < today() ? 'down' : d === today() ? 'acc' : 'muted';
const dueTxt = d => !d ? 'no date' : d === today() ? 'Today' : d === plusDays(1) ? 'Tomorrow' : nice(d);
const nextAct = a => a ? `<span class="${dueCls(a.due)}">${ACT_ICON[a.type] || '•'} ${esc(a.subject)} · ${dueTxt(a.due)}</span>`
  : '<span class="faint">⚠ No next activity</span>';
const typeChip = t => t ? `<span class="chip">${esc(lbl('org_types', t))}</span>` : '';
const regionChip = r => r ? `<span class="chip cr">${esc(lbl('regions', r))}</span>` : '';
const verifiedBadge = o => o.verified ? '<span class="badge on">✓ verified</span>' : '<span class="badge soon" title="From a public source; not yet confirmed in person">unverified</span>';
const link = (kind, id, text) => id ? `<a href="${ROOT}/${kind}/${id}">${esc(text || '—')}</a>` : '<span class="faint">—</span>';
const field = (kind, key) => M.kinds[kind].find(f => f.key === key);

// ------------------------------------------------------------------ form modal (schema-driven)
const refCache = {};
async function refOptions(target) { return (refCache[target] = await api('/' + target)); }

async function openForm(kind, doc = {}, {title, preset = {}, onSaved} = {}) {
  const isNew = !doc.id, data = {...preset, ...doc};
  const fs = M.kinds[kind].filter(f => !f.hidden);
  const refs = {};
  for (const f of fs.filter(f => f.type === 'ref')) refs[f.target] = await refOptions(f.target);
  const nameOf = (t, r) => r.name || r.title || r.lot || r.subject;
  const input = f => {
    const v = data[f.key] ?? (isNew ? f.default : null) ?? '';
    const id = `f_${f.key}`, req = f.required ? 'required' : '';
    if (f.type === 'textarea') return `<textarea id="${id}" name="${f.key}" rows="3" ${req}>${esc(v)}</textarea>`;
    if (f.type === 'bool') return `<label class="crm-check"><input type="checkbox" id="${id}" name="${f.key}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
    if (f.type === 'select') return `<select id="${id}" name="${f.key}" ${req}>${f.default ? '' : '<option value="">—</option>'}${f.options.map(o => `<option value="${esc(o.value)}" ${o.value === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    if (f.type === 'ref') return `<select id="${id}" name="${f.key}" ${req}><option value="">—</option>${refs[f.target].map(r => `<option value="${r.id}" ${r.id === v ? 'selected' : ''}>${esc(nameOf(f.target, r))}${r.org_name && f.target !== 'orgs' ? ' · ' + esc(r.org_name) : ''}</option>`).join('')}</select>`;
    const t = {number: 'number', date: 'date', email: 'email', url: 'url', phone: 'tel'}[f.type] || 'text';
    return `<input id="${id}" name="${f.key}" type="${t}" ${t === 'number' ? 'step="any"' : ''} value="${esc(v)}" ${req}>`;
  };
  const groups = [...new Set(fs.map(f => f.group || ''))];
  const dlg = document.createElement('dialog');
  dlg.className = 'crm-dlg';
  dlg.innerHTML = `<form method="dialog">
    <div class="crm-dlg-head"><h3>${esc(title || (isNew ? 'Add ' : 'Edit ') + kindName(kind))}</h3><button type="button" class="crm-x" data-close aria-label="Close">✕</button></div>
    <div class="crm-dlg-body">${groups.map(g => `${g ? `<div class="k crm-group">${esc(g)}</div>` : ''}<div class="crm-fields">${fs.filter(f => (f.group || '') === g).map(f =>
      `<div class="crm-f ${f.type === 'textarea' ? 'wide' : ''}">${f.type === 'bool' ? '' : `<label for="f_${f.key}">${esc(f.label)}${f.required ? ' <span class="acc">*</span>' : ''}</label>`}${input(f)}</div>`).join('')}</div>`).join('')}</div>
    <div class="crm-dlg-foot"><span class="err" id="ferr"></span><span class="spacer"></span><button type="button" class="btn" data-close>Cancel</button><button class="btn primary" type="submit">Save</button></div>
  </form>`;
  document.body.appendChild(dlg);
  const close = () => { dlg.close(); dlg.remove(); };
  $$('[data-close]', dlg).forEach(b => b.onclick = close);
  dlg.addEventListener('cancel', close);
  $('form', dlg).onsubmit = async e => {
    e.preventDefault();
    const out = {};
    fs.forEach(f => { const el = $(`[name="${f.key}"]`, dlg); out[f.key] = f.type === 'bool' ? el.checked : el.value; });
    try {
      const saved = isNew ? await api('/' + kind, {method: 'POST', body: out}) : await api(`/${kind}/${doc.id}`, {method: 'PATCH', body: out});
      close(); onSaved ? onSaved(saved) : rerender();
    } catch (err) { $('#ferr', dlg).textContent = err.message; }
  };
  dlg.showModal();
  $('input,select,textarea', dlg)?.focus();
}
const kindName = k => ({orgs: 'organization', people: 'person', deals: 'deal', activities: 'activity', notes: 'note', samples: 'sample'}[k]);

async function patch(kind, id, body) { await api(`/${kind}/${id}`, {method: 'PATCH', body}); }
async function remove(kind, id, msg) { if (!confirm(msg || `Delete this ${kindName(kind)}?`)) return false; await api(`/${kind}/${id}`, {method: 'DELETE'}); return true; }

// ------------------------------------------------------------------ shell
const TABS = [['', 'Pipeline'], ['orgs', 'Organizations'], ['people', 'People'], ['activities', 'Activities'], ['samples', 'Samples'], ['data', 'Import / export']];
let current = null;
function rerender() { if (current) page(current.view, current.path, current.params); }

function shell(sub) {
  const c = M.counts;
  const n = {orgs: c.orgs, people: c.people, activities: null, samples: c.samples, '': c.deals};
  return `<div class="crm-top">
      <div><h1 class="page">Sourcing</h1>
      <p class="lede">Every producer, mill, co-op and exporter you deal with, in one neutral view: contacts, visits, samples and the lots you're buying.</p></div>
      <div class="crm-add">
        <button class="btn primary" data-new="deals">+ Deal</button>
        <button class="btn" data-new="orgs">+ Organization</button>
        <button class="btn" data-new="people">+ Person</button>
        <button class="btn" data-new="activities">+ Activity</button>
      </div>
    </div>
    <div class="crm-tabs">${TABS.map(([k, t]) => `<a href="${ROOT}${k ? '/' + k : ''}" class="${sub === k ? 'on' : ''}">${t}${n[k] != null ? ` <span class="faint mono">${n[k]}</span>` : ''}</a>`).join('')}</div>
    <div id="crmbody"></div>`;
}

async function page(view, path, params) {
  current = {view, path, params};
  M = await api('/meta');
  const parts = path.replace(/^\/sourcing\/?/, '').split('/');
  const sub = parts[0] || '', id = parts[1];
  const tab = {org: 'orgs', person: 'people', deal: ''}[sub] ?? sub;
  view.innerHTML = shell(tab);
  $$('[data-new]', view).forEach(b => b.onclick = () => openForm(b.dataset.new, {}, {
    preset: b.dataset.new === 'activities' ? {due: today()} : {},
    onSaved: s => {
      const to = b.dataset.new === 'activities' ? location.hash : `${ROOT}/${{orgs: 'org', people: 'person', deals: 'deal'}[b.dataset.new]}/${s.id}`;
      if (to === location.hash) rerender(); else location.hash = to;
    }}));
  const body = $('#crmbody');
  const routes = {'': pagePipeline, orgs: pageOrgs, people: pagePeople, activities: pageActivities, samples: pageSamples, data: pageData,
    org: () => pageOrg(body, id), person: () => pagePerson(body, id), deal: () => pageDeal(body, id)};
  await (routes[sub] || (() => { body.innerHTML = '<div class="loading">Not found</div>'; }))(body, params);
}

// ------------------------------------------------------------------ due soon strip
async function dueStrip() {
  const d = await api('/due?days=7');
  const items = [...d.overdue, ...d.upcoming];
  if (!items.length) return `<div class="panel tight crm-due"><span class="k">Due soon</span> <span class="faint small">Nothing overdue or due in the next 7 days.</span></div>`;
  return `<div class="panel tight crm-due"><div class="row"><span class="k">Due soon</span>
      ${d.overdue.length ? `<span class="sig bearish">${d.overdue.length} overdue</span>` : ''}<span class="faint small">${d.upcoming.length} in the next 7 days</span></div>
    <div class="crm-duelist">${items.map(a => `<div class="crm-dueitem ${a.overdue ? 'over' : ''}">
      <input type="checkbox" data-done="${a.id}" title="Mark done">
      <span>${ACT_ICON[a.type] || '•'}</span>
      <span class="crm-subj">${esc(a.subject)}</span>
      ${a.org_id ? `<a class="faint small" href="${ROOT}/org/${a.org_id}">${esc(a.org_name)}</a>` : ''}
      <span class="mono small ${dueCls(a.due)}">${dueTxt(a.due)}</span></div>`).join('')}</div></div>`;
}
function wireDone(root) {
  $$('[data-done]', root).forEach(cb => cb.onchange = async () => { await patch('activities', cb.dataset.done, {done: cb.checked}); rerender(); });
}

// ================================================================== PIPELINE
const pipe = {status: 'open', q: ''};
async function pagePipeline(body) {
  body.innerHTML = `<div id="due"></div>
    <div class="filters" style="margin-top:12px">
      <input type="search" id="dq" placeholder="Search deals, lots, varieties…" value="${esc(pipe.q)}">
      <div class="seg" id="dstatus">${['open', 'won', 'lost'].map(s => `<button data-s="${s}" class="${pipe.status === s ? 'on' : ''}">${s}</button>`).join('')}</div>
    </div>
    <div id="board"><div class="loading">Loading pipeline…</div></div>`;
  $('#due').innerHTML = await dueStrip(); wireDone($('#due'));
  const draw = async () => {
    const deals = await api(`/deals?status=${pipe.status}${pipe.q ? '&q=' + encodeURIComponent(pipe.q) : ''}`);
    if (!deals.length && !pipe.q && pipe.status === 'open') {
      $('#board').innerHTML = `<div class="panel crm-empty"><h3>No deals yet</h3>
        <p class="muted small">A deal is one lot you're buying. It moves from <b>Prospect</b> through samples and cupping to <b>Contracted</b>, <b>Shipped</b> and <b>Arrived</b>. Start from an organization — ${M.counts.orgs} are already in your list.</p>
        <div class="row"><button class="btn primary" data-new2="deals">+ Add your first deal</button><a class="btn" href="${ROOT}/orgs">Browse organizations</a></div></div>`;
      $('[data-new2]').onclick = () => openForm('deals', {}, {onSaved: () => rerender()});
      return;
    }
    $('#board').innerHTML = `<div class="crm-board">${opts('stages').map(s => {
      const ds = deals.filter(d => d.stage === s.value), tot = ds.reduce((a, d) => a + (d.value_usd || 0), 0);
      return `<div class="crm-col" data-stage="${s.value}">
        <div class="crm-colhead"><b>${esc(s.label)}</b><span class="mono faint tiny">${money(tot)} · ${ds.length}</span></div>
        <div class="crm-cards">${ds.map(d => `<a class="crm-card" draggable="true" data-id="${d.id}" href="${ROOT}/deal/${d.id}">
          <div class="crm-ct">${esc(d.title)}</div>
          <div class="faint small">${esc(d.org_name || '')}</div>
          <div class="mono small">${d.price_usd_lb != null ? '$' + fmt(d.price_usd_lb) + '/lb' : ''}${d.volume_kg != null ? ' · ' + fmt(d.volume_kg, 0) + ' kg' : ''}${d.value_usd != null ? ` · <b>${money(d.value_usd)}</b>` : ''}</div>
          <div class="tiny">${d.status === 'open' ? nextAct(d.next_activity) : `<span class="sig ${d.status === 'won' ? 'bullish' : 'bearish'}">${d.status}</span>`}</div>
        </a>`).join('') || '<div class="faint tiny crm-drop">Drop deals here</div>'}</div></div>`;
    }).join('')}</div>`;
    // drag & drop between stages (desktop); on phones, change the stage from the deal page
    $$('.crm-card').forEach(c => c.ondragstart = e => { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('drag'); });
    $$('.crm-col').forEach(col => {
      col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
      col.ondragleave = () => col.classList.remove('over');
      col.ondrop = async e => { e.preventDefault(); col.classList.remove('over');
        const id = e.dataTransfer.getData('text/plain'); if (id) { await patch('deals', id, {stage: col.dataset.stage}); draw(); } };
    });
  };
  let t; $('#dq').oninput = e => { clearTimeout(t); t = setTimeout(() => { pipe.q = e.target.value; draw(); }, 250); };
  $$('#dstatus button').forEach(b => b.onclick = () => { pipe.status = b.dataset.s; $$('#dstatus button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  await draw();
}

// ================================================================== ORGANIZATIONS
const of = {q: '', type: '', region: '', verified: ''};
async function pageOrgs(body) {
  body.innerHTML = `<div class="filters">
      <input type="search" id="oq" placeholder="Search name, producer, town, variety…" value="${esc(of.q)}">
      <select id="otype"><option value="">All types</option>${opts('org_types').map(o => `<option value="${o.value}" ${of.type === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>
      <select id="oregion"><option value="">All regions</option>${opts('regions').map(o => `<option value="${o.value}" ${of.region === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>
      <select id="over"><option value="">Verified or not</option><option value="true" ${of.verified === 'true' ? 'selected' : ''}>Verified</option><option value="false" ${of.verified === 'false' ? 'selected' : ''}>Unverified</option></select>
    </div><div id="olist" class="panel"><div class="loading">Loading…</div></div>`;
  const draw = async () => {
    const qs = new URLSearchParams(Object.entries(of).filter(([, v]) => v)).toString();
    const orgs = await api('/orgs' + (qs ? '?' + qs : ''));
    if (!orgs.length && !qs) {
      $('#olist').innerHTML = `<div class="crm-empty"><h3>No organizations yet</h3>
        <p class="muted small">Add the farms, mills, co-ops and exporters you work with — or start from the public Costa Rica list (Cup of Excellence 2024–26 winners plus major co-ops and exporters, each linked to its source and marked unverified until you meet them).</p>
        <div class="row"><button class="btn primary" id="seedbtn">Load Costa Rica seed list</button><button class="btn" data-new2="orgs">+ Organization</button></div></div>`;
      $('#seedbtn').onclick = async () => { await api('/seed', {method: 'POST'}); rerender(); };
      $('[data-new2]').onclick = () => openForm('orgs', {}, {onSaved: s => { location.hash = `${ROOT}/org/${s.id}`; }});
      return;
    }
    $('#olist').innerHTML = `<div class="row small faint" style="margin-bottom:6px"><span>${orgs.length} organization${orgs.length === 1 ? '' : 's'}</span></div>
      <div class="crm-scroll"><table class="t crm-table"><thead><tr><th>Name</th><th>Type</th><th>Region</th><th class="hide-sm">Producer</th><th class="hide-sm">Best CoE</th><th class="hide-sm">People</th><th class="hide-sm">Open deals</th><th class="hide-sm">Next activity</th><th></th></tr></thead>
      <tbody>${orgs.map(o => `<tr data-href="${ROOT}/org/${o.id}">
        <td><a href="${ROOT}/org/${o.id}">${esc(o.name)}</a>${o.town ? `<div class="faint tiny">${esc(o.town)}</div>` : ''}</td>
        <td>${typeChip(o.type)}</td><td>${regionChip(o.region)}</td>
        <td class="hide-sm small">${esc(o.producer || '')}</td>
        <td class="hide-sm mono small">${o.best_coe ? `${fmt(o.best_coe.score)} <span class="faint">'${String(o.best_coe.year).slice(2)}</span>` : ''}</td>
        <td class="hide-sm mono">${o.people_count || ''}</td><td class="hide-sm mono">${o.open_deals || ''}</td>
        <td class="hide-sm tiny">${o.next_activity ? nextAct(o.next_activity) : ''}</td>
        <td>${verifiedBadge(o)}</td></tr>`).join('') || '<tr><td colspan="9" class="faint">No matches.</td></tr>'}</tbody></table></div>`;
    $$('tr[data-href]').forEach(tr => tr.onclick = e => { if (!e.target.closest('a')) location.hash = tr.dataset.href; });
  };
  let t; $('#oq').oninput = e => { clearTimeout(t); t = setTimeout(() => { of.q = e.target.value; draw(); }, 250); };
  $('#otype').onchange = e => { of.type = e.target.value; draw(); };
  $('#oregion').onchange = e => { of.region = e.target.value; draw(); };
  $('#over').onchange = e => { of.verified = e.target.value; draw(); };
  await draw();
}

// ------------------------------------------------------------------ detail building blocks
function detailsPanel(kind, doc, {skip = []} = {}) {
  const fs = M.kinds[kind].filter(f => !f.hidden && !skip.includes(f.key) && f.type !== 'ref');
  const groups = [...new Set(fs.map(f => f.group || 'Details'))];
  const show = f => {
    const v = doc[f.key];
    if (f.type === 'bool') return v ? '<span class="up">Yes</span>' : '<span class="faint">No</span>';
    if (v == null || v === '') return '<span class="faint">—</span>';
    if (f.type === 'select') return esc(f.options.find(o => o.value === v)?.label || v);
    if (f.type === 'url') return `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42))}</a>`;
    if (f.type === 'email') return `<a href="mailto:${esc(v)}">${esc(v)}</a>`;
    if (f.type === 'phone') return `<a href="tel:${esc(v)}">${esc(v)}</a>`;
    if (f.type === 'number') return `<span class="mono">${fmt(v, Number.isInteger(v) ? 0 : 2)}</span>`;
    if (f.type === 'date') return `<span class="mono">${nice(v)}</span>`;
    if (f.type === 'textarea') return `<span class="crm-pre">${esc(v)}</span>`;
    return esc(v);
  };
  return groups.map(g => `<div class="panel tight crm-side"><div class="row"><h3 style="margin:0">${esc(g)}</h3><span class="spacer"></span><button class="crm-link" data-edit>Edit</button></div>
    <dl class="crm-dl">${fs.filter(f => (f.group || 'Details') === g).map(f => `<dt>${esc(f.label)}</dt><dd>${show(f)}</dd>`).join('')}</dl></div>`).join('');
}

function composer(ctx) {
  return `<div class="panel crm-composer">
    <div class="seg" id="ctabs"><button data-c="note" class="on">📝 Note</button><button data-c="act">☎ Activity</button>${ctx.org_id ? '<button data-c="sample">☕ Sample</button>' : ''}</div>
    <form id="cform" class="crm-cform"></form></div>`;
}
function wireComposer(ctx) {
  const forms = {
    note: `<textarea name="body" rows="3" placeholder="Take a note — what you learned, prices quoted, who to talk to next…" required></textarea>`,
    act: `<div class="row"><select name="type">${opts('activity_types').map(o => `<option value="${o.value}">${ACT_ICON[o.value]} ${o.label}</option>`).join('')}</select>
      <input name="subject" placeholder="Subject — e.g. Visit the micro-mill" required style="flex:1;min-width:180px">
      <input type="date" name="due" value="${plusDays(1)}"><label class="crm-check small"><input type="checkbox" name="done"> already done (log it)</label></div>
      <textarea name="notes" rows="2" placeholder="Notes / outcome (optional)"></textarea>`,
    sample: `<div class="row"><input name="lot" placeholder="Lot name — e.g. Lot 7 Geisha honey" required style="flex:1;min-width:180px">
      <select name="status">${opts('sample_status').map(o => `<option value="${o.value}">${o.label}</option>`).join('')}</select>
      <input type="date" name="requested" value="${today()}" title="Requested on"></div>`,
  };
  let mode = 'note';
  const draw = () => { $('#cform').innerHTML = forms[mode] + `<div class="row"><span class="err" id="cerr"></span><span class="spacer"></span><button class="btn primary" type="submit">Save</button></div>`; };
  $$('#ctabs button').forEach(b => b.onclick = () => { mode = b.dataset.c; $$('#ctabs button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#cform').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target), body = {...ctx};
    for (const [k, v] of f.entries()) body[k] = v;
    if (mode === 'act') body.done = !!f.get('done');
    try { await api('/' + {note: 'notes', act: 'activities', sample: 'samples'}[mode], {method: 'POST', body}); rerender(); }
    catch (err) { $('#cerr').textContent = err.message; }
  };
  draw();
}

async function timeline(filter) {
  const qs = new URLSearchParams(filter).toString();
  // Visits and cuppings come from Field mode (#10); they link to orgs and people, not deals.
  const field = !filter.deal_id;
  const [acts, notes, samples, visits, cups] = await Promise.all([api('/activities?' + qs), api('/notes?' + qs),
    filter.person_id ? Promise.resolve([]) : api('/samples?' + qs),
    field ? api('/visits?' + qs) : Promise.resolve([]), field ? api('/cuppings?' + qs) : Promise.resolve([])]);
  const todo = acts.filter(a => !a.done);
  const hist = [
    ...acts.filter(a => a.done).map(a => ({t: a.updated, html: `<div class="crm-ev"><span class="crm-evi">${ACT_ICON[a.type] || '•'}</span><div><div><s class="faint">${esc(a.subject)}</s> <span class="faint tiny">${esc(lbl('activity_types', a.type))}${a.due ? ' · ' + nice(a.due) : ''}</span>
        <button class="crm-link" data-undo="${a.id}">undo</button> <button class="crm-link" data-del="activities:${a.id}">delete</button></div>${a.notes ? `<div class="small muted crm-pre">${esc(a.notes)}</div>` : ''}</div></div>`})),
    ...notes.map(n => ({t: n.created, html: `<div class="crm-ev"><span class="crm-evi">📝</span><div class="crm-note"><div class="crm-pre">${esc(n.body)}</div>
        <div class="faint tiny">${when(n.created)}${n.deal_title && !filter.deal_id ? ' · ' + esc(n.deal_title) : ''} <button class="crm-link" data-del="notes:${n.id}">delete</button></div></div></div>`})),
    ...samples.map(s => ({t: s.created, html: `<div class="crm-ev"><span class="crm-evi">☕</span><div><div>Sample <b>${esc(s.lot)}</b>
        <select class="crm-inline" data-sample="${s.id}">${opts('sample_status').map(o => `<option value="${o.value}" ${o.value === s.status ? 'selected' : ''}>${o.label}</option>`).join('')}</select>
        <button class="crm-link" data-edits="${s.id}">edit</button></div><div class="faint tiny">${[s.process, s.variety, s.requested && 'requested ' + nice(s.requested), s.received && 'received ' + nice(s.received)].filter(Boolean).map(esc).join(' · ')}</div></div></div>`})),
    ...visits.map(v => ({t: dayT(v.date, v.created), html: `<div class="crm-ev"><span class="crm-evi">📍</span><div><div>Visit <b>${nice(v.date)}</b>${v.person_name && !filter.person_id ? ' with ' + esc(v.person_name) : ''}${v.org_name && !filter.org_id ? ' · ' + esc(v.org_name) : ''}
        <a class="crm-link" href="/field/#/visit/${v.id}">open in Field</a></div>
        <div class="faint tiny">${[lbl('harvest_status', v.harvest_status), v.varieties, v.price_discussed != null && `${fmt(v.price_discussed)} ${lbl('price_units', v.price_unit)}`,
          v.altitude_m != null && `${fmt(v.altitude_m, 0)} m`, checklistDone(v.checklist)].filter(Boolean).map(esc).join(' · ')}</div>
        ${v.notes ? `<div class="small muted crm-pre">${esc(v.notes)}</div>` : ''}</div></div>`})),
    ...cups.map(c => ({t: dayT(c.date, c.created), html: `<div class="crm-ev"><span class="crm-evi">☕</span><div><div>Cupped <b>${esc(c.lot)}</b>
        <span class="mono">${c.total == null ? 'not scored' : fmt(c.total)}</span> <a class="crm-link" href="/field/#/flight/${encodeURIComponent(c.session || c.date)}">flight</a></div>
        <div class="faint tiny">${[nice(c.date), c.session, c.process, c.variety, c.descriptors].filter(Boolean).map(esc).join(' · ')}</div></div></div>`})),
  ].sort((a, b) => b.t - a.t);
  return `<h2>Focus <span class="faint small mono">${todo.length}</span></h2>
    <div class="panel tight">${todo.map(a => `<div class="crm-ev"><input type="checkbox" data-done="${a.id}" title="Mark done"><div>
      <div><b>${ACT_ICON[a.type] || '•'} ${esc(a.subject)}</b> <span class="mono small ${dueCls(a.due)}">${dueTxt(a.due)}</span>
      <button class="crm-link" data-edita="${a.id}">edit</button></div>${a.notes ? `<div class="small muted crm-pre">${esc(a.notes)}</div>` : ''}</div></div>`).join('') || '<div class="faint small">No upcoming activities. Schedule the next step so nothing slips.</div>'}</div>
    <h2>History</h2><div class="panel tight">${hist.map(h => h.html).join('') || '<div class="faint small">Nothing logged yet.</div>'}</div>`;
}
// Field records carry a calendar date; sort them at noon that day (created time breaks ties).
const dayT = (d, created) => d ? Date.parse(d + 'T12:00:00') / 1000 + (created || 0) % 1 : created || 0;
const checklistDone = ck => { const xs = Object.values(ck || {}); const n = xs.filter(x => x && (x.done || x.note)).length; return xs.length ? `${n}/${xs.length} questions asked` : ''; };

// Cupping summary for an org: best and average score, and every lot cupped (Field mode).
function cuppingPanel(cups) {
  if (!cups.length) return '';
  const sc = cups.filter(c => c.total != null).sort((a, b) => b.total - a.total);
  const avg = sc.length ? sc.reduce((t, c) => t + c.total, 0) / sc.length : null;
  return `<div class="panel tight crm-side"><div class="row"><h3 style="margin:0">Cuppings <span class="faint mono small">${cups.length}</span></h3><span class="spacer"></span>
    <a class="crm-link" href="/field/#/cup/new">+ Cup in Field</a></div>
    ${sc.length ? `<div class="small" style="margin:4px 0">Best <b class="mono">${fmt(sc[0].total)}</b> · average <span class="mono">${fmt(avg)}</span></div>` : ''}
    <div class="crm-scroll"><table class="t"><tr><th>Lot</th><th>Score</th><th>Date</th></tr>
    ${[...sc, ...cups.filter(c => c.total == null)].map(c => `<tr><td class="small"><a href="/field/#/flight/${encodeURIComponent(c.session || c.date)}">${esc(c.lot)}</a></td>
      <td class="mono">${c.total == null ? '—' : fmt(c.total)}</td><td class="mono tiny">${esc(c.date || '')}</td></tr>`).join('')}</table></div></div>`;
}

function wireTimeline(root) {
  wireDone(root);
  $$('[data-undo]', root).forEach(b => b.onclick = async () => { await patch('activities', b.dataset.undo, {done: false}); rerender(); });
  $$('[data-del]', root).forEach(b => b.onclick = async () => { const [k, id] = b.dataset.del.split(':'); if (await remove(k, id)) rerender(); });
  $$('[data-sample]', root).forEach(s => s.onchange = async () => {
    const body = {status: s.value}; if (s.value === 'received') body.received = today();
    await patch('samples', s.dataset.sample, body); rerender(); });
  $$('[data-edits]', root).forEach(b => b.onclick = async () => openForm('samples', await api('/samples/' + b.dataset.edits)));
  $$('[data-edita]', root).forEach(b => b.onclick = async () => openForm('activities', await api('/activities/' + b.dataset.edita)));
}

function miniList(title, kind, items, render, addPreset) {
  return `<div class="panel tight crm-side"><div class="row"><h3 style="margin:0">${title} <span class="faint mono small">${items.length}</span></h3><span class="spacer"></span>
    <button class="crm-link" data-add="${kind}" data-preset='${esc(JSON.stringify(addPreset))}'>+ Add</button></div>
    ${items.map(render).join('') || '<div class="faint small">None yet.</div>'}</div>`;
}
function wireAdds(root) {
  $$('[data-add]', root).forEach(b => b.onclick = () => openForm(b.dataset.add, {}, {preset: JSON.parse(b.dataset.preset || '{}')}));
}

// ================================================================== ORG DETAIL
async function pageOrg(body, id) {
  const o = await api('/orgs/' + id);
  const [people, deals, cups] = await Promise.all([api('/people?org_id=' + id), api('/deals?org_id=' + id), api('/cuppings?org_id=' + id)]);
  const coe = (o.coe || []).slice().sort((a, b) => b.year - a.year || (a.rank || 99) - (b.rank || 99));
  body.innerHTML = `<div class="crm-crumb"><a href="${ROOT}/orgs">← Organizations</a></div>
    <div class="crm-head"><div><h2 class="crm-title">${esc(o.name)}</h2>
      <div class="row">${typeChip(o.type)}${regionChip(o.region)}${o.town ? `<span class="faint small">${esc(o.town)}</span>` : ''}${verifiedBadge(o)}
      ${o.source_url ? `<a class="small" href="${esc(o.source_url)}" target="_blank" rel="noopener">source: ${esc(o.source || 'link')} ↗</a>` : ''}</div></div>
      <div class="row"><a class="btn" href="/field/#/visit/new?org=${id}">📍 Log visit</a><button class="btn" id="verify">${o.verified ? 'Mark unverified' : '✓ Mark verified'}</button><button class="btn" data-edit>Edit</button><button class="btn danger" id="del">Delete</button></div></div>
    <div class="crm-detail">
      <aside>
        ${miniList('People', 'people', people, p => `<div class="crm-li"><a href="${ROOT}/person/${p.id}">${esc(p.name)}</a> <span class="faint small">${esc(p.title || '')}</span>
          <div class="tiny">${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a> ` : ''}${p.phone ? `<a href="tel:${esc(p.phone)}">${esc(p.phone)}</a> ` : ''}${p.whatsapp ? `<a href="https://wa.me/${esc(p.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</div></div>`, {org_id: id})}
        ${miniList('Deals', 'deals', deals, d => `<div class="crm-li"><a href="${ROOT}/deal/${d.id}">${esc(d.title)}</a> <span class="mono small">${money(d.value_usd)}</span>
          <div class="tiny faint">${esc(lbl('stages', d.stage))} · ${d.status}</div></div>`, {org_id: id})}
        ${cuppingPanel(cups)}
        ${coe.length ? `<div class="panel tight crm-side"><h3>Cup of Excellence</h3><div class="crm-scroll"><table class="t"><tr><th>Year</th><th>#</th><th>Score</th><th>$/lb</th><th>Lot</th></tr>
          ${coe.map(c => `<tr><td class="mono">${c.year}</td><td class="mono">${c.rank ?? ''}</td><td class="mono">${fmt(c.score)}</td><td class="mono">${c.price_usd_lb != null ? fmt(c.price_usd_lb) : '—'}</td>
          <td class="small">${esc([c.process, c.variety].filter(Boolean).join(' · '))} ${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">↗</a>` : ''}</td></tr>`).join('')}</table></div>
          <div class="faint tiny" style="margin-top:6px">Results © Alliance for Coffee Excellence; linked for sourcing research.</div></div>` : ''}
        ${detailsPanel('orgs', o, {skip: ['name']})}
      </aside>
      <section>${composer({org_id: id})}<div id="tl"><div class="loading">Loading…</div></div></section>
    </div>`;
  wireComposer({org_id: id}); wireAdds(body);
  $$('[data-edit]', body).forEach(b => b.onclick = () => openForm('orgs', o));
  $('#verify').onclick = async () => { await patch('orgs', id, {verified: !o.verified}); rerender(); };
  $('#del').onclick = async () => { if (await remove('orgs', id, `Delete ${o.name}? Its deals, samples, activities and notes are deleted too; people are kept but unlinked.`)) location.hash = ROOT + '/orgs'; };
  $('#tl').innerHTML = await timeline({org_id: id}); wireTimeline($('#tl'));
}

// ================================================================== PEOPLE
const pf = {q: ''};
async function pagePeople(body) {
  body.innerHTML = `<div class="filters"><input type="search" id="pq" placeholder="Search name, title, email, phone…" value="${esc(pf.q)}"></div><div class="panel" id="plist"><div class="loading">Loading…</div></div>`;
  const draw = async () => {
    const ps = await api('/people' + (pf.q ? '?q=' + encodeURIComponent(pf.q) : ''));
    $('#plist').innerHTML = !ps.length && !pf.q ? `<div class="crm-empty"><h3>No people yet</h3><p class="muted small">Add the producers, mill managers, exporters and agents you talk to, linked to their organization.</p><button class="btn primary" data-add="people">+ Person</button></div>`
      : `<div class="crm-scroll"><table class="t crm-table"><thead><tr><th>Name</th><th>Organization</th><th class="hide-sm">Title</th><th>Email</th><th class="hide-sm">Phone</th><th class="hide-sm">Location</th><th class="hide-sm">Next activity</th></tr></thead><tbody>
      ${ps.map(p => `<tr data-href="${ROOT}/person/${p.id}"><td><a href="${ROOT}/person/${p.id}">${esc(p.name)}</a></td><td>${link('org', p.org_id, p.org_name)}</td>
        <td class="hide-sm small">${esc(p.title || '')}</td><td class="small">${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}</td>
        <td class="hide-sm small mono">${esc(p.phone || '')}</td><td class="hide-sm small">${esc(p.location || '')}</td><td class="hide-sm tiny">${nextAct(p.next_activity)}</td></tr>`).join('') || '<tr><td colspan="7" class="faint">No matches.</td></tr>'}</tbody></table></div>`;
    wireAdds($('#plist'));
    $$('tr[data-href]').forEach(tr => tr.onclick = e => { if (!e.target.closest('a')) location.hash = tr.dataset.href; });
  };
  let t; $('#pq').oninput = e => { clearTimeout(t); t = setTimeout(() => { pf.q = e.target.value; draw(); }, 250); };
  await draw();
}

async function pagePerson(body, id) {
  const p = await api('/people/' + id);
  const deals = await api('/deals?person_id=' + id);
  body.innerHTML = `<div class="crm-crumb"><a href="${ROOT}/people">← People</a></div>
    <div class="crm-head"><div><h2 class="crm-title">${esc(p.name)}</h2><div class="row"><span class="muted">${esc(p.title || '')}</span>${p.org_id ? link('org', p.org_id, p.org_name) : ''}
      ${p.whatsapp ? `<a class="small" href="https://wa.me/${esc(p.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}</div></div>
      <div class="row"><button class="btn" data-edit>Edit</button><button class="btn danger" id="del">Delete</button></div></div>
    <div class="crm-detail"><aside>${detailsPanel('people', p, {skip: ['name']})}
      ${miniList('Deals', 'deals', deals, d => `<div class="crm-li"><a href="${ROOT}/deal/${d.id}">${esc(d.title)}</a> <span class="tiny faint">${esc(lbl('stages', d.stage))}</span></div>`, {org_id: p.org_id, person_id: id})}</aside>
      <section>${composer({person_id: id, org_id: p.org_id})}<div id="tl"></div></section></div>`;
  wireComposer({person_id: id, ...(p.org_id ? {org_id: p.org_id} : {})}); wireAdds(body);
  $$('[data-edit]', body).forEach(b => b.onclick = () => openForm('people', p));
  $('#del').onclick = async () => { if (await remove('people', id)) location.hash = ROOT + '/people'; };
  $('#tl').innerHTML = await timeline({person_id: id}); wireTimeline($('#tl'));
}

// ================================================================== DEAL DETAIL
async function pageDeal(body, id) {
  const d = await api('/deals/' + id);
  const st = opts('stages'), idx = st.findIndex(s => s.value === d.stage);
  body.innerHTML = `<div class="crm-crumb"><a href="${ROOT}">← Pipeline</a></div>
    <div class="crm-head"><div><h2 class="crm-title">${esc(d.title)}</h2>
      <div class="row"><span class="mono big">${money(d.value_usd)}</span>${link('org', d.org_id, d.org_name)}${d.person_id ? link('person', d.person_id, d.person_name) : ''}
      ${d.status !== 'open' ? `<span class="sig ${d.status === 'won' ? 'bullish' : 'bearish'}">${d.status}</span>` : ''}</div></div>
      <div class="row">${d.status === 'open' ? '<button class="btn won" id="won">Won</button><button class="btn danger" id="lost">Lost</button>' : '<button class="btn" id="reopen">Reopen</button>'}
      <button class="btn" data-edit>Edit</button><button class="btn danger" id="del">Delete</button></div></div>
    <div class="crm-stages">${st.map((s, i) => `<button data-stage="${s.value}" class="${i <= idx ? 'done' : ''} ${i === idx ? 'cur' : ''}" title="Move to ${esc(s.label)}">${esc(s.label)}</button>`).join('')}</div>
    <div class="crm-detail"><aside>${detailsPanel('deals', d, {skip: ['title', 'stage', 'status']})}</aside>
      <section>${composer({deal_id: id, org_id: d.org_id, ...(d.person_id ? {person_id: d.person_id} : {})})}<div id="tl"></div></section></div>`;
  wireComposer({deal_id: id, org_id: d.org_id, ...(d.person_id ? {person_id: d.person_id} : {})});
  $$('[data-edit]', body).forEach(b => b.onclick = () => openForm('deals', d));
  $$('.crm-stages button').forEach(b => b.onclick = async () => { await patch('deals', id, {stage: b.dataset.stage}); rerender(); });
  if ($('#won')) $('#won').onclick = async () => { await patch('deals', id, {status: 'won'}); rerender(); };
  if ($('#lost')) $('#lost').onclick = async () => { const r = prompt('Lost reason (optional)'); if (r === null) return; await patch('deals', id, {status: 'lost', lost_reason: r}); rerender(); };
  if ($('#reopen')) $('#reopen').onclick = async () => { await patch('deals', id, {status: 'open'}); rerender(); };
  $('#del').onclick = async () => { if (await remove('deals', id)) location.hash = ROOT; };
  $('#tl').innerHTML = await timeline({deal_id: id}); wireTimeline($('#tl'));
}

// ================================================================== ACTIVITIES
const af = {view: 'todo', type: ''};
async function pageActivities(body) {
  body.innerHTML = `<div id="due"></div><div class="filters" style="margin-top:12px">
      <div class="seg" id="aview">${[['todo', 'To do'], ['overdue', 'Overdue'], ['done', 'Done'], ['all', 'All']].map(([k, t]) => `<button data-v="${k}" class="${af.view === k ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="togs" id="atype"><span class="tog ${!af.type ? 'on' : ''}" data-t="">All types</span>${opts('activity_types').map(o => `<span class="tog ${af.type === o.value ? 'on' : ''}" data-t="${o.value}">${ACT_ICON[o.value]} ${o.label}</span>`).join('')}</div>
    </div><div class="panel" id="alist"><div class="loading">Loading…</div></div>`;
  $('#due').innerHTML = await dueStrip(); wireDone($('#due'));
  const draw = async () => {
    let acts = await api('/activities' + (af.type ? '?type=' + af.type : ''));
    if (af.view === 'todo') acts = acts.filter(a => !a.done);
    if (af.view === 'overdue') acts = acts.filter(a => !a.done && a.due && a.due < today());
    if (af.view === 'done') acts = acts.filter(a => a.done).reverse();
    $('#alist').innerHTML = `<div class="crm-scroll"><table class="t crm-table"><thead><tr><th></th><th>Subject</th><th class="hide-sm">Type</th><th>Due</th><th>Organization</th><th class="hide-sm">Person</th><th class="hide-sm">Deal</th><th></th></tr></thead><tbody>
      ${acts.map(a => `<tr><td><input type="checkbox" data-done="${a.id}" ${a.done ? 'checked' : ''}></td>
        <td>${a.done ? `<s class="faint">${esc(a.subject)}</s>` : esc(a.subject)}</td><td class="hide-sm small">${ACT_ICON[a.type] || ''} ${esc(lbl('activity_types', a.type))}</td>
        <td class="mono small ${a.done ? 'faint' : dueCls(a.due)}">${dueTxt(a.due)}</td><td class="small">${link('org', a.org_id, a.org_name)}</td>
        <td class="hide-sm small">${link('person', a.person_id, a.person_name)}</td><td class="hide-sm small">${link('deal', a.deal_id, a.deal_title)}</td>
        <td><button class="crm-link" data-edita="${a.id}">edit</button></td></tr>`).join('') || '<tr><td colspan="8" class="faint">Nothing here.</td></tr>'}</tbody></table></div>`;
    wireDone($('#alist'));
    $$('[data-edita]').forEach(b => b.onclick = async () => openForm('activities', await api('/activities/' + b.dataset.edita)));
  };
  $$('#aview button').forEach(b => b.onclick = () => { af.view = b.dataset.v; $$('#aview button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $$('#atype .tog').forEach(b => b.onclick = () => { af.type = b.dataset.t; $$('#atype .tog').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  await draw();
}

// ================================================================== SAMPLES
const sf = {status: ''};
async function pageSamples(body) {
  body.innerHTML = `<div class="filters"><div class="togs" id="sstat"><span class="tog ${!sf.status ? 'on' : ''}" data-s="">All</span>${opts('sample_status').map(o => `<span class="tog ${sf.status === o.value ? 'on' : ''}" data-s="${o.value}">${o.label}</span>`).join('')}</div>
    <span class="spacer"></span><button class="btn" data-add="samples" data-preset='${esc(JSON.stringify({requested: today()}))}'>+ Sample</button></div>
    <div class="panel" id="slist"><div class="loading">Loading…</div></div>`;
  wireAdds(body);
  const draw = async () => {
    const ss = await api('/samples' + (sf.status ? '?status=' + sf.status : ''));
    $('#slist').innerHTML = `<div class="crm-scroll"><table class="t crm-table"><thead><tr><th>Lot</th><th>Organization</th><th>Status</th><th class="hide-sm">Process</th><th class="hide-sm">Variety</th><th class="hide-sm">Requested</th><th class="hide-sm">Received</th><th class="hide-sm">Deal</th></tr></thead><tbody>
      ${ss.map(s => `<tr><td><button class="crm-link" data-edits="${s.id}">${esc(s.lot)}</button></td><td class="small">${link('org', s.org_id, s.org_name)}</td>
        <td><select class="crm-inline" data-sample="${s.id}">${opts('sample_status').map(o => `<option value="${o.value}" ${o.value === s.status ? 'selected' : ''}>${o.label}</option>`).join('')}</select></td>
        <td class="hide-sm small">${esc(s.process || '')}</td><td class="hide-sm small">${esc(s.variety || '')}</td><td class="hide-sm mono small">${nice(s.requested)}</td><td class="hide-sm mono small">${nice(s.received)}</td>
        <td class="hide-sm small">${link('deal', s.deal_id, s.deal_title)}</td></tr>`).join('') || '<tr><td colspan="8" class="faint">No samples yet. Log one from an organization page or with “+ Sample”.</td></tr>'}</tbody></table></div>`;
    wireTimeline($('#slist'));
  };
  $$('#sstat .tog').forEach(b => b.onclick = () => { sf.status = b.dataset.s; $$('#sstat .tog').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  await draw();
}

// ================================================================== IMPORT / EXPORT
async function pageData(body) {
  const kinds = [['orgs', 'Organizations'], ['people', 'People'], ['deals', 'Deals'], ['activities', 'Activities'], ['notes', 'Notes'], ['samples', 'Samples']];
  body.innerHTML = `<p class="lede">Your data is portable: export any list as CSV (every field, including IDs), edit it in a spreadsheet, and import it back. Rows with an existing <code>id</code> are updated; rows without one are added. Import organizations before the people, deals and samples that point to them.</p>
    <div class="grid g3">${kinds.map(([k, t]) => `<div class="panel"><h3>${t} <span class="faint mono small">${M.counts[k]}</span></h3>
      <div class="row"><a class="btn" href="/api/crm/export/${k}.csv" download>⬇ Export CSV</a>
      <label class="btn">⬆ Import CSV<input type="file" accept=".csv,text/csv" data-imp="${k}" hidden></label></div><div class="small" id="imp_${k}"></div></div>`).join('')}</div>
    <h2>Costa Rica seed list</h2><div class="panel small"><p class="muted" style="margin-top:0">${M.counts.orgs ? '' : 'Your organization list is empty. '}Adds public Costa Rican suppliers: Cup of Excellence 2024–26 winners (ACE) plus major co-ops and exporters (PROCOMER and other public pages). Each links to its source and is marked <b>unverified</b> until you meet them. Safe to run again — existing entries are skipped.</p>
      <button class="btn" id="seedbtn">Load / refresh seed list</button> <span id="seedout" class="small"></span></div>`;
  $$('[data-imp]').forEach(inp => inp.onchange = async () => {
    const k = inp.dataset.imp, out = $('#imp_' + k), file = inp.files[0]; if (!file) return;
    out.textContent = 'Importing…';
    try { const r = await api('/import/' + k, {method: 'POST', body: await file.text(), headers: {'content-type': 'text/csv'}}); out.innerHTML = `<span class="up">✓ ${r.imported} rows imported</span>`; M = await api('/meta'); }
    catch (e) { out.innerHTML = `<span class="err">${esc(e.message)}</span>`; }
    inp.value = '';
  });
  $('#seedbtn').onclick = async () => { const r = await api('/seed', {method: 'POST'}); $('#seedout').innerHTML = `<span class="up">✓ ${r.added} added</span>, ${r.skipped} already present`; };
}

// ================================================================== export + standalone router
window.CRM = {page};
if (document.body.dataset.standalone !== undefined) {
  const route = async () => {
    const [path, qs] = (location.hash.slice(1) || '/sourcing').split('?');
    if (!path.startsWith('/sourcing')) { location.hash = ROOT; return; }
    const view = $('#view');
    try { await page(view, path, new URLSearchParams(qs || '')); }
    catch (e) { console.error(e); view.innerHTML = `<div class="err" style="padding:20px 0">Couldn't load this page: ${esc(e.message)}</div>`; }
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', route);
  route();
}
})();
