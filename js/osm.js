// js/osm.js
import { els } from './state.js';
import { ingestDatasetArray } from './dataset.js';

let map = null;
let rect = null;
let drawing = false;
let startLatLng = null;

export function bindOSM(){
  els.connectOSMBtn?.addEventListener('click', ()=> openModal());
  els.osmClose?.addEventListener('click', closeModal);
  els.osmCancel?.addEventListener('click', closeModal);
  els.osmFetch?.addEventListener('click', fetchAndIngest);

  // bbox interattiva
  els.osmDrawToggle?.addEventListener('click', toggleDraw);
  els.osmUseBbox?.addEventListener('click', useCurrentRect);
  els.osmClearBbox?.addEventListener('click', clearRect);

  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });
}

function openModal(){
  els.osmStatus && (els.osmStatus.textContent = '');
  els.osmModal?.classList.remove('hidden');
  document.body.classList.add('modal-open');
  ensureMap();
  setTimeout(()=> map?.invalidateSize(), 60);
  drawRectFromInputs();
}

function closeModal(){
  els.osmModal?.classList.add('hidden');
  document.body.classList.remove('modal-open');
  stopDrawing();
}

function ensureMap(){
  if (map || !els.osmMapDiv) return;
  map = L.map(els.osmMapDiv, { zoomControl: true, attributionControl: true })
        .setView([41.9, 12.5], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // Evita che click/scroll “passino” sotto il modale
  L.DomEvent.disableClickPropagation(els.osmMapDiv);
  L.DomEvent.disableScrollPropagation(els.osmMapDiv);

  // Disegno rettangolo semplice
  map.on('mousedown', (e)=>{
    if (!drawing) return;
    startLatLng = e.latlng;
    if (rect) { map.removeLayer(rect); rect = null; }
    rect = L.rectangle(L.latLngBounds(startLatLng, startLatLng), { color:'#5b8def', weight:2, fillOpacity:0.07 }).addTo(map);
    map.dragging.disable();
  });
  map.on('mousemove', (e)=>{
    if (!drawing || !startLatLng || !rect) return;
    rect.setBounds(L.latLngBounds(startLatLng, e.latlng));
  });
  const finish = ()=>{
    if (!drawing) return;
    map.dragging.enable();
    drawing = false;
    startLatLng = null;
    if (els.osmDrawToggle){
      els.osmDrawToggle.textContent = 'Disegna rettangolo';
      els.osmDrawToggle.classList.remove('accent');
    }
  };
  map.on('mouseup', finish);
  map.on('mouseleave', finish);
}

function toggleDraw(){
  drawing = !drawing;
  if (els.osmDrawToggle){
    els.osmDrawToggle.textContent = drawing ? 'Termina disegno' : 'Disegna rettangolo';
    els.osmDrawToggle.classList.toggle('accent', drawing);
  }
  if (!drawing){
    startLatLng = null;
    map?.dragging.enable();
  }
}

function stopDrawing(){
  drawing = false;
  startLatLng = null;
  map?.dragging.enable();
  if (els.osmDrawToggle){
    els.osmDrawToggle.textContent = 'Disegna rettangolo';
    els.osmDrawToggle.classList.remove('accent');
  }
}

function clearRect(){
  if (rect){ map?.removeLayer(rect); rect = null; }
}

function useCurrentRect(){
  if (!rect){
    alert('Nessun rettangolo selezionato. Usa "Disegna rettangolo" sulla mappa.');
    return;
  }
  const b = rect.getBounds();
  const S = b.getSouth().toFixed(6);
  const W = b.getWest().toFixed(6);
  const N = b.getNorth().toFixed(6);
  const E = b.getEast().toFixed(6);
  if (els.osmSouth) els.osmSouth.value = S;
  if (els.osmWest)  els.osmWest.value  = W;
  if (els.osmNorth) els.osmNorth.value = N;
  if (els.osmEast)  els.osmEast.value  = E;
}

function drawRectFromInputs(){
  const s = parseFloat(els.osmSouth?.value || '');
  const w = parseFloat(els.osmWest?.value  || '');
  const n = parseFloat(els.osmNorth?.value || '');
  const e = parseFloat(els.osmEast?.value  || '');
  if ([s,w,n,e].some(isNaN)) return;
  const b = L.latLngBounds([s,w],[n,e]);
  if (rect){ map?.removeLayer(rect); rect = null; }
  rect = L.rectangle(b, { color:'#5b8def', weight:2, fillOpacity:0.07 }).addTo(map);
  map?.fitBounds(b, { padding:[20,20] });
}

async function fetchAndIngest(){
  const endpoint = els.osmEndpoint?.value || 'https://overpass-api.de/api/interpreter';
  const types = [
    els.osmTypeNode?.checked ? 'node' : null,
    els.osmTypeWay?.checked  ? 'way'  : null,
    els.osmTypeRel?.checked  ? 'relation' : null,
  ].filter(Boolean);
  if (!types.length){ alert('Seleziona almeno un tipo (node/way/relation).'); return; }

  const key = (els.osmKey?.value || '').trim();
  const val = (els.osmValue?.value || '').trim();
  const nameLike = (els.osmNameLike?.value || '').trim();
  const limit = Math.max(1, Math.min(10000, Number(els.osmLimit?.value || 500)));

  const south = parseFloat(els.osmSouth?.value || '');
  const west  = parseFloat(els.osmWest?.value  || '');
  const north = parseFloat(els.osmNorth?.value || '');
  const east  = parseFloat(els.osmEast?.value  || '');
  let bbox = null;
  if (![south,west,north,east].some(isNaN)){ bbox = `(${south},${west},${north},${east})`; }

  let tagSel = '';
  if (key && val) tagSel = `["${escapeQ(key)}"="${escapeQ(val)}"]`;
  else if (key)   tagSel = `["${escapeQ(key)}"]`;

  let nameFilter = '';
  if (nameLike){ nameFilter = `["name"~"${escapeRegex(nameLike)}",i]`; }

  const where = `${tagSel}${nameFilter}${bbox || ''}`;
  const q = `
[out:json][timeout:25];
(
  ${types.includes('node') ? `node${where};` : ''}
  ${types.includes('way') ? `way${where};` : ''}
  ${types.includes('relation') ? `relation${where};` : ''}
);
out tags center ${limit ? `qt ${limit}` : 'qt'};
`.trim();

  try{
    setStatus('Richiesta in corso…');
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: 'data=' + encodeURIComponent(q),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const arr = Array.isArray(json.elements) ? json.elements : [];
    if (!arr.length){ setStatus('Nessun risultato.'); return; }

    const includeAllTags = !!els.osmIncludeAllTags?.checked;

    const data = arr.map(e=>{
      const t = e.tags || {};
      // Geometria: preferisci center (per way/rel), altrimenti lat/lon
      let geom = '';
      if (e.type === 'node' && typeof e.lat === 'number' && typeof e.lon === 'number'){
        geom = `${e.lat},${e.lon}`;
      } else if (e.center && typeof e.center.lat === 'number' && typeof e.center.lon === 'number'){
        geom = `${e.center.lat},${e.center.lon}`;
      }

      const base = {
        id: `${prefix(e.type)}${e.id}`,   // es. n123, w456, r789
        osmid: e.id,
        osm_type: e.type,
        geom: geom,
      };

      if (includeAllTags){
        // FLATTEN: porta tutti i tag OSM a livello top (chiave così com’è: "name", "name:it", ecc.)
        // In caso di collisione con campi base, i campi base vincono.
        return Object.assign({}, t, base);
      } else {
        // Schema compatto "amichevole" (retrocompatibile)
        const name = t.name || t['name:it'] || '';
        const alt  = t.alt_name || t['old_name'] || t['name:en'] || '';
        const wkd  = t.wikidata || '';
        const wkp  = t.wikipedia || '';
        return {
          ...base,
          project_id: '',
          project: '',
          name: name,
          alternative_names: alt,
          wikidata: wkd,
          wikipedia: wkp,
        };
      }
    });

    ingestDatasetArray(data);
    setStatus(`Importati ${data.length} elementi da OSM.`);
    closeModal();
  }catch(err){
    console.error(err);
    setStatus('Errore nella richiesta OSM. Riprova o cambia endpoint.');
  }
}

function setStatus(msg){ if (els.osmStatus) els.osmStatus.textContent = msg; }
function escapeQ(s){ return String(s).replace(/"/g, '\\"'); }
function escapeRegex(s){ return String(s).replace(/[\\"]/g, m => '\\'+m); }
function prefix(type){ return type==='node'?'n':type==='way'?'w':'r'; }
