// js/pg.js — Doppia modalità: PostgREST (REST) o Node Proxy (PROXY)
import { els } from './state.js';
import { ingestDatasetArray } from './dataset.js';

const show   = el => el?.classList.remove('hidden');
const hide   = el => el?.classList.add('hidden');
const status = msg => { if (els.pgStatus) els.pgStatus.textContent = msg || ''; };
const base   = () => (els.pgEndpoint?.value || '').trim().replace(/\/+$/, '');
const isURL  = s => /^https?:\/\//i.test(s || '');

const getMode = () => {
  // supporta radio oppure select
  if (els.pgMode?.value) return els.pgMode.value; // select
  if (els.pgModeRest?.checked)  return 'rest';
  if (els.pgModeProxy?.checked) return 'proxy';
  return 'rest';
};

/* ========== Persistenza endpoint per modalità ========== */
function loadSavedEndpoint() {
  try {
    const m = getMode();
    const saved = localStorage.getItem(`pgEndpoint:${m}`);
    if (saved && els.pgEndpoint) els.pgEndpoint.value = saved;
  } catch {}
}
function saveEndpoint() {
  try {
    const m = getMode();
    const url = base();
    localStorage.setItem(`pgEndpoint:${m}`, url);
  } catch {}
}

/* ========== Helpers comuni ========== */
async function fetchJSON(url, opts) {
  const r = await fetch(url, {
    headers: { 'Accept': 'application/json, application/openapi+json' },
    cache: 'no-store',
    ...opts
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${await r.text()}`);
  return r.json();
}
function ensureTextInput(elRef, id, placeholder, defVal) {
  if (!elRef) return;
  if (elRef.tagName !== 'INPUT') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = id;
    input.placeholder = placeholder || '';
    input.value = defVal ?? '';
    input.className = elRef.className || '';
    elRef.parentElement.replaceChild(input, elRef);
    return input;
  }
  if (defVal && !elRef.value) elRef.value = defVal;
  return elRef;
}

/* ========== REST (PostgREST) ==========
   - Schema e Tabella: input testo (sempre scrivibili)
   - Suggerimenti tabella via OpenAPI best-effort
======================================== */
async function rest_trySuggestTables() {
  try {
    const spec = await fetchJSON(base() + '/');
    const paths = Object.keys(spec.paths || {});
    const names = paths
      .filter(p => !p.startsWith('/rpc/'))
      .map(p => p.replace(/^\//, ''))
      .filter(n => n && !n.includes('/') && !n.startsWith('-') && !/^favicon/i.test(n))
      .map(n => n.includes('.') ? n.split('.').pop() : n)
      .filter((v,i,a) => a.indexOf(v) === i)
      .sort((a,b)=>a.localeCompare(b));
    if (!names.length) { status('Nessuna risorsa nell’OpenAPI. Inserisci la tabella manualmente.'); return; }

    let dl = document.getElementById('pgTable_suggest');
    if (!dl) { dl = document.createElement('datalist'); dl.id = 'pgTable_suggest'; document.body.appendChild(dl); }
    dl.innerHTML = '';
    names.forEach(n => { const opt = document.createElement('option'); opt.value = n; dl.appendChild(opt); });
    els.pgTable.setAttribute('list', dl.id);
    status(`Trovate ${names.length} risorse (suggerimenti attivi).`);
  } catch (e) {
    console.warn('OpenAPI suggestions failed:', e);
    status('Non posso leggere l’elenco tabelle (REST): inserisci il nome manualmente.');
  }
}

async function rest_connect() {
  const api = base();
  if (!isURL(api)) { status('API non valida. Esempio: http://localhost:3005'); return; }
  saveEndpoint();
  // schema / tabella sempre scrivibili
  els.pgSchema = ensureTextInput(els.pgSchema, 'pgSchema', 'Schema (es. public)', 'public');
  els.pgTable  = ensureTextInput(els.pgTable,  'pgTableInput', 'Nome tabella (es. feature_item_arsdb)');
  status('Connessione (REST)…');
  // suggerimenti best-effort
  await rest_trySuggestTables();
  status('Connesso (REST). Inserisci/Seleziona la tabella e recupera i dati.');
}

async function rest_fetchRows() {
  const api = base();
  if (!isURL(api)) throw new Error('API non valida (REST)');
  const table = (els.pgTable?.value || '').trim();
  if (!table) throw new Error('Specifica il nome della tabella (REST).');
  const limit = Math.max(1, Math.min(+(els.pgLimit?.value || 500), 2000));
  const nameLike = (els.pgNameLike?.value || '').trim();

  let url = `${api}/${encodeURIComponent(table)}?limit=${limit}`;
  // Se vuoi forzare filtro su name:
  // if (nameLike) url += `&name=ilike.*${encodeURIComponent(nameLike)}*`;

  const rows = await fetchJSON(url);
  return Array.isArray(rows) ? rows : [];
}

/* ========== PROXY (Node) ==========
   - Usa /pg/info2 per schemi+tabelle
   - Usa /pg/data2 per dati
   - Richiede credenziali inserite nei campi
==================================== */
function proxy_connPayload() {
  return {
    host: (els.pgHost?.value || '').trim(),
    port: +(els.pgPort?.value || 5432),
    database: (els.pgDatabase?.value || '').trim(),
    user: (els.pgUser?.value || '').trim(),
    password: els.pgPassword?.value || '',
    ssl: (els.pgSSL?.value || '') === 'true'
  };
}

async function proxy_info() {
  const api = base();
  const body = { conn: proxy_connPayload() };
  const r = await fetch(api + '/pg/info2', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    cache:'no-store',
    body: JSON.stringify(body)
  });
  const json = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
  return json; // { schemas: string[], tables: [{table_schema, table_name}, ...] }
}

async function proxy_connect() {
  const api = base();
  if (!isURL(api)) { status('API proxy non valida. Esempio: http://localhost:5055'); return; }
  saveEndpoint();

  status('Connessione (Proxy)…');
  const info = await proxy_info();

  // popola schema select (se manca, trasformiamo in select)
  if (els.pgSchema?.tagName === 'INPUT') {
    const sel = document.createElement('select');
    sel.id = 'pgSchema'; sel.className = els.pgSchema.className || '';
    els.pgSchema.parentElement.replaceChild(sel, els.pgSchema);
    els.pgSchema = sel;
  }
  els.pgSchema.innerHTML = '';
  info.schemas.forEach(s => {
    const o = document.createElement('option'); o.value = s; o.textContent = s;
    els.pgSchema.appendChild(o);
  });

  // popola tabella select
  if (els.pgTable?.tagName === 'INPUT') {
    const sel = document.createElement('select');
    sel.id = 'pgTable'; sel.className = els.pgTable.className || '';
    els.pgTable.parentElement.replaceChild(sel, els.pgTable);
    els.pgTable = sel;
  }
  const fillTables = () => {
    const schema = els.pgSchema.value;
    const subset = info.tables.filter(t => t.table_schema === schema);
    els.pgTable.innerHTML = '';
    subset.forEach(t => {
      const o = document.createElement('option'); o.value = t.table_name; o.textContent = t.table_name;
      els.pgTable.appendChild(o);
    });
  };
  fillTables();
  els.pgSchema.onchange = fillTables;

  status('Connesso (Proxy). Scegli schema e tabella, poi recupera i dati.');
}

async function proxy_fetchRows() {
  const api = base();
  const payload = {
    conn: proxy_connPayload(),
    schema: els.pgSchema?.value,
    table:  els.pgTable?.value,
    limit:  Math.max(1, Math.min(+(els.pgLimit?.value || 500), 2000)),
    nameLike: (els.pgNameLike?.value || '').trim() || undefined
  };
  if (!payload.schema || !payload.table) throw new Error('Seleziona schema e tabella (Proxy).');

  const r = await fetch(api + '/pg/data2', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    cache:'no-store',
    body: JSON.stringify(payload)
  });
  const json = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
  const rows = json.rows || [];
  return Array.isArray(rows) ? rows : [];
}

/* ========== UI orchestration ========== */
async function connectNow() {
  const m = getMode();
  try {
    if (m === 'rest') await rest_connect();
    else await proxy_connect();
  } catch (e) {
    status(`Errore: ${e.message}`);
  }
}

async function fetchRowsNow() {
  const m = getMode();
  return m === 'rest' ? rest_fetchRows() : proxy_fetchRows();
}

function wireEndpointChange() {
  // Connetti su Enter o change dell'API
  els.pgEndpoint?.addEventListener('keydown', async (e)=>{
    if (e.key !== 'Enter') return;
    await connectNow();
  });
  els.pgEndpoint?.addEventListener('change', async ()=>{
    await connectNow();
  });
  // Bottone "Connetti", se presente
  els.pgConnect?.addEventListener('click', async ()=> { await connectNow(); });

  // Cambio modalità: ricarica endpoint salvato per quella modalità e resetta UI
  const onModeChange = ()=>{
    loadSavedEndpoint();
    status('Seleziona l’API e premi Connetti.');
  };
  els.pgMode?.addEventListener('change', onModeChange);
  els.pgModeRest?.addEventListener('change', onModeChange);
  els.pgModeProxy?.addEventListener('change', onModeChange);
}

/* ========== Bind pubblico ========== */
export function bindPG(){
  els.connectPGBtn?.addEventListener('click', async ()=>{
    show(els.pgModal);
    loadSavedEndpoint();

    // prepara campi base
    // REST: schema/tabella input; PROXY: lasciali così, verranno create le select alla connessione
    if (getMode() === 'rest') {
      els.pgSchema = ensureTextInput(els.pgSchema, 'pgSchema', 'Schema (es. public)', 'public');
      els.pgTable  = ensureTextInput(els.pgTable,  'pgTableInput', 'Nome tabella (es. feature_item_arsdb)');
    }

    // non connetterti automaticamente se l’endpoint è vuoto/placeholder
    if (!isURL(base())) {
      status('Inserisci l’API (es. http://localhost:3005 per REST o http://localhost:5055 per Proxy) e premi “Connetti”.');
      return;
    }
    await connectNow();
  });

  els.pgClose?.addEventListener('click', ()=> hide(els.pgModal));
  els.pgCancel?.addEventListener('click', ()=> hide(els.pgModal));

  wireEndpointChange();

  els.pgFetch?.addEventListener('click', async ()=>{
    try {
      status('Recupero dati…');
      const rows = await fetchRowsNow();
      if (rows.length) {
        ingestDatasetArray(rows);
        hide(els.pgModal);
      } else {
        status('Nessun record trovato (controlla tabella/limite/permessi).');
      }
    } catch (e) {
      status(`Errore: ${e.message}`);
    }
  });
}
