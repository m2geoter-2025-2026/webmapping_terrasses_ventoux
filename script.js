const map = L.map('map', {
    zoomControl: true,
    minZoom: 9,
    maxZoom: 19,
    bounceAtZoomLimits: false,
    zoomSnap: 0.25,
    zoomDelta: 1,
    wheelPxPerZoomLevel: 80,
    wheelDebounceTime: 60
}).setView([44.17, 5.28], 12);

const LAYER_PANES = [
    { id: 'pane-ombrage',      label: 'Ombrage',                                  z: 201 },
    { id: 'pane-mnt',          label: 'Modèle Numérique de Terrain',              z: 202 },
    { id: 'pane-probabilites', label: 'Probabilité d\'occurrence des terrasses',  z: 203 },
    { id: 'pane-communes',     label: 'Communes du PNR',                          z: 204 },
    { id: 'pane-parcelles',    label: 'Parcellaire',                              z: 205 },
    { id: 'pane-terrasses',    label: 'Terrasses',                                z: 206 },
    { id: 'pane-ruptures',     label: 'Ruptures de pentes',                       z: 207 },
];
LAYER_PANES.forEach(({ id, z }) => {
    const pane = map.createPane(id);
    pane.style.zIndex = z;
    pane.style.pointerEvents = 'none';
});
const comparePane = map.createPane('pane-compare');
comparePane.style.zIndex = 200;
comparePane.style.pointerEvents = 'none';
map.getPane('pane-terrasses').style.pointerEvents = 'auto';

(function initSplashProgress() {
    const fill   = document.getElementById('splash-progress-fill');
    const pct    = document.getElementById('splash-progress-pct');
    const status = document.getElementById('splash-progress-status');
    let _cur = 0;

    function setProgress(p, msg) {
        _cur = Math.max(_cur, Math.min(100, p));
        if (fill)   fill.style.width = _cur + '%';
        if (pct)    pct.textContent  = Math.round(_cur) + ' %';
        if (status && msg) status.textContent = msg;
    }

    function hideSplash() {
        setProgress(100, 'Prêt !');
        setTimeout(() => {
            const s = document.getElementById('splash-screen');
            if (s) {
                s.classList.add('hidden');
                setTimeout(() => {
                    s.remove();
                    if (typeof openModal === 'function') openModal();
                }, 800);
            }
        }, 350);
    }

    setProgress(8, 'Initialisation de la carte…');

    const t0 = Date.now();
    function tick() {
        const elapsed = Date.now() - t0;
        const t = Math.min(1, elapsed / 2200);
        const p = 8 + 67 * (1 - Math.pow(1 - t, 2.5));
        setProgress(p);
        if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    window.addEventListener('load', () => {
        setProgress(92, 'Finalisation…');
        setTimeout(hideSplash, 600);
    });

    setTimeout(hideSplash, 6000);

    window._splashProgress = setProgress;
})();

const ScaleBar = L.Control.extend({
    options: { position: 'bottomleft', maxWidth: 100 },
    onAdd: function (map) {
        this._container = L.DomUtil.create('div', 'gm-scale');
        map.on('zoomend moveend', this._update, this);
        this._update();
        return this._container;
    },
    _update: function () {
        const y = map.getSize().y / 2;
        const maxMeters = map.distance(
            map.containerPointToLatLng([0, y]),
            map.containerPointToLatLng([this.options.maxWidth, y])
        );
        const nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
        let m = nice[0];
        for (const v of nice) { if (v <= maxMeters) m = v; else break; }
        const w = Math.round(this.options.maxWidth * (m / maxMeters));
        const label = m >= 1000 ? (m / 1000) + ' km' : m + ' m';
        const ratio = Math.round(m / (w * 0.000264583));
        const ratioStr = new Intl.NumberFormat('fr-FR').format(ratio);
        this._container.innerHTML = '<span>' + label + '</span><div class="gm-scale-bar" style="width:' + w + 'px"></div><span class="gm-scale-ratio">1\u202F:\u202F' + ratioStr + '</span>';
    }
});
new ScaleBar().addTo(map);

const NorthArrow = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function () {
        const c = L.DomUtil.create('div', 'gm-compass');
        L.DomEvent.disableClickPropagation(c);
        c.innerHTML = '<svg viewBox="0 0 40 60" width="30" height="45" style="filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.3));">' +
            '<path d="M20 0 L40 40 L20 30 L0 40 Z" fill="#1e6b45" stroke="#ffffff" stroke-width="2"/>' +
            '<text x="20" y="56" text-anchor="middle" font-size="16" font-weight="bold" fill="#1e6b45" font-family="sans-serif">N</text>' +
            '</svg>';
        return c;
    }
});
new NorthArrow().addTo(map);

const Toolbar = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function () {
        const bar = L.DomUtil.create('div', 'map-toolbar');
        L.DomEvent.disableClickPropagation(bar);
        L.DomEvent.disableScrollPropagation(bar);
        bar.innerHTML =
            '<button id="tool-home"       class="tool-btn" title="Accueil – recentrer (H)"><i class="fas fa-home"></i><span class="tool-label">Accueil</span></button>' +
            '<div class="toolbar-sep"></div>' +
            '<button id="tool-distance"   class="tool-btn" title="Mesure de distance (D)"><i class="fas fa-ruler"></i><span class="tool-label">Distance</span></button>' +
            '<button id="tool-area"       class="tool-btn" title="Mesure de surface (S)"><i class="fas fa-draw-polygon"></i><span class="tool-label">Surface</span></button>' +
            '<button id="tool-coords"     class="tool-btn" title="Coordonnées au clic (X)"><i class="fas fa-crosshairs"></i><span class="tool-label">Coordonnées</span></button>' +
            '<div class="toolbar-sep"></div>' +
            '<button id="tool-locate"     class="tool-btn" title="Ma position GPS (L)"><i class="fas fa-location-dot"></i><span class="tool-label">Ma position</span></button>' +
            '<button id="tool-fullscreen" class="tool-btn" title="Plein écran (F)"><i class="fas fa-expand"></i><span class="tool-label">Plein écran</span></button>' +
            '<button id="tool-export"     class="tool-btn" title="Capture PNG (C)"><i class="fas fa-camera"></i><span class="tool-label">Capture</span></button>' +
            '<div class="toolbar-sep"></div>' +
            '<button id="tool-compare"    class="tool-btn" title="Comparer les fonds (B)"><i class="fas fa-columns"></i><span class="tool-label">Comparer</span></button>' +
            '<button id="tool-geojson"    class="tool-btn" title="Exporter les terrasses visibles (G)"><i class="fas fa-file-export"></i><span class="tool-label">Export Terrasses</span></button>';
        return bar;
    }
});
new Toolbar().addTo(map);

const ToolInfo = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd: function () {
        this._div = L.DomUtil.create('div', 'tool-info');
        this._div.style.display = 'none';
        return this._div;
    },
    show: function (html) { this._div.innerHTML = html; this._div.style.display = 'block'; },
    hide: function () { this._div.style.display = 'none'; this._div.innerHTML = ''; }
});
const toolInfo = new ToolInfo();
toolInfo.addTo(map);

const FloatingLegend = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd: function () {
        this._div = L.DomUtil.create('div', 'floating-legend');
        L.DomEvent.disableClickPropagation(this._div);
        this._div.innerHTML = '<div class="floating-legend-title">L\u00e9gendes actives</div><div class="floating-legend-empty">Aucune couche active</div>';
        return this._div;
    },
    update: function (items) {
        if (!this._div) return;
        let html = '<div class="floating-legend-title">L\u00e9gendes actives</div>';
        if (items.length === 0) {
            html += '<div class="floating-legend-empty">Aucune couche active</div>';
        } else {
            items.forEach(item => {
                html += '<div class="floating-legend-item"><span class="floating-legend-sym" style="' + item.style + '"></span>' + item.label + '</div>';
            });
        }
        this._div.innerHTML = html;
    }
});
const floatingLegend = new FloatingLegend();
floatingLegend.addTo(map);

function updateFloatingLegend() {
    const items = [];
    const layerTerrasses = document.getElementById('layer-terrasses');
    const layerRuptures = document.getElementById('layer-ruptures');
    const layerCommunes = document.getElementById('layer-communes');
    const layerParcelles = document.getElementById('layer-parcelles');
    const layerProba = document.getElementById('layer-probabilites');
    const layerMnt = document.getElementById('layer-mnt-ombrage');
    const layerOmbrage = document.getElementById('layer-ombrage');
    if (layerTerrasses?.checked) {
        const c = document.getElementById('color-terrasses')?.value || '#e74c3c';
        items.push({ style: 'background:' + c + '66;border:2px solid ' + c + ';border-radius:2px;', label: 'Terrasses' });
    }
    if (layerRuptures?.checked) {
        const c = document.getElementById('color-ruptures')?.value || '#e67e22';
        items.push({ style: 'height:0;border-bottom:3px solid ' + c + ';', label: 'Ruptures de pentes' });
    }
    if (layerProba?.checked) {
        items.push({ style: 'background:linear-gradient(90deg,#ffffff,#508c32,#0a3c05);border-radius:2px;', label: 'Probabilit\u00e9 d\'occurrence' });
    }
    if (layerMnt?.checked) {
        items.push({ style: 'background:linear-gradient(90deg,#285023,#c3d76e,#f5ebe1);border-radius:2px;', label: 'MNT' });
    }
    if (layerOmbrage?.checked) {
        items.push({ style: 'background:linear-gradient(90deg,#333,#999,#eee);border-radius:2px;', label: 'Ombrage' });
    }
    if (layerCommunes?.checked) {
        const c = document.getElementById('color-communes')?.value || '#fde047';
        items.push({ style: 'height:0;border-bottom:2px dashed ' + c + ';', label: 'Communes' });
    }
    if (layerParcelles?.checked) {
        const c = document.getElementById('color-parcelles')?.value || '#f1c40f';
        items.push({ style: 'background:' + c + '26;border:2px solid ' + c + ';border-radius:2px;', label: 'Parcellaire' });
    }
    floatingLegend.update(items);
}

const mouseTooltip = L.DomUtil.create('div', 'mouse-tooltip');
document.body.appendChild(mouseTooltip);

map.on('mousemove', function (e) {
    if (activeTool && (activeTool === 'distance' || activeTool === 'area' || activeTool === 'coords')) {
        mouseTooltip.style.display = 'block';
        mouseTooltip.style.left = (e.originalEvent.pageX + 15) + 'px';
        mouseTooltip.style.top = (e.originalEvent.pageY + 15) + 'px';
    } else {
        mouseTooltip.style.display = 'none';
    }
    const coordsDisplay = document.getElementById('coords-display');
    if (coordsDisplay) {
        coordsDisplay.textContent = `Lat : ${e.latlng.lat.toFixed(5)}  |  Lon : ${e.latlng.lng.toFixed(5)}`;
    }
});
map.on('mouseout', function () { mouseTooltip.style.display = 'none'; });

function updateZoomDisplay() {
    const zoomEl = document.getElementById('zoom-display');
    if (zoomEl) zoomEl.textContent = `Zoom : ${map.getZoom().toFixed(1)}`;
}
map.on('zoomend', updateZoomDisplay);

let activeTool = null;
let measurePoints = [];
let measureMarkers = [];
let measureLine = null;
let measurePolygon = null;
let activeMeasure = false;
let lastMeasureType = null;

function downloadToFile(dataUrl, fileName) {
    try {
        const parts = dataUrl.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const uInt8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; ++i) uInt8Array[i] = raw.charCodeAt(i);
        const blob = new Blob([uInt8Array], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
    } catch (err) {
        console.error('[Export] Échec Blob:', err);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function clearMeasure() {
    measurePoints = [];
    measureMarkers.forEach(m => map.removeLayer(m));
    measureMarkers = [];
    if (measureLine) { map.removeLayer(measureLine); measureLine = null; }
    if (measurePolygon) { map.removeLayer(measurePolygon); measurePolygon = null; }
    activeMeasure = false;
    toolInfo.hide();
    document.getElementById('elevation-profile-container')?.classList.remove('active');
}

function deactivateTool() {
    if (activeTool) {
        document.getElementById('tool-' + activeTool)?.classList.remove('active');
        map.getContainer().style.cursor = '';
        map.getContainer().classList.remove('cursor-distance', 'cursor-area', 'cursor-coords');
        mouseTooltip.style.display = 'none';
    }
    map.off('click', onMeasureClick);
    map.off('mousemove', onMeasureMove);
    map.off('click', onCoordsClick);
    activeTool = null;
}

function setActiveTool(name) {
    if (activeTool === name) { deactivateTool(); return; }
    deactivateTool();
    if (name === 'distance' || name === 'area') clearMeasure();
    activeTool = name;
    document.getElementById('tool-' + name)?.classList.add('active');
    if (name === 'distance') map.getContainer().classList.add('cursor-distance');
    else if (name === 'area') map.getContainer().classList.add('cursor-area');
    else if (name === 'coords') map.getContainer().classList.add('cursor-coords');
    else map.getContainer().style.cursor = 'crosshair';
}

let elevationChart = null;

function initElevationChart() {
    const ctx = document.getElementById('elevationChart').getContext('2d');
    elevationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Altitude relative (m)',
                data: [],
                borderColor: '#52b788',
                backgroundColor: 'rgba(30, 107, 69, 0.12)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (ctx) => `Altitude relative: ${ctx.raw >= 0 ? '+' : ''}${ctx.raw.toFixed(1)} m`,
                        title: (ctx) => `Distance: ${ctx[0].label} km`
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: { display: true, text: 'Distance (km)', font: { size: 10 }, color: '#94a3b8' },
                    ticks: { color: '#94a3b8', font: { size: 9 } },
                    grid: { display: false }
                },
                y: {
                    display: true,
                    title: { display: true, text: 'Altitude relative (m)', font: { size: 10 }, color: '#94a3b8' },
                    ticks: { color: '#94a3b8', font: { size: 9 } },
                    grid: { color: 'rgba(255,255,255,0.06)' }
                }
            }
        }
    });
}

async function updateElevationProfile(points) {
    if (points.length < 2) return;
    const profileContainer = document.getElementById('elevation-profile-container');
    profileContainer.classList.add('active');
    const lons = points.map(p => p.lng.toFixed(6)).join('|');
    const lats = points.map(p => p.lat.toFixed(6)).join('|');
    const url = `https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevationLine.json?resource=ign_rge_alti_wld&sampling=50&lon=${lons}&lat=${lats}&delimiter=|`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erreur API Altimétrie: ' + response.status);
        const data = await response.json();
        const elevations = data.elevations;
        if (!elevations || elevations.length === 0) return;
        const rawValues = elevations.map(e => e.z);
        const baseAlt = rawValues[0];
        const values = rawValues.map(v => parseFloat((v - baseAlt).toFixed(2)));
        const lineFeature = turf.lineString(points.map(p => [p.lng, p.lat]));
        const totalDistKm = turf.length(lineFeature, { units: 'kilometers' });
        const labels = elevations.map((_, i) =>
            (totalDistKm * i / Math.max(1, elevations.length - 1)).toFixed(2)
        );
        if (!elevationChart) initElevationChart();
        elevationChart.data.labels = labels;
        elevationChart.data.datasets[0].data = values;
        elevationChart.update();
    } catch (err) {
        console.error('Erreur profil alti:', err);
    }
}

document.getElementById('export-profile-png')?.addEventListener('click', () => {
    const canvas = document.getElementById('elevationChart');
    if (!canvas) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);
    const fileName = 'Profil_Altimetrique_Ventoux_' + new Date().toISOString().slice(0, 10) + '.png';
    downloadToFile(tempCanvas.toDataURL('image/png'), fileName);
    toolInfo.show('<i class="fas fa-check" style="color:#27ae60"></i> Image envoyée vers votre dossier <b>Téléchargements</b> !');
    setTimeout(() => toolInfo.hide(), 5000);
});

document.getElementById('close-elevation')?.addEventListener('click', () => {
    document.getElementById('elevation-profile-container').classList.remove('active');
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && activeTool) { deactivateTool(); return; }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const key = e.key.toLowerCase();
    if (key === 'h') document.getElementById('tool-home')?.click();
    if (key === 'd') document.getElementById('tool-distance')?.click();
    if (key === 's') document.getElementById('tool-area')?.click();
    if (key === 'x') document.getElementById('tool-coords')?.click();
    if (key === 'c' && !e.ctrlKey) document.getElementById('tool-export')?.click();
    if (key === 'l') document.getElementById('tool-locate')?.click();
    if (key === 'f') document.getElementById('tool-fullscreen')?.click();
    if (key === 'r') {
        const cb = document.getElementById('layer-ruptures');
        if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
    }
    if (key === 'b') document.getElementById('tool-compare')?.click();
    if (key === 'g') document.getElementById('tool-geojson')?.click();
});

function formatDistance(meters) {
    return meters >= 1000 ? (meters / 1000).toFixed(2) + ' km' : Math.round(meters) + ' m';
}

function getTotalDistance() {
    let total = 0;
    for (let i = 1; i < measurePoints.length; i++) total += map.distance(measurePoints[i - 1], measurePoints[i]);
    return total;
}

function getArea(pts) {
    if (pts.length < 3) return 0;
    let area = 0;
    const projPts = pts.map(p => L.Projection.SphericalMercator.project(p));
    for (let i = 0; i < projPts.length; i++) {
        const j = (i + 1) % projPts.length;
        area += projPts[i].x * projPts[j].y;
        area -= projPts[j].x * projPts[i].y;
    }
    return Math.abs(area / 2);
}

function formatArea(sqm) {
    if (sqm >= 1e6) return (sqm / 1e6).toFixed(2) + ' km²';
    if (sqm >= 1e4) return (sqm / 1e4).toFixed(2) + ' ha';
    return Math.round(sqm) + ' m²';
}

function exportMeasureCSV() {
    if (measurePoints.length === 0) return;
    let lines = ['Point,Latitude,Longitude,Distance cumulée (m)'];
    let cum = 0;
    measurePoints.forEach((p, i) => {
        if (i > 0) cum += map.distance(measurePoints[i - 1], measurePoints[i]);
        lines.push(i + 1 + ',' + p.lat.toFixed(6) + ',' + p.lng.toFixed(6) + ',' + cum.toFixed(1));
    });
    if (lastMeasureType === 'area' && measurePoints.length >= 3) {
        lines.push('');
        lines.push('Surface (m²),' + getArea(measurePoints).toFixed(1));
        lines.push('Surface (ha),' + (getArea(measurePoints) / 10000).toFixed(4));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mesure_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

function finishMeasure() {
    activeMeasure = false;
    map.off('mousemove', onMeasureMove);
    mouseTooltip.style.display = 'none';
    let resultHTML = '';
    if (activeTool === 'distance') {
        resultHTML = '<i class="fas fa-ruler"></i> <b>' + formatDistance(getTotalDistance()) + '</b>';
    } else {
        resultHTML = '<i class="fas fa-draw-polygon"></i> <b>' + formatArea(getArea(measurePoints)) + '</b>';
    }
    resultHTML += '<br><a href="#" onclick="clearMeasure(); return false;" style="color:#EA4335; font-size:11px; text-decoration:none;"><i class="fas fa-trash"></i> Effacer</a>';
    resultHTML += ' <a href="#" onclick="exportMeasureCSV(); return false;" style="color:#1e6b45; font-size:11px; text-decoration:none; margin-left:6px;"><i class="fas fa-download"></i> CSV</a>';
    toolInfo.show(resultHTML);
    lastMeasureType = activeTool;
    activeTool = null;
    document.querySelector('.tool-btn.active')?.classList.remove('active');
    map.getContainer().style.cursor = '';
    map.off('click', onMeasureClick);
}

function onMeasureClick(e) {
    if (!activeMeasure) { clearMeasure(); activeMeasure = true; }
    if (measurePoints.length > 0) {
        const lastPt = measurePoints[measurePoints.length - 1];
        if (map.latLngToContainerPoint(lastPt).distanceTo(map.latLngToContainerPoint(e.latlng)) < 15) {
            finishMeasure();
            return;
        }
    }
    measurePoints.push(e.latlng);
    const dot = L.circleMarker(e.latlng, {
        radius: 4, color: '#fff', fillColor: '#EA4335', fillOpacity: 1, weight: 2
    }).addTo(map);
    dot.on('click', function (ev) { L.DomEvent.stopPropagation(ev); finishMeasure(); });
    measureMarkers.push(dot);
    updateMeasureDrawing();
    if (activeTool === 'distance' && measurePoints.length >= 2) updateElevationProfile(measurePoints);
}

function onMeasureMove(e) {
    if (measurePoints.length === 0) {
        mouseTooltip.innerHTML = 'Cliquez pour commencer<br><span class="tooltip-hint">Échap pour annuler</span>';
        return;
    }
    const pts = [...measurePoints, e.latlng];
    if (measureLine) map.removeLayer(measureLine);
    if (activeTool === 'distance') {
        measureLine = L.polyline(pts, { color: '#EA4335', weight: 3, dashArray: '5,5' }).addTo(map);
        let dist = getTotalDistance() + map.distance(measurePoints[measurePoints.length - 1], e.latlng);
        mouseTooltip.innerHTML = '<b>' + formatDistance(dist) + '</b><br><span class="tooltip-hint">Clic: ajouter, Dbl-clic: terminer</span>';
    } else if (activeTool === 'area') {
        if (pts.length >= 3) {
            if (measurePolygon) map.removeLayer(measurePolygon);
            measurePolygon = L.polygon(pts, { color: '#EA4335', weight: 3, dashArray: '5,5', fillColor: '#EA4335', fillOpacity: 0.2 }).addTo(map);
            mouseTooltip.innerHTML = '<b>' + formatArea(getArea(pts)) + '</b><br><span class="tooltip-hint">Clic: ajouter, Dbl-clic: terminer</span>';
        } else {
            measureLine = L.polyline(pts, { color: '#EA4335', weight: 3, dashArray: '5,5' }).addTo(map);
            mouseTooltip.innerHTML = '<span class="tooltip-hint">Ajoutez au moins 3 points</span>';
        }
    }
}

function updateMeasureDrawing() {
    if (activeTool === 'distance') {
        if (measureLine) map.removeLayer(measureLine);
        measureLine = L.polyline(measurePoints, { color: '#EA4335', weight: 3 }).addTo(map);
        toolInfo.show('<i class="fas fa-ruler"></i> ' + formatDistance(getTotalDistance()));
    } else if (activeTool === 'area') {
        if (measurePoints.length >= 3) {
            if (measurePolygon) map.removeLayer(measurePolygon);
            measurePolygon = L.polygon(measurePoints, { color: '#EA4335', weight: 3, fillColor: '#EA4335', fillOpacity: 0.2 }).addTo(map);
            toolInfo.show('<i class="fas fa-draw-polygon"></i> ' + formatArea(getArea(measurePoints)));
        }
    }
}

function onCoordsClick(e) {
    const lat = e.latlng.lat.toFixed(5);
    const lng = e.latlng.lng.toFixed(5);
    L.popup({ closeButton: false, className: 'custom-popup' })
        .setLatLng(e.latlng)
        .setContent('<div style="text-align:center"><b style="color:#2c3e50">' + lat + ', ' + lng + '</b><br><i class="fas fa-check" style="color:#27ae60; margin-top:4px"></i> Copié !</div>')
        .openOn(map);
    navigator.clipboard?.writeText(lat + ', ' + lng);
    setTimeout(() => map.closePopup(), 2000);
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('input[name="basemap"]').forEach(radio => {
        radio.addEventListener('change', e => switchBasemap(e.target.value));
    });

    let miniMap = null;
    if (typeof L.Control.MiniMap !== 'undefined') {
        const miniTile = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { minZoom: 0, maxZoom: 13, attribution: '' });
        miniMap = new L.Control.MiniMap(miniTile, {
            toggleDisplay: true,
            position: 'bottomright',
            minimized: false,
            width: 140,
            height: 110,
            zoomLevelOffset: -5,
            mapOptions: { zoomControl: false, attributionControl: false }
        }).addTo(map);
    }
    window._miniMap = miniMap;

    const communeSearchInput = document.getElementById('commune-search');
    const communeSearchResults = document.getElementById('commune-search-results');
    if (communeSearchInput && communeSearchResults) {
        communeSearchInput.addEventListener('input', function () {
            const q = this.value.trim().toLowerCase();
            communeSearchResults.innerHTML = '';
            if (!q || !window._communeIndex) return;
            const matches = window._communeIndex.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8);
            matches.forEach(commune => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.textContent = commune.name;
                item.addEventListener('click', () => {
                    map.flyToBounds(commune.bounds, { duration: 0.8, padding: [30, 30] });
                    communeSearchInput.value = commune.name;
                    communeSearchResults.innerHTML = '';
                });
                communeSearchResults.appendChild(item);
            });
        });
        document.addEventListener('click', function (e) {
            if (!communeSearchInput.contains(e.target) && !communeSearchResults.contains(e.target)) {
                communeSearchResults.innerHTML = '';
            }
        });
    }

    document.getElementById('tool-home')?.addEventListener('click', function () {
        if (emprisePNR.getBounds().isValid()) {
            map.flyToBounds(emprisePNR.getBounds(), { duration: 1 });
            toolInfo.show('<i class="fas fa-home"></i> Carte recentrée !');
            setTimeout(() => toolInfo.hide(), 2000);
        }
    });

    document.getElementById('tool-distance')?.addEventListener('click', function () {
        setActiveTool('distance');
        if (activeTool === 'distance') {
            map.on('click', onMeasureClick);
            map.on('mousemove', onMeasureMove);
            map.on('dblclick', finishMeasure);
            toolInfo.show('<i class="fas fa-ruler"></i> Mesure de distance...');
        }
    });

    document.getElementById('tool-area')?.addEventListener('click', function () {
        setActiveTool('area');
        if (activeTool === 'area') {
            map.on('click', onMeasureClick);
            map.on('mousemove', onMeasureMove);
            map.on('dblclick', finishMeasure);
            toolInfo.show('<i class="fas fa-draw-polygon"></i> Mesure de surface...');
        }
    });

    document.getElementById('tool-coords')?.addEventListener('click', function () {
        setActiveTool('coords');
        if (activeTool === 'coords') {
            map.on('click', onCoordsClick);
            mouseTooltip.innerHTML = 'Cliquez pour copier les coordonnées';
            toolInfo.show('<i class="fas fa-crosshairs"></i> Mode coordonnées actif');
        }
    });

    document.getElementById('tool-locate')?.addEventListener('click', function () {
        deactivateTool();
        const btn = this;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Localisation...</span>';
        map.locate({ setView: true, maxZoom: 16 });
        map.once('locationfound', function (e) {
            btn.innerHTML = originalHTML;
            L.circleMarker(e.latlng, { radius: 8, color: '#4285F4', fillColor: '#4285F4', fillOpacity: 0.6, weight: 2 })
                .addTo(map).bindPopup('Vous êtes ici').openPopup();
            L.circle(e.latlng, { radius: e.accuracy / 2, color: '#4285F4', fillOpacity: 0.08, weight: 1 }).addTo(map);
        });
        map.once('locationerror', function () {
            btn.innerHTML = originalHTML;
            toolInfo.show('<i class="fas fa-exclamation-triangle" style="color:#e74c3c"></i> Impossible de vous localiser');
            setTimeout(function () { toolInfo.hide(); }, 3000);
        });
    });

    document.getElementById('tool-fullscreen')?.addEventListener('click', function () {
        deactivateTool();
        const span = this.querySelector('span');
        const icon = this.querySelector('i');
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            if (icon) icon.className = 'fas fa-compress';
            if (span) span.textContent = 'Réduire';
            this.title = 'Quitter le plein écran';
        } else {
            document.exitFullscreen();
            if (icon) icon.className = 'fas fa-expand';
            if (span) span.textContent = 'Plein Écran';
            this.title = 'Plein écran';
        }
    });

    document.addEventListener('fullscreenchange', () => {
        const btn = document.getElementById('tool-fullscreen');
        if (!document.fullscreenElement && btn) {
            const span = btn.querySelector('span');
            const icon = btn.querySelector('i');
            if (icon) icon.className = 'fas fa-expand';
            if (span) span.textContent = 'Plein Écran';
            btn.title = 'Plein écran';
        }
    });

    document.getElementById('tool-export')?.addEventListener('click', function () {
        deactivateTool();
        const btn = this;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Capture...</span>';
        toolInfo.show('<i class="fas fa-camera"></i> Génération de l\'image...');
        document.querySelectorAll('.leaflet-control-container .leaflet-top, .leaflet-control-container .leaflet-bottom').forEach(el => el.style.opacity = '0');
        setTimeout(() => {
            const mapEl = document.getElementById('map');
            html2canvas(mapEl, { useCORS: true, allowTaint: true }).then(function (canvas) {
                document.querySelectorAll('.leaflet-control-container .leaflet-top, .leaflet-control-container .leaflet-bottom').forEach(el => el.style.opacity = '1');
                const fileName = 'Carte_PNR_du-Mont-Ventoux_' + new Date().toISOString().slice(0, 10) + '.png';
                downloadToFile(canvas.toDataURL(), fileName);
                btn.innerHTML = originalHTML;
                toolInfo.show('<i class="fas fa-check" style="color:#27ae60"></i> Carte envoyée vers votre dossier <b>Téléchargements</b> !');
                setTimeout(function () { toolInfo.hide(); }, 5000);
            }).catch(function () {
                document.querySelectorAll('.leaflet-control-container .leaflet-top, .leaflet-control-container .leaflet-bottom').forEach(el => el.style.opacity = '1');
                btn.innerHTML = originalHTML;
                toolInfo.show('<i class="fas fa-exclamation-triangle" style="color:#e74c3c"></i> Erreur lors de l\'export');
                setTimeout(function () { toolInfo.hide(); }, 3000);
            });
        }, 300);
    });

    document.getElementById('tool-compare')?.addEventListener('click', function () {
        if (compareActive) { disableCompare(); } else { enableCompare(); }
    });
    document.getElementById('compare-toggle')?.addEventListener('change', function () {
        if (this.checked) { enableCompare(); } else { disableCompare(); }
    });

    document.getElementById('tool-geojson')?.addEventListener('click', function () {
        const features = [];
        terrassesLayer._geomLayer.eachLayer(l => { if (l.feature) features.push(l.feature); });
        if (features.length === 0) {
            toolInfo.show('<i class="fas fa-exclamation-triangle" style="color:#e67e22"></i> Activez la couche Terrasses et zoomez au niveau \u2265 14');
            setTimeout(() => toolInfo.hide(), 3500);
            return;
        }
        const geojson = { type: 'FeatureCollection', features };
        const blob = new Blob([JSON.stringify(geojson)], { type: 'application/geo+json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'terrasses_' + new Date().toISOString().slice(0, 10) + '.geojson';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        toolInfo.show('<i class="fas fa-check" style="color:#27ae60"></i> ' + features.length + ' terrasse(s) export\u00e9e(s)');
        setTimeout(() => toolInfo.hide(), 3000);
    });
});

const BASEMAP_STYLES = {
    satellite: {
        emprise:  { color: '#ffffff', weight: 3.5, opacity: 1, dashArray: null  },
        communes: { color: '#38bdf8', weight: 2,   opacity: 1, dashArray: '8,5' }
    },
    esriLight: {
        emprise:  { color: '#7b1fa2', weight: 4,   opacity: 1, dashArray: null  },
        communes: { color: '#0d47a1', weight: 2,   opacity: 1, dashArray: '6,5' }
    },
    osm: {
        emprise:  { color: '#004d40', weight: 3.5, opacity: 1, dashArray: null  },
        communes: { color: '#880e4f', weight: 2,   opacity: 1, dashArray: '6,5' }
    }
};

let currentBasemapKey = (() => {
    const checked = document.querySelector('input[name="basemap"]:checked');
    return checked ? checked.value : 'satellite';
})();

function applyBasemapStyles(key) {
    const s = BASEMAP_STYLES[key] || BASEMAP_STYLES.satellite;

    emprisePNR.setStyle({
        color:     s.emprise.color,
        weight:    s.emprise.weight,
        opacity:   s.emprise.opacity,
        dashArray: s.emprise.dashArray || null
    });

    const cStyle = {
        color:     s.communes.color,
        weight:    s.communes.weight,
        opacity:   s.communes.opacity,
        dashArray: s.communes.dashArray
    };
    communesPNR.setStyle(cStyle);

    const picker  = document.getElementById('color-communes');
    const swatchC = document.getElementById('legend-swatch-communes');
    const swatchE = document.getElementById('legend-swatch-emprise');
    if (picker)  picker.value = s.communes.color;
    if (swatchC) swatchC.style.borderBottom = `2px dashed ${s.communes.color}`;
    if (swatchE) swatchE.style.borderBottom  = `3px solid ${s.emprise.color}`;
}

const BASEMAP_TILES = {
    osm:        (pane) => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19, pane: pane || undefined }),
    satellite:  (pane) => L.tileLayer('http://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { attribution: 'Map data &copy; Google Satellite', maxZoom: 20, pane: pane || undefined }),
    esriLight:  (pane) => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri', maxZoom: 16, pane: pane || undefined })
};

const basemaps = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }),
    satellite: L.tileLayer('http://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: 'Map data &copy; Google Satellite',
        maxZoom: 20
    }),
    esriLight: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
    })
};

basemaps.satellite.addTo(map);

basemaps.satellite.once('load', () => {
    if (window._splashProgress) window._splashProgress(85, 'Couches vectorielles…');
});

const CMP_LABELS = { satellite: 'Satellite', esriLight: 'Esri Light', osm: 'OSM' };
const CMP_DATA_PANES = [
    { key: 'terrasses',    pane: 'pane-terrasses',    label: 'Terrasses',          checkId: 'layer-terrasses' },
    { key: 'ruptures',     pane: 'pane-ruptures',     label: 'Ruptures de pentes', checkId: 'layer-ruptures' },
    { key: 'probabilites', pane: 'pane-probabilites', label: 'Probabilite',        checkId: 'layer-probabilites' },
    { key: 'mnt',          pane: 'pane-mnt',          label: 'MNT',               checkId: 'layer-mnt-ombrage' },
    { key: 'ombrage',      pane: 'pane-ombrage',      label: 'Ombrage',            checkId: 'layer-ombrage' },
    { key: 'communes',     pane: 'pane-communes',     label: 'Communes',           checkId: 'layer-communes' },
    { key: 'parcelles',    pane: 'pane-parcelles',    label: 'Parcellaire',        checkId: 'layer-parcelles' },
];
let compareActive = false;
let compareLeftLayer = null;
let compareLeftKey = 'esriLight';
let compareRightKey = 'satellite';
let compareDivX = 0.5;
let compareDivEl = null;
let cmpLayerSides = Object.fromEntries(CMP_DATA_PANES.map(d => [d.key, 'both']));

function _applyCompareClip() {
    const mapSize = map.getSize();
    const nw = map.containerPointToLayerPoint([0, 0]);
    const se = map.containerPointToLayerPoint(mapSize);
    const clipX = nw.x + Math.round(mapSize.x * compareDivX);
    const cmpPane = map.getPane('pane-compare');
    if (cmpPane) cmpPane.style.clip = `rect(${nw.y}px,${clipX}px,${se.y}px,${nw.x}px)`;
    CMP_DATA_PANES.forEach(({ key, pane: paneName }) => {
        const pane = map.getPane(paneName);
        if (!pane) return;
        const side = cmpLayerSides[key];
        if (side === 'left') {
            pane.style.clip = `rect(${nw.y}px,${clipX}px,${se.y}px,${nw.x}px)`;
        } else if (side === 'right') {
            pane.style.clip = `rect(${nw.y}px,${se.x}px,${se.y}px,${clipX}px)`;
        } else {
            pane.style.clip = '';
        }
    });
}

function _clearAllClips() {
    const cmpPane = map.getPane('pane-compare');
    if (cmpPane) cmpPane.style.clip = '';
    CMP_DATA_PANES.forEach(({ pane: paneName }) => {
        const p = map.getPane(paneName);
        if (p) p.style.clip = '';
    });
}

function _dragCompare(clientX) {
    const rect = document.getElementById('map').getBoundingClientRect();
    compareDivX = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width));
    if (compareDivEl) compareDivEl.style.left = (compareDivX * 100) + '%';
    _applyCompareClip();
}

function _buildCompareSidebarContent() {
    const panel = document.getElementById('compare-sidebar-panel');
    if (!panel) return;
    const layerRows = CMP_DATA_PANES.map(({ key, label, checkId }) => {
        const chk = document.getElementById(checkId);
        const active = chk && chk.checked;
        const isLeft  = cmpLayerSides[key] !== 'right';
        const isRight = cmpLayerSides[key] !== 'left';
        return `<tr${active ? '' : ' class="cmp-row-inactive"'}>
            <td class="cmp-td-name">${label}</td>
            <td class="cmp-td-check"><input type="checkbox" class="cmp-layer-chk" data-layer="${key}" data-col="left"${isLeft ? ' checked' : ''}${active ? '' : ' disabled'}></td>
            <td class="cmp-td-check"><input type="checkbox" class="cmp-layer-chk" data-layer="${key}" data-col="right"${isRight ? ' checked' : ''}${active ? '' : ' disabled'}></td>
        </tr>`;
    }).join('');
    panel.innerHTML = `
        <table class="cmp-sb-table">
            <thead>
                <tr>
                    <th></th>
                    <th class="cmp-th-left">&#9664; G</th>
                    <th class="cmp-th-right">D &#9654;</th>
                </tr>
            </thead>
            <tbody>
                <tr class="cmp-section-row"><td colspan="3">Fond de carte</td></tr>
                ${Object.entries(CMP_LABELS).map(([k, v]) => `
                <tr>
                    <td class="cmp-td-name">${v}</td>
                    <td class="cmp-td-check"><input type="radio" name="cmp-bm-left" value="${k}"${compareLeftKey === k ? ' checked' : ''}></td>
                    <td class="cmp-td-check"><input type="radio" name="cmp-bm-right" value="${k}"${compareRightKey === k ? ' checked' : ''}></td>
                </tr>`).join('')}
                <tr class="cmp-section-row"><td colspan="3">Couches</td></tr>
                ${layerRows}
            </tbody>
        </table>`;
    panel.querySelectorAll('input[name="cmp-bm-left"]').forEach(radio => {
        radio.addEventListener('change', () => {
            compareLeftKey = radio.value;
            if (compareLeftLayer) map.removeLayer(compareLeftLayer);
            compareLeftLayer = BASEMAP_TILES[compareLeftKey]('pane-compare');
            compareLeftLayer.addTo(map);
            _applyCompareClip();
        });
    });
    panel.querySelectorAll('input[name="cmp-bm-right"]').forEach(radio => {
        radio.addEventListener('change', () => {
            compareRightKey = radio.value;
            switchBasemap(compareRightKey);
        });
    });
    panel.querySelectorAll('.cmp-layer-chk').forEach(chk => {
        chk.addEventListener('change', () => {
            const layerKey = chk.dataset.layer;
            const leftChk  = panel.querySelector(`.cmp-layer-chk[data-layer="${layerKey}"][data-col="left"]`);
            const rightChk = panel.querySelector(`.cmp-layer-chk[data-layer="${layerKey}"][data-col="right"]`);
            const l = leftChk?.checked, r = rightChk?.checked;
            cmpLayerSides[layerKey] = (l && r) ? 'both' : l ? 'left' : 'right';
            _applyCompareClip();
        });
    });
}

function enableCompare() {
    compareActive = true;
    document.getElementById('tool-compare')?.classList.add('compare-active');
    const toggle = document.getElementById('compare-toggle');
    if (toggle) toggle.checked = true;
    compareRightKey = currentBasemapKey;
    compareLeftKey = currentBasemapKey === 'satellite' ? 'esriLight' : 'satellite';
    CMP_DATA_PANES.forEach(d => { cmpLayerSides[d.key] = 'both'; });
    compareLeftLayer = BASEMAP_TILES[compareLeftKey]('pane-compare');
    compareLeftLayer.addTo(map);
    compareDivX = 0.5;
    _applyCompareClip();
    map.on('move zoomend', _applyCompareClip);
    const panel = document.getElementById('compare-sidebar-panel');
    if (panel) { panel.style.display = 'block'; _buildCompareSidebarContent(); }
    const mapEl = document.getElementById('map');
    compareDivEl = document.createElement('div');
    compareDivEl.className = 'compare-divider';
    compareDivEl.style.left = '50%';
    compareDivEl.innerHTML = '<div class="compare-handle"><i class="fas fa-arrows-left-right"></i></div>';
    mapEl.appendChild(compareDivEl);
    L.DomEvent.on(compareDivEl, 'mousedown', function (e) {
        L.DomEvent.stop(e);
        map.dragging.disable();
        const onMove = ev => _dragCompare(ev.clientX);
        const onUp = () => {
            map.dragging.enable();
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
    L.DomEvent.on(compareDivEl, 'touchstart', function (e) {
        L.DomEvent.stop(e);
        map.dragging.disable();
        const onMove = ev => _dragCompare(ev.touches[0].clientX);
        const onEnd = () => {
            map.dragging.enable();
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    });
}

function disableCompare() {
    compareActive = false;
    map.off('move zoomend', _applyCompareClip);
    document.getElementById('tool-compare')?.classList.remove('compare-active');
    const toggle = document.getElementById('compare-toggle');
    if (toggle) toggle.checked = false;
    if (compareLeftLayer) { map.removeLayer(compareLeftLayer); compareLeftLayer = null; }
    _clearAllClips();
    if (compareDivEl) { compareDivEl.remove(); compareDivEl = null; }
    const panel = document.getElementById('compare-sidebar-panel');
    if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
    CMP_DATA_PANES.forEach(d => { cmpLayerSides[d.key] = 'both'; });
}

function switchBasemap(newKey) {
    const newLayer = basemaps[newKey];
    if (!newLayer) return;
    Object.values(basemaps).forEach(layer => {
        if (map.hasLayer(layer) && layer !== newLayer) map.removeLayer(layer);
    });
    newLayer.addTo(map);
    if (newLayer.setOpacity) {
        newLayer.setOpacity(0);
        let op = 0;
        const iv = setInterval(() => {
            op = Math.min(1, op + 0.1);
            newLayer.setOpacity(op);
            if (op >= 1) clearInterval(iv);
        }, 30);
    }
    currentBasemapKey = newKey;
    applyBasemapStyles(newKey);
    updateFloatingLegend();
}

const contextMenu = L.DomUtil.create('div', 'context-menu', document.body);
contextMenu.innerHTML = `
    <div class="context-menu-item" onclick="document.getElementById('tool-home').click()"><i class="fas fa-home"></i> Accueil</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="document.getElementById('tool-distance').click()"><i class="fas fa-ruler"></i> Mesurer une distance</div>
    <div class="context-menu-item" onclick="document.getElementById('tool-area').click()"><i class="fas fa-draw-polygon"></i> Mesurer une surface</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="document.getElementById('tool-coords').click()"><i class="fas fa-crosshairs"></i> Copier coordonnées</div>
    <div class="context-menu-item" onclick="document.getElementById('tool-export').click()"><i class="fas fa-camera"></i> Faire une capture</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item danger" onclick="clearMeasure(); contextMenu.style.display='none';"><i class="fas fa-trash"></i> Nettoyer tout</div>
`;

map.on('contextmenu', function (e) {
    contextMenu.style.display = 'flex';
    contextMenu.style.left = e.originalEvent.pageX + 'px';
    contextMenu.style.top = e.originalEvent.pageY + 'px';
});

map.on('click', () => { contextMenu.style.display = 'none'; });
document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) contextMenu.style.display = 'none';
});

const _eStyle = BASEMAP_STYLES[currentBasemapKey].emprise;
const emprisePNR = L.geoJSON(null, {
    style: {
        color:     _eStyle.color,
        weight:    _eStyle.weight,
        opacity:   _eStyle.opacity,
        dashArray: _eStyle.dashArray || null,
        fillColor: 'transparent'
    }
}).addTo(map);

fetch('data/Emprise_PNR.geojson')
    .then(r => {
        if (!r.ok) throw new Error('Emprise_PNR.geojson introuvable');
        return r.json();
    })
    .then(data => {
        emprisePNR.addData(data);
        applyBasemapStyles(currentBasemapKey);
        if (emprisePNR.getBounds().isValid()) map.fitBounds(emprisePNR.getBounds());
    })
    .catch(err => console.warn('[Emprise]', err.message));

const communesPNR = L.geoJSON(null, {
    pane: 'pane-communes',
    style: {
        color: '#2c3e50',
        weight: 2.5,
        opacity: 0.9,
        fillColor: '#ffffff',
        fillOpacity: 0,
        dashArray: '6, 6',
        lineCap: 'round',
        lineJoin: 'round'
    }
}).addTo(map);

fetch('data/Communes_PNR.geojson')
    .then(r => {
        if (!r.ok) throw new Error('Communes_PNR.geojson introuvable');
        return r.json();
    })
    .then(data => {
        communesPNR.addData(data);
        applyBasemapStyles(currentBasemapKey);
        window._communeIndex = data.features.map(f => {
            const name = f.properties.nom_officiel || f.properties.NOM || f.properties.nom || f.properties.NAME || f.properties.libelle || f.properties.commune || '';
            const bounds = L.geoJSON(f).getBounds();
            return { name, bounds };
        }).filter(c => c.name && c.bounds.isValid());
        if (window._miniMap && window._miniMap._miniMap) {
            L.geoJSON(data, { style: { color: '#1e6b45', weight: 1, fillOpacity: 0, opacity: 0.7 } }).addTo(window._miniMap._miniMap);
        }
    })
    .catch(err => console.warn('[Communes]', err.message));

let parcellesData = null;
let parcellesPNR = L.layerGroup();

function loadParcellesVectorTiles() {
    if (!parcellesData) return;
    parcellesPNR.clearLayers();
    const vectorGrid = L.vectorGrid.slicer(parcellesData, {
        rendererFactory: L.canvas.tile,
        pane: 'pane-parcelles',
        vectorTileLayerStyles: {
            sliced: {
                fillColor: '#f1c40f',
                fillOpacity: 0.05,
                stroke: true,
                color: '#f39c12',
                weight: 0.8,
                opacity: 0.6
            }
        },
        maxZoom: 22,
        indexMaxZoom: 4,
        interactive: true,
        tolerance: 3,
        extent: 512,
        buffer: 64,
        lineMetrics: false,
        getFeatureId: function (f) {
            return f.properties.__id !== undefined ? f.properties.__id : Math.random().toString(36).substr(2, 9);
        }
    });
    parcellesPNR.addLayer(vectorGrid);
}

map.on('click', function (e) {
    if (!parcellesData) return;
    if (!document.getElementById('layer-parcelles')?.checked) return;
    const pt = turf.point([e.latlng.lng, e.latlng.lat]);
    let clickedFeature = null;
    toolInfo.show('<i class="fas fa-spinner fa-spin"></i> Recherche de la parcelle...');
    setTimeout(() => {
        const clickLng = e.latlng.lng;
        const clickLat = e.latlng.lat;
        for (let i = 0; i < parcellesData.features.length; i++) {
            const f = parcellesData.features[i];
            if (!f._bbox) f._bbox = turf.bbox(f);
            const [minX, minY, maxX, maxY] = f._bbox;
            if (clickLng < minX || clickLng > maxX || clickLat < minY || clickLat > maxY) continue;
            try {
                if (turf.booleanPointInPolygon(pt, f)) { clickedFeature = f; break; }
            } catch (_) { }
        }
        toolInfo.hide();
        if (clickedFeature) {
            const props = clickedFeature.properties;
            let popupContent = '<div style="max-height: 200px; overflow-y: auto; font-family: Roboto; font-size: 13px;"><b>Infos Parcelle</b><br><table style="width:100%; text-align:left; margin-top:5px;">';
            let foundProps = false;
            for (let prop in props) {
                if (prop !== '__id' && props[prop]) {
                    popupContent += `<tr><td style="color:#666; padding-right:10px;">${prop}</td><td>${props[prop]}</td></tr>`;
                    foundProps = true;
                }
            }
            popupContent += '</table></div>';
            if (!foundProps) popupContent = '<b>Parcelle</b><br>Aucune information disponible.';
            L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(map);
        } else {
            L.popup().setLatLng(e.latlng).setContent('<i>Aucune parcelle trouvée à cet endroit.</i>').openOn(map);
        }
    }, 10);
});

toolInfo.show('<i class="fas fa-spinner fa-spin"></i> Préparation des parcelles (peut prendre 5-10s)...');
fetch('data/Parcelles_PNR.geojson')
    .then(r => {
        if (!r.ok) throw new Error('Parcelles_PNR.geojson introuvable');
        return r.json();
    })
    .then(data => {
        data.features.forEach((f, i) => {
            f.properties.__id = i;
            f._bbox = turf.bbox(f);
        });
        parcellesData = data;
        loadParcellesVectorTiles();
        toolInfo.show('<i class="fas fa-check" style="color:#2ecc71"></i> Parcelles prêtes !');
        setTimeout(() => toolInfo.hide(), 2000);
        if (document.getElementById('layer-parcelles')?.checked) map.addLayer(parcellesPNR);
    })
    .catch(err => {
        toolInfo.hide();
        console.warn('[Parcelles]', err.message);
    });

function _probaColor(t) {
    const stops = [
        { p: 0.00, c: [255, 255, 255] },
        { p: 0.20, c: [200, 230, 180] },
        { p: 0.40, c: [140, 190, 100] },
        { p: 0.60, c: [80, 140, 50] },
        { p: 0.80, c: [30, 100, 20] },
        { p: 1.00, c: [10, 60, 5] }
    ];
    let lo = 0;
    for (let i = 0; i < stops.length - 1; i++) { if (t <= stops[i + 1].p) { lo = i; break; } }
    const hi = Math.min(lo + 1, stops.length - 1);
    const span = stops[hi].p - stops[lo].p;
    const f = span === 0 ? 0 : (t - stops[lo].p) / span;
    return stops[lo].c.map((v, i) => Math.round(v + (stops[hi].c[i] - v) * f));
}

const ProbaColorLayer = L.TileLayer.extend({
    createTile(coords, done) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            ctx.drawImage(img, 0, 0, 256, 256);
            try {
                const id = ctx.getImageData(0, 0, 256, 256);
                const d = id.data;
                for (let i = 0; i < d.length; i += 4) {
                    if (d[i + 3] === 0) continue;
                    const t = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
                    const [r, g, b] = _probaColor(t);
                    d[i] = r; d[i + 1] = g; d[i + 2] = b;
                }
                ctx.putImageData(id, 0, 0);
            } catch (_) { }
            done(null, canvas);
        };
        img.onerror = () => done(null, canvas);
        img.src = this.getTileUrl(coords);
        return canvas;
    }
});

const probabilites = new ProbaColorLayer(
    'https://tiles.arcgis.com/tiles/y9Ov7ybbaxLMONwL/arcgis/rest/services/Proba_Online/MapServer/tile/{z}/{y}/{x}',
    { attribution: '&copy; PNR du Mont-Ventoux – Probabilité d\'occurrence', maxZoom: 19, maxNativeZoom: 17, opacity: 1, pane: 'pane-probabilites' }
);

function _mntElevColor(t) {
    const stops = [
        { p: 0.00, c: [40, 80, 35] },
        { p: 0.18, c: [85, 150, 55] },
        { p: 0.35, c: [145, 190, 85] },
        { p: 0.50, c: [195, 215, 110] },
        { p: 0.63, c: [225, 205, 115] },
        { p: 0.76, c: [215, 155, 85] },
        { p: 0.90, c: [205, 125, 105] },
        { p: 1.00, c: [245, 235, 225] }
    ];
    let lo = 0;
    for (let i = 0; i < stops.length - 1; i++) { if (t <= stops[i + 1].p) { lo = i; break; } }
    const hi = Math.min(lo + 1, stops.length - 1);
    const span = stops[hi].p - stops[lo].p;
    const f = span === 0 ? 0 : (t - stops[lo].p) / span;
    return stops[lo].c.map((v, i) => Math.round(v + (stops[hi].c[i] - v) * f));
}

const MNTColorLayer = L.TileLayer.extend({
    createTile(coords, done) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            ctx.drawImage(img, 0, 0, 256, 256);
            try {
                const id = ctx.getImageData(0, 0, 256, 256);
                const d = id.data;
                for (let i = 0; i < d.length; i += 4) {
                    if (d[i + 3] === 0) continue;
                    const t = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
                    const [r, g, b] = _mntElevColor(t);
                    d[i] = r; d[i + 1] = g; d[i + 2] = b;
                }
                ctx.putImageData(id, 0, 0);
            } catch (_) { }
            done(null, canvas);
        };
        img.onerror = () => done(null, canvas);
        img.src = this.getTileUrl(coords);
        return canvas;
    }
});

const mntOmbrage = new MNTColorLayer(
    'https://tiles.arcgis.com/tiles/y9Ov7ybbaxLMONwL/arcgis/rest/services/MNT_Online/MapServer/tile/{z}/{y}/{x}',
    { attribution: '&copy; PNR du Mont-Ventoux – MNT LiDAR', maxZoom: 19, maxNativeZoom: 17, opacity: 1, pane: 'pane-mnt' }
);

const ombrageRaster = L.tileLayer(
    'https://tiles.arcgis.com/tiles/y9Ov7ybbaxLMONwL/arcgis/rest/services/Ombrage_Online/MapServer/tile/{z}/{y}/{x}',
    { attribution: '&copy; PNR du Mont-Ventoux – Ombrage', maxZoom: 19, maxNativeZoom: 17, opacity: 1, pane: 'pane-ombrage' }
);

const GEOM_ZOOM      = 14;
const MAX_CENTROIDS  = 15000;
const MAX_GEOMS      = 4000;

class ClusteredArcGISLayer {
    constructor(serviceUrl, geomStyle, options = {}) {
        this.serviceUrl    = serviceUrl;
        this.geomZoom      = options.geomZoom  ?? GEOM_ZOOM;
        this.maxItems      = options.maxItems  ?? 2000;
        this.debounceMs    = options.debounce  ?? 400;
        this.label         = options.label     ?? 'Couche';
        this._clusterHue   = options.clusterHue   ?? 200;
        this._geomStyle    = { ...geomStyle };
        this._pane         = options.pane ?? null;
        this._interactive  = options.interactive ?? false;
        this._outFields    = options.outFields ?? 'FID';

        this._cluster = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius:    60,
            spiderfyOnMaxZoom:   false,
            iconCreateFunction:  (c) => this._clusterIcon(c),
        });

        this._geomLayer = L.geoJSON(null, {
            pane:     this._pane ?? undefined,
            renderer: L.canvas({ padding: 0.5, pane: this._pane ?? undefined }),
            style:    () => ({ ...this._geomStyle }),
            interactive: this._interactive,
            onEachFeature: this._interactive ? (f, layer) => this._bindPopup(f, layer) : undefined,
        });

        this._centroidIds = new Set();
        this._geomIds     = new Set();
        this._ctrlC = null;
        this._ctrlG = null;
        this._timer = null;
        this._map   = null;
        this._on    = false;
        this._mode  = null;
    }

    _clusterIcon(cluster) {
        const n = cluster.getChildCount();
        const t = Math.min(1, Math.log(n) / Math.log(2000));
        const size = Math.round(18 + t * 26);
        const lig = Math.round(78 - t * 44);
        const sat = Math.round(55 + t * 33);
        const h   = this._clusterHue;
        const bg  = `hsl(${h},${sat}%,${lig}%)`;
        const bdr = `hsl(${h},${sat}%,${Math.max(15, lig - 18)}%)`;
        const label = n >= 1000 ? Math.round(n / 1000) + 'k' : String(n);
        const fs = Math.round(size * 0.38);
        const txtColor = lig < 50 ? '#fff' : '#1a1a1a';
        return L.divIcon({
            html: `<div class="arcgis-cluster-dot" style="width:${size}px;height:${size}px;background:${bg};border-color:${bdr};font-size:${fs}px;color:${txtColor}">${label}</div>`,
            className: '',
            iconSize:   [size, size],
            iconAnchor: [size / 2, size / 2],
        });
    }

    _bindPopup(feature, layer) {
        layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            const p = feature.properties || {};
            const area = p.Shape__Area ?? p.Shape_Area ?? null;
            const perim = p.Shape__Length ?? p.Shape_Length ?? null;
            let html = '<div class="terrasse-popup"><div class="terrasse-popup-title"><i class="fas fa-draw-polygon"></i> Terrasse</div>';
            if (area !== null || perim !== null) {
                if (area !== null) {
                    const areaVal = area >= 10000 ? (area / 10000).toFixed(2) + ' ha' : Math.round(area) + ' m\u00b2';
                    html += '<div class="terrasse-popup-row"><span>Surface</span><b>' + areaVal + '</b></div>';
                }
                if (perim !== null) {
                    const perimVal = perim >= 1000 ? (perim / 1000).toFixed(2) + ' km' : Math.round(perim) + ' m';
                    html += '<div class="terrasse-popup-row"><span>P\u00e9rim\u00e8tre</span><b>' + perimVal + '</b></div>';
                }
            } else {
                html += '<div class="terrasse-popup-row"><span>Aucune donn\u00e9e attributaire</span></div>';
            }
            html += '</div>';
            L.popup({ className: 'terrasse-popup-wrap', closeButton: true })
                .setLatLng(e.latlng)
                .setContent(html)
                .openOn(this._map);
        });
    }

    init(map) { this._map = map; }

    enable() {
        if (this._on) return;
        this._on = true;
        this._schedule(false);
    }

    disable() {
        this._on   = false;
        this._mode = null;
        this._cancelAll();
        this._cluster.clearLayers();
        this._geomLayer.clearLayers();
        this._centroidIds.clear();
        this._geomIds.clear();
        if (this._map?.hasLayer(this._cluster))   this._map.removeLayer(this._cluster);
        if (this._map?.hasLayer(this._geomLayer)) this._map.removeLayer(this._geomLayer);
        toolInfo.hide();
    }

    onMove(isZoom) { if (this._on) this._schedule(isZoom); }

    _cancelAll() {
        clearTimeout(this._timer);
        this._timer = null;
        if (this._ctrlC) { this._ctrlC.abort(); this._ctrlC = null; }
        if (this._ctrlG) { this._ctrlG.abort(); this._ctrlG = null; }
    }

    _schedule(isZoom) {
        clearTimeout(this._timer);
        this._timer = setTimeout(() => this._load(isZoom), this.debounceMs);
    }

    _bbox() {
        const b = this._map.getBounds().pad(0.05);
        return [
            b.getWest().toFixed(6), b.getSouth().toFixed(6),
            b.getEast().toFixed(6), b.getNorth().toFixed(6),
        ].join(',');
    }

    async _load(isZoom) {
        if (!this._on || !this._map) return;
        const zoom = this._map.getZoom();
        const bbox = this._bbox();

        if (zoom < this.geomZoom) {
            if (this._mode !== 'cluster') {
                this._mode = 'cluster';
                if (this._ctrlG) { this._ctrlG.abort(); this._ctrlG = null; }
                this._geomLayer.clearLayers();
                this._geomIds.clear();
                if (this._map.hasLayer(this._geomLayer)) this._map.removeLayer(this._geomLayer);
                this._cluster.clearLayers();
                this._centroidIds.clear();
                if (!this._map.hasLayer(this._cluster)) this._map.addLayer(this._cluster);
            }
            await this._loadCentroids(bbox);

        } else {
            if (this._mode !== 'geom') {
                this._mode = 'geom';
                if (this._ctrlC) { this._ctrlC.abort(); this._ctrlC = null; }
                this._cluster.clearLayers();
                this._centroidIds.clear();
                if (this._map.hasLayer(this._cluster)) this._map.removeLayer(this._cluster);
                this._geomLayer.clearLayers();
                this._geomIds.clear();
                if (!this._map.hasLayer(this._geomLayer)) this._map.addLayer(this._geomLayer);
            } else if (isZoom) {
                this._geomLayer.clearLayers();
                this._geomIds.clear();
            }
            await this._loadGeometries(bbox);
        }
    }

    async _loadCentroids(bboxStr) {
        const ctrl = new AbortController();
        this._ctrlC = ctrl;

        if (this._centroidIds.size > MAX_CENTROIDS) {
            this._cluster.clearLayers();
            this._centroidIds.clear();
        }

        toolInfo.show(`<i class="fas fa-spinner fa-spin"></i> ${this.label} : chargement…`);

        const [w, s, e, n] = bboxStr.split(',').map(Number);
        const dw = (e - w) / 3, dh = (n - s) / 3;
        const cells = [];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                cells.push([
                    (w + col * dw).toFixed(6),       (s + row * dh).toFixed(6),
                    (w + (col + 1) * dw).toFixed(6), (s + (row + 1) * dh).toFixed(6),
                ].join(','));
            }
        }

        try {
            await Promise.all(cells.map(cb => this._fetchCentroidsCell(cb, ctrl)));
            if (ctrl.signal.aborted) return;
            const total = this._cluster.getLayers().length;
            if (total > 0) {
                toolInfo.show(`<i class="fas fa-check" style="color:#2ecc71"></i> ${this.label} : ~${total} entités`);
                setTimeout(() => toolInfo.hide(), 2000);
            } else {
                toolInfo.hide();
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.warn('[ClusteredArcGIS centroids]', this.label, e.message);
                toolInfo.hide();
            }
        }
    }

    async _fetchCentroidsCell(cellBbox, ctrl) {
        const url = `${this.serviceUrl}?where=1%3D1` +
            `&geometry=${encodeURIComponent(cellBbox)}` +
            `&geometryType=esriGeometryEnvelope` +
            `&spatialRel=esriSpatialRelIntersects` +
            `&outFields=FID` +
            `&f=geojson` +
            `&resultRecordCount=400`;

        const resp = await fetch(url, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        if (ctrl.signal.aborted || data.error) return;

        const markers = [];
        for (const f of (data.features || [])) {
            if (!f.geometry) continue;
            const id = f.properties?.FID ?? f.properties?.OBJECTID;
            if (id != null && this._centroidIds.has(id)) continue;
            if (id != null) this._centroidIds.add(id);

            const geom = f.geometry;
            let lng, lat;
            if (geom.type === 'Polygon' && geom.coordinates?.[0]?.length) {
                const ring = geom.coordinates[0];
                [lng, lat] = ring[Math.floor(ring.length / 2)];
            } else if (geom.type === 'MultiPolygon' && geom.coordinates?.[0]?.[0]?.length) {
                const ring = geom.coordinates[0][0];
                [lng, lat] = ring[Math.floor(ring.length / 2)];
            } else if (geom.type === 'LineString' && geom.coordinates?.length) {
                [lng, lat] = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
            } else if (geom.type === 'MultiLineString' && geom.coordinates?.[0]?.length) {
                const line = geom.coordinates[0];
                [lng, lat] = line[Math.floor(line.length / 2)];
            } else if (geom.type === 'Point') {
                [lng, lat] = geom.coordinates;
            } else continue;

            markers.push(L.marker([lat, lng], {
                icon: L.divIcon({ className: '', iconSize: [0, 0] }),
                interactive: false,
            }));
        }
        if (markers.length) this._cluster.addLayers(markers);
    }

    async _loadGeometries(bbox) {
        if (this._ctrlG) this._ctrlG.abort();
        const ctrl = new AbortController();
        this._ctrlG = ctrl;

        if (this._geomIds.size > MAX_GEOMS) {
            this._geomLayer.clearLayers();
            this._geomIds.clear();
        }

        toolInfo.show(`<i class="fas fa-spinner fa-spin"></i> ${this.label} : géométries…`);

        const url = `${this.serviceUrl}?where=1%3D1` +
            `&geometry=${encodeURIComponent(bbox)}` +
            `&geometryType=esriGeometryEnvelope` +
            `&spatialRel=esriSpatialRelIntersects` +
            `&outFields=${this._outFields}&f=geojson` +
            `&resultRecordCount=${this.maxItems}`;

        try {
            const resp = await fetch(url, { signal: ctrl.signal });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            if (ctrl.signal.aborted) return;

            const fresh = (data.features || []).filter(f => {
                const id = f.properties?.FID ?? f.properties?.OBJECTID;
                if (id == null || this._geomIds.has(id)) return false;
                this._geomIds.add(id);
                return true;
            });

            if (fresh.length) {
                this._geomLayer.addData({ type: 'FeatureCollection', features: fresh });
            }

            const total = this._geomIds.size;
            if (total > 0) {
                toolInfo.show(`<i class="fas fa-check" style="color:#2ecc71"></i> ${this.label} : ${total} entité(s)`);
                setTimeout(() => toolInfo.hide(), 2000);
            } else {
                toolInfo.show(`<i class="fas fa-info-circle"></i> ${this.label} : aucune entité ici`);
                setTimeout(() => toolInfo.hide(), 2000);
            }

        } catch (e) {
            if (e.name !== 'AbortError') {
                console.warn('[ClusteredArcGIS geometries]', this.label, e.message);
                toolInfo.hide();
            }
        }
    }

    setStyle(partial) {
        Object.assign(this._geomStyle, partial);
        this._geomLayer.setStyle(() => ({ ...this._geomStyle }));
    }

    setClusterColor(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0;
        if (max !== min) {
            const d = max - min;
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            else if (max === g) h = ((b - r) / d + 2) / 6;
            else h = ((r - g) / d + 4) / 6;
        }
        this._clusterHue = Math.round(h * 360);
        if (this._mode === 'cluster' && this._map?.hasLayer(this._cluster)) {
            const markers = this._cluster.getLayers();
            this._cluster.clearLayers();
            if (markers.length) this._cluster.addLayers(markers);
        }
    }
}

const terrassesLayer = new ClusteredArcGISLayer(
    'https://services5.arcgis.com/y9Ov7ybbaxLMONwL/arcgis/rest/services/TERRASSES/FeatureServer/0/query',
    { color: '#e74c3c', weight: 1.5, opacity: 0.9, fillColor: '#c0392b', fillOpacity: 0.45 },
    { debounce: 400, label: 'Terrasses RF', clusterHue: 6, pane: 'pane-terrasses', interactive: true, outFields: 'FID,Shape__Area,Shape__Length' }
);

const rupturesLayer = new ClusteredArcGISLayer(
    'https://services5.arcgis.com/y9Ov7ybbaxLMONwL/arcgis/rest/services/ruptures_squelette/FeatureServer/0/query',
    { color: '#e67e22', weight: 2, opacity: 0.9, fillOpacity: 0 },
    { debounce: 400, label: 'Ruptures de pentes', clusterHue: 28, pane: 'pane-ruptures' }
);

terrassesLayer.init(map);
rupturesLayer.init(map);

map.on('moveend', () => { terrassesLayer.onMove(false); rupturesLayer.onMove(false); });
map.on('zoomend', () => { terrassesLayer.onMove(true);  rupturesLayer.onMove(true);  });

const layerMapping = {
    'layer-communes':     communesPNR,
    'layer-parcelles':    parcellesPNR,
    'layer-probabilites': probabilites,
    'layer-mnt-ombrage':  mntOmbrage,
    'layer-ombrage':      ombrageRaster,
};

const vectorLayerMapping = {
    'layer-terrasses': terrassesLayer,
    'layer-ruptures':  rupturesLayer,
};

let layerOrderState = [...LAYER_PANES];

function applyLayerZOrder() {
    layerOrderState.forEach((entry, i) => {
        const pane = map.getPane(entry.id);
        if (pane) pane.style.zIndex = 201 + i;
    });
}

function _orderSymbol(paneId) {
    const colorMap = {
        'pane-communes':     () => document.getElementById('color-communes')?.value || '#2c3e50',
        'pane-parcelles':    () => document.getElementById('color-parcelles')?.value || '#f1c40f',
        'pane-terrasses':    () => document.getElementById('color-terrasses')?.value || '#e74c3c',
        'pane-ruptures':     () => document.getElementById('color-ruptures')?.value || '#e67e22',
    };
    if (paneId === 'pane-probabilites')
        return '<span class="order-sym" style="width:20px;height:10px;border-radius:3px;background:linear-gradient(90deg,#ffffff,#508c32,#0a3c05);border:1px solid rgba(0,0,0,0.1);"></span>';
    if (paneId === 'pane-mnt')
        return '<span class="order-sym" style="width:20px;height:10px;border-radius:3px;background:linear-gradient(90deg,#285023,#c3d76e,#cd7d69,#f5ebe1);border:1px solid rgba(0,0,0,0.1);"></span>';
    if (paneId === 'pane-ombrage')
        return '<span class="order-sym" style="width:20px;height:10px;border-radius:3px;background:linear-gradient(90deg,#333,#999,#eee);border:1px solid rgba(0,0,0,0.1);"></span>';
    if (paneId === 'pane-ruptures') {
        const c = colorMap[paneId]();
        return `<span class="order-sym" style="width:20px;height:0;border-bottom:3px solid ${c};"></span>`;
    }
    if (colorMap[paneId]) {
        const c = colorMap[paneId]();
        const fill = paneId === 'pane-communes' ? 'transparent' : c + '26';
        return `<span class="order-sym" style="width:14px;height:14px;border-radius:3px;border:2px solid ${c};background:${fill};"></span>`;
    }
    return '';
}

function renderLayerOrderPanel() {
    const panel = document.getElementById('layer-order-panel');
    if (!panel) return;
    panel.innerHTML = '';

    let dragSrcIdx = null;

    [...layerOrderState].reverse().forEach((entry, reversedIdx) => {
        const realIdx = layerOrderState.length - 1 - reversedIdx;
        const row = document.createElement('div');
        row.className = 'layer-order-row';
        row.draggable = true;
        row.dataset.realIdx = realIdx;
        const isTop = reversedIdx === 0;
        const isBot = reversedIdx === layerOrderState.length - 1;
        const badge = isTop ? '<span class="layer-order-badge badge-top">▲ haut</span>'
                    : isBot ? '<span class="layer-order-badge badge-bot">▼ bas</span>'
                    : '';
        row.innerHTML = `
            <i class="fas fa-grip-vertical drag-handle"></i>
            <span class="layer-order-num">${reversedIdx + 1}</span>
            ${_orderSymbol(entry.id)}
            <span class="layer-order-label">${entry.label}</span>
            ${badge}`;

        row.addEventListener('dragstart', e => {
            dragSrcIdx = realIdx;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => row.classList.add('dragging'), 0);
        });
        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            panel.querySelectorAll('.layer-order-row').forEach(r => r.classList.remove('drag-over'));
        });
        row.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            panel.querySelectorAll('.layer-order-row').forEach(r => r.classList.remove('drag-over'));
            if (dragSrcIdx !== realIdx) row.classList.add('drag-over');
        });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
        row.addEventListener('drop', e => {
            e.preventDefault();
            row.classList.remove('drag-over');
            if (dragSrcIdx === null || dragSrcIdx === realIdx) return;
            const item = layerOrderState.splice(dragSrcIdx, 1)[0];
            const targetIdx = dragSrcIdx < realIdx ? realIdx - 1 : realIdx;
            layerOrderState.splice(targetIdx, 0, item);
            applyLayerZOrder();
            renderLayerOrderPanel();
        });

        panel.appendChild(row);
    });
}

renderLayerOrderPanel();

document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const pageNum = tab.dataset.page;
        document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.sidebar-page').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const page = document.getElementById('sidebar-page-' + pageNum);
        if (page) page.classList.add('active');
        if (pageNum === '2') renderLayerOrderPanel();
    });
});

Object.keys(layerMapping).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const layer = layerMapping[id];
    const sliderId = 'slider-' + id.replace('layer-', '').replace('mnt-ombrage', 'mnt') + '-container';
    const sliderEl = document.getElementById(sliderId);
    el.addEventListener('change', e => {
        if (e.target.checked) {
            map.addLayer(layer);
            if (sliderEl) sliderEl.style.display = 'flex';
        } else {
            if (map.hasLayer(layer)) map.removeLayer(layer);
            if (sliderEl) sliderEl.style.display = 'none';
        }
        updateFloatingLegend();
    });
});

Object.entries(vectorLayerMapping).forEach(([id, vl]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const sliderId = 'slider-' + id.replace('layer-', '') + '-container';
    const sliderEl = document.getElementById(sliderId);
    el.addEventListener('change', e => {
        if (e.target.checked) {
            vl.enable();
            if (sliderEl) sliderEl.style.display = 'flex';
        } else {
            vl.disable();
            if (sliderEl) sliderEl.style.display = 'none';
        }
        updateFloatingLegend();
    });
});

['probabilites', 'mnt', 'ombrage'].forEach(key => {
    const slider = document.getElementById('opacity-' + key);
    if (!slider) return;
    slider.addEventListener('input', e => {
        const opacity = parseInt(e.target.value) / 100;
        const lyrId = key === 'mnt' ? 'layer-mnt-ombrage' : 'layer-' + key;
        layerMapping[lyrId]?.setOpacity(opacity);
    });
});

const sliderTerrasses = document.getElementById('opacity-terrasses');
if (sliderTerrasses) {
    sliderTerrasses.addEventListener('input', e => {
        const op = parseInt(e.target.value) / 100;
        terrassesLayer.setStyle({ opacity: op, fillOpacity: op * 0.5 });
    });
}

const sliderRuptures = document.getElementById('opacity-ruptures');
if (sliderRuptures) {
    sliderRuptures.addEventListener('input', e => {
        const op = parseInt(e.target.value) / 100;
        rupturesLayer.setStyle({ opacity: op });
    });
}

const colorCommunes = document.getElementById('color-communes');
if (colorCommunes) {
    colorCommunes.addEventListener('input', e => {
        const c = e.target.value;
        communesPNR.setStyle({ color: c });
        const sw = document.getElementById('legend-swatch-communes');
        if (sw) sw.style.borderColor = c;
        updateFloatingLegend();
    });
}

const colorParcelles = document.getElementById('color-parcelles');
if (colorParcelles) {
    colorParcelles.addEventListener('input', e => {
        const c = e.target.value;
        parcellesPNR.eachLayer(vg => {
            vg.options.vectorTileLayerStyles.sliced.fillColor = c;
            vg.options.vectorTileLayerStyles.sliced.color = c;
            vg.redraw();
        });
        const sw = document.getElementById('legend-swatch-parcelles');
        if (sw) { sw.style.borderColor = c; sw.style.background = c + '26'; }
        updateFloatingLegend();
    });
}

const colorTerrasses = document.getElementById('color-terrasses');
if (colorTerrasses) {
    colorTerrasses.addEventListener('input', e => {
        const c = e.target.value;
        const op = parseInt(document.getElementById('opacity-terrasses')?.value ?? 90) / 100;
        terrassesLayer.setStyle({ color: c, fillColor: c, opacity: op, fillOpacity: op * 0.5 });
        terrassesLayer.setClusterColor(c);
        const sw = document.getElementById('legend-swatch-terrasses');
        if (sw) { sw.style.borderColor = c; sw.style.background = c + '66'; }
        updateFloatingLegend();
    });
}

const colorRuptures = document.getElementById('color-ruptures');
if (colorRuptures) {
    colorRuptures.addEventListener('input', e => {
        const c = e.target.value;
        const op = parseInt(document.getElementById('opacity-ruptures')?.value ?? 90) / 100;
        rupturesLayer.setStyle({ color: c, opacity: op });
        rupturesLayer.setClusterColor(c);
        const sw = document.getElementById('legend-swatch-ruptures');
        if (sw) sw.style.borderBottom = '3px solid ' + c;
        updateFloatingLegend();
    });
}

const modalOverlay = document.getElementById('info-modal');
const modalClose = document.getElementById('modal-close');
const btnInfo = document.getElementById('btn-info-footer');

function openModal() {
    if (modalOverlay) modalOverlay.classList.add('active');
}

function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
}

if (btnInfo) btnInfo.addEventListener('click', openModal);
if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalOverlay) {
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) closeModal();
    });
}

const header = document.querySelector('.main-header');
const headerToggle = document.getElementById('header-toggle');
const revealHeader = document.createElement('button');
revealHeader.id = 'reveal-header';
revealHeader.className = 'reveal-btn';
revealHeader.innerHTML = '<i class="fas fa-chevron-down"></i>';
revealHeader.title = 'Afficher le header';
document.querySelector('.map-wrapper').appendChild(revealHeader);

if (headerToggle && header) {
    headerToggle.addEventListener('click', () => {
        header.classList.add('collapsed');
        revealHeader.style.display = 'flex';
        setTimeout(() => map.invalidateSize(), 400);
    });
}

revealHeader.addEventListener('click', () => {
    header.classList.remove('collapsed');
    revealHeader.style.display = 'none';
    setTimeout(() => map.invalidateSize(), 400);
});

const footer = document.querySelector('.main-footer');
const footerToggle = document.getElementById('footer-toggle');
const revealFooter = document.createElement('button');
revealFooter.id = 'reveal-footer';
revealFooter.className = 'reveal-btn';
revealFooter.innerHTML = '<i class="fas fa-chevron-up"></i>';
revealFooter.title = 'Afficher le footer';
document.querySelector('.map-wrapper').appendChild(revealFooter);

if (footerToggle && footer) {
    footerToggle.addEventListener('click', () => {
        footer.classList.add('collapsed');
        revealFooter.style.display = 'flex';
        setTimeout(() => map.invalidateSize(), 400);
    });
}

revealFooter.addEventListener('click', () => {
    footer.classList.remove('collapsed');
    revealFooter.style.display = 'none';
    setTimeout(() => map.invalidateSize(), 400);
});

const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.querySelector('.sidebar');

const sidebarBackdrop = document.createElement('div');
sidebarBackdrop.className = 'sidebar-backdrop';
document.querySelector('.map-wrapper')?.appendChild(sidebarBackdrop);

const sidebarCloseMobile = document.createElement('button');
sidebarCloseMobile.className = 'sidebar-close-mobile';
sidebarCloseMobile.innerHTML = '<i class="fas fa-times"></i>';
sidebar?.querySelector('.sidebar-header')?.appendChild(sidebarCloseMobile);

function closeSidebar() {
    if (!sidebar || !sidebarToggle) return;
    sidebar.classList.add('collapsed');
    sidebarToggle.classList.add('collapsed');
    const icon = sidebarToggle.querySelector('i');
    if (icon) icon.classList.replace('fa-chevron-left', 'fa-chevron-right');
    sidebarToggle.title = 'Afficher le panneau';
    map.getContainer().classList.add('sidebar-collapsed-map');
    sidebarBackdrop.classList.remove('active');
    setTimeout(() => map.invalidateSize(), 400);
}

function openSidebar() {
    if (!sidebar || !sidebarToggle) return;
    sidebar.classList.remove('collapsed');
    sidebarToggle.classList.remove('collapsed');
    const icon = sidebarToggle.querySelector('i');
    if (icon) icon.classList.replace('fa-chevron-right', 'fa-chevron-left');
    sidebarToggle.title = 'Masquer le panneau';
    map.getContainer().classList.remove('sidebar-collapsed-map');
    if (window.innerWidth <= 768) sidebarBackdrop.classList.add('active');
    setTimeout(() => map.invalidateSize(), 400);
}

if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
        if (sidebar.classList.contains('collapsed')) openSidebar();
        else closeSidebar();
    });
}
sidebarCloseMobile.addEventListener('click', closeSidebar);
sidebarBackdrop.addEventListener('click', closeSidebar);

if (window.innerWidth <= 768 && sidebar) {
    sidebar.classList.add('collapsed');
    if (sidebarToggle) {
        sidebarToggle.classList.add('collapsed');
        const icon = sidebarToggle.querySelector('i');
        if (icon) icon.classList.replace('fa-chevron-left', 'fa-chevron-right');
    }
    map.getContainer().classList.add('sidebar-collapsed-map');
}

if (window.innerWidth <= 768) {
    const toolbar = document.querySelector('.map-toolbar');
    if (toolbar) {
        document.querySelector('.map-wrapper')?.appendChild(toolbar);
    }
}

updateFloatingLegend();
