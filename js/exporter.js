// js/exporter.js
import { state, els } from './state.js';

export function bindExporter(){
  // --- Esporta JSON completo degli spot ---
  els.exportJSONBtn?.addEventListener('click', ()=>{
    downloadBlob(JSON.stringify(state.spots, null, 2), 'spots.json', 'application/json');
  });

  // --- Esporta ZIP con viewer ---
  els.exportZIPBtn?.addEventListener('click', async ()=>{
    if (!state.imgW) return alert('Nessuna immagine caricata.');
    if (!els.canvas) return alert('Canvas non disponibile.');

    const zip = new JSZip();
    zip.file('spots.json', JSON.stringify(state.spots, null, 2));

    // Snapshot dell'immagine corrente dal canvas
    const dataURL = els.canvas.toDataURL('image/png');
    zip.file('image.png', dataURL.split(',')[1], { base64:true });

    // Viewer standalone
    zip.file('viewer.html', buildViewerHTML());

    const blob = await zip.generateAsync({ type:'blob' });
    downloadBlob(blob, 'tagged_map_package.zip', 'application/zip');
  });

  // ===== NUOVO: Export tabella d’intersezione =====
  els.exportIntersectCSVBtn?.addEventListener('click', ()=>{
    const rows = buildIntersectionRows(); if (!rows) return;
    const csv = toCSV(rows, ['id_map','id_place']);
    downloadBlob(csv, 'intersection.csv', 'text/csv');
  });

  els.exportIntersectJSONBtn?.addEventListener('click', ()=>{
    const rows = buildIntersectionRows(); if (!rows) return;
    downloadBlob(JSON.stringify(rows, null, 2), 'intersection.json', 'application/json');
  });
}

/* ===================== Helper comuni ===================== */

function downloadBlob(data, filename, mime){
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

// Viewer statico: mostra nome, valore e note
function buildViewerHTML(){
  return `<!doctype html>
<meta charset="utf-8">
<title>Viewer – Mappa taggata</title>
<style>
  body{margin:0;font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f7f8;color:#111827}
  header{padding:10px 14px;background:#fff;border-bottom:1px solid #e5e7eb}
  main{display:grid;grid-template-columns:1fr 340px;gap:12px;padding:12px}
  #viewport{border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;height:calc(100vh - 120px);min-height:420px;overflow:hidden;position:relative}
  #stage{position:absolute;left:0;top:0;transform-origin:0 0}
  #img{display:block;user-select:none;-webkit-user-drag:none}
  #markers{position:absolute;left:0;top:0;pointer-events:none}
  .marker{position:absolute;width:14px;height:14px;border:2px solid #111;background:#fff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 1px 3px #0002;pointer-events:auto;cursor:pointer}
  .panel{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px}
  .row{display:flex;gap:8px}
  button{padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer}
  .tip{position:absolute;max-width:280px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px;box-shadow:0 1px 10px #0002;display:none}
  .tip h4{margin:0 0 6px;font-size:14px}
  .tip p{margin:4px 0}
  .tip small{color:#6b7280}
  #list{list-style:none;padding:0;margin:0}
  #list li{padding:6px;border-bottom:1px dashed #eee;cursor:pointer}
</style>
<header><strong>Mappa taggata</strong></header>
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
      <div id="tip" class="tip"></div>
    </div>
  </div>
  <aside class="panel">
    <h3>Tag</h3>
    <ul id="list"></ul>
  </aside>
</main>
<script>
  const viewport=document.getElementById('viewport'), stage=document.getElementById('stage');
  const img=document.getElementById('img'), markers=document.getElementById('markers');
  const tip=document.getElementById('tip'), list=document.getElementById('list');
  let imgW=0,imgH=0,scale=1,tx=0,ty=0,spots=[];
  fetch('spots.json').then(r=>r.json()).then(d=>{spots=d; if(img.complete) init(); else img.onload=init;});
  function init(){ imgW=img.naturalWidth; imgH=img.naturalHeight; fit(); draw(); renderList(); }
  function fit(){ const r=viewport.getBoundingClientRect(), s=Math.min(r.width/imgW,r.height/imgH); scale=s; tx=(r.width-imgW*s)/2; ty=(r.height-imgH*s)/2; apply(); }
  function apply(){ stage.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')'; }
  function setScaleAround(f,cx,cy){ const prev=scale,next=Math.max(.25,Math.min(8,prev*f)); const r=viewport.getBoundingClientRect(); const vx=cx-r.left,vy=cy-r.top; tx=vx-((vx-tx)*(next/prev)); ty=vy-((vy-ty)*(next/prev)); scale=next; apply(); }
  function draw(){ markers.innerHTML=''; spots.forEach(s=>{ const el=document.createElement('div'); el.className='marker'; el.style.left=(s.x*imgW)+'px'; el.style.top=(s.y*imgH)+'px'; el.title=s.nome||''; el.addEventListener('click',(e)=>showTip(e.clientX,e.clientY,s)); markers.appendChild(el); }); }
  function renderList(){ list.innerHTML=''; spots.forEach(s=>{ const li=document.createElement('li'); li.textContent=(s.nome||'')+(s.valore?' — '+s.valore:''); li.addEventListener('click',()=>centerOn(s)); list.appendChild(li); }); }
  function centerOn(s){ const ix=s.x*imgW,iy=s.y*imgH; const r=viewport.getBoundingClientRect(); tx=r.width/2 - ix*scale; ty=r.height/2 - iy*scale; apply(); }
  function showTip(cx,cy,s){ const r=viewport.getBoundingClientRect(); tip.innerHTML='<h4>'+escapeHtml(s.nome||'')+'</h4>'+(s.valore?'<p><b>Valore:</b> '+escapeHtml(s.valore)+'</p>':'')+(s.note?'<p><small>'+escapeHtml(s.note)+'</small></p>':''); tip.style.left=(cx-r.left+10)+'px'; tip.style.top=(cy-r.top+10)+'px'; tip.style.display='block'; setTimeout(()=>tip.style.display='none',2500); }
  function escapeHtml(x){ return String(x).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
  document.getElementById('zoomIn').onclick=()=>{const r=viewport.getBoundingClientRect(); setScaleAround(1.25,r.left+r.width/2,r.top+r.height/2)};
  document.getElementById('zoomOut').onclick=()=>{const r=viewport.getBoundingClientRect(); setScaleAround(1/1.25,r.left+r.width/2,r.top+r.height/2)};
  document.getElementById('zoomFit').onclick=fit;
  window.addEventListener('resize',fit);
  let pan=false,sx=0,sy=0,stx=0,sty=0;
  viewport.addEventListener('mousedown',e=>{pan=true;sx=e.clientX;sy=e.clientY;stx=tx;sty=ty;});
  window.addEventListener('mousemove',e=>{if(!pan)return; tx=stx+(e.clientX-sx); ty=sty+(e.clientY-sy); apply();});
  window.addEventListener('mouseup',()=>pan=false);
  viewport.addEventListener('wheel',e=>{e.preventDefault(); setScaleAround(e.deltaY<0?1.15:1/1.15,e.clientX,e.clientY)},{passive:false});
</script>`;
}

/* ===================== Intersezione id_map | id_place ===================== */

function getMapIdFromImageName(){
  // "01.png" -> "01" ; "mappa.v1.tif" -> "mappa.v1"
  const name = (state.imageName || '').trim();
  if (!name) return '';
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

function buildIntersectionRows(){
  if (!state.imageName) { alert('Nessuna immagine caricata: impossibile determinare id_map.'); return null; }
  const id_map = getMapIdFromImageName();
  if (!id_map) { alert('Nome file immagine non valido: impossibile determinare id_map.'); return null; }

  const rows = state.spots.map(s => ({ id_map, id_place: (s.valore ?? '').toString() }));

  // Avviso su valori mancanti
  const missing = rows.filter(r => !r.id_place || r.id_place.trim() === '');
  if (missing.length){
    const proceed = confirm(
      `Attenzione: ${missing.length} tag non hanno il campo "valore".\n` +
      `Suggerimento: associa un campo ID nella sezione Dati oppure compila manualmente il "Valore da salvare".\n\n` +
      `Vuoi esportare comunque (gli id_place mancanti resteranno vuoti)?`
    );
    if (!proceed) return null;
  }
  return rows;
}

function toCSV(rows, headers){
  const head = headers.join(',');
  const lines = rows.map(r => headers.map(h => csvEscape(r[h])).join(','));
  return [head, ...lines].join('\n');
}
function csvEscape(v){
  const s = (v==null) ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
  return s;
}
