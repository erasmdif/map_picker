// js/panzoom.js
import { state, els, emit, util } from './state.js';

export function fitToViewport(){
  if (!els.viewport) return;
  const vpW = els.viewport.clientWidth, vpH = els.viewport.clientHeight;
  if (!state.imgW || !state.imgH) return;
  const s = Math.min(vpW / state.imgW, vpH / state.imgH);
  state.scale = s;
  state.tx = (vpW - state.imgW * s) / 2;
  state.ty = (vpH - state.imgH * s) / 2;
  applyTransform();
}

export function applyTransform(){
  if (els.stage) els.stage.style.transform = `translate(${state.tx}px,${state.ty}px) scale(${state.scale})`;
  emit('panzoom:changed');
}

export function setScaleAround(factor, cx, cy){
  if (!els.viewport) return;
  const prev = state.scale;
  const next = util.clamp(prev * factor, 0.25, 8);
  const r = els.viewport.getBoundingClientRect();
  const vx = cx - r.left, vy = cy - r.top;
  state.tx = vx - ((vx - state.tx) * (next / prev));
  state.ty = vy - ((vy - state.ty) * (next / prev));
  state.scale = next;
  applyTransform();
}

export function screenToImage(clientX, clientY){
  const r = els.viewport.getBoundingClientRect();
  const vx = clientX - r.left, vy = clientY - r.top;
  return { ix: (vx - state.tx) / state.scale, iy: (vy - state.ty) / state.scale };
}

export function bindPanZoomUI(){
  if (!els.viewport) { console.warn('viewport mancante'); return; }

  // Buttons (se presenti)
  els.zoomInBtn?.addEventListener('click', ()=>{
    const r = els.viewport.getBoundingClientRect();
    setScaleAround(1.25, r.left+r.width/2, r.top+r.height/2);
  });
  els.zoomOutBtn?.addEventListener('click', ()=>{
    const r = els.viewport.getBoundingClientRect();
    setScaleAround(1/1.25, r.left+r.width/2, r.top+r.height/2);
  });
  els.zoomFitBtn?.addEventListener('click', fitToViewport);

  window.addEventListener('resize', fitToViewport);

  // Wheel
  els.viewport.addEventListener('wheel', (e)=>{
    e.preventDefault();
    setScaleAround(e.deltaY<0?1.15:1/1.15, e.clientX, e.clientY);
  }, { passive:false });

  // Drag pan
  let pan=false,sx=0,sy=0,stx=0,sty=0;
  els.viewport.addEventListener('mousedown', (e)=>{
    pan=true; sx=e.clientX; sy=e.clientY; stx=state.tx; sty=state.ty;
  });
  window.addEventListener('mousemove', (e)=>{
    if(!pan) return;
    state.tx = stx + (e.clientX - sx);
    state.ty = sty + (e.clientY - sy);
    applyTransform();
  });
  window.addEventListener('mouseup', ()=>{ pan=false; });

  // Quick fill x,y on click (se i campi esistono)
  els.viewport.addEventListener('click', (e)=>{
    if (!els.spotX || !els.spotY) return;
    const {ix,iy} = screenToImage(e.clientX,e.clientY);
    if (ix>=0 && iy>=0 && ix<=state.imgW && iy<=state.imgH){
      els.spotX.value = String(util.to6(ix/state.imgW));
      els.spotY.value = String(util.to6(iy/state.imgH));
    }
  });
}
