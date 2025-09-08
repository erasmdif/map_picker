import { state, els, emit } from './state.js';
import { fitToViewport } from './panzoom.js';

export function bindImageLoader(){
  els.fileImage.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    if (isTiff(f)) await loadTIFF(f);
    else await loadGeneric(f);
  });
  els.pageSelect.addEventListener('change', async ()=>{
    const idx = +els.pageSelect.value;
    await renderTiffPage(idx);
  });
}

function isTiff(file){
  const name = (file.name||'').toLowerCase();
  return file.type==='image/tiff'||name.endsWith('.tif')||name.endsWith('.tiff');
}

async function loadGeneric(file){
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = ()=>{
    state.imgW = img.naturalWidth; state.imgH = img.naturalHeight;
    els.canvas.width = state.imgW; els.canvas.height = state.imgH;
    els.ctx.clearRect(0,0,els.canvas.width,els.canvas.height);
    state.imageName = file.name || '';
    els.ctx.drawImage(img,0,0);
    URL.revokeObjectURL(url);
    els.pageSelect.classList.add('hidden');
    els.pageLabel.classList.add('hidden');
    fitToViewport();
    emit('image:loaded');
  };
  img.onerror = ()=>{ URL.revokeObjectURL(url); alert('Immagine non caricabile'); };
  img.src = url;
}

// TIFF
let tiff=null, tiffImages=null;
async function loadTIFF(file){
  const buf = await file.arrayBuffer();
  tiff = await GeoTIFF.fromArrayBuffer(buf);
  tiffImages = await tiff.getImages();
  state.imageName = file.name || '';
  if (tiffImages.length>1){
    els.pageSelect.innerHTML='';
    tiffImages.forEach((_,i)=>{
      const o=document.createElement('option'); o.value=i; o.textContent=`Pagina ${i+1}`;
      els.pageSelect.appendChild(o);
    });
    els.pageSelect.classList.remove('hidden');
    els.pageLabel.classList.remove('hidden');
  } else {
    els.pageSelect.classList.add('hidden');
    els.pageLabel.classList.add('hidden');
  }
  await renderTiffPage(0);
}

export async function renderTiffPage(idx){
  const img = tiffImages[idx];
  const W = img.getWidth(), H = img.getHeight();
  const maxPixels = 20_000_000;
  let outW=W, outH=H;
  if (W*H>maxPixels){ const s=Math.sqrt(maxPixels/(W*H)); outW=Math.round(W*s); outH=Math.round(H*s); }
  const sp = img.getSamplesPerPixel();
  const ras = await img.readRasters({ interleave:true, width:outW, height:outH });

  const imageData = els.ctx.createImageData(outW,outH);
  const data = imageData.data; const n=outW*outH;
  if (sp===3 || sp===4){
    const hasA = sp===4;
    if (ras.BYTES_PER_ELEMENT===1){
      for(let i=0,j=0;i<n;i++,j+=sp){
        const o=i*4;
        data[o]=ras[j]; data[o+1]=ras[j+1]; data[o+2]=ras[j+2]; data[o+3]= hasA? ras[j+3]:255;
      }
    } else {
      let max=0; for(let k=0;k<ras.length;k+=sp){ max=Math.max(max, ras[k], ras[k+1], ras[k+2]); }
      const denom=max||1;
      for(let i=0,j=0;i<n;i++,j+=sp){
        const o=i*4;
        data[o]=Math.round((ras[j]/denom)*255);
        data[o+1]=Math.round((ras[j+1]/denom)*255);
        data[o+2]=Math.round((ras[j+2]/denom)*255);
        data[o+3]=255;
      }
    }
  } else if (sp===1){
    let min=Infinity,max=-Infinity; for(let i=0;i<n;i++){ const v=ras[i]; if(v<min)min=v; if(v>max)max=v; }
    const range=(max-min)||1;
    for(let i=0;i<n;i++){ const o=i*4, v=Math.round(((ras[i]-min)/range)*255); data[o]=data[o+1]=data[o+2]=v; data[o+3]=255; }
  } else { alert('TIFF: canali non supportati'); return; }

  els.canvas.width = outW; els.canvas.height = outH;
  state.imgW = outW; state.imgH = outH;
  els.ctx.putImageData(imageData,0,0);
  fitToViewport();
  emit('image:loaded');
}
