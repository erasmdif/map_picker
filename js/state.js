// js/state.js
const listeners = new Map();
export function on(evt, cb){ (listeners.get(evt) || listeners.set(evt,[]).get(evt)).push(cb); }
export function emit(evt, data){ (listeners.get(evt)||[]).forEach(cb=>cb(data)); }

export const state = {
  imgW: 0, imgH: 0,
  scale: 1, tx: 0, ty: 0,
  spots: /** @type {{id:string,nome:string,valore?:string,note?:string,x:number,y:number}[]} */([]),
  dataset: [],
  displayFields: /** @type {string[]} */([]),
  valueField: '',
  imageName: '',
};

export const els = {};

export function bindDOM(){
  const byId = (id)=>/** @type {HTMLElement|null} */(document.getElementById(id));
  els.viewport  = byId('viewport');
  els.stage     = byId('stage');
  els.canvas    = /** @type {HTMLCanvasElement|null} */(byId('canvas'));
  els.ctx       = els.canvas ? els.canvas.getContext('2d') : null;
  els.markers   = byId('markers');

  els.fileImage = /** @type {HTMLInputElement|null} */(byId('fileImage'));
  els.pageSelect= /** @type {HTMLSelectElement|null} */(byId('pageSelect'));
  els.pageLabel = byId('pageLabel');

  els.fileData        = /** @type {HTMLInputElement|null} */(byId('fileData'));
  els.mappingBox      = byId('mapping');
  els.displayFieldsBox= byId('displayFieldsBox');
  els.valueFieldSel   = /** @type {HTMLSelectElement|null} */(byId('valueField'));
  els.datalist        = /** @type {HTMLDataListElement|null} */(byId('displayValues'));

  els.zoomInBtn  = /** @type {HTMLButtonElement|null} */(byId('zoomIn'));
  els.zoomOutBtn = /** @type {HTMLButtonElement|null} */(byId('zoomOut'));
  els.zoomFitBtn = /** @type {HTMLButtonElement|null} */(byId('zoomFit'));

  els.newSpotForm = /** @type {HTMLFormElement|null} */(byId('newSpotForm'));
  els.spotNome    = /** @type {HTMLInputElement|null} */(byId('spotNome'));
  els.spotValore  = /** @type {HTMLInputElement|null} */(byId('spotValore'));
  els.spotNote    = /** @type {HTMLTextAreaElement|null} */(byId('spotNote'));
  els.spotX       = /** @type {HTMLInputElement|null} */(byId('spotX'));
  els.spotY       = /** @type {HTMLInputElement|null} */(byId('spotY'));
  els.pickFromCanvasBtn = /** @type {HTMLButtonElement|null} */(byId('pickFromCanvas'));
  els.spotsList   = byId('spotsList');

  // Spots buttons
  els.fileSpotsImport = /** @type {HTMLInputElement|null} */(byId('fileSpotsImport'));
  els.importSpotsBtn  = /** @type {HTMLButtonElement|null} */(byId('importSpots'));
  els.exportJSONBtn   = /** @type {HTMLButtonElement|null} */(byId('exportJSON'));
  els.exportZIPBtn    = /** @type {HTMLButtonElement|null} */(byId('exportZIP'));
  els.exportIntersectCSVBtn  = /** @type {HTMLButtonElement|null} */(byId('exportIntersectCSV'));
  els.exportIntersectJSONBtn = /** @type {HTMLButtonElement|null} */(byId('exportIntersectJSON'));

  // OSM
  els.connectOSMBtn = /** @type {HTMLButtonElement|null} */(byId('connectOSM'));
  els.osmModal   = byId('osmModal');
  els.osmClose   = /** @type {HTMLButtonElement|null} */(byId('osmClose'));
  els.osmCancel  = /** @type {HTMLButtonElement|null} */(byId('osmCancel'));
  els.osmFetch   = /** @type {HTMLButtonElement|null} */(byId('osmFetch'));
  els.osmEndpoint= /** @type {HTMLSelectElement|null} */(byId('osmEndpoint'));
  els.osmLimit   = /** @type {HTMLInputElement|null} */(byId('osmLimit'));
  els.osmTypeNode= /** @type {HTMLInputElement|null} */(byId('osmTypeNode'));
  els.osmTypeWay = /** @type {HTMLInputElement|null} */(byId('osmTypeWay'));
  els.osmTypeRel = /** @type {HTMLInputElement|null} */(byId('osmTypeRel'));
  els.osmKey     = /** @type {HTMLInputElement|null} */(byId('osmKey'));
  els.osmValue   = /** @type {HTMLInputElement|null} */(byId('osmValue'));
  els.osmNameLike= /** @type {HTMLInputElement|null} */(byId('osmNameLike'));
  els.osmSouth   = /** @type {HTMLInputElement|null} */(byId('osmSouth'));
  els.osmWest    = /** @type {HTMLInputElement|null} */(byId('osmWest'));
  els.osmNorth   = /** @type {HTMLInputElement|null} */(byId('osmNorth'));
  els.osmEast    = /** @type {HTMLInputElement|null} */(byId('osmEast'));
  els.osmStatus  = byId('osmStatus');
  els.osmMapDiv    = /** @type {HTMLElement|null} */(byId('osmMap'));
  els.osmDrawToggle= /** @type {HTMLButtonElement|null} */(byId('osmDrawToggle'));
  els.osmUseBbox   = /** @type {HTMLButtonElement|null} */(byId('osmUseBbox'));
  els.osmClearBbox = /** @type {HTMLButtonElement|null} */(byId('osmClearBbox'));
  els.osmIncludeAllTags = /** @type {HTMLInputElement|null} */(byId('osmIncludeAllTags'));

  // PG modal (comune)
  els.connectPGBtn = /** @type {HTMLButtonElement|null} */(byId('connectPG'));
  els.pgModal    = byId('pgModal');
  els.pgClose    = byId('pgClose');
  els.pgCancel   = byId('pgCancel');
  els.pgFetch    = byId('pgFetch');
  els.pgStatus   = byId('pgStatus');
  els.pgEndpoint = /** @type {HTMLInputElement|null} */(byId('pgEndpoint'));
  els.pgConnect  = /** @type {HTMLButtonElement|null} */(byId('pgConnect'));

  // Modalità (usa quello che hai in HTML: select o radio)
  els.pgMode     = /** @type {HTMLSelectElement|null} */(byId('pgMode'));
  els.pgModeRest = /** @type {HTMLInputElement|null} */(byId('pgModeRest'));
  els.pgModeProxy= /** @type {HTMLInputElement|null} */(byId('pgModeProxy'));

  // Campi schema/tabella (verranno trasformati se serve)
  els.pgSchema   = /** @type {HTMLElement|null} */(byId('pgSchema'));
  els.pgTable    = /** @type {HTMLElement|null} */(byId('pgTable'));

  // Limite e filtro
  els.pgLimit    = /** @type {HTMLInputElement|null} */(byId('pgLimit'));
  els.pgNameLike = /** @type {HTMLInputElement|null} */(byId('pgNameLike'));

  // Credenziali per PROXY (riusiamo quelli che avevi già)
  els.pgSSL      = /** @type {HTMLSelectElement|null} */(byId('pgSSL'));
  els.pgHost     = /** @type {HTMLInputElement|null} */(byId('pgHost'));
  els.pgPort     = /** @type {HTMLInputElement|null} */(byId('pgPort'));
  els.pgDatabase = /** @type {HTMLInputElement|null} */(byId('pgDatabase'));
  els.pgUser     = /** @type {HTMLInputElement|null} */(byId('pgUser'));
  els.pgPassword = /** @type {HTMLInputElement|null} */(byId('pgPassword'));
}

export const util = {
  clamp: (v,min,max)=>Math.max(min,Math.min(max,v)),
  to6: (n)=>+Number(n).toFixed(6),
};
