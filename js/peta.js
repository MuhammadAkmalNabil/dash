// js/peta.js

// Inisialisasi Peta dan Basemap Utama
var map = L.map('map').setView([-7.5666, 112.2384], 8);

var osmBasemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors - BAPPENAS Pembangunan Indonesia Barat'
}).addTo(map);

// Variabel Global
var stuntingLayer;
var tanamanPanganLayer, tanamanSayuranLayer, tanamanBiofarmakaLayer, buahLayer, perkebunanLayer;
var tanamanHiasLayer;
var dagingTernakLayer, telurUnggasLayer;
var perikananTangkapLayer, perikananBudidayaLayer;

var geojsonData;
let kabupatenDataForSearch = [];
let legends;
let currentBasemapLayer = osmBasemap;
let stuntingChart = null;

var kabupatenLabelLayerGroup = L.layerGroup();
var kotaLabelLayerGroup = L.layerGroup();

const additionalTileLayers = {
    esriImagery: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'contributors - BAPPENAS Pembangunan Indonesia Barat'
    })
};

function setBasemap(basemapType) {
    let newLayerToSet;
    let activeBasemapTypeForGallery;

    if (basemapType === 'osmStandard') {
        newLayerToSet = osmBasemap;
        activeBasemapTypeForGallery = 'osmStandard';
    } else if (basemapType === 'esriImagery' && additionalTileLayers.esriImagery) {
        newLayerToSet = additionalTileLayers.esriImagery;
        activeBasemapTypeForGallery = 'esriImagery';
    } else {
        console.error("Basemap type not recognized or not defined:", basemapType);
        return;
    }

    if (currentBasemapLayer && map.hasLayer(currentBasemapLayer) && currentBasemapLayer !== newLayerToSet) {
        map.removeLayer(currentBasemapLayer);
    }

    if (!map.hasLayer(newLayerToSet)) {
        newLayerToSet.addTo(map);
    }
    currentBasemapLayer = newLayerToSet;

    document.querySelectorAll('.basemap-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.basemapType === activeBasemapTypeForGallery) {
            item.classList.add('active');
        }
    });
}


function createPopupContent(properties) {
    let content = `
        <div style="text-align: left; max-height: 300px; overflow-y: auto; padding-right:10px;">
            <div style="text-align: center;">
                <img src="${properties.icon_image || 'image/default.jpg'}" style="width:100px; height:100px; border-radius:5px; margin-bottom:10px;"><br>
                <b style="font-size: 17px;">${properties.WADMKK}</b><br>
                Provinsi: ${properties.WADMPR}<br>
            </div>`;
    let dataAdded = false;
    if (stuntingLayer && map.hasLayer(stuntingLayer) && typeof properties.stunting_rate !== 'undefined') {
        content += `<hr style="margin: 8px 0;">
                    <strong>Tingkat Stunting:</strong> <strong>${properties.stunting_rate}%</strong><br>
                    Komoditas Utama Umum: ${properties.main_commodity || '-'}`;
        dataAdded = true;
    }

    // Pastikan nilai 'key' di sini SESUAI DENGAN KUNCI DI FILE GEOJSON ANDA
    const categoriesToShow = {
        'Tanaman Hias': { layer: tanamanHiasLayer, key: 'Tanaman_Hias' },
        'Tanaman Pangan': { layer: tanamanPanganLayer, key: 'Tanaman_Pangan' },
        'Tanaman Sayuran': { layer: tanamanSayuranLayer, key: 'Tanaman_Sayuran' },
        'Tanaman Biofarmaka': { layer: tanamanBiofarmakaLayer, key: 'Tanaman_Biofarmaka' }, // Atau 'Tanaman_Biofarmaka'
        'Buah': { layer: buahLayer, key: 'Buah' }, // Atau 'Buah_'
        'Perkebunan': { layer: perkebunanLayer, key: 'Perkebunan' }, // Atau 'Perkebunan_'
        'Daging Ternak': { layer: dagingTernakLayer, key: 'Daging_Ternak' },
        'Telur Unggas & Susu Sapi': { layer: telurUnggasLayer, key: 'TelurUnggas&SusuSapi' },
        'Perikanan Tangkap': { layer: perikananTangkapLayer, key: 'Perikanan_Tangkap' },
        'Perikanan Budidaya': { layer: perikananBudidayaLayer, key: 'Perikanan_Budidaya' }
    };

    for (const categoryName in categoriesToShow) {
        const catInfo = categoriesToShow[categoryName];
        if (catInfo.layer && map.hasLayer(catInfo.layer)) {
            content += `<hr style="margin: 8px 0;">`;
            if (properties.categories && properties.categories[catInfo.key] && properties.categories[catInfo.key].length > 0) {
                content += `<strong>Komoditas ${categoryName}:</strong><ul style="padding-left: 20px;">`;
                properties.categories[catInfo.key].forEach(item => {
                    content += `<li>${item.name}: ${item.value}</li>`;
                });
                content += `</ul>`;
            } else {
                content += `<strong>Komoditas ${categoryName}:</strong><br><em>Tidak ada data</em>`;
            }
            dataAdded = true;
        }
    }
    if (!dataAdded && (!stuntingLayer || !map.hasLayer(stuntingLayer))) {
        content += `<p style="margin-top:10px; text-align:center;"><em>Pilih layer data untuk menampilkan informasi.</em></p>`;
    }
    content += `</div>`;
    return content;
}

const getColorStunting = (rate) => {
    if (rate === null || typeof rate === 'undefined') return '#CCCCCC';
    return rate > 30 ? 'red' : rate > 20 ? 'orange' : 'green';
};
function styleStunting(feature) {
    return { fillColor: getColorStunting(feature.properties.stunting_rate), weight: 2, opacity: 1, color: 'white', dashArray: '3', fillOpacity: 0.7 };
}

function onEachFeatureDefault(feature, layer) {
    layer.on('click', function (e) {
        showLayerPanel(feature.properties);
        const popupContentHtml = createPopupContent(feature.properties);
        L.popup({ maxWidth: 350 })
            .setLatLng(e.latlng)
            .setContent(popupContentHtml)
            .openOn(map);
    });
    if (feature.properties && feature.properties.WADMKK && typeof turf !== 'undefined' && kabupatenLabelLayerGroup && kotaLabelLayerGroup) {
        const namaWilayah = feature.properties.WADMKK;
        let centerLatLng;
        if (namaWilayah === "Sumenep") centerLatLng = L.latLng(-7.0100, 113.8600);
        else if (namaWilayah === "Ponorogo") centerLatLng = L.latLng(-7.8700, 111.4600);
        else if (namaWilayah === "Gresik") centerLatLng = L.latLng(-7.0900, 112.5550);
        else if (namaWilayah === "Lamongan") centerLatLng = L.latLng(-7.0180, 112.2200);
        else if (namaWilayah === "Trenggalek") centerLatLng = L.latLng(-8.0180, 111.6350);
        else if (namaWilayah === "Tulungagung") centerLatLng = L.latLng(-8.1180, 111.8550);
        else if (namaWilayah === "Jombang") centerLatLng = L.latLng(-7.4800, 112.1850);
        else if (namaWilayah === "Magetan") centerLatLng = L.latLng(-7.6700, 111.3250);
        else if (namaWilayah === "Kabupaten Madiun" || (namaWilayah === "Madiun" && !namaWilayah.toLowerCase().startsWith("kota "))) centerLatLng = L.latLng(-7.5600, 111.6150);
        else if (namaWilayah === "Kabupaten Blitar" || (namaWilayah === "Blitar" && !namaWilayah.toLowerCase().startsWith("kota "))) centerLatLng = L.latLng(-8.0180, 112.2300);
        else if (namaWilayah === "Nganjuk") centerLatLng = L.latLng(-7.5100, 111.9050);
        else if (namaWilayah === "Situbondo") centerLatLng = L.latLng(-7.7500, 114.1000);
        else if (namaWilayah === "Lumajang") centerLatLng = L.latLng(-8.100, 113.0500);
        else if (namaWilayah === "Jember") centerLatLng = L.latLng(-8.200, 113.5400);
        else if (namaWilayah === "Ngawi") centerLatLng = L.latLng(-7.3900, 111.3250);
        else if (namaWilayah === "Kota Surabaya") centerLatLng = L.latLng(-7.2400, 112.6550);
        else if (namaWilayah === "Sidoarjo") centerLatLng = L.latLng(-7.4000, 112.6550);
        else if (namaWilayah === "Kota Madiun") centerLatLng = L.latLng(-7.629, 111.524);
        else if (namaWilayah === "Kota Malang") centerLatLng = L.latLng(-7.970, 112.620);
        else if (namaWilayah === "Kota Kediri") centerLatLng = L.latLng(-7.820, 112.014);
        else if (namaWilayah === "Kota Blitar") centerLatLng = L.latLng(-8.097, 112.168);
        else if (namaWilayah === "Kota Pasuruan") centerLatLng = L.latLng(-7.642, 112.907);
        else if (namaWilayah === "Kota Probolinggo") centerLatLng = L.latLng(-7.747, 113.217);
        else if (namaWilayah === "Kota Mojokerto") centerLatLng = L.latLng(-7.470, 112.433);
        else if (namaWilayah === "Kota Batu") centerLatLng = L.latLng(-7.870, 112.525);
        else {
            try {
                const pointOnFeature = turf.pointOnFeature(feature.geometry);
                if (pointOnFeature && pointOnFeature.geometry && pointOnFeature.geometry.coordinates) {
                    centerLatLng = L.latLng(pointOnFeature.geometry.coordinates[1], pointOnFeature.geometry.coordinates[0]);
                } else {
                    console.warn("turf.pointOnFeature gagal untuk:", namaWilayah, ". Menggunakan bounds layer (jika ada).");
                    if (layer && layer.getBounds && layer.getBounds().isValid()) {
                         centerLatLng = layer.getBounds().getCenter();
                    } else {
                        console.warn("Tidak bisa mendapatkan bounds yang valid untuk:", namaWilayah); return;
                    }
                }
            } catch (e) {
                console.error("Error menghitung centroid untuk " + namaWilayah + ": ", e, ". Menggunakan bounds layer (jika ada).");
                if (layer && layer.getBounds && layer.getBounds().isValid()) {
                    centerLatLng = layer.getBounds().getCenter();
                } else {
                    console.warn("Tidak bisa mendapatkan bounds yang valid setelah error Turf.js untuk:", namaWilayah); return;
                }
            }
        }

        if (!centerLatLng) {
            console.warn("Tidak bisa menentukan centerLatLng untuk label:", namaWilayah);
            return;
        }

        const labelIcon = L.divIcon({
            className: 'region-map-label-divicon',
            html: `<span>${namaWilayah}</span>`,
            iconSize: null,
            iconAnchor: null
        });

        const markerLabel = L.marker(centerLatLng, {
            icon: labelIcon,
            interactive: false,
        });
        const namaLower = namaWilayah.toLowerCase();
        let tipeWilayah = null;

        if (namaLower.includes("kota ")) {
            tipeWilayah = "kota";
        } else if (namaLower.includes("kabupaten ")) {
            tipeWilayah = "kabupaten";
        } else {
            const daftarNamaKotaSingkat = ["surabaya", "batu"];
            if (daftarNamaKotaSingkat.includes(namaLower)) {
                tipeWilayah = "kota";
            } else {
                tipeWilayah = "kabupaten";
            }
        }
        if (tipeWilayah === "kota") {
            markerLabel.addTo(kotaLabelLayerGroup);
        } else {
            markerLabel.addTo(kabupatenLabelLayerGroup);
        }
    }
}


function styleKomoditasDefault(feature, categoryKey, colorIfData, colorIfNoData = '#E0E0E0') {
    const hasData = feature.properties.categories &&
                    feature.properties.categories[categoryKey] &&
                    feature.properties.categories[categoryKey].length > 0;
    return {
        fillColor: hasData ? colorIfData : colorIfNoData,
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.65
    };
}

// Pastikan setiap fungsi style ini menggunakan KUNCI GEOJSON yang benar
function styleTanamanHias(feature) { return styleKomoditasDefault(feature, 'Tanaman_Hias', '#FF69B4'); }
function styleTanamanPangan(feature) { return styleKomoditasDefault(feature, 'Tanaman_Pangan', '#90EE90'); }
function styleTanamanSayuran(feature) { return styleKomoditasDefault(feature, 'Tanaman_Sayuran', '#32CD32'); }
function styleTanamanBiofarmaka(feature) { return styleKomoditasDefault(feature, 'Tanaman_Biofarmaka', '#FFD700'); }
function styleBuah(feature) { return styleKomoditasDefault(feature, 'Buah', '#FFA500'); }
function stylePerkebunan(feature) { return styleKomoditasDefault(feature, 'Perkebunan', '#D2691E'); }
function styleDagingTernak(feature) { return styleKomoditasDefault(feature, 'Daging_Ternak', '#A52A2A'); }
function styleTelurUnggas(feature) { return styleKomoditasDefault(feature, 'TelurUnggas&SusuSapi', '#F5F5DC'); }
function stylePerikananTangkap(feature) { return styleKomoditasDefault(feature, 'Perikanan_Tangkap', '#4682B4'); }
function stylePerikananBudidaya(feature) { return styleKomoditasDefault(feature, 'Perikanan_Budidaya', '#ADD8E6'); }

function updateVisibleLegends() {
    if (!legends) { console.warn("Objek 'legends' belum ada saat updateVisibleLegends."); return; }
    const layerDisplayStatus = {
        stunting: stuntingLayer && map.hasLayer(stuntingLayer),
        tanamanHias: tanamanHiasLayer && map.hasLayer(tanamanHiasLayer),
        tanamanPangan: tanamanPanganLayer && map.hasLayer(tanamanPanganLayer),
        tanamanSayuran: tanamanSayuranLayer && map.hasLayer(tanamanSayuranLayer),
        tanamanBiofarmaka: tanamanBiofarmakaLayer && map.hasLayer(tanamanBiofarmakaLayer),
        buah: buahLayer && map.hasLayer(buahLayer),
        perkebunan: perkebunanLayer && map.hasLayer(perkebunanLayer),
        dagingTernak: dagingTernakLayer && map.hasLayer(dagingTernakLayer),
        telurUnggas: telurUnggasLayer && map.hasLayer(telurUnggasLayer),
        perikananTangkap: perikananTangkapLayer && map.hasLayer(perikananTangkapLayer),
        perikananBudidaya: perikananBudidayaLayer && map.hasLayer(perikananBudidayaLayer)
    };
    for (const key in legends) {
        if (legends[key]) {
            legends[key].style.display = layerDisplayStatus[key] ? 'block' : 'none';
        }
    }
}

// js/peta.js

// ... (kode Anda yang sudah ada di atas, termasuk createPopupContent) ...

function showLayerPanel(properties) {
    const panel = document.getElementById('layerPanel');
    const contentDiv = document.getElementById('layerContent');
    if (!panel || !contentDiv) { 
        console.error("Elemen #layerPanel atau #layerContent tidak ditemukan.");
        return; 
    }

    panel.style.display = 'block';
    const namaKabupaten = properties.WADMKK || 'Tidak Diketahui';
    
    // Header Panel
    let panelHtml = `<div class="panel-header-info">
                        <h3>${namaKabupaten}</h3>
                        <p class="panel-subtitle">Provinsi: ${properties.WADMPR || '-'}</p>
                     </div>`;

    let dataDisplayedInPanel = false;
    let isFirstSection = true;

    // Informasi Stunting
    if (stuntingLayer && map.hasLayer(stuntingLayer)) {
        // ... (bagian stunting tetap sama seperti sebelumnya) ...
        if (!isFirstSection) {
            panelHtml += `<hr class="panel-section-separator">`;
        }
        panelHtml += `<div class="panel-section stunting-section">`;
        if (typeof properties.stunting_rate !== 'undefined') {
            panelHtml += `<p class="panel-data-text"><strong>Tingkat Stunting:</strong> ${properties.stunting_rate}%</p>`;
            panelHtml += `<p class="panel-data-text"><strong>Komoditas Utama Umum:</strong> ${properties.main_commodity || '-'}</p>`;
        } else {
            panelHtml += `<p class="panel-data-text"><strong>Tingkat Stunting:</strong> <em class="panel-no-data-inline">Data tidak tersedia</em></p>`;
            panelHtml += `<p class="panel-data-text"><strong>Komoditas Utama Umum:</strong> ${properties.main_commodity || '-'}</p>`;
        }
        panelHtml += `</div>`;
        dataDisplayedInPanel = true;
        isFirstSection = false;
    }

    // Informasi Komoditas
    const categoriesToShowInPanel = {
        'Tanaman Hias': {layer: tanamanHiasLayer, key: 'Tanaman_Hias'},
        'Tanaman Pangan': { layer: tanamanPanganLayer, key: 'Tanaman_Pangan' },
        'Tanaman Sayuran': { layer: tanamanSayuranLayer, key: 'Tanaman_Sayuran' },
        'Tanaman Biofarmaka': { layer: tanamanBiofarmakaLayer, key: 'Tanaman_Biofarmaka' },
        'Buah': { layer: buahLayer, key: 'Buah' },
        'Perkebunan': { layer: perkebunanLayer, key: 'Perkebunan' },
        'Daging Ternak': { layer: dagingTernakLayer, key: 'Daging_Ternak' },
        'Telur Unggas & Susu Sapi': { layer: telurUnggasLayer, key: 'TelurUnggas&SusuSapi' },
        'Perikanan Tangkap': { layer: perikananTangkapLayer, key: 'Perikanan_Tangkap' },
        'Perikanan Budidaya': { layer: perikananBudidayaLayer, key: 'Perikanan_Budidaya' }
    };

    for (const categoryName in categoriesToShowInPanel) {
        const catInfo = categoriesToShowInPanel[categoryName];
        if (catInfo.layer && map.hasLayer(catInfo.layer)) {
            if (!isFirstSection || (stuntingLayer && map.hasLayer(stuntingLayer))) {
                panelHtml += `<hr class="panel-section-separator">`;
            }
            panelHtml += `<div class="panel-section commodity-section">
                            <h4 class="panel-section-title">Komoditas ${categoryName}:</h4>`;
            if (properties.categories && properties.categories[catInfo.key] && properties.categories[catInfo.key].length > 0) {
                // MODIFIKASI: Tambahkan inline style pada <ul> dan <li>
                // Untuk <ul>, kita bisa tetap menggunakan class atau inline style jika hanya padding-left
                panelHtml += '<ul class="panel-data-list" style="padding-left: 20px;">'; // Anda sudah punya class .panel-data-list
                properties.categories[catInfo.key].forEach(item => {
                    // Menambahkan style="margin-bottom: 7px;" pada setiap <li>
                    panelHtml += `<li class="panel-data-item" style="margin-bottom: 7px;">${item.name}: ${item.value}</li>`;
                });
                panelHtml += '</ul>';
            } else {
                panelHtml += `<p class="panel-no-data"><em>Tidak ada data</em></p>`;
            }
            panelHtml += '</div>';
            dataDisplayedInPanel = true;
            isFirstSection = false;
        }
    }

    // Pesan jika tidak ada data sama sekali yang aktif/ditampilkan
    if (!dataDisplayedInPanel) {
         panelHtml += `<p class="panel-message"><em>Pilih layer data pada "Daftar Layer" untuk menampilkan informasi.</em></p>`;
    }
    
    contentDiv.innerHTML = panelHtml;

    // ... (sisa kode untuk tombol close dan grafik tetap sama seperti sebelumnya) ...
    const oldCloseBtn = panel.querySelector('button.close-btn');
    if (oldCloseBtn) oldCloseBtn.remove();
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.className = 'close-btn';
    closeButton.title = 'Tutup Panel';
    closeButton.onclick = function () { panel.style.display = 'none'; };
    panel.insertBefore(closeButton, panel.firstChild);

    let chartContainer = panel.querySelector('#chartContainer');
    if (stuntingLayer && map.hasLayer(stuntingLayer)) {
        if (!chartContainer) {
            chartContainer = document.createElement('div');
            chartContainer.id = 'chartContainer';
            chartContainer.className = 'panel-section chart-section';
            if (dataDisplayedInPanel) {
                 chartContainer.innerHTML = `<hr class="panel-section-separator">`;
            }
            chartContainer.innerHTML += `<h4 class="panel-section-title">Grafik Stunting</h4>
                                         <div class="chart-canvas-wrapper">
                                            <canvas id="stuntingChart"></canvas>
                                         </div>`;
            contentDiv.appendChild(chartContainer);
        }
        chartContainer.style.display = 'block';

        const stuntingRateForChart = parseFloat(properties.stunting_rate);
        if (properties.stunting_rate !== undefined && !isNaN(stuntingRateForChart)) {
             updateChart([{ name: namaKabupaten, stunting_rate: stuntingRateForChart }]);
        } else {
            const chartCanvas = document.getElementById('stuntingChart');
            if(chartCanvas && chartCanvas.parentElement.classList.contains('chart-canvas-wrapper')) {
                const ctxChart = chartCanvas.getContext('2d');
                if (stuntingChart) stuntingChart.destroy();
                stuntingChart = null;
                ctxChart.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
                ctxChart.font = "13px Arial";
                ctxChart.fillStyle = "#777";
                ctxChart.textAlign = "center";
                ctxChart.fillText("Data stunting tidak tersedia untuk grafik.", chartCanvas.width / 2, chartCanvas.height / 2 - 10);
            }
        }
    } else {
        if (chartContainer) chartContainer.style.display = 'none';
        if (stuntingChart) {
            stuntingChart.destroy();
            stuntingChart = null;
        }
    }
}
// ... (fungsi updateChart dan sisa kode Anda) ...

function updateChart(data) {
    const chartCanvas = document.getElementById('stuntingChart');
    if (!chartCanvas) { console.error("Canvas stuntingChart tidak ditemukan!"); return; }
    const ctx = chartCanvas.getContext('2d');
    if (stuntingChart) stuntingChart.destroy();
    stuntingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Rata-Rata Jatim', ...data.map(d => d.name)],
            datasets: [{
                label: 'Tingkat Stunting (%)',
                data: [19.13, ...data.map(d => parseFloat(d.stunting_rate) || 0)],
                backgroundColor: ['rgba(0, 0, 255, 0.7)', ...data.map(d => getColorStunting(d.stunting_rate))],
                borderColor: ['rgba(0, 0, 255, 1)', ...data.map(d => {
                    const color = getColorStunting(d.stunting_rate);
                    if (color === 'red') return 'rgba(255,0,0,1)';
                    if (color === 'orange') return 'rgba(255,165,0,1)';
                    if (color === 'green') return 'rgba(0,128,0,1)';
                    if (color === '#CCCCCC') return 'rgba(204, 204, 204, 1)';
                    if (typeof color === 'string' && color.startsWith('rgba')) {
                        return color.replace(/,(\s*\d?\.?\d+)\)/, ', 1)');
                    }
                    return color;
                })],
                borderWidth: 1
            }]
        },
        options: {
            maintainAspectRatio: false, plugins: { legend: { display: false } },
            responsive: true, scales: { y: { beginAtZero: true, max: 40 } }
        }
    });
}

function initializeApplication() {
    const mapDiv = document.getElementById('map');
    const toggleWilayahLabelControlButton = document.getElementById('toggleWilayahLabelControlButton');
    const wilayahLabelControlPanel = document.getElementById('wilayahLabelControlPanel');
    const closeWilayahLabelControl = document.getElementById('closeWilayahLabelControl');
    const customLayerControlPanel = document.getElementById('customLayerControl');
    const toggleLayerControlButton = document.getElementById('toggleLayerControlButton');
    const basemapGalleryPanel = document.getElementById('basemapGalleryPanel');
    const toggleBasemapGalleryButton = document.getElementById('toggleBasemapGalleryButton');
    const closeCustomLayerControlButton = document.getElementById('closeCustomLayerControl');
    const closeBasemapGalleryButton = document.getElementById('closeBasemapGalleryButton');
    let domError = false;
    if (!toggleWilayahLabelControlButton) { console.error("Elemen #toggleWilayahLabelControlButton tidak ditemukan!"); domError = true; }
    if (!wilayahLabelControlPanel) { console.error("Elemen #wilayahLabelControlPanel tidak ditemukan!"); domError = true; }
    if (!closeWilayahLabelControl) { console.error("Elemen #closeWilayahLabelControl tidak ditemukan!"); domError = true; }
    if (!mapDiv) { console.error("Elemen #map tidak ditemukan!"); domError = true; }
    if (!customLayerControlPanel) { console.error("Elemen #customLayerControl tidak ditemukan!"); domError = true; }
    if (!toggleLayerControlButton) { console.error("Elemen #toggleLayerControlButton tidak ditemukan!"); domError = true; }
    if (!basemapGalleryPanel) { console.error("Elemen #basemapGalleryPanel tidak ditemukan!"); domError = true; }
    if (!toggleBasemapGalleryButton) { console.error("Elemen #toggleBasemapGalleryButton tidak ditemukan!"); domError = true; }
    if (!closeCustomLayerControlButton) { console.error("Elemen #closeCustomLayerControl tidak ditemukan!"); domError = true; }
    if (!closeBasemapGalleryButton) { console.error("Elemen #closeBasemapGalleryButton tidak ditemukan!"); domError = true; }
    if (domError) {
        if (mapDiv) mapDiv.innerHTML = '<p style="text-align:center; padding-top:50px; color:red;">Error: Elemen DOM penting tidak ditemukan. Periksa ID di HTML.</p>';
        return;
    }

    const layerMapping = {
        'stunting': stuntingLayer,
        'tanamanHias': tanamanHiasLayer,
        'tanamanPangan': tanamanPanganLayer,
        'tanamanSayuran': tanamanSayuranLayer,
        'tanamanBiofarmaka': tanamanBiofarmakaLayer,
        'buah': buahLayer,
        'perkebunan': perkebunanLayer,
        'dagingTernak': dagingTernakLayer,
        'telurUnggas': telurUnggasLayer,
        'perikananTangkap': perikananTangkapLayer,
        'perikananBudidaya': perikananBudidayaLayer
    };

    const allIndividualLayerCheckboxes = document.querySelectorAll('#customLayerControl input[type="checkbox"]:not([data-is-master="true"])');
    const komoditasMasterCheckbox = document.getElementById('komoditasMasterCheckbox');
    const komoditasChildCheckboxes = document.querySelectorAll('.komoditas-child-checkbox');
    const stuntingCheckbox = document.querySelector('input[data-layer-name="stunting"]');

    let masterActionInProgress = false;

    function updateMapAndLegendsFromCheckboxes() {
        allIndividualLayerCheckboxes.forEach(cb => {
            const layerName = cb.dataset.layerName;
            if (!layerName) return;
            const layer = layerMapping[layerName];
            if (layer) {
                if (cb.checked) {
                    if (!map.hasLayer(layer)) map.addLayer(layer);
                } else {
                    if (map.hasLayer(layer)) map.removeLayer(layer);
                }
            }
        });
        updateVisibleLegends();
        if (!masterActionInProgress) {
            syncKomoditasMasterCheckboxState();
        }
    }
    function syncKomoditasMasterCheckboxState() {
        if (!komoditasMasterCheckbox) return;
        let anyChildChecked = false;
        komoditasChildCheckboxes.forEach(childCb => {
            if (childCb.checked) {
                anyChildChecked = true;
            }
        });
        const stuntingIsChecked = stuntingCheckbox ? stuntingCheckbox.checked : false;
        komoditasMasterCheckbox.checked = anyChildChecked && !stuntingIsChecked;
    }

    if (komoditasMasterCheckbox) {
        komoditasMasterCheckbox.addEventListener('change', function() {
            const isMasterNowChecked = this.checked;
            masterActionInProgress = true;

            if (isMasterNowChecked) {
                if (stuntingCheckbox) stuntingCheckbox.checked = false;
                komoditasChildCheckboxes.forEach(childCb => {
                    childCb.checked = true; // Aktifkan semua anak
                });
                // Jika master dicentang tapi tidak ada anak (seharusnya tidak terjadi jika HTML benar), batalkan centang master
                if (komoditasChildCheckboxes.length === 0) {
                     this.checked = false;
                }
            } else {
                // Jika master tidak dicentang, nonaktifkan semua anak
                komoditasChildCheckboxes.forEach(childCb => {
                    childCb.checked = false;
                });
            }
            updateMapAndLegendsFromCheckboxes();
            masterActionInProgress = false;
        });
    }

    allIndividualLayerCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (masterActionInProgress) return;
            masterActionInProgress = true;

            if (this.checked) {
                if (this === stuntingCheckbox) {
                    if (komoditasMasterCheckbox) komoditasMasterCheckbox.checked = false;
                    komoditasChildCheckboxes.forEach(childCb => childCb.checked = false);
                } else if (Array.from(komoditasChildCheckboxes).includes(this)) {
                    if (stuntingCheckbox) stuntingCheckbox.checked = false;
                    // Hanya satu anak komoditas yang aktif
                    komoditasChildCheckboxes.forEach(otherChildCb => {
                        if (otherChildCb !== this) {
                            otherChildCb.checked = false;
                        }
                    });
                }
            }
            updateMapAndLegendsFromCheckboxes(); // Ini akan memanggil syncKomoditasMasterCheckboxState
            masterActionInProgress = false;
        });
    });

    masterActionInProgress = true;
    if (stuntingCheckbox) stuntingCheckbox.checked = true;
    if (komoditasMasterCheckbox) komoditasMasterCheckbox.checked = false;
    komoditasChildCheckboxes.forEach(cb => cb.checked = false);
    updateMapAndLegendsFromCheckboxes();
    masterActionInProgress = false;


    const toggleKabLabelsCheckbox = document.getElementById('toggleKabupatenLabelsCheckbox');
    const toggleKotaLabelsCheckbox = document.getElementById('toggleKotaLabelsCheckbox');

    if (toggleKabLabelsCheckbox) {
        toggleKabLabelsCheckbox.addEventListener('change', function() {
            if (this.checked) {
                if (kabupatenLabelLayerGroup && !map.hasLayer(kabupatenLabelLayerGroup)) kabupatenLabelLayerGroup.addTo(map);
            } else {
                if (kabupatenLabelLayerGroup && map.hasLayer(kabupatenLabelLayerGroup)) map.removeLayer(kabupatenLabelLayerGroup);
            }
        });
        if (kabupatenLabelLayerGroup && toggleKabLabelsCheckbox.checked && !map.hasLayer(kabupatenLabelLayerGroup)) {
            kabupatenLabelLayerGroup.addTo(map);
        }
    } else {
        console.error("#toggleKabupatenLabelsCheckbox tidak ditemukan");
    }

    if (toggleKotaLabelsCheckbox) {
        toggleKotaLabelsCheckbox.addEventListener('change', function() {
            if (this.checked) {
                if (kotaLabelLayerGroup && !map.hasLayer(kotaLabelLayerGroup)) kotaLabelLayerGroup.addTo(map);
            } else {
                if (kotaLabelLayerGroup && map.hasLayer(kotaLabelLayerGroup)) map.removeLayer(kotaLabelLayerGroup);
            }
        });
        if (kotaLabelLayerGroup && toggleKotaLabelsCheckbox.checked && !map.hasLayer(kotaLabelLayerGroup)) {
            kotaLabelLayerGroup.addTo(map);
        }
    } else {
        console.error("#toggleKotaLabelsCheckbox tidak ditemukan");
    }

    if (closeCustomLayerControlButton && customLayerControlPanel) {
        closeCustomLayerControlButton.addEventListener('click', () => customLayerControlPanel.style.display = 'none');
    }
    if (toggleLayerControlButton && customLayerControlPanel) {
        toggleLayerControlButton.addEventListener('click', () => {
            const isHidden = customLayerControlPanel.style.display === 'none' || customLayerControlPanel.style.display === '';
            customLayerControlPanel.style.display = isHidden ? 'block' : 'none';
            if (basemapGalleryPanel && isHidden && basemapGalleryPanel.style.display !== 'none') {
                basemapGalleryPanel.style.display = 'none';
            }
            if (wilayahLabelControlPanel && isHidden && wilayahLabelControlPanel.style.display !== 'none') {
                wilayahLabelControlPanel.style.display = 'none';
            }
        });
    }

    // --- MODIFIKASI LOGIKA LEGEND DROPDOWN ---
    const layerItemsWithLegend = document.querySelectorAll('.custom-layer-control-body .layer-item-with-legend');
    function updateArrowIcon(toggleBtn, legendContentPanel) {
        if (!toggleBtn) return;
        const arrowSpan = toggleBtn.querySelector('.toggle-arrow');
        if (!arrowSpan) return;
        if (!legendContentPanel) {
            arrowSpan.textContent = '▸';
            return;
        }
        const isLegendaExpanded = legendContentPanel.style.display === 'block';
        arrowSpan.textContent = isLegendaExpanded ? '▾' : '▸';
    }

    layerItemsWithLegend.forEach(item => {
        const toggleBtn = item.querySelector('.legend-toggle-btn');
        const legendContentPanel = item.querySelector('.legend-content-panel');
        const checkbox = item.querySelector('input[type="checkbox"]');

        if (!toggleBtn || !checkbox || !legendContentPanel) {
            // console.warn("Struktur item layer tidak lengkap (kurang tombol/checkbox/panel konten):", item);
            if(toggleBtn) toggleBtn.style.display = 'none';
            return;
        }

        toggleBtn.style.visibility = 'hidden';
        legendContentPanel.style.display = 'none';

        const legendGroupId = checkbox.dataset.legendGroupId;

        if (legendGroupId) {
    const sourceLegendGroup = document.getElementById(legendGroupId); // Mengambil elemen sumber legenda
    if (sourceLegendGroup) {
        legendContentPanel.innerHTML = sourceLegendGroup.innerHTML; // Menyalin HTMLnya!
                toggleBtn.style.visibility = 'visible';
                updateArrowIcon(toggleBtn, legendContentPanel);

                toggleBtn.addEventListener('click', () => {
                    const isExpanded = legendContentPanel.style.display === 'block';
                    legendContentPanel.style.display = isExpanded ? 'none' : 'block';
                    toggleBtn.setAttribute('aria-expanded', String(!isExpanded));
                    updateArrowIcon(toggleBtn, legendContentPanel);
                });
            } else {
                console.warn(`Sumber legenda dengan ID '${legendGroupId}' untuk checkbox '${checkbox.dataset.layerName || checkbox.id}' TIDAK DITEMUKAN.`);
            }
        } else {
            if (!checkbox.dataset.isMaster) {
                // console.warn(`'data-legend-group-id' tidak ada untuk '${checkbox.dataset.layerName || checkbox.id}'.`);
            }
        }
    });
    // --- AKHIR MODIFIKASI LOGIKA LEGEND DROPDOWN ---


    const groupToggleButtons = document.querySelectorAll('.group-toggle-btn');
    groupToggleButtons.forEach(button => {
        const groupContentId = button.getAttribute('aria-controls');
        const groupContentPanel = document.getElementById(groupContentId);
        const arrowSpan = button.querySelector('.toggle-arrow');

        if (groupContentPanel && arrowSpan) {
            function updateGroupArrowIcon() {
                const isExpanded = groupContentPanel.style.display === 'block';
                arrowSpan.textContent = isExpanded ? '▾' : '▸';
            }
            updateGroupArrowIcon();

            const groupHeader = button.closest('.layer-group-header');
            if (groupHeader) {
                groupHeader.addEventListener('click', (event) => {
                    const masterLabel = groupHeader.querySelector('.group-master-label');
                    if (masterLabel && masterLabel.contains(event.target)) {
                        return;
                    }
                    if (event.target === button || button.contains(event.target) || !masterLabel || !masterLabel.contains(event.target)) {
                        const isExpanded = groupContentPanel.style.display === 'block';
                        groupContentPanel.style.display = isExpanded ? 'none' : 'block';
                        button.setAttribute('aria-expanded', String(!isExpanded));
                        updateGroupArrowIcon();
                    }
                });
            }
        } else {
            if (!groupContentPanel) console.error(`Group content panel with ID '${groupContentId}' not found.`);
            if (!arrowSpan) console.error(`Arrow span not found in group toggle button for '${groupContentId}'.`);
        }
    });
    if (toggleBasemapGalleryButton && basemapGalleryPanel && closeBasemapGalleryButton) {
        toggleBasemapGalleryButton.addEventListener('click', () => {
            const isPanelHidden = basemapGalleryPanel.style.display === 'none' || basemapGalleryPanel.style.display === '';
            basemapGalleryPanel.style.display = isPanelHidden ? 'block' : 'none';
            if (isPanelHidden) {
                const galleryContent = basemapGalleryPanel.querySelector('.basemap-gallery-content');
                if (galleryContent) galleryContent.style.display = 'flex';
            }
            if (customLayerControlPanel && isPanelHidden && customLayerControlPanel.style.display !== 'none') {
                customLayerControlPanel.style.display = 'none';
            }
             if (wilayahLabelControlPanel && isPanelHidden && wilayahLabelControlPanel.style.display !== 'none') {
                wilayahLabelControlPanel.style.display = 'none';
            }
        });
        closeBasemapGalleryButton.addEventListener('click', () => {
            basemapGalleryPanel.style.display = 'none';
        });
        const basemapItems = document.querySelectorAll('#basemapGalleryPanel .basemap-item');
        if (basemapItems.length > 0) {
            basemapItems.forEach(item => {
                item.addEventListener('click', function() {
                    const selectedBasemapType = this.dataset.basemapType;
                    if (selectedBasemapType) setBasemap(selectedBasemapType);
                });
            });
        } else {
             console.warn("Tidak ada .basemap-item yang ditemukan.");
        }
    } else {
        console.error("Satu atau lebih elemen untuk galeri basemap tidak ditemukan!");
    }
    if (closeWilayahLabelControl && wilayahLabelControlPanel) {
        closeWilayahLabelControl.addEventListener('click', () => wilayahLabelControlPanel.style.display = 'none');
    }
    if (toggleWilayahLabelControlButton && wilayahLabelControlPanel) {
        toggleWilayahLabelControlButton.addEventListener('click', () => {
            const isHidden = wilayahLabelControlPanel.style.display === 'none' || wilayahLabelControlPanel.style.display === '';
            wilayahLabelControlPanel.style.display = isHidden ? 'block' : 'none';
            if (customLayerControlPanel && isHidden) customLayerControlPanel.style.display = 'none';
            if (basemapGalleryPanel && isHidden) basemapGalleryPanel.style.display = 'none';
        });
    }
    const defaultActiveBasemapItem = document.querySelector('.basemap-item[data-basemap-type="osmStandard"]');
    if (defaultActiveBasemapItem) defaultActiveBasemapItem.classList.add('active');
}


fetch('data/coba.geojson')
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} untuk ${response.url}`);
        return response.json();
    })
    .then(data => {
        console.log("GeoJSON data loaded successfully");
        geojsonData = data;

        kabupatenLabelLayerGroup = L.layerGroup();
        kotaLabelLayerGroup = L.layerGroup();
        
        kabupatenDataForSearch = geojsonData.features.map(feature => {
            let centroid;
            try {
                if (feature.properties.WADMKK === "Gresik") centroid = [-7.155, 112.565];
                else if (feature.properties.WADMKK === "Situbondo") centroid = [-7.706, 114.009];
                else if (feature.properties.WADMKK === "Sumenep") centroid = [-7.000, 113.875];
                else if (feature.geometry && typeof turf !== 'undefined' && turf.pointOnFeature) {
                    const point = turf.pointOnFeature(feature);
                    centroid = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
                } else if (feature.geometry) {
                    if (feature.geometry.type === "Point") centroid = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
                    else if (feature.geometry.type === "MultiPolygon" && feature.geometry.coordinates[0][0][0]) centroid = [feature.geometry.coordinates[0][0][0][1], feature.geometry.coordinates[0][0][0][0]];
                    else if (feature.geometry.type === "Polygon" && feature.geometry.coordinates[0][0]) centroid = [feature.geometry.coordinates[0][0][1],feature.geometry.coordinates[0][0][0]];
                    else { centroid = [-7.5, 111.5]; console.warn("Fallback centroid for:", feature.properties.WADMKK); }
                } else {
                    centroid = [-7.5, 111.5]; console.warn("No geometry for:", feature.properties.WADMKK);
                }
            } catch(e) {
                console.error("Error calculating centroid for " + feature.properties.WADMKK + ": ", e);
                centroid = [-7.5, 111.5];
            }
            return {
                name: feature.properties.WADMKK, province: feature.properties.WADMPR,
                stunting_rate: feature.properties.stunting_rate, main_commodity: feature.properties.main_commodity,
                icon_image: feature.properties.icon_image, coords: centroid,
                categories: feature.properties.categories || {}
            };
        });


        stuntingLayer = L.geoJson(geojsonData, { style: styleStunting, onEachFeature: onEachFeatureDefault });
        tanamanHiasLayer = L.geoJson(geojsonData, { style: styleTanamanHias, onEachFeature: onEachFeatureDefault });
        tanamanPanganLayer = L.geoJson(geojsonData, { style: styleTanamanPangan, onEachFeature: onEachFeatureDefault });
        tanamanSayuranLayer = L.geoJson(geojsonData, { style: styleTanamanSayuran, onEachFeature: onEachFeatureDefault });
        tanamanBiofarmakaLayer = L.geoJson(geojsonData, { style: styleTanamanBiofarmaka, onEachFeature: onEachFeatureDefault });
        buahLayer = L.geoJson(geojsonData, { style: styleBuah, onEachFeature: onEachFeatureDefault });
        perkebunanLayer = L.geoJson(geojsonData, { style: stylePerkebunan, onEachFeature: onEachFeatureDefault });
        dagingTernakLayer = L.geoJson(geojsonData, { style: styleDagingTernak, onEachFeature: onEachFeatureDefault });
        telurUnggasLayer = L.geoJson(geojsonData, { style: styleTelurUnggas, onEachFeature: onEachFeatureDefault });
        perikananTangkapLayer = L.geoJson(geojsonData, { style: stylePerikananTangkap, onEachFeature: onEachFeatureDefault });
        perikananBudidayaLayer = L.geoJson(geojsonData, { style: stylePerikananBudidaya, onEachFeature: onEachFeatureDefault });


        if (stuntingLayer) stuntingLayer.addTo(map); // Default layer

        for (const key in legends) {
            if (!legends[key]) {
                console.warn(`Elemen legenda untuk '${key}' (ID: legendaGroup${key.charAt(0).toUpperCase() + key.slice(1)}) tidak ditemukan di HTML.`);
            }
        }

        initializeApplication(); // Panggil SETELAH legends dan layer diinisialisasi
    })
    .catch(error => {
        console.error('GAGAL MEMUAT GEOJSON atau ADA ERROR SETELAHNYA:', error);
        const mapDiv = document.getElementById('map');
        if (mapDiv) mapDiv.innerHTML = '<p style="text-align:center; padding-top:50px; color:red;">Gagal memuat data peta.</p>';
        if (map && (!map.getCenter() || map.getZoom() === undefined )) map.setView([-7.5666, 112.2384], 8);
    });


const searchContainer = document.createElement('div');
searchContainer.style = 'position: fixed; top: 85px; right: 20px; z-index: 1000; width: 330px;display: flex; flex-direction: column; align-items: center;';
const searchInputGroup = document.createElement('div');
searchInputGroup.style = 'position: relative; width: 100%;';
const searchInput = document.createElement('input');
searchInput.type = 'text'; searchInput.placeholder = 'Cari Kabupaten/Kota Jawa Timur...';
searchInput.style = 'width: 100%; padding: 10px; border-radius: 4px; border: 1px solid #ccc; box-sizing: border-box;';
const clearButton = document.createElement('span');
clearButton.innerHTML = '×';
clearButton.style = 'position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 20px; display: none; color: gray;';
const resultContainer = document.createElement('ul');
resultContainer.className = 'search-results';
resultContainer.style = 'width: 100%; background: white; list-style: none; padding: 0; margin: 0; border: 1px solid #ccc; border-top: none; max-height: 200px; overflow-y: auto; border-radius: 0 0 4px 4px; display:none; box-sizing: border-box;';
searchInputGroup.appendChild(searchInput); searchInputGroup.appendChild(clearButton);
searchContainer.appendChild(searchInputGroup); searchContainer.appendChild(resultContainer);
document.body.appendChild(searchContainer);
searchInput.addEventListener('input', function () {
    const query = this.value.toLowerCase(); resultContainer.innerHTML = '';
    clearButton.style.display = query ? 'block' : 'none';
    resultContainer.style.display = query ? 'block' : 'none';
    if (query && kabupatenDataForSearch.length > 0) {
        const filteredKab = kabupatenDataForSearch.filter(kabupaten => kabupaten.name.toLowerCase().includes(query));
        if (filteredKab.length > 0) {
            filteredKab.forEach(kabupaten => {
                const li = document.createElement('li'); li.textContent = kabupaten.name;
                li.style = 'padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;';
                li.onmouseover = function() { this.style.backgroundColor = '#f0f0f0'; };
                li.onmouseout = function() { this.style.backgroundColor = 'white'; };
                li.addEventListener('click', () => {
                    if (!kabupaten.coords || typeof kabupaten.coords[0] === 'undefined' || typeof kabupaten.coords[1] === 'undefined') {
                        console.error("Koordinat tidak valid untuk:", kabupaten.name, kabupaten.coords);
                        return;
                    }
                    map.setView(kabupaten.coords, 10);
                    const originalFeatureProperties = geojsonData.features.find(f => f.properties.WADMKK === kabupaten.name)?.properties;
                    if (originalFeatureProperties) {
                        const popupContentHtml = createPopupContent(originalFeatureProperties);
                        L.popup({ maxWidth: 350 })
                        .setLatLng(kabupaten.coords)
                        .setContent(popupContentHtml)
                        .openOn(map);
                        showLayerPanel(originalFeatureProperties);
                    }
                    resultContainer.style.display = 'none'; searchInput.value = kabupaten.name; clearButton.style.display = 'block';
                });
                resultContainer.appendChild(li);
            });
        } else {
            const noResultLi = document.createElement('li'); noResultLi.textContent = 'Tidak ada hasil ditemukan';
            noResultLi.style = 'padding: 10px; color: grey; text-align: center;'; resultContainer.appendChild(noResultLi);
        }
    } else if (!query) {
        resultContainer.style.display = 'none';
    }
});
clearButton.addEventListener('click', function () {
    searchInput.value = ''; resultContainer.innerHTML = '';
    resultContainer.style.display = 'none'; clearButton.style.display = 'none'; searchInput.focus();
});
document.addEventListener('click', function(event) {
    if (searchContainer && !searchContainer.contains(event.target) && resultContainer) {
        resultContainer.style.display = 'none';
    }
});
searchInput.addEventListener('focus', function() {
    if (this.value && resultContainer && resultContainer.childNodes.length > 0) {
        resultContainer.style.display = 'block';
    }
});