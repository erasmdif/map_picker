// js/storage.js
import { state, on, emit } from './state.js';
import { redrawMarkers, renderList } from './spots.js';

const LS_KEY_SPOTS = 'tagger_v1_spots';
const LS_KEY_MAP   = 'tagger_v1_mapping';

export function initAutosave() {
  on('spots:changed', () => {
    try { localStorage.setItem(LS_KEY_SPOTS, JSON.stringify(state.spots)); } catch {}
  });
  on('dataset:mapping', () => {
    try {
      localStorage.setItem(LS_KEY_MAP, JSON.stringify({
        displayFields: state.displayFields,   // <— array
        valueField: state.valueField,
      }));
    } catch {}
  });
}

export function loadAutosave() {
  try {
    const raw = localStorage.getItem(LS_KEY_SPOTS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        state.spots = arr.map((r,i)=>({
          id: String(r.id ?? (i+1)),
          nome: String(r.nome ?? ''),
          valore: r.valore!=null ? String(r.valore) : (r.nome ?? ''),
          note: r.note!=null ? String(r.note) : '',
          x: +Number(r.x).toFixed(6),
          y: +Number(r.y).toFixed(6),
        }));
      }
    }
    const mapRaw = localStorage.getItem(LS_KEY_MAP);
    if (mapRaw) {
      const m = JSON.parse(mapRaw);
      // compat: se esiste il vecchio displayField (stringa), trasformalo in array
      if (Array.isArray(m.displayFields)) state.displayFields = m.displayFields;
      else if (typeof m.displayField === 'string' && m.displayField) state.displayFields = [m.displayField];
      state.valueField = m.valueField || state.valueField;
      emit('dataset:mapping:loaded');
    }
  } catch {}
  redrawMarkers(); renderList();
}

export function clearAutosave() {
  localStorage.removeItem(LS_KEY_SPOTS);
  localStorage.removeItem(LS_KEY_MAP);
}
