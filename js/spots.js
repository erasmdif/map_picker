// js/spots.js
import { state, els, util, on, emit } from './state.js';
import { screenToImage } from './panzoom.js';

export function bindSpots() {
  els.importSpotsBtn?.addEventListener('click', () => {
    els.fileSpotsImport?.click();
  });

  els.newSpotForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.imgW || !state.imgH) { alert('Carica prima un’immagine.'); return; }
    const x = util.clamp(Number(els.spotX?.value), 0, 1);
    const y = util.clamp(Number(els.spotY?.value), 0, 1);
    if (Number.isNaN(x) || Number.isNaN(y)) { alert('Coordinate non valide.'); return; }

    const spot = {
      id: String(state.spots.length + 1),
      nome: els.spotNome?.value || '',
      valore: (els.spotValore?.value || (els.spotNome?.value || '')),
      note: els.spotNote?.value || '',
      x: util.to6(x), y: util.to6(y),
    };
    state.spots.push(spot);
    drawMarker(spot);
    renderList();
    emit('spots:changed');
    els.newSpotForm?.reset();
  });

  els.pickFromCanvasBtn?.addEventListener('click', () => {
    alert('Clicca sulla mappa per compilare i campi x,y.');
    const once = (e) => {
      const { ix, iy } = screenToImage(e.clientX, e.clientY);
      if (ix >= 0 && iy >= 0 && ix <= state.imgW && iy <= state.imgH) {
        if (els.spotX) els.spotX.value = String(util.to6(ix / state.imgW));
        if (els.spotY) els.spotY.value = String(util.to6(iy / state.imgH));
      }
      els.viewport.removeEventListener('click', once);
    };
    els.viewport?.addEventListener('click', once);
  });

  els.fileSpotsImport?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const arr = JSON.parse(await f.text());
      if (!Array.isArray(arr)) throw new Error('JSON non è un array');
      state.spots = arr.map((r, i) => ({
        id: String(r.id ?? (i + 1)),
        nome: String(r.nome ?? ''),
        valore: r.valore != null ? String(r.valore) : (r.nome ?? ''),
        note: r.note != null ? String(r.note) : '',
        x: util.to6(Number(r.x)),
        y: util.to6(Number(r.y)),
      }));
      redrawMarkers();
      renderList();
      emit('spots:changed');
      e.target.value = '';
    } catch (err) {
      console.error(err);
      alert('JSON spot non valido.');
    }
  });

  on('image:loaded', () => { redrawMarkers(); renderList(); });
  on('panzoom:changed', () => {});
}

function clearMarkers(){ if (els.markers) els.markers.innerHTML=''; }

function drawMarker(spot){
  if (!els.markers) return;
  const el = document.createElement('div');
  el.className = 'marker';
  el.dataset.id = spot.id;
  el.dataset.label = spot.nome || '';
  el.title = spot.nome || '';
  el.style.left = `${spot.x * state.imgW}px`;
  el.style.top  = `${spot.y * state.imgH}px`;
  el.draggable = false;

  let dragging=false, sx=0, sy=0, startIx=0, startIy=0;
  el.addEventListener('mousedown', (e)=>{
    e.stopPropagation();
    dragging=true; sx=e.clientX; sy=e.clientY;
    startIx = spot.x*state.imgW; startIy = spot.y*state.imgH;

    const onMove = (ev)=>{
      if(!dragging) return;
      const dx = (ev.clientX - sx) / state.scale;
      const dy = (ev.clientY - sy) / state.scale;
      const ix = util.clamp(startIx + dx, 0, state.imgW);
      const iy = util.clamp(startIy + dy, 0, state.imgH);
      el.style.left = `${ix}px`;
      el.style.top  = `${iy}px`;
    };
    const onUp = ()=>{
      dragging=false; document.removeEventListener('mousemove', onMove);
      const ix = parseFloat(el.style.left), iy = parseFloat(el.style.top);
      spot.x = util.to6(ix/state.imgW); spot.y = util.to6(iy/state.imgH);
      renderList();
      emit('spots:changed');
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, { once:true });
  });

  el.addEventListener('click', (e)=>{
    e.stopPropagation();
    document.getElementById(`card-${spot.id}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
  });

  els.markers.appendChild(el);
}

export function redrawMarkers(){ clearMarkers(); state.spots.forEach(drawMarker); }

export function renderList(){
  if (!els.spotsList) return;
  const wrap = els.spotsList;
  wrap.innerHTML='';

  state.spots.forEach((s)=>{
    const card = document.createElement('div'); card.className='spot-card'; card.id=`card-${s.id}`;
    const row  = document.createElement('div'); row.className='spot-row';

    const l1 = document.createElement('div'); l1.className='line';
    const nomeInp = document.createElement('input'); nomeInp.value=s.nome||''; nomeInp.placeholder='Nome (visibile)';
    const valInp  = document.createElement('input'); valInp.value=s.valore||''; valInp.placeholder='ID';

    if (state.dataset.length){
      nomeInp.setAttribute('list','displayValues');
      nomeInp.addEventListener('change', ()=>{
        const rowm = state.dataset.find(r=> String(r[state.displayField])===String(nomeInp.value));
        if (rowm && (state.valueField in rowm)) valInp.value = String(rowm[state.valueField] ?? '');
        s.nome = nomeInp.value; s.valore = valInp.value; updateMarkerLabel(s); emit('spots:changed');
      });
    }
    nomeInp.addEventListener('input', ()=>{ s.nome = nomeInp.value; updateMarkerLabel(s); emit('spots:changed'); });
    valInp .addEventListener('input', ()=>{ s.valore = valInp.value; emit('spots:changed'); });

    l1.appendChild(nomeInp); l1.appendChild(valInp);

    const lNote = document.createElement('div'); lNote.className='line';
    const noteInp = document.createElement('input'); noteInp.value=s.note||''; noteInp.placeholder='Note';
    noteInp.addEventListener('input', ()=>{ s.note = noteInp.value; emit('spots:changed'); });
    lNote.appendChild(noteInp);

    const l2 = document.createElement('div'); l2.className='line';
    const xInp=document.createElement('input'); xInp.type='number'; xInp.step='0.000001'; xInp.min='0'; xInp.max='1'; xInp.value=String(s.x);
    const yInp=document.createElement('input'); yInp.type='number'; yInp.step='0.000001'; yInp.min='0'; yInp.max='1'; yInp.value=String(s.y);
    xInp.addEventListener('change', ()=>{ s.x = util.to6(util.clamp(Number(xInp.value),0,1)); repositionMarker(s); emit('spots:changed'); });
    yInp.addEventListener('change', ()=>{ s.y = util.to6(util.clamp(Number(yInp.value),0,1)); repositionMarker(s); emit('spots:changed'); });

    l2.appendChild(xInp); l2.appendChild(yInp);

    row.appendChild(l1); row.appendChild(lNote); row.appendChild(l2);
    card.appendChild(row);

    const actions = document.createElement('div'); actions.className='spot-actions';
    const left = document.createElement('div'); left.className='left';

    const centerBtn = document.createElement('button'); centerBtn.type='button'; centerBtn.textContent='Centra';
    centerBtn.addEventListener('click', ()=> centerOn(s));

    const delBtn = document.createElement('button'); delBtn.type='button'; delBtn.textContent='Elimina'; delBtn.className='danger';
    delBtn.addEventListener('click', ()=> deleteSpot(s.id));

    left.appendChild(centerBtn); left.appendChild(delBtn);

    const coordTxt = document.createElement('div'); coordTxt.className='coord'; coordTxt.textContent=`x:${s.x} y:${s.y}`;

    actions.appendChild(left); actions.appendChild(coordTxt);
    card.appendChild(actions);
    wrap.appendChild(card);
  });
}

function updateMarkerLabel(s){
  const el = els.markers?.querySelector(`.marker[data-id="${s.id}"]`);
  if (el){ el.dataset.label = s.nome || ''; el.title = s.nome || ''; }
}
function repositionMarker(s){
  const el = els.markers?.querySelector(`.marker[data-id="${s.id}"]`);
  if (el){ el.style.left = `${s.x*state.imgW}px`; el.style.top = `${s.y*state.imgH}px`; }
  else drawMarker(s);
  renderList();
}
function centerOn(s){
  if (!els.viewport || !els.stage) return;
  const ix = s.x*state.imgW, iy = s.y*state.imgH;
  const r = els.viewport.getBoundingClientRect();
  state.tx = r.width/2 - ix*state.scale;
  state.ty = r.height/2 - iy*state.scale;
  els.stage.style.transform = `translate(${state.tx}px,${state.ty}px) scale(${state.scale})`;
}
function deleteSpot(id){
  state.spots = state.spots.filter(p=>p.id!==id);
  redrawMarkers(); renderList(); emit('spots:changed');
}
