/**
 * WebGIS Analisis UHI & Keterjangkauan UGS Surabaya
 * ENGINE REVISI FINAL ANTI-GAGAL - Kelompok 03 PWK (2026)
 */

function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const activePage = document.getElementById(`page-${pageId}`);
    if (activePage) activePage.classList.add('active');
    const activeLink = document.querySelector(`[onclick="showPage('${pageId}')"]`);
    if (activeLink) activeLink.classList.add('active');
    if (pageId === 'map' && window.map) {
        setTimeout(() => { window.map.resize(); }, 100);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const map = new maplibregl.Map({
        container: 'map',
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [112.7508, -7.2575],
        zoom: 11.2,
        minZoom: 10,
        maxZoom: 16
    });

    window.map = map;

    map.on('load', function() {
        // --- SOURCES ---
        map.addSource('kecamatan-src', { type: 'geojson', data: 'data/Kecamatan_UHI.geojson' });
        map.addSource('jalan-src', { type: 'geojson', data: 'data/jalan_SBY.geojson' });
        map.addSource('service10-src', { type: 'geojson', data: 'data/Service_6700.geojson' });
        map.addSource('service5-src', { type: 'geojson', data: 'data/Service_3300.geojson' });
        map.addSource('rth-src', { type: 'geojson', data: 'data/Titik_RTH_FIX.geojson' });

        // --- SIMBOLOGI & LAYER ORDERING ---

        // 1. Layer Poligon Kecamatan
        map.addLayer({
            'id': 'kecamatan-layer',
            'type': 'fill',
            'source': 'kecamatan-src',
            'paint': {
                'fill-color': [
                    'step',
                    ['get', 'Skor_UHI'],
                    '#2ecc71', // 🟢 Rendah (6-8)
                    9,
                    '#f1c40f', // 🟡 Sedang (9-11)
                    12,
                    '#e74c3c'  // 🔴 Tinggi (12-14)
                ],
                'fill-opacity': 0.6
            }
        });

        // 2. Layer Garis Batas Kecamatan Default
        map.addLayer({
            'id': 'kecamatan-border-layer',
            'type': 'line',
            'source': 'kecamatan-src',
            'paint': {
                'line-color': '#ffffff',
                'line-width': 0.8,
                'line-opacity': 0.4
            }
        });

        // Layer khusus garis hover melingkar menyala
        map.addLayer({
            'id': 'kecamatan-hover-layer',
            'type': 'line',
            'source': 'kecamatan-src',
            'paint': {
                'line-color': '#00d2d3',
                'line-width': 3,
                'line-opacity': 0
            },
            'filter': ['==', ['get', 'K'], '']
        });

        // 3. Layer Jaringan Jalan Kota
        map.addLayer({
            'id': 'jalan-layer',
            'type': 'line',
            'source': 'jalan-src',
            'paint': {
                'line-color': '#ffffff',
                'line-width': 0.5,
                'line-opacity': 0.2
            }
        });

        // 4. Layer Service Area 10 Menit
        map.addLayer({
            'id': 'service10-layer',
            'type': 'line',
            'source': 'service10-src',
            'paint': {
                'line-color': '#7cb7df',
                'line-width': 1.2,
                'line-opacity': 0.4
            }
        });

        // 5. Layer Service Area 5 Menit
        map.addLayer({
            'id': 'service5-layer',
            'type': 'line',
            'source': 'service5-src',
            'paint': {
                'line-color': '#90dfdf',
                'line-width': 1.6,
                'line-opacity': 0.5
            }
        });

        // 6. Layer Titik Fasilitas RTH (Wajib Paling Atas di Hierarki)
        map.addLayer({
            'id': 'rth-layer',
            'type': 'circle',
            'source': 'rth-src',
            'paint': {
                'circle-radius': 7, // Diperbesar sedikit dari 6 ke 7 agar lebih klik-able
                'circle-color': '#1e272e',
                'circle-stroke-width': 2.5,
                'circle-stroke-color': '#2ecc71'
            }
        });

        // --- LOGIKA HOVER PINGGIRAN KECAMATAN ---
        map.on('mousemove', 'kecamatan-layer', function(e) {
            if (e.features.length > 0) {
                const nameKec = e.features[0].properties.K;
                map.setFilter('kecamatan-hover-layer', ['==', ['get', 'K'], nameKec]);
                map.setPaintProperty('kecamatan-hover-layer', 'line-opacity', 1);
            }
        });

        map.on('mouseleave', 'kecamatan-layer', function() {
            map.setPaintProperty('kecamatan-hover-layer', 'line-opacity', 0);
            map.setFilter('kecamatan-hover-layer', ['==', ['get', 'K'], '']);
        });

        // --- EVENT INTERAKTIF POP-UP TITIK RTH (VERSI FULL FOTO AKTIF) ---
        map.on('click', function(e) {
            const bbox = [
                [e.point.x - 12, e.point.y - 12],
                [e.point.x + 12, e.point.y + 12]
            ];
            
            const rthFeatures = map.queryRenderedFeatures(bbox, { layers: ['rth-layer'] });

            if (rthFeatures.length > 0) {
                const props = rthFeatures[0].properties;
                
                // 🛠️ TRICK CLEANING: Memotong path Windows lokal dan mengambil nama filenya saja
                const namaFileSaja = props.foto ? props.foto.split('\\').pop() : '';
                
                // Menghubungkan langsung ke folder img/ proyek web kalian
                const urlFoto = namaFileSaja ? `img/${namaFileSaja}` : 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=300';

                const html = `
                    <div style="font-family: Arial, sans-serif; width: 170px; text-align: center; color: #2c3e50;">
                        <h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold;">${props.name || 'Taman Publik'}</h4>
                        <div style="width: 100%; height: 100px; border-radius: 4px; overflow: hidden; background: #eee; box-shadow: inset 0 0 5px rgba(0,0,0,0.1);">
                            <img src="${urlFoto}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://placehold.co/170x100?text=Foto+Taman'"/>
                        </div>
                        <p style="margin: 4px 0 0 0; font-size: 10px; color: #95a5a6;">📍 Fasilitas Publik RTH</p>
                    </div>
                `;
                
                new maplibregl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(html)
                    .addTo(map);
                
                return; 
            }

            // JALUR CADANGAN 2: Jika tidak klik RTH, tampilkan pop-up kecamatan
            const kecFeatures = map.queryRenderedFeatures(e.point, { layers: ['kecamatan-layer'] });

            if (kecFeatures.length > 0) {
                const props = kecFeatures[0].properties;
                let tingkat = "Rendah"; let color = "#2ecc71";
                if (props.Skor_UHI >= 9 && props.Skor_UHI <= 11) { tingkat = "Sedang"; color = "#f1c40f"; }
                else if (props.Skor_UHI >= 12) { tingkat = "Tinggi"; color = "#e74c3c"; }

                const html = `
                    <div style="font-family: Arial, sans-serif; padding: 2px; width: 210px; color: #2c3e50;">
                        <h3 style="margin: 0 0 8px 0; font-size: 15px; border-bottom: 2px solid #2c3e50; padding-bottom: 3px;">Kec. ${props.K}</h3>
                        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                            <tr><td style="padding:2px 0; color:#7f8c8d;">Luas Wilayah:</td><td style="font-weight:bold; text-align:right;">${parseFloat(props.LUAS_HA).toFixed(2)} Ha</td></tr>
                            <tr><td style="padding:2px 0; color:#7f8c8d;">Indeks LST:</td><td style="font-weight:bold; text-align:right; color:#e74c3c;">${props["indeks lst"]} / 5</td></tr>
                            <tr><td style="padding:2px 0; color:#7f8c8d;">Indeks NDVI:</td><td style="font-weight:bold; text-align:right; color:#2ecc71;">${props["index ndvi"]} / 5</td></tr>
                            <tr><td style="padding:2px 0; color:#7f8c8d;">Indeks SNA:</td><td style="font-weight:bold; text-align:right; color:#3498db;">${props.Indeks_SNA} / 5</td></tr>
                            <tr style="border-top:1px dashed #ccc;"><td style="padding:6px 0 2px 0; font-weight:bold;">Total Skor UHI:</td><td style="padding:6px 0 2px 0; font-weight:bold; text-align:right; font-size:13px;">${props.Skor_UHI}</td></tr>
                            <tr><td style="padding:2px 0; font-weight:bold;">Status Kerentanan:</td><td style="font-weight:bold; text-align:right; color:${color};">${tingkat}</td></tr>
                        </table>
                    </div>
                `;
                new maplibregl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
            }
        });

        // Efek kursor otomatis berubah saat melintasi objek spasial
        map.on('mousemove', function(e) {
            const bbox = [[e.point.x - 8, e.point.y - 8], [e.point.x + 8, e.point.y + 8]];
            const features = map.queryRenderedFeatures(bbox, { layers: ['rth-layer', 'kecamatan-layer'] });
            map.getCanvas().style.cursor = features.length ? 'pointer' : '';
        });

        initLayerControl(map);
        initSearchControl(map);
    });
});

// FUNGSI CHECKBOX KONTROL LAYER
function initLayerControl(map) {
    const layerMapping = {
        'chk-kecamatan': ['kecamatan-layer', 'kecamatan-border-layer', 'kecamatan-hover-layer'],
        'chk-jalan': ['jalan-layer'],
        'chk-service10': ['service10-layer'],
        'chk-service5': ['service5-layer'],
        'chk-rth': ['rth-layer']
    };
    Object.keys(layerMapping).forEach(id => {
        const cb = document.getElementById(id);
        if (cb) {
            cb.addEventListener('change', function(e) {
                const visibility = e.target.checked ? 'visible' : 'none';
                layerMapping[id].forEach(lId => {
                    if (map.getLayer(lId)) map.setLayoutProperty(lId, 'visibility', visibility);
                });
            });
        }
    });
}

// FUNGSI SEARCH KECAMATAN
function initSearchControl(map) {
    const btn = document.getElementById('searchBtn');
    const input = document.getElementById('searchInput');
    if (!btn || !input) return;

    function doSearch() {
        const val = input.value.trim().toUpperCase();
        if (!val) return;

        const features = map.querySourceFeatures('kecamatan-src', { sourceLayer: 'kecamatan-layer' });
        const target = features.find(f => f.properties.K && f.properties.K.toUpperCase() === val);

        if (target) {
            map.flyTo({
                center: [112.7508, -7.2575],
                zoom: 12.2,
                essential: true
            });
            map.setFilter('kecamatan-hover-layer', ['==', ['get', 'K'], target.properties.K]);
            map.setPaintProperty('kecamatan-hover-layer', 'line-opacity', 1);
        } else {
            alert(`Kecamatan "${input.value}" tidak ditemukan. Contoh ketikan: TAMBAKSARI, BUBUTAN, SUKOLILO.`);
        }
    }
    btn.addEventListener('click', doSearch);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSearch(); });
}