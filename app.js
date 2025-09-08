// ===== Stato globale =====
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');
const stage = document.getElementById('stage');
const markersLayer = document.getElementById('markers');

const fileImage = document.getElementById('fileImage');
const pageSelect = document.getElementById('pageSelect');
const pageLabel = document.getElementById('pageLabel');

const fileData = document.getElementById('fileData');
const mappingBox = document.getElementById('mapping');
const displayFieldSel = document.getElementById('displayField');
const valueFieldSel = document.getElementById('valueField');
const datalist = document.getElementById('displayValues');

const fileSpotsImport = document.getElementById('fileSpotsImport');
const exportJSONBtn = document.getElementById('exportJSON');
const exportZIPBtn = document.getElementById('exportZIP');

const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomFitBtn = document.getElementById('zoomFit');

const newSpotForm = document.getElementById('newSpotForm');
const spotNome = document.getElementById('spotNome');
const spotValore = document.getElementById('spotValore');
const spotX = document.getElementById('spotX');
const spotY = document.getElementById('spotY');
const pickFromCanvasBtn = document.getElementById('pickFromCanvas');
const spotsList = document.getElementById('spotsList');

// immagine attuale
let tiff = null, tiffImages = null, currentPage = 0;
let imgW = 0, imgH = 0;
let currentImageBlob = null; // per export ZIP (se TIFF, lo convertiremo in PNG)

// pan/zoom
let scale = 1, tx = 0, ty = 0;
let isPanning = false, panStartX = 0, panStartY = 0, panStartTx = 0, panStartTy = 0;

// spots
/** @type {{id:string, nome:string, valore?:string, x:number, y:number}[]} */
let spots = [];

// dataset opzionale (CSV/JSON)
let dataset = [];      // array di oggetti (chiavi = nomi campi)
let displayField = ''; // campo da visualizzare (autocomplete)
let valueField = '';   // campo da immettere (salvato)

// ===== Util =====
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
function updateStageTransform() {
  stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
}
function fitToViewport() {
  const vpW = viewport.clientWidth, vpH = viewport.clientHeight;
  if (!imgW || !imgH) return;
  const s = Math.min(vpW / imgW, vpH / imgH);
  scale = s;
  tx = (vpW - imgW * scale) / 2;
  ty = (vpH - imgH * scale) / 2;
  updateStageTransform();
}
function setScaleAround(factor, cx, cy) {
  const prev = scale;
  const next = clamp(prev * factor, 0.25, 8);
  const rect = viewport.getBoundingClientRect();
  const vx = cx - rect.left, vy = cy - rect.top;
  tx = vx - ((vx - tx) * (next / prev));
  ty = vy - ((vy - ty) * (next / prev));
  scale = next;
  updateStageTransform();
}
function screenToImage(clientX, clientY) {
  const rect = viewport.getBoundingClientRect();
  const vx = clientX - rect.left, vy = clientY - rect.top;
  return { ix: (vx - tx) / scale, iy: (vy - ty) / scale };
}
function to6(n) { return +Number(n).toFixed(6); }

// ===== Rendering markers =====
function clearMarkers() { markersLayer.innerHTML = ''; }
function addMarkerElement(spot) {
  const el = document.createElement('div');
  el.className = 'marker';
  el.dataset.id = spot.id;
  el.dataset.label = spot.nome || '';
  el.style.left = `${spot.x * imgW}px`;
  el.style.top = `${spot.y * imgH}px`;
  el.title = spot.nome || '';
  el.draggable = false;

  // drag per spostare
  let dragging = false, startX=0, startY=0, startIx=0, startIy=0;
  el.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    dragging = true;
    el.style.cursor = 'grabbing';
    startX = e.clientX; startY = e.clientY;
    startIx = spot.x * imgW; startIy = spot.y * imgH;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, { once: true });
  });
  function onMove(e) {
    if (!dragging) return;
    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;
    const ix = clamp(startIx + dx, 0, imgW);
    const iy = clamp(startIy + dy, 0, imgH);
    el.style.left = `${ix}px`;
    el.style.top  = `${iy}px`;
  }
  function onUp(e) {
    document.removeEventListener('mousemove', onMove);
    dragging = false;
    el.style.cursor = 'grab';
    // commit nuova posizione
    const ix = parseFloat(el.style.left);
    const iy = parseFloat(el.style.top);
    spot.x = to6(ix / imgW);
    spot.y = to6(iy / imgH);
    renderSpotsList();
  }

  // click per aprire editor in lista
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    focusSpotInList(spot.id);
  });

  markersLayer.appendChild(el);
}
function redrawMarkers() {
  clearMarkers();
  spots.forEach(addMarkerElement);
}

// ===== Immagine: carica e disegna =====
fileImage.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  spots = []; renderSpotsList(); clearMarkers(); currentImageBlob = null;

  if (isTiff(f)) {
    await loadTIFF(f);
  } else {
    await loadGenericImage(f);
  }
});

function isTiff(file) {
  const name = (file.name || '').toLowerCase();
  return file.type === 'image/tiff' || name.endsWith('.tif') || name.endsWith('.tiff');
}

async function loadGenericImage(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    imgW = img.naturalWidth; imgH = img.naturalHeight;
    canvas.width = imgW; canvas.height = imgH;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    pageSelect.classList.add('hidden');
    pageLabel.classList.add('hidden');
    fitToViewport();
    // mantieni il blob per export ZIP
    currentImageBlob = file;
  };
  img.onerror = () => { URL.revokeObjectURL(url); alert('Immagine non caricabile.'); };
  img.src = url;
}

async function loadTIFF(file) {
  const buf = await file.arrayBuffer();
  try {
    tiff = await GeoTIFF.fromArrayBuffer(buf);
    tiffImages = await tiff.getImages();
    if (tiffImages.length > 1) {
      pageSelect.innerHTML = '';
      tiffImages.forEach((_, i) => {
        const o = document.createElement('option');
        o.value = i; o.textContent = `Pagina ${i + 1}`;
        pageSelect.appendChild(o);
      });
      pageSelect.classList.remove('hidden');
      pageLabel.classList.remove('hidden');
    } else {
      pageSelect.classList.add('hidden');
      pageLabel.classList.add('hidden');
    }
    currentPage = 0;
    pageSelect.value = '0';
    await renderTiffPage(0);

    // per export ZIP, convertiremo a PNG dal canvas (vedi exporter)
    currentImageBlob = file;
  } catch (err) {
    console.error(err);
    alert('Errore lettura TIFF. Usa un TIFF RGB/LZW/Deflate o esporta PNG.');
  }
}

pageSelect.addEventListener('change', async () => {
  currentPage = +pageSelect.value;
  await renderTiffPage(currentPage);
  redrawMarkers();
});

async function renderTiffPage(idx) {
  const img = tiffImages[idx];
  const W = img.getWidth(), H = img.getHeight();

  const maxPixels = 20_000_000;
  let outW = W, outH = H;
  if (W * H > maxPixels) {
    const s = Math.sqrt(maxPixels / (W * H));
    outW = Math.max(1, Math.round(W * s));
    outH = Math.max(1, Math.round(H * s));
  }
  const sp = img.getSamplesPerPixel();
  const ras = await img.readRasters({ interleave: true, width: outW, height: outH });

  const imageData = ctx.createImageData(outW, outH);
  const data = imageData.data;
  const n = outW * outH;

  if (sp === 3 || sp === 4) {
    const hasAlpha = (sp === 4);
    if (ras.BYTES_PER_ELEMENT === 1) {
      for (let i=0,j=0;i<n;i++,j+=sp){
        const o=i*4;
        data[o]=ras[j]; data[o+1]=ras[j+1]; data[o+2]=ras[j+2]; data[o+3]= hasAlpha? ras[j+3]:255;
      }
    } else {
      let max = 0;
      for (let k=0;k<ras.length;k+=sp) {
        if (ras[k] > max) max = ras[k];
        if (ras[k+1] > max) max = ras[k+1];
        if (ras[k+2] > max) max = ras[k+2];
      }
      const denom = max || 1;
      for (let i=0,j=0;i<n;i++,j+=sp){
        const o=i*4;
        data[o]  = Math.round((ras[j]  /denom)*255);
        data[o+1]= Math.round((ras[j+1]/denom)*255);
        data[o+2]= Math.round((ras[j+2]/denom)*255);
        data[o+3]= 255;
      }
    }
  } else if (sp === 1) {
    let min=Infinity, max=-Infinity;
    for (let i=0;i<n;i++){ const v=ras[i]; if (v<min) min=v; if (v>max) max=v; }
    const range=(max-min)||1;
    for (let i=0;i<n;i++){
      const o=i*4; const v = Math.round(((ras[i]-min)/range)*255);
      data[o]=data[o+1]=data[o+2]=v; data[o+3]=255;
    }
  } else {
    alert(`TIFF con ${sp} canali non supportato in anteprima`);
    return;
  }

  canvas.width = outW; canvas.height = outH;
  imgW = outW; imgH = outH;
  ctx.putImageData(imageData, 0, 0);
  stage.style.width = imgW + 'px';
  stage.style.height = imgH + 'px';
  markersLayer.style.width = imgW + 'px';
  markersLayer.style.height = imgH + 'px';
  fitToViewport();
}

// ===== Pan / Zoom interazioni =====
zoomInBtn.addEventListener('click', () => {
  const r = viewport.getBoundingClientRect();
  setScaleAround(1.25, r.left + r.width/2, r.top + r.height/2);
});
zoomOutBtn.addEventListener('click', () => {
  const r = viewport.getBoundingClientRect();
  setScaleAround(1/1.25, r.left + r.width/2, r.top + r.height/2);
});
zoomFitBtn.addEventListener('click', () => fitToViewport());

viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  setScaleAround(e.deltaY < 0 ? 1.15 : 1/1.15, e.clientX, e.clientY);
}, { passive: false });

viewport.addEventListener('mousedown', (e) => {
  isPanning = true;
  panStartX = e.clientX; panStartY = e.clientY;
  panStartTx = tx; panStartTy = ty;
});

document.addEventListener('mousemove', (e) => {
  if (!isPanning) return;
  tx = panStartTx + (e.clientX - panStartX);
  ty = panStartTy + (e.clientY - panStartY);
  updateStageTransform();
});

document.addEventListener('mouseup', () => {
  isPanning = false;
});

// ===== Dataset CSV/JSON =====
fileData.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  const name = (f.name || '').toLowerCase();
  dataset = [];
  if (name.endsWith('.csv')) {
    const text = await f.text();
    const res = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
    dataset = res.data;
  } else if (name.endsWith('.json')) {
    dataset = JSON.parse(await f.text());
  } else {
    alert('Formato non supportato. Usa CSV o JSON.');
    return;
  }
  if (!Array.isArray(dataset) || dataset.length === 0 || typeof dataset[0] !== 'object') {
    alert('Dataset vuoto o non valido.');
    return;
  }
  // popola i campi mapping
  const keys = Object.keys(dataset[0]);
  displayFieldSel.innerHTML = ''; valueFieldSel.innerHTML = '';
  keys.forEach(k => {
    const o1 = document.createElement('option'); o1.value = k; o1.textContent = k; displayFieldSel.appendChild(o1);
    const o2 = document.createElement('option'); o2.value = k; o2.textContent = k; valueFieldSel.appendChild(o2);
  });
  displayField = keys[0]; valueField = keys[0];
  displayFieldSel.value = displayField; valueFieldSel.value = valueField;
  mappingBox.classList.remove('hidden');
  refreshDatalist();
});

displayFieldSel.addEventListener('change', () => { displayField = displayFieldSel.value; refreshDatalist(); });
valueFieldSel.addEventListener('change', () => { valueField = valueFieldSel.value; });

function refreshDatalist() {
  datalist.innerHTML = '';
  if (!dataset.length || !displayField) return;
  const seen = new Set();
  dataset.forEach(row => {
    const v = row[displayField];
    if (v == null) return;
    const s = String(v);
    if (seen.has(s)) return;
    seen.add(s);
    const opt = document.createElement('option');
    opt.value = s;
    datalist.appendChild(opt);
  });
}

// Se l’utente sceglie un'etichetta dall’autocomplete, sincronizza “valore”
spotNome.addEventListener('change', () => {
  if (!dataset.length || !displayField || !valueField) return;
  const val = spotNome.value;
  const row = dataset.find(r => String(r[displayField]) === String(val));
  if (row && (valueField in row)) {
    spotValore.value = String(row[valueField]);
  }
});

// ===== Aggiungi nuovo spot =====
pickFromCanvasBtn.addEventListener('click', () => {
  alert('Clicca sulla mappa: le coordinate appariranno nei campi x,y');
  const once = (e) => {
    const { ix, iy } = screenToImage(e.clientX, e.clientY);
    if (ix >= 0 && iy >= 0 && ix <= imgW && iy <= imgH) {
      spotX.value = to6(ix / imgW);
      spotY.value = to6(iy / imgH);
    }
    viewport.removeEventListener('click', once);
  };
  viewport.addEventListener('click', once);
});

newSpotForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!imgW || !imgH) { alert('Carica prima un\'immagine.'); return; }
  const x = clamp(Number(spotX.value), 0, 1);
  const y = clamp(Number(spotY.value), 0, 1);
  if (Number.isNaN(x) || Number.isNaN(y)) { alert('Coord non valide.'); return; }
  const id = String(spots.length + 1);
  const nome = spotNome.value || '';
  const valore = spotValore.value || (nome || '');

  const spot = { id, nome, valore, x: to6(x), y: to6(y) };
  spots.push(spot);
  addMarkerElement(spot);
  renderSpotsList();

  newSpotForm.reset();
});

// ===== Lista spots: edit / delete =====
function renderSpotsList() {
  spotsList.innerHTML = '';
  spots.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'spot-card';
    card.id = `card-${s.id}`;

    const row = document.createElement('div');
    row.className = 'spot-row';

    // Nome + Valore
    const line1 = document.createElement('div');
    line1.className = 'line';
    const nomeInp = document.createElement('input');
    nomeInp.value = s.nome || '';
    nomeInp.placeholder = 'Nome (visibile)';
    const valInp = document.createElement('input');
    valInp.value = s.valore || '';
    valInp.placeholder = 'ID';

    // Se c'è dataset, collega l'autocomplete solo al nome; al change, aggiorna valore
    if (dataset.length) {
      nomeInp.setAttribute('list', 'displayValues');
      nomeInp.addEventListener('change', () => {
        const rowm = dataset.find(r => String(r[displayField]) === String(nomeInp.value));
        if (rowm && (valueField in rowm)) valInp.value = String(rowm[valueField]);
        s.nome = nomeInp.value; s.valore = valInp.value; updateMarkerLabel(s);
      });
    }
    nomeInp.addEventListener('input', () => { s.nome = nomeInp.value; updateMarkerLabel(s); });
    valInp.addEventListener('input', () => { s.valore = valInp.value; });

    line1.appendChild(nomeInp); line1.appendChild(valInp);

    // Coord
    const line2 = document.createElement('div');
    line2.className = 'line';
    const xInp = document.createElement('input');
    xInp.type = 'number'; xInp.step = '0.000001'; xInp.min = '0'; xInp.max = '1'; xInp.value = s.x;
    const yInp = document.createElement('input');
    yInp.type = 'number'; yInp.step = '0.000001'; yInp.min = '0'; yInp.max = '1'; yInp.value = s.y;
    xInp.addEventListener('change', () => { s.x = to6(clamp(Number(xInp.value), 0, 1)); repositionMarker(s); });
    yInp.addEventListener('change', () => { s.y = to6(clamp(Number(yInp.value), 0, 1)); repositionMarker(s); });
    line2.appendChild(xInp); line2.appendChild(yInp);

    row.appendChild(line1); row.appendChild(line2);
    card.appendChild(row);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'spot-actions';
    const left = document.createElement('div'); left.className = 'left';

    const focusBtn = document.createElement('button');
    focusBtn.type = 'button'; focusBtn.textContent = 'Centra';
    focusBtn.addEventListener('click', () => centerOnSpot(s));

    const delBtn = document.createElement('button');
    delBtn.type = 'button'; delBtn.textContent = 'Elimina';
    delBtn.className = 'danger';
    delBtn.addEventListener('click', () => deleteSpot(s.id));

    left.appendChild(focusBtn);
    left.appendChild(delBtn);

    const coordTxt = document.createElement('div');
    coordTxt.className = 'coord';
    coordTxt.textContent = `x:${s.x} y:${s.y}`;

    actions.appendChild(left);
    actions.appendChild(coordTxt);
    card.appendChild(actions);
    spotsList.appendChild(card);
  });
}

function focusSpotInList(id) {
  const el = document.getElementById(`card-${id}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function updateMarkerLabel(s) {
  const el = markersLayer.querySelector(`.marker[data-id="${s.id}"]`);
  if (el) { el.dataset.label = s.nome || ''; el.title = s.nome || ''; }
}
function repositionMarker(s) {
  const el = markersLayer.querySelector(`.marker[data-id="${s.id}"]`);
  if (el) {
    el.style.left = `${s.x * imgW}px`;
    el.style.top  = `${s.y * imgH}px`;
  } else {
    addMarkerElement(s);
  }
  renderSpotsList();
}
function centerOnSpot(s) {
  const ix = s.x * imgW, iy = s.y * imgH;
  const rect = viewport.getBoundingClientRect();
  const targetX = rect.width / 2, targetY = rect.height / 2;
  // porta il punto al centro (mantieni scala)
  tx = targetX - ix * scale;
  ty = targetY - iy * scale;
  updateStageTransform();
}
function deleteSpot(id) {
  spots = spots.filter(s => s.id !== id);
  redrawMarkers();
  renderSpotsList();
}

// ===== Import/Export spots =====
fileSpotsImport.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try {
    const arr = JSON.parse(await f.text());
    if (!Array.isArray(arr)) throw new Error('JSON non è una lista');
    spots = arr.map((r, i) => ({
      id: String(r.id ?? (i+1)),
      nome: String(r.nome ?? ''),
      valore: r.valore != null ? String(r.valore) : (r.nome ?? ''),
      x: to6(Number(r.x)),
      y: to6(Number(r.y)),
    }));
    redrawMarkers();
    renderSpotsList();
  } catch (e2) {
    alert('JSON spot non valido.');
  }
});

exportJSONBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(spots, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'spots.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

exportZIPBtn.addEventListener('click', async () => {
  if (!imgW || !imgH) { alert('Nessuna immagine.'); return; }
  const zip = new JSZip();

  // 1) spots.json
  zip.file('spots.json', JSON.stringify(spots, null, 2));

  // 2) image.png (se immagine era TIFF, usiamo il canvas; se JPG/PNG, possiamo comunque usare il canvas)
  const dataURL = canvas.toDataURL('image/png');
  const imageData = dataURL.split(',')[1];
  zip.file('image.png', imageData, { base64: true });

  // 3) viewer.html (standalone, legge image.png + spots.json)
  const viewerHtml = buildViewerHTML();
  zip.file('viewer.html', viewerHtml);

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tagged_map_package.zip';
  a.click();
  URL.revokeObjectURL(a.href);
});

// genera un viewer statico minimale
function buildViewerHTML() {
  return `<!doctype html>
<meta charset="utf-8">
<title>Viewer – Mappa taggata</title>
<style>
  body{margin:0;font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f7f8;color:#111827}
  header{padding:10px 14px;background:#fff;border-bottom:1px solid #e5e7eb}
  main{display:grid;grid-template-columns:1fr 320px;gap:12px;padding:12px}
  #viewport{border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;height:calc(100vh - 120px);min-height:420px;overflow:hidden;position:relative}
  #stage{position:absolute;left:0;top:0;transform-origin:0 0}
  #img{display:block;user-select:none;-webkit-user-drag:none}
  #markers{position:absolute;left:0;top:0;pointer-events:none}
  .marker{position:absolute;width:14px;height:14px;border:2px solid #111;background:#fff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 1px 3px #0002;pointer-events:auto;cursor:pointer}
  .tooltip{position:absolute;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:8px;box-shadow:0 1px 8px #0002;display:none}
  .panel{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px}
  .row{display:flex;gap:8px}
  button{padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer}
</style>
<header>
  <strong>Mappa taggata</strong>
</header>
<main>
  <div class="panel">
    <div class="row">
      <button id="zoomIn">Zoom +</button>
      <button id="zoomOut">Zoom −</button>
      <button id="zoomFit">Adatta</button>
    </div>
    <div id="viewport">
      <div id="stage">
        <img id="img" src="image.png" alt="" />
        <div id="markers"></div>
      </div>
      <div id="tooltip" class="tooltip"></div>
    </div>
  </div>
  <aside class="panel">
    <h3>Tag</h3>
    <ul id="list"></ul>
  </aside>
</main>
<script>
  const viewport=document.getElementById('viewport');
  const stage=document.getElementById('stage');
  const img=document.getElementById('img');
  const markers=document.getElementById('markers');
  const tooltip=document.getElementById('tooltip');
  const list=document.getElementById('list');
  let imgW=0,imgH=0,scale=1,tx=0,ty=0,spots=[];
  fetch('spots.json').then(r=>r.json()).then(d=>{spots=d; renderList(); if(img.complete) init(); else img.onload=init;});
  function init(){
    imgW=img.naturalWidth; imgH=img.naturalHeight;
    markers.style.width=imgW+'px'; markers.style.height=imgH+'px';
    fit(); drawMarkers();
  }
  function fit(){
    const r=viewport.getBoundingClientRect(), s=Math.min(r.width/imgW, r.height/imgH);
    scale=s; tx=(r.width-imgW*s)/2; ty=(r.height-imgH*s)/2;
    stage.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')';
  }
  function setScaleAround(f,cx,cy){
    const prev=scale,next=Math.max(.25,Math.min(8,prev*f));
    const r=viewport.getBoundingClientRect(),vx=cx-r.left,vy=cy-r.top;
    tx=vx-((vx-tx)*(next/prev)); ty=vy-((vy-ty)*(next/prev)); scale=next;
    stage.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')';
  }
  function drawMarkers(){
    markers.innerHTML='';
    spots.forEach((s,i)=>{
      const el=document.createElement('div');
      el.className='marker';
      el.style.left=(s.x*imgW)+'px';
      el.style.top=(s.y*imgH)+'px';
      el.title=s.nome||'';
      el.addEventListener('click',(e)=> showTip(e.clientX,e.clientY,s));
      markers.appendChild(el);
    });
  }
  function renderList(){
    list.innerHTML='';
    spots.forEach(s=>{
      const li=document.createElement('li');
      li.textContent=(s.nome||'')+(s.valore? ' — '+s.valore:'');
      li.style.cursor='pointer';
      li.addEventListener('click',()=> centerOn(s));
      list.appendChild(li);
    });
  }
  function centerOn(s){
    const ix=s.x*imgW,iy=s.y*imgH,r=viewport.getBoundingClientRect();
    const cx=r.width/2,cy=r.height/2; tx=cx-ix*scale; ty=cy-iy*scale;
    stage.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')';
  }
  function showTip(cx,cy,s){
    const r=viewport.getBoundingClientRect();
    tooltip.style.left=(cx-r.left+10)+'px';
    tooltip.style.top=(cy-r.top+10)+'px';
    tooltip.style.display='block';
    tooltip.textContent=(s.nome||'')+(s.valore? ' — '+s.valore:'');
    setTimeout(()=>tooltip.style.display='none',2000);
  }
  document.getElementById('zoomIn').onclick=()=>{const r=viewport.getBoundingClientRect(); setScaleAround(1.25,r.left+r.width/2,r.top+r.height/2)}
  document.getElementById('zoomOut').onclick=()=>{const r=viewport.getBoundingClientRect(); setScaleAround(1/1.25,r.left+r.width/2,r.top+r.height/2)}
  document.getElementById('zoomFit').onclick=fit;
  window.addEventListener('resize',fit);
  let pan=false,sx=0,sy=0,stx=0,sty=0;
  viewport.addEventListener('mousedown',e=>{pan=true;sx=e.clientX;sy=e.clientY;stx=tx;sty=ty;});
  window.addEventListener('mousemove',e=>{if(!pan)return; tx=stx+(e.clientX-sx); ty=sty+(e.clientY-sy); stage.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')';});
  window.addEventListener('mouseup',()=>pan=false);
  viewport.addEventListener('wheel',e=>{e.preventDefault(); setScaleAround(e.deltaY<0?1.15:1/1.15,e.clientX,e.clientY)},{passive:false});
</script>`;
}

// ===== UI pan/zoom: resize fit
window.addEventListener('resize', fitToViewport);

// ===== Selezione rapida: click su viewport per compilare x,y in form
viewport.addEventListener('click', (e) => {
  const { ix, iy } = screenToImage(e.clientX, e.clientY);
  if (ix >= 0 && iy >= 0 && ix <= imgW && iy <= imgH) {
    spotX.value = to6(ix / imgW);
    spotY.value = to6(iy / imgH);
  }
});
