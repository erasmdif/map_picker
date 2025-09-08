import { bindDOM } from './state.js';
import { bindImageLoader } from './imageLoader.js';
import { bindPanZoomUI, fitToViewport } from './panzoom.js';
import { bindDataset } from './dataset.js';
import { bindSpots } from './spots.js';
import { bindExporter } from './exporter.js';
import { initAutosave, loadAutosave } from './storage.js';
import { bindOSM } from './osm.js';


window.addEventListener('DOMContentLoaded', () => {
  bindDOM();
  bindImageLoader();
  bindPanZoomUI();
  bindDataset();
  bindSpots();
  bindExporter();
  bindOSM();  

  initAutosave();
  loadAutosave();

  fitToViewport();
});
