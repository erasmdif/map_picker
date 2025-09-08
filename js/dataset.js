// js/dataset.js
import { state, els, emit } from './state.js';

/** Etichetta composta: concatena i valori dei campi selezionati, saltando vuoti/NaN/null */
function makeDisplayLabel(row, fields){
  const parts = [];
  fields.forEach(f=>{
    const v = row[f];
    if (v === null || v === undefined) return;
    const s = String(v).trim();
    if (!s || s.toLowerCase() === 'nan' || s.toLowerCase() === 'null') return;
    parts.push(s);
  });
  return parts.join(' - ');
}

function rebuildDatalist(){
  if (!els.datalist) return;
  els.datalist.innerHTML = '';
  if (!state.dataset.length || !state.displayFields.length) return;
  const seen = new Set();
  state.dataset.forEach(row=>{
    const label = makeDisplayLabel(row, state.displayFields);
    if (!label) return;
    if (seen.has(label)) return;
    seen.add(label);
    const opt = document.createElement('option');
    opt.value = label;
    els.datalist.appendChild(opt);
  });
}

/** Crea le checkbox per i campi “da visualizzare” */
function buildDisplayFieldsChecks(keys){
  if (!els.displayFieldsBox) return;
  els.displayFieldsBox.innerHTML = '';

  keys.forEach(k=>{
    const lab = document.createElement('label');
    const cb  = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = k;
    cb.checked = state.displayFields.length ? state.displayFields.includes(k) : (k === keys[0]); // default: primo selezionato
    cb.addEventListener('change', ()=>{
      const selected = Array.from(els.displayFieldsBox.querySelectorAll('input[type="checkbox"]:checked'))
                            .map(el=>el.value);
      if (selected.length === 0){
        cb.checked = true; // impedisci 0 selezioni
        return;
      }
      state.displayFields = selected;
      rebuildDatalist();
      emit('dataset:mapping'); // autosave
    });
    lab.appendChild(cb);
    const span = document.createElement('span');
    span.textContent = k;
    lab.appendChild(span);
    els.displayFieldsBox.appendChild(lab);
  });

  if (!state.displayFields.length) {
    state.displayFields = [keys[0]];
  }
}

/** Applica alla UI un dataset array di oggetti */
function applyDataset(data){
  if (!Array.isArray(data) || !data.length || typeof data[0] !== 'object'){
    alert('Dataset non valido'); return;
  }
  state.dataset = data;
  const keys = Object.keys(data[0]);

  // costruisci i flag (multi-select) e la select del campo da immettere
  buildDisplayFieldsChecks(keys);

  if (els.valueFieldSel){
    els.valueFieldSel.innerHTML = '';
    keys.forEach(k=>{
      const o = document.createElement('option'); o.value = k; o.textContent = k;
      els.valueFieldSel.appendChild(o);
    });
    if (state.valueField && keys.includes(state.valueField)) {
      els.valueFieldSel.value = state.valueField;
    } else {
      state.valueField = keys[0];
      els.valueFieldSel.value = keys[0];
    }
  }

  els.mappingBox?.classList.remove('hidden');
  rebuildDatalist();
  emit('dataset:mapping'); // autosave mapping
}

/** API pubblica per caricare dataset da codice (OSM, ecc.) */
export function ingestDatasetArray(data){
  applyDataset(data);
}

export function bindDataset(){
  els.fileData?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if (!f) return;
    const name = (f.name||'').toLowerCase();
    let data = [];
    if (name.endsWith('.csv')){
      const text = await f.text();
      const res = Papa.parse(text, { header:true, dynamicTyping:true, skipEmptyLines:true });
      data = res.data;
    } else if (name.endsWith('.json')){
      data = JSON.parse(await f.text());
    } else { alert('Formato non supportato (usa CSV o JSON)'); return; }
    applyDataset(data);
  });

  els.valueFieldSel?.addEventListener('change', ()=>{
    state.valueField = els.valueFieldSel.value;
    emit('dataset:mapping');
  });

  els.spotNome?.addEventListener('change', ()=>{
    if (!state.dataset.length || !state.displayFields.length || !els.spotValore) return;
    const label = els.spotNome.value;
    const row = state.dataset.find(r => makeDisplayLabel(r, state.displayFields) === label);
    if (row) els.spotValore.value = String(row[state.valueField] ?? '');
  });
}
