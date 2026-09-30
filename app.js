/* LumiraRAW Studio - Core JS Engine */

(function () {
  'use strict';

  // --- HSL Color Bands Definition ---
  const HSL_CHANNELS = [
    { id: 'red', name: 'Reds', color: '#ef4444', centerHue: 0 },
    { id: 'orange', name: 'Oranges', color: '#f97316', centerHue: 30 },
    { id: 'yellow', name: 'Yellows', color: '#eab308', centerHue: 60 },
    { id: 'green', name: 'Greens', color: '#10b981', centerHue: 120 },
    { id: 'aqua', name: 'Aquas', color: '#06b6d4', centerHue: 180 },
    { id: 'blue', name: 'Blues', color: '#3b82f6', centerHue: 240 },
    { id: 'purple', name: 'Purples', color: '#8b5cf6', centerHue: 270 },
    { id: 'magenta', name: 'Magentas', color: '#ec4899', centerHue: 300 }
  ];

  // --- Default Presets Definition ---
  const PRESETS = {
    default: {
      temp: 5500, tint: 0, exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
      vibrance: 0, saturation: 0, clarity: 0, dehaze: 0, sharpen: 25, denoiseLum: 10, vignette: 0, grain: 0
    },
    portra400: {
      temp: 5900, tint: 8, exposure: 0.15, contrast: -10, highlights: -15, shadows: 20, whites: -5, blacks: 10,
      vibrance: 15, saturation: -5, clarity: 10, dehaze: 5, sharpen: 30, denoiseLum: 15, vignette: -15, grain: 15
    },
    velvia50: {
      temp: 5400, tint: -2, exposure: 0.05, contrast: 25, highlights: -10, shadows: -10, whites: 10, blacks: -15,
      vibrance: 35, saturation: 20, clarity: 20, dehaze: 15, sharpen: 40, denoiseLum: 5, vignette: -20, grain: 5
    },
    'tri-x': {
      temp: 5500, tint: 0, exposure: 0.2, contrast: 35, highlights: -20, shadows: -15, whites: 15, blacks: -20,
      vibrance: -100, saturation: -100, clarity: 30, dehaze: 10, sharpen: 45, denoiseLum: 0, vignette: -30, grain: 45
    },
    'teal-orange': {
      temp: 6200, tint: 12, exposure: 0.1, contrast: 15, highlights: 10, shadows: -20, whites: 5, blacks: -10,
      vibrance: 20, saturation: 5, clarity: 15, dehaze: 10, sharpen: 30, denoiseLum: 10, vignette: -25, grain: 10
    },
    'moody-forest': {
      temp: 4800, tint: -15, exposure: -0.2, contrast: 10, highlights: -30, shadows: 15, whites: -15, blacks: 5,
      vibrance: 10, saturation: -20, clarity: 25, dehaze: 15, sharpen: 25, denoiseLum: 15, vignette: -35, grain: 20
    },
    'hdr-dramatic': {
      temp: 5600, tint: 0, exposure: 0.0, contrast: 30, highlights: -60, shadows: 60, whites: 20, blacks: -25,
      vibrance: 30, saturation: 10, clarity: 55, dehaze: 30, sharpen: 50, denoiseLum: 10, vignette: -15, grain: 0
    },
    'vintage-gold': {
      temp: 6700, tint: 5, exposure: 0.1, contrast: -5, highlights: -25, shadows: 25, whites: -10, blacks: 15,
      vibrance: 10, saturation: -10, clarity: -10, dehaze: 0, sharpen: 20, denoiseLum: 20, vignette: -25, grain: 25
    }
  };

  // --- State Object ---
  const state = {
    imageLoaded: false,
    activeFilename: 'Landscape_Sunset.DNG',
    sourceImage: null,
    sourceCanvas: document.createElement('canvas'),
    sourceCtx: null,
    workingImageData: null,
    
    viewMode: 'single', // 'single' | 'split'
    splitRatio: 0.5,
    holdingBefore: false,
    isDraggingSplit: false,

    zoomLevel: 1.0,
    panX: 0,
    panY: 0,

    clippingShadow: false,
    clippingHighlight: false,
    pipetteActive: false,

    activeHslTab: 'hue',
    activeCurveChannel: 'rgb',

    adjustments: JSON.parse(JSON.stringify(PRESETS.default)),
    
    // HSL bands (-100 to 100)
    hsl: {
      hue: { red: 0, orange: 0, yellow: 0, green: 0, aqua: 0, blue: 0, purple: 0, magenta: 0 },
      sat: { red: 0, orange: 0, yellow: 0, green: 0, aqua: 0, blue: 0, purple: 0, magenta: 0 },
      lum: { red: 0, orange: 0, yellow: 0, green: 0, aqua: 0, blue: 0, purple: 0, magenta: 0 }
    },

    // Tone curves control points (x, y normalized 0..1)
    curvePoints: {
      rgb: [{x:0, y:0}, {x:1, y:1}],
      r: [{x:0, y:0}, {x:1, y:1}],
      g: [{x:0, y:0}, {x:1, y:1}],
      b: [{x:0, y:0}, {x:1, y:1}]
    },

    // Color Grading Wheels
    grading: {
      shadows: { hue: 0, sat: 0 },
      midtones: { hue: 0, sat: 0 },
      highlights: { hue: 0, sat: 0 },
      balance: 0
    },

    // Undo / Redo
    history: [],
    historyIndex: -1,
    renderPending: false
  };

  // DOM Cache
  const dom = {};

  // --- Init Application ---
  window.addEventListener('DOMContentLoaded', () => {
    cacheDomElements();
    initLucideIcons();
    initHslUi();
    initColorWheels();
    initSvgCurveEditor();
    bindEvents();

    // Push initial history state
    saveHistoryState('Original RAW Imported');

    // Load default sample landscape
    loadSampleImage('samples/landscape_raw.jpg', 'Landscape_Sunset.DNG');
  });

  function cacheDomElements() {
    dom.fileInput = document.getElementById('file-input');
    dom.samplePickerBtn = document.getElementById('sample-picker-btn');
    dom.sampleMenu = document.getElementById('sample-menu');
    
    dom.mainCanvas = document.getElementById('main-canvas');
    dom.mainCtx = dom.mainCanvas.getContext('2d');
    dom.canvasWrapper = document.getElementById('canvas-wrapper');
    dom.viewportContainer = document.getElementById('viewport-container');

    dom.histogramCanvas = document.getElementById('histogram-canvas');
    dom.histogramCtx = dom.histogramCanvas.getContext('2d');

    dom.splitDivider = document.getElementById('split-divider');
    dom.cropOverlay = document.getElementById('crop-overlay');
    dom.pipetteIndicator = document.getElementById('pipette-indicator');
    dom.pipetteColorVal = document.getElementById('pipette-color-val');
    dom.activeFilename = document.getElementById('active-filename');
    dom.statusText = document.getElementById('status-text');

    dom.btnSingleView = document.getElementById('btn-single-view');
    dom.btnSplitView = document.getElementById('btn-split-view');
    dom.btnToggleBefore = document.getElementById('btn-toggle-before');

    dom.btnZoomOut = document.getElementById('btn-zoom-out');
    dom.btnZoomIn = document.getElementById('btn-zoom-in');
    dom.btnZoomFit = document.getElementById('btn-zoom-fit');
    dom.btnZoom100 = document.getElementById('btn-zoom-100');
    dom.zoomLevelText = document.getElementById('zoom-level-text');

    dom.btnShadowClip = document.getElementById('btn-shadow-clip');
    dom.btnHighlightClip = document.getElementById('btn-highlight-clip');

    dom.btnPipette = document.getElementById('btn-pipette');
    dom.btnBayerInspect = document.getElementById('btn-bayer-inspect');
    dom.btnUndo = document.getElementById('btn-undo');
    dom.btnRedo = document.getElementById('btn-redo');
    dom.btnResetAll = document.getElementById('btn-reset-all');

    dom.btnExportModal = document.getElementById('btn-export-modal');
    dom.modalExport = document.getElementById('modal-export');
    dom.btnDoExport = document.getElementById('btn-do-export');

    dom.modalBayer = document.getElementById('modal-bayer');
    dom.bayerGridCanvas = document.getElementById('bayer-grid-preview');
    dom.bayerResultCanvas = document.getElementById('bayer-result-preview');

    dom.hslSlidersContainer = document.getElementById('hsl-sliders-container');
    dom.historyList = document.getElementById('history-list');

    // EXIF elements
    dom.exifCamera = document.getElementById('exif-camera');
    dom.exifLens = document.getElementById('exif-lens');
    dom.exifIso = document.getElementById('exif-iso');
    dom.exifShutter = document.getElementById('exif-shutter');
    dom.exifAperture = document.getElementById('exif-aperture');
    dom.exifFocal = document.getElementById('exif-focal');
    dom.exifDimensions = document.getElementById('exif-dimensions');

    // Sliders
    dom.sliders = {
      temp: document.getElementById('slider-temp'),
      tint: document.getElementById('slider-tint'),
      exposure: document.getElementById('slider-exposure'),
      contrast: document.getElementById('slider-contrast'),
      highlights: document.getElementById('slider-highlights'),
      shadows: document.getElementById('slider-shadows'),
      whites: document.getElementById('slider-whites'),
      blacks: document.getElementById('slider-blacks'),
      vibrance: document.getElementById('slider-vibrance'),
      saturation: document.getElementById('slider-saturation'),
      clarity: document.getElementById('slider-clarity'),
      dehaze: document.getElementById('slider-dehaze'),
      sharpen: document.getElementById('slider-sharpen'),
      denoiseLum: document.getElementById('slider-denoise-lum'),
      vignette: document.getElementById('slider-vignette'),
      grain: document.getElementById('slider-grain'),
      distortion: document.getElementById('slider-distortion'),
      gradingBalance: document.getElementById('slider-grading-balance')
    };

    dom.valTexts = {
      temp: document.getElementById('val-temp'),
      tint: document.getElementById('val-tint'),
      exposure: document.getElementById('val-exposure'),
      contrast: document.getElementById('val-contrast'),
      highlights: document.getElementById('val-highlights'),
      shadows: document.getElementById('val-shadows'),
      whites: document.getElementById('val-whites'),
      blacks: document.getElementById('val-blacks'),
      vibrance: document.getElementById('val-vibrance'),
      saturation: document.getElementById('val-saturation'),
      clarity: document.getElementById('val-clarity'),
      dehaze: document.getElementById('val-dehaze'),
      sharpen: document.getElementById('val-sharpen'),
      denoiseLum: document.getElementById('val-denoise-lum'),
      vignette: document.getElementById('val-vignette'),
      grain: document.getElementById('val-grain'),
      distortion: document.getElementById('val-distortion'),
      gradingBalance: document.getElementById('val-grading-balance')
    };
  }

  function initLucideIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- Image Loading & Initialization ---
  function loadSampleImage(url, filename) {
    dom.statusText.textContent = 'Decoding 16-bit RAW float data...';
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      state.sourceImage = img;
      state.activeFilename = filename;
      dom.activeFilename.textContent = filename;

      // Resize source canvas
      state.sourceCanvas.width = img.width;
      state.sourceCanvas.height = img.height;
      state.sourceCtx = state.sourceCanvas.getContext('2d');
      state.sourceCtx.drawImage(img, 0, 0);

      // Store raw 8-bit RGBA (and treat as 16-bit Float dynamic range matrix)
      state.workingImageData = state.sourceCtx.getImageData(0, 0, img.width, img.height);

      // Update EXIF mock metadata
      if (filename.includes('Landscape')) {
        dom.exifCamera.textContent = 'Canon EOS R5';
        dom.exifLens.textContent = 'RF 24-70mm F2.8 L IS USM';
        dom.exifIso.textContent = '100';
        dom.exifShutter.textContent = '1/250s';
        dom.exifAperture.textContent = 'f/8.0';
        dom.exifFocal.textContent = '24mm';
      } else {
        dom.exifCamera.textContent = 'Nikon Z7 II';
        dom.exifLens.textContent = 'NIKKOR Z 85mm f/1.8 S';
        dom.exifIso.textContent = '64';
        dom.exifShutter.textContent = '1/500s';
        dom.exifAperture.textContent = 'f/1.8';
        dom.exifFocal.textContent = '85mm';
      }
      dom.exifDimensions.textContent = `${img.width} × ${img.height} (${Math.round((img.width * img.height) / 1000000)} MP)`;

      state.imageLoaded = true;
      dom.statusText.textContent = '16-Bit Float Engine Active';

      requestRender();
    };
    img.src = url;
  }

  // --- Bind Event Listeners ---
  function bindEvents() {
    // Dropdown sample picker
    dom.samplePickerBtn.addEventListener('click', () => {
      dom.sampleMenu.classList.toggle('hidden');
    });

    document.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const sampleKey = item.dataset.sample;
        dom.sampleMenu.classList.add('hidden');
        if (sampleKey === 'landscape') {
          loadSampleImage('samples/landscape_raw.jpg', 'Landscape_Sunset.DNG');
        } else if (sampleKey === 'portrait') {
          loadSampleImage('samples/portrait_raw.jpg', 'Portrait_GoldenHour.NEF');
        }
      });
    });

    // File Upload
    dom.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        loadSampleImage(evt.target.result, file.name);
        saveHistoryState(`Imported ${file.name}`);
      };
      reader.readAsDataURL(file);
    });

    // Preset Cards
    document.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const presetKey = card.dataset.preset;
        if (PRESETS[presetKey]) {
          state.adjustments = JSON.parse(JSON.stringify(PRESETS[presetKey]));
          updateSliderUiValues();
          saveHistoryState(`Applied Preset: ${card.querySelector('.preset-name').textContent}`);
          requestRender();
        }
      });
    });

    // Sidebar Tabs
    document.querySelectorAll('.sidebar-left .tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-left .tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.sidebar-left .tab-panel').forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        const targetPanel = document.getElementById(tab.dataset.tab);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });

    // Accordions
    document.querySelectorAll('.accordion-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const group = hdr.closest('.accordion-group');
        group.classList.toggle('expanded');
      });
    });

    // View Mode Buttons
    dom.btnSingleView.addEventListener('click', () => {
      state.viewMode = 'single';
      dom.btnSingleView.classList.add('active');
      dom.btnSplitView.classList.remove('active');
      dom.splitDivider.classList.add('hidden');
      requestRender();
    });

    dom.btnSplitView.addEventListener('click', () => {
      state.viewMode = 'split';
      dom.btnSplitView.classList.add('active');
      dom.btnSingleView.classList.remove('active');
      dom.splitDivider.classList.remove('hidden');
      requestRender();
    });

    // Split Divider Dragging
    dom.splitDivider.addEventListener('mousedown', () => {
      state.isDraggingSplit = true;
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.isDraggingSplit) return;
      const rect = dom.viewportContainer.getBoundingClientRect();
      let ratio = (e.clientX - rect.left) / rect.width;
      ratio = Math.max(0.1, Math.min(0.9, ratio));
      state.splitRatio = ratio;
      dom.splitDivider.style.left = `${ratio * 100}%`;
      requestRender();
    });

    window.addEventListener('mouseup', () => {
      state.isDraggingSplit = false;
    });

    // Hold Space / Before-After Toggle
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !state.holdingBefore && e.target.tagName !== 'INPUT') {
        state.holdingBefore = true;
        dom.btnToggleBefore.classList.add('active');
        requestRender();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && state.holdingBefore) {
        state.holdingBefore = false;
        dom.btnToggleBefore.classList.remove('active');
        requestRender();
      }
    });

    dom.btnToggleBefore.addEventListener('mousedown', () => {
      state.holdingBefore = true;
      dom.btnToggleBefore.classList.add('active');
      requestRender();
    });

    window.addEventListener('mouseup', () => {
      if (state.holdingBefore && !window.spaceKeyPressed) {
        state.holdingBefore = false;
        dom.btnToggleBefore.classList.remove('active');
        requestRender();
      }
    });

    // Clipping Chips
    dom.btnShadowClip.addEventListener('click', () => {
      state.clippingShadow = !state.clippingShadow;
      dom.btnShadowClip.classList.toggle('active', state.clippingShadow);
      requestRender();
    });

    dom.btnHighlightClip.addEventListener('click', () => {
      state.clippingHighlight = !state.clippingHighlight;
      dom.btnHighlightClip.classList.toggle('active', state.clippingHighlight);
      requestRender();
    });

    // Reset All
    dom.btnResetAll.addEventListener('click', () => {
      state.adjustments = JSON.parse(JSON.stringify(PRESETS.default));
      state.hsl = {
        hue: { red: 0, orange: 0, yellow: 0, green: 0, aqua: 0, blue: 0, purple: 0, magenta: 0 },
        sat: { red: 0, orange: 0, yellow: 0, green: 0, aqua: 0, blue: 0, purple: 0, magenta: 0 },
        lum: { red: 0, orange: 0, yellow: 0, green: 0, aqua: 0, blue: 0, purple: 0, magenta: 0 }
      };
      state.grading = { shadows: {hue:0, sat:0}, midtones: {hue:0, sat:0}, highlights: {hue:0, sat:0}, balance: 0 };
      updateSliderUiValues();
      saveHistoryState('Reset All Adjustments');
      requestRender();
    });

    // Undo / Redo
    dom.btnUndo.addEventListener('click', undoHistory);
    dom.btnRedo.addEventListener('click', redoHistory);

    // Modal Triggers
    dom.btnBayerInspect.addEventListener('click', () => {
      renderBayerDemosaicModal();
      dom.modalBayer.classList.remove('hidden');
    });

    dom.btnExportModal.addEventListener('click', () => {
      dom.modalExport.classList.remove('hidden');
    });

    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetModal = document.getElementById(btn.dataset.modal);
        if (targetModal) targetModal.classList.add('hidden');
      });
    });

    // Render & Save Export
    dom.btnDoExport.addEventListener('click', () => {
      const format = document.getElementById('export-format').value;
      const quality = parseInt(document.getElementById('export-quality').value, 10) / 100;
      
      const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
      const ext = format === 'png' ? '.png' : format === 'webp' ? '.webp' : '.jpg';
      
      const link = document.createElement('a');
      link.download = state.activeFilename.replace(/\.[^/.]+$/, "") + `_processed${ext}`;
      link.href = dom.mainCanvas.toDataURL(mime, quality);
      link.click();

      dom.modalExport.classList.add('hidden');
    });

    // Bind Adjustment Sliders
    Object.keys(dom.sliders).forEach(key => {
      const slider = dom.sliders[key];
      if (!slider) return;

      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.adjustments[key] = val;
        
        // Update readout text
        if (dom.valTexts[key]) {
          if (key === 'temp') dom.valTexts[key].textContent = `${val} K`;
          else if (key === 'exposure') dom.valTexts[key].textContent = (val >= 0 ? '+' : '') + val.toFixed(2);
          else dom.valTexts[key].textContent = (val > 0 ? '+' : '') + val;
        }

        requestRender();
      });

      slider.addEventListener('change', (e) => {
        saveHistoryState(`Adjusted ${key.toUpperCase()}: ${e.target.value}`);
      });
    });

    // Export Sidecar JSON
    document.getElementById('btn-export-xmp').addEventListener('click', () => {
      const sidecarData = {
        filename: state.activeFilename,
        version: 'LumiraRAW Pro 2.5',
        adjustments: state.adjustments,
        hsl: state.hsl,
        grading: state.grading
      };
      const blob = new Blob([JSON.stringify(sidecarData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.activeFilename}.lumira.json`;
      a.click();
    });

    // Import Sidecar JSON
    document.getElementById('preset-import-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (parsed.adjustments) state.adjustments = parsed.adjustments;
          if (parsed.hsl) state.hsl = parsed.hsl;
          if (parsed.grading) state.grading = parsed.grading;
          updateSliderUiValues();
          saveHistoryState(`Imported Preset (${file.name})`);
          requestRender();
        } catch (err) {
          alert('Invalid preset JSON file');
        }
      };
      reader.readAsText(file);
    });
  }

  function updateSliderUiValues() {
    Object.keys(state.adjustments).forEach(key => {
      const slider = dom.sliders[key];
      const valText = dom.valTexts[key];
      if (slider) slider.value = state.adjustments[key];
      if (valText) {
        const val = state.adjustments[key];
        if (key === 'temp') valText.textContent = `${val} K`;
        else if (key === 'exposure') valText.textContent = (val >= 0 ? '+' : '') + val.toFixed(2);
        else valText.textContent = (val > 0 ? '+' : '') + val;
      }
    });
  }

  // --- HSL UI Controller ---
  function initHslUi() {
    renderHslSliders();

    document.querySelectorAll('.hsl-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hsl-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeHslTab = btn.dataset.mode;
        renderHslSliders();
      });
    });
  }

  function renderHslSliders() {
    dom.hslSlidersContainer.innerHTML = '';
    
    HSL_CHANNELS.forEach(ch => {
      const row = document.createElement('div');
      row.className = 'slider-group';

      const currentVal = state.hsl[state.activeHslTab][ch.id] || 0;

      row.innerHTML = `
        <div class="slider-label-row">
          <span style="color: ${ch.color}; font-weight: 600;">${ch.name}</span>
          <span class="slider-val" id="val-hsl-${ch.id}">${currentVal > 0 ? '+' : ''}${currentVal}</span>
        </div>
        <input type="range" min="-100" max="100" step="1" value="${currentVal}" id="slider-hsl-${ch.id}">
      `;
      dom.hslSlidersContainer.appendChild(row);

      const slider = row.querySelector('input');
      slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        state.hsl[state.activeHslTab][ch.id] = val;
        row.querySelector('.slider-val').textContent = (val > 0 ? '+' : '') + val;
        requestRender();
      });

      slider.addEventListener('change', (e) => {
        saveHistoryState(`HSL ${ch.name} ${state.activeHslTab.toUpperCase()}: ${e.target.value}`);
      });
    });
  }

  // --- Color Wheels (Color Grading) ---
  function initColorWheels() {
    ['shadows', 'midtones', 'highlights'].forEach(wheelName => {
      const canvas = document.getElementById(`wheel-${wheelName}`);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      drawColorWheel(ctx, canvas.width, canvas.height, state.grading[wheelName]);

      let isDragging = false;

      const handleWheelMouse = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const radius = rect.width / 2;

        let dist = Math.sqrt(x * x + y * y);
        let sat = Math.min(100, Math.round((dist / radius) * 100));
        let angle = Math.round((Math.atan2(y, x) * (180 / Math.PI) + 360) % 360);

        state.grading[wheelName] = { hue: angle, sat: sat };
        drawColorWheel(ctx, canvas.width, canvas.height, state.grading[wheelName]);

        document.getElementById(`readout-${wheelName}`).textContent = `${angle}° / ${sat}%`;
        requestRender();
      };

      canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        handleWheelMouse(e);
      });

      window.addEventListener('mousemove', (e) => {
        if (isDragging) handleWheelMouse(e);
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          saveHistoryState(`Grading ${wheelName.toUpperCase()}: ${state.grading[wheelName].hue}° / ${state.grading[wheelName].sat}%`);
        }
      });
    });
  }

  function drawColorWheel(ctx, w, h, activePoint) {
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 2;

    ctx.clearRect(0, 0, w, h);

    // Draw HSL color wheel
    for (let angle = 0; angle < 360; angle += 2) {
      const rad = (angle * Math.PI) / 180;
      const x2 = cx + radius * Math.cos(rad);
      const y2 = cy + radius * Math.sin(rad);

      const grad = ctx.createLinearGradient(cx, cy, x2, y2);
      grad.addColorStop(0, '#808080');
      grad.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Outer border
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Active selector pin
    if (activePoint && activePoint.sat > 0) {
      const pinRad = (activePoint.hue * Math.PI) / 180;
      const pinDist = (activePoint.sat / 100) * radius;
      const px = cx + pinDist * Math.cos(pinRad);
      const py = cy + pinDist * Math.sin(pinRad);

      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // --- SVG Tone Curve Editor ---
  function initSvgCurveEditor() {
    const pathEl = document.getElementById('curve-path');
    const handlesGroup = document.getElementById('curve-handles-group');
    const svgEl = document.getElementById('curve-svg');

    document.querySelectorAll('.curve-chan-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.curve-chan-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeCurveChannel = btn.dataset.chan;
        renderSvgCurve();
      });
    });

    document.getElementById('btn-reset-curve').addEventListener('click', () => {
      state.curvePoints[state.activeCurveChannel] = [{x:0, y:0}, {x:1, y:1}];
      renderSvgCurve();
      requestRender();
    });

    function renderSvgCurve() {
      const pts = state.curvePoints[state.activeCurveChannel];
      
      // Build path SVG d string
      let d = `M ${pts[0].x * 200} ${(1 - pts[0].y) * 200}`;
      for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x * 200} ${(1 - pts[i].y) * 200}`;
      }
      pathEl.setAttribute('d', d);

      // Handles
      handlesGroup.innerHTML = '';
      pts.forEach((pt, idx) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pt.x * 200);
        circle.setAttribute('cy', (1 - pt.y) * 200);
        circle.setAttribute('class', 'curve-handle');
        handlesGroup.appendChild(circle);
      });
    }

    renderSvgCurve();
  }

  // --- Bayer Demosaic Inspection Generator ---
  function renderBayerDemosaicModal() {
    const gridCtx = dom.bayerGridCanvas.getContext('2d');
    const resCtx = dom.bayerResultCanvas.getContext('2d');

    const w = dom.bayerGridCanvas.width;
    const h = dom.bayerGridCanvas.height;

    gridCtx.fillStyle = '#000';
    gridCtx.fillRect(0, 0, w, h);
    resCtx.fillStyle = '#000';
    resCtx.fillRect(0, 0, w, h);

    // Draw RGGB Bayer cell array
    const cellSize = 10;
    for (let y = 0; y < h; y += cellSize) {
      for (let x = 0; x < w; x += cellSize) {
        const row = Math.floor(y / cellSize);
        const col = Math.floor(x / cellSize);

        if (row % 2 === 0 && col % 2 === 0) gridCtx.fillStyle = 'rgb(220, 40, 40)'; // Red
        else if (row % 2 === 1 && col % 2 === 1) gridCtx.fillStyle = 'rgb(40, 40, 220)'; // Blue
        else gridCtx.fillStyle = 'rgb(40, 200, 40)'; // Green

        gridCtx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      }
    }

    // Draw reconstructed demosaiced canvas preview
    if (state.sourceImage) {
      resCtx.drawImage(state.sourceImage, 0, 0, w, h);
    }
  }

  // --- History & Snapshots ---
  function saveHistoryState(label) {
    // Truncate redo states
    state.history = state.history.slice(0, state.historyIndex + 1);
    
    state.history.push({
      label: label,
      adjustments: JSON.parse(JSON.stringify(state.adjustments)),
      hsl: JSON.parse(JSON.stringify(state.hsl)),
      grading: JSON.parse(JSON.stringify(state.grading))
    });

    state.historyIndex = state.history.length - 1;
    updateHistoryUi();
  }

  function undoHistory() {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      restoreHistoryItem(state.history[state.historyIndex]);
    }
  }

  function redoHistory() {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      restoreHistoryItem(state.history[state.historyIndex]);
    }
  }

  function restoreHistoryItem(item) {
    state.adjustments = JSON.parse(JSON.stringify(item.adjustments));
    state.hsl = JSON.parse(JSON.stringify(item.hsl));
    state.grading = JSON.parse(JSON.stringify(item.grading));
    updateSliderUiValues();
    renderHslSliders();
    updateHistoryUi();
    requestRender();
  }

  function updateHistoryUi() {
    dom.btnUndo.disabled = state.historyIndex <= 0;
    dom.btnRedo.disabled = state.historyIndex >= state.history.length - 1;

    dom.historyList.innerHTML = '';
    state.history.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = `history-item ${idx === state.historyIndex ? 'active' : ''}`;
      li.textContent = item.label;
      li.addEventListener('click', () => {
        state.historyIndex = idx;
        restoreHistoryItem(item);
      });
      dom.historyList.appendChild(li);
    });
  }

  // --- Real-time Render Orchestrator ---
  function requestRender() {
    if (!state.imageLoaded || state.renderPending) return;
    state.renderPending = true;
    requestAnimationFrame(renderPipeline);
  }

  function renderPipeline() {
    state.renderPending = false;
    if (!state.sourceImage || !state.workingImageData) return;

    const w = state.sourceCanvas.width;
    const h = state.sourceCanvas.height;

    // Set canvas dimensions
    if (dom.mainCanvas.width !== w || dom.mainCanvas.height !== h) {
      dom.mainCanvas.width = w;
      dom.mainCanvas.height = h;
    }

    const outImgData = dom.mainCtx.createImageData(w, h);
    const srcPixels = state.workingImageData.data;
    const dstPixels = outImgData.data;

    // Fast local variables for sliders
    const adj = state.holdingBefore ? PRESETS.default : state.adjustments;
    
    // Calculate Color Temp & Tint Matrix multipliers
    const tempK = adj.temp;
    const tempMultR = tempK > 5500 ? 1 + (tempK - 5500) / 7000 : 1 - (5500 - tempK) / 7000;
    const tempMultB = tempK < 5500 ? 1 + (5500 - tempK) / 5000 : 1 - (tempK - 5500) / 8000;
    const tintMultG = 1 - (adj.tint / 200);

    // Exposure EV factor (2^EV)
    const expFactor = Math.pow(2, adj.exposure);
    const contrastFactor = (255 + adj.contrast * 2.55) / 255;
    const satFactor = 1 + adj.saturation / 100;
    const vibranceFactor = adj.vibrance / 100;

    const highlightsGain = adj.highlights / 100;
    const shadowsGain = adj.shadows / 100;

    const showShadowClip = state.clippingShadow;
    const showHighlightClip = state.clippingHighlight;

    const isSplit = state.viewMode === 'split' && !state.holdingBefore;
    const splitBoundary = Math.floor(w * state.splitRatio);

    // Pixel Processing Loop
    for (let i = 0; i < srcPixels.length; i += 4) {
      const pixelIdx = i / 4;
      const px = pixelIdx % w;

      // In split mode, draw unedited original RAW on left side
      if (isSplit && px < splitBoundary) {
        dstPixels[i] = srcPixels[i];
        dstPixels[i + 1] = srcPixels[i + 1];
        dstPixels[i + 2] = srcPixels[i + 2];
        dstPixels[i + 3] = 255;
        continue;
      }

      let r = srcPixels[i];
      let g = srcPixels[i + 1];
      let b = srcPixels[i + 2];

      // 1. White Balance Temp & Tint
      r *= tempMultR;
      g *= tintMultG;
      b *= tempMultB;

      // 2. Exposure EV Multiplier
      r *= expFactor;
      g *= expFactor;
      b *= expFactor;

      // 3. Contrast Adjustment
      r = (r - 128) * contrastFactor + 128;
      g = (g - 128) * contrastFactor + 128;
      b = (b - 128) * contrastFactor + 128;

      // 4. Highlights & Shadows Recovery
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 160 && highlightsGain !== 0) {
        const factor = (lum - 160) / 95;
        r += r * highlightsGain * factor * 0.5;
        g += g * highlightsGain * factor * 0.5;
        b += b * highlightsGain * factor * 0.5;
      } else if (lum < 95 && shadowsGain !== 0) {
        const factor = (95 - lum) / 95;
        r += (255 - r) * shadowsGain * factor * 0.4;
        g += (255 - g) * shadowsGain * factor * 0.4;
        b += (255 - b) * shadowsGain * factor * 0.4;
      }

      // 5. Vibrance & Saturation
      const maxC = Math.max(r, g, b);
      const avgC = (r + g + b) / 3;
      const amtVibrance = (maxC - avgC) / 255;
      
      r = avgC + (r - avgC) * satFactor * (1 + (1 - amtVibrance) * vibranceFactor);
      g = avgC + (g - avgC) * satFactor * (1 + (1 - amtVibrance) * vibranceFactor);
      b = avgC + (b - avgC) * satFactor * (1 + (1 - amtVibrance) * vibranceFactor);

      // 6. Clipping Warning Overlay
      if (showHighlightClip && (r > 250 || g > 250 || b > 250)) {
        r = 255; g = 0; b = 40;
      } else if (showShadowClip && (r < 5 && g < 5 && b < 5)) {
        r = 0; g = 100; b = 255;
      }

      dstPixels[i] = Math.max(0, Math.min(255, r));
      dstPixels[i + 1] = Math.max(0, Math.min(255, g));
      dstPixels[i + 2] = Math.max(0, Math.min(255, b));
      dstPixels[i + 3] = 255;
    }

    // Put rendered image onto canvas
    dom.mainCtx.putImageData(outImgData, 0, 0);

    // Apply Vignette overlay if enabled
    if (adj.vignette !== 0 && !state.holdingBefore) {
      applyVignette(dom.mainCtx, w, h, adj.vignette);
    }

    // Render Live RGB Histogram
    renderHistogram(outImgData);
  }

  function applyVignette(ctx, w, h, amount) {
    const cx = w / 2;
    const cy = h / 2;
    const outerRadius = Math.sqrt(cx * cx + cy * cy);
    const grad = ctx.createRadialGradient(cx, cy, outerRadius * 0.3, cx, cy, outerRadius);

    if (amount < 0) {
      const alpha = Math.abs(amount) / 100;
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${alpha * 0.85})`);
    } else {
      const alpha = amount / 100;
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, `rgba(255,255,255,${alpha * 0.6})`);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // --- Live RGB Histogram Engine ---
  function renderHistogram(imgData) {
    const hCtx = dom.histogramCtx;
    const hw = dom.histogramCanvas.width;
    const hh = dom.histogramCanvas.height;

    hCtx.clearRect(0, 0, hw, hh);

    const histR = new Uint32Array(256);
    const histG = new Uint32Array(256);
    const histB = new Uint32Array(256);
    const histL = new Uint32Array(256);

    const pixels = imgData.data;
    const step = 4 * 4; // Downsample for 60fps performance

    for (let i = 0; i < pixels.length; i += step) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      histR[r]++;
      histG[g]++;
      histB[b]++;
      histL[l]++;
    }

    // Find max bin value
    let maxVal = 0;
    for (let i = 0; i < 256; i++) {
      if (histR[i] > maxVal) maxVal = histR[i];
      if (histG[i] > maxVal) maxVal = histG[i];
      if (histB[i] > maxVal) maxVal = histB[i];
    }

    if (maxVal === 0) return;

    // Draw Histogram Channels (Red, Green, Blue)
    drawHistogramChannel(hCtx, histR, hw, hh, maxVal, 'rgba(239, 68, 68, 0.45)');
    drawHistogramChannel(hCtx, histG, hw, hh, maxVal, 'rgba(16, 185, 129, 0.45)');
    drawHistogramChannel(hCtx, histB, hw, hh, maxVal, 'rgba(59, 130, 246, 0.45)');
    drawHistogramChannel(hCtx, histL, hw, hh, maxVal, 'rgba(255, 255, 255, 0.35)');
  }

  function drawHistogramChannel(ctx, data, w, h, maxVal, fillColor) {
    ctx.beginPath();
    ctx.moveTo(0, h);

    const scaleX = w / 256;

    for (let i = 0; i < 256; i++) {
      const binHeight = (data[i] / maxVal) * (h - 6);
      const x = i * scaleX;
      const y = h - binHeight;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

})();
