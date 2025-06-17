// js/peta.js

// Inisialisasi Peta dan Basemap Utama
var map = L.map('map').setView([-7.5666, 112.2384], 8);

var osmBasemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors - BAPPENAS Pembangunan Indonesia Barat'
}).addTo(map);

// Variabel Global

var kemiskinanLayer; // Pastikan variabel ini ada
var geojsonData;
var stuntingLayer;
var tanamanPanganLayer, tanamanSayuranLayer, tanamanBiofarmakaLayer, buahLayer, perkebunanLayer;
var tanamanHiasLayer;
var dagingTernakLayer, telurUnggasLayer;
var perikananTangkapLayer, perikananBudidayaLayer;
var tkddLayer; // Layer tunggal untuk TKDD

var geojsonData; // Akan menyimpan data GeoJSON yang sudah diproses
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

// Fungsi untuk mem-parsing string numerik (misal dari Rupiah)
function parseNumericString(value) {
    if (typeof value === 'string') {
        const cleanedValue = value.replace(/\./g, '').replace(',', '.');
        const number = parseFloat(cleanedValue);
        return isNaN(number) ? 0 : number;
    }
    if (typeof value === 'number') {
        return value;
    }
    return 0;
}
// <<< TAMBAHKAN DUA FUNGSI BARU INI >>>

function formatJumlahOrang(value) {
    const number = parseInt(value, 10);
    if (isNaN(number)) return 'N/A';
    return number.toLocaleString('id-ID') + ' Jiwa';
}

// <<< TAMBAHKAN FUNGSI BARU INI >>>
function processAllIndicatorsForYear(trendData, year) {
    const allDataByRegion = {};
    const indicators = trendData.indicators;

    // Pastikan daftar lokasi ada
    if (!indicators.locations) {
        console.error("Properti 'locations' tidak ditemukan di data-tren.json");
        return {};
    }

    // Iterasi setiap wilayah yang ada di daftar
    indicators.locations.forEach(regionName => {
        allDataByRegion[regionName] = {};

        // Iterasi setiap jenis indikator (persentase, jumlah, manusia, dll.)
        for (const indicatorKey in indicators) {
            // Lewati properti yang bukan objek indikator data
            if (indicatorKey === 'locations' || !indicators[indicatorKey].data) continue;

            const indicator = indicators[indicatorKey];
            const yearIndex = indicator.labels.indexOf(year);

            // Jika tahun ditemukan dan ada data untuk wilayah ini
            if (yearIndex !== -1 && indicator.data[regionName] !== undefined) {
                const value = indicator.data[regionName][yearIndex];
                
                // Simpan data dengan format yang rapi
                allDataByRegion[regionName][indicatorKey] = {
                    name: indicator.name,
                    value: value,
                    unit: indicator.unit
                };
            }
        }
    });

    return allDataByRegion;
}

// <<< TAMBAHKAN JUGA FUNGSI HELPER UNTUK FORMAT ANGKA UMUM >>>
function formatGenericNumber(value) {
    if (value === null || typeof value === 'undefined') return 'N/A';
    // Gunakan toLocaleString untuk format angka yang baik dengan pemisah ribuan
    return parseFloat(value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function processTrendData(trendData) {
    const kemiskinanData = {};
    const persentaseIndicator = trendData.indicators.persentase;
    const jumlahIndicator = trendData.indicators.jumlah;
    const index2024 = persentaseIndicator.labels.indexOf(2024);

    if (index2024 === -1) {
        console.error("Tahun 2024 tidak ditemukan dalam data tren.");
        return {};
    }

    for (const wilayah in persentaseIndicator.data) {
        if (jumlahIndicator.data[wilayah]) {
            const persentase = persentaseIndicator.data[wilayah][index2024];
            const jumlah = jumlahIndicator.data[wilayah][index2024] * 1000;
            kemiskinanData[wilayah] = {
                persentase_penduduk_miskin: persentase,
                jumlah_penduduk_miskin_2024: jumlah
            };
        }
    }
    return kemiskinanData;
}
// Fungsi untuk memformat angka menjadi format Rupiah
function formatRupiah(value, name) {
    
if (name === 'rasio_fisikal') {
    if (value === '-' || value === null || typeof value === 'undefined') return '-';
    // Mengganti titik desimal dengan koma, khusus untuk rasio
    return value.replace('.', ',');
}

    // Untuk semua data lain, lanjutkan dengan proses normal
    if (value === '-' || value === null || typeof value === 'undefined') return '-';
    
    const number = parseNumericString(value);
    if (isNaN(number)) return 'N/A';
    if (number === 0 && value === '-') return '-';

    return 'Rp' + number.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
// <<< TAMBAHKAN FUNGSI BARU INI DI PETA.JS >>>

// Fungsi untuk mendapatkan warna berdasarkan jumlah komoditas
function getCommodityColor(count) {
    if (count > 6) return '#006d2c';      // Sangat Gelap (lebih dari 6 komoditas)
    else if (count > 4) return '#31a354'; // Gelap (5-6 komoditas)
    else if (count > 2) return '#74c476'; // Sedang (3-4 komoditas)
    else if (count > 0) return '#bae4b3'; // Terang (1-2 komoditas)
    else return '#E0E0E0';                // Abu-abu (Tidak ada data)
}

// <<< GANTI FUNGSI LAMA ANDA DENGAN VERSI BARU INI >>>
// <<< GANTI DENGAN VERSI FINAL INI >>>
function extractPeringkatFromValue(valueString) {
    if (typeof valueString !== 'string') return null;
    // Regex ini mencari: (#) lalu (angka) lalu (tanda bintang opsional)
    const match = valueString.match(/\(#(\d+)(\*?)\)/);
    
    if (match) {
        return {
            peringkat: parseInt(match[1]), // Angka ada di grup pertama
            isNasional: match[2] === '*'   // Tanda bintang di grup kedua
        };
    }
    return null;
}

// <<< GANTI DENGAN VERSI FINAL INI >>>
function getValueWithoutPeringkat(valueString) {
    if (typeof valueString !== 'string') return valueString;
    // Regex ini menghapus pola #angka dengan atau tanpa bintang
    return valueString.replace(/\s*\(\#\d+\*?\)/, '').trim();
}
// <<< GANTI FUNGSI LAMA ANDA DENGAN KODE BARU INI >>>

// Fungsi untuk menghasilkan label/ikon peringkat provinsi
// <<< GANTI FUNGSI LAMA ANDA DENGAN KODE YANG LEBIH LENGKAP INI >>>

// Fungsi untuk menghasilkan label/ikon peringkat provinsi
// <<< GANTI DENGAN FUNGSI YANG LEBIH SEDERHANA INI >>>
function getPeringkatProvinsiLabel(peringkatAngka) {
    if (peringkatAngka === null) return "";

    const imagePath = 'image/';
    const iconPrefix = 'icon'; // Prefix untuk ikon provinsi

    if (peringkatAngka >= 1 && peringkatAngka <= 5) {
        return `<span class="peringkat-provinsi-label" style="margin-left: 5px; white-space: nowrap;"><img src="${imagePath}${iconPrefix}${peringkatAngka}.png" alt="Peringkat Provinsi ${peringkatAngka}" style="width: 21px; height: 21px; vertical-align: middle;"></span>`;
    }
    
    return `<span class="peringkat-provinsi-label" style="margin-left: 5px; white-space: nowrap;">(#${peringkatAngka})</span>`;
}
// <<< TAMBAHKAN FUNGSI BARU INI >>>
// <<< GANTI DENGAN VERSI BARU INI >>>
function getPeringkatNasionalLabel(peringkatAngka) {
    if (peringkatAngka === null) return "";

    // Gunakan path absolut yang dimulai dengan '/'
    const imagePath = '/image/';
    const iconPrefix = 'indo';

    if (peringkatAngka >= 1 && peringkatAngka <= 5) {
        return `<span class="peringkat-provinsi-label" style="margin-left: 5px; white-space: nowrap;"><img src="${imagePath}${iconPrefix}${peringkatAngka}.png" alt="Peringkat Nasional ${peringkatAngka}" style="width: 21px; height: 21px; vertical-align: middle;"></span>`;
    }
    
    return `<span class="peringkat-provinsi-label" style="margin-left: 5px; white-space: nowrap;">(#${peringkatAngka}*)</span>`;
}
// Kategori komoditas yang mungkin memiliki data peringkat
const KATEGORI_DENGAN_PERINGKAT = [
    'Tanaman Hias',
    'Daging Ternak',
    'Perikanan Tangkap',
    'Tanaman Pangan',
    'Tanaman Sayuran',
    'Tanaman Biofarmaka',
    'Buah',
    'Perkebunan',
    'Telur Unggas & Susu Sapi',
    'Perikanan Budidaya',
];
// <<< TAMBAHKAN FUNGSI BARU INI DI BAGIAN ATAS >>>
function normalizeRegionName(name) {
    if (typeof name !== 'string') return '';
    // Menghapus "Kabupaten " atau "Kota " (tidak case-sensitive) dan spasi di awal/akhir
    return name.replace(/^(Kabupaten |Kota )/i, '').trim();
}

// Fungsi untuk membuat konten popup
// <<< GANTI FUNGSI createPopupContent ANDA DENGAN VERSI LENGKAP INI >>>
function createPopupContent(properties) {
    let content = `
        <div style="text-align: left; max-height: 350px; overflow-y: auto; padding-right:10px;">
            <div style="text-align: center;">
                <img src="${properties.icon_image || 'image/default.jpg'}" style="width:60px; height:60px; border-radius:5px; margin-bottom:10px;"><br>
                <b style="font-size: 17px;">${properties.WADMKK}</b><br>
                Provinsi: ${properties.WADMPR}<br>
            </div>`;
            
    let dataAdded = false;

    // BAGIAN 1: DATA TREN (SELALU TAMPIL)
    if (properties.trendIndicators2024 && Object.keys(properties.trendIndicators2024).length > 0) {
        content += `<hr style="margin: 8px 0;"><strong>Indikator Utama (2024):</strong>
                    <ul style="padding-left: 20px; margin-top: 5px; margin-bottom: 0;font-size:11px;">`;
        
        const trend = properties.trendIndicators2024;
        const displayOrder = ['persentase', 'jumlah', 'manusia', 'ekonomi', 'terbuka', 'gini', 'pangan', 'stunting'];

        displayOrder.forEach(key => {
            if (trend[key] && trend[key].value !== null) {
                const item = trend[key];
                let formattedValue;

                if (key === 'jumlah') {
                    formattedValue = formatJumlahOrang(item.value * 1000);
                } else {
                    // Buat variabel baru untuk unit yang akan ditampilkan
                    let displayUnit = item.unit;
                    
                    // Cek jika unitnya adalah 'Indeks' atau 'Rasio' (case-insensitive)
                    if (displayUnit.toLowerCase() === 'indeks' || displayUnit.toLowerCase() === 'rasio') {
                        displayUnit = ''; // Jika ya, kosongkan unitnya
                    }else if (displayUnit.toLowerCase() === 'persen') {
                        displayUnit = '%'; // Jika ya, kosongkan unitnya
                    }
                    
                    // Gabungkan nilai dengan unit yang sudah dimodifikasi
                    formattedValue = `${formatGenericNumber(item.value)} ${displayUnit}`.trim(); // .trim() untuk hapus spasi jika unit kosong
                }
                
                // --- AKHIR MODIFIKASI ---
                
                content += `<li>${item.name}: <strong>${formattedValue}</strong></li>`;
            }
        });

        content += `</ul>`;
        dataAdded = true;
    }
 
    // BAGIAN 2: DATA KOMODITAS (TAMPIL JIKA LAYER AKTIF)
    const categoriesToShow = {
        'Tanaman Hias': { layer: tanamanHiasLayer, key: 'Tanaman_Hias' },
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
    
    
    // BAGIAN 3: PESAN JIKA TIDAK ADA DATA SAMA SEKALI
    if (!dataAdded) {
        // Cek apakah ada layer lain yang aktif
        let anyOtherLayerActive = false;
        for (const catName in categoriesToShow) {
            if (categoriesToShow[catName].layer && map.hasLayer(categoriesToShow[catName].layer)) {
                anyOtherLayerActive = true;
                break;
            }
        }
        if (!anyOtherLayerActive && (!tkddLayer || !map.hasLayer(tkddLayer))) {
             content += `<p style="margin-top:10px; text-align:center;"><em>Pilih layer data pada "Daftar Layer" untuk menampilkan informasi.</em></p>`;
        }
    }

    content += `</div>`;
    return content;
}
// Fungsi style untuk layer Stunting
const getColorStunting = (rate) => {
    if (rate === null || typeof rate === 'undefined' || rate === '-') return '#CCCCCC'; 
    const numericRate = parseFloat(rate); 
    if (isNaN(numericRate)) return '#CCCCCC'; 
    if (numericRate < 20) return 'green';       
    else if (numericRate >= 20 && numericRate <= 29.9) return '#fff700'; 
    else if (numericRate >= 30 && numericRate <= 40) return 'orange';   
    else if (numericRate > 40) return 'red';        
    else return '#CCCCCC'; 
};
function styleStunting(feature) {
    return { fillColor: getColorStunting(feature.properties.stunting_rate), weight: 2, opacity: 1, color: 'white', dashArray: '3', fillOpacity: 0.7 };
}

// Fungsi style untuk layer TKDD tunggal
const WARNA_TKDD_ADA = '#FFDEAD'; // Contoh: Navajo White
const WARNA_TKDD_TIDAK_ADA = '#E0E0E0'; // Abu-abu muda

// Fungsi style untuk layer TKDD tunggal berdasarkan jumlah_tkdd
// GANTI FUNGSI LAMA DENGAN FUNGSI BARU INI
function styleTkdd(feature) {
    let rasioValue = null;

    // Bagian ini tidak berubah, tetap mencari nilai 'rasio_fisikal'
    if (feature.properties.Keuangan && Array.isArray(feature.properties.Keuangan.tkdd)) {
        const rasioItem = feature.properties.Keuangan.tkdd.find(item => item.name === 'rasio_fisikal');
        if (rasioItem && rasioItem.value && rasioItem.value !== '-') {
            rasioValue = parseNumericString(rasioItem.value);
        }
    }

    // MODIFIKASI: Menerapkan rentang dari tabel dengan warna yang sudah ada
    let fillColor;
    if (rasioValue === null) {
        fillColor = '#E0E0E0';       // Tidak Ada Data
    } else if (rasioValue < 1.119) {
        fillColor = '#fce893';       // Kategori: sangat rendah
    } else if (rasioValue < 1.656) {
        fillColor = '#d1c452';       // Kategori: rendah
    } else if (rasioValue < 2.193) {
        fillColor = '#cebb10';       // Kategori: sedang
    } else if (rasioValue < 2.730) {
        fillColor = '#a1920c';       // Kategori: tinggi
    } else { // >= 2.730
        fillColor = '#6d6607';       // Kategori: sangat tinggi
    }

    // Bagian ini tidak berubah, mengembalikan objek style
    return {
        fillColor: fillColor,
        weight: 1.5,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.8
    };
}

// Fungsi onEachFeature (interaksi hover, klik)
function onEachFeatureDefault(feature, layer) {
    let popupInstance = null;
    let originalStyle = layer.options.style ? (typeof layer.options.style === 'function' ? layer.options.style(feature) : { ...layer.options.style }) : 
                        (layer.options.fillColor ? { ...layer.options } : { weight: 2, opacity: 1, color: 'white', dashArray: '3', fillOpacity: 0.7, fillColor: '#CCCCCC' });


    layer.on('mouseover', function (e) {
        layer.setStyle({
            fillOpacity: (originalStyle.fillOpacity || 0.7) * 0.4,
            weight: (originalStyle.weight || 2) + 1,
            color: '#666'
        });
        layer.bringToFront();

        const popupContentHtml = createPopupContent(feature.properties);
        popupInstance = L.popup({ maxWidth: 350, closeButton: false, keepInView: false, autoPan: false })
            .setLatLng(e.latlng)
            .setContent(popupContentHtml)
            .openOn(map);
    });

    layer.on('mouseout', function () {
        layer.setStyle(originalStyle);
        if (popupInstance && map.hasLayer(popupInstance)) {
            map.closePopup(popupInstance);
            popupInstance = null;
        }
    });

    layer.on('click', function(e) {
        showLayerPanel(feature.properties); 
        if (popupInstance && map.hasLayer(popupInstance)) {
            map.closePopup(popupInstance);
            popupInstance = null;
        }
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
                    if (layer && layer.getBounds && layer.getBounds().isValid()) {
                         centerLatLng = layer.getBounds().getCenter();
                    } else { console.warn("Tidak bisa mendapatkan center untuk label:", namaWilayah); return; }
                }
            } catch (e) {
                if (layer && layer.getBounds && layer.getBounds().isValid()) {
                    centerLatLng = layer.getBounds().getCenter();
                } else { console.warn("Error atau tidak bisa mendapatkan center untuk label:", namaWilayah, e); return; }
            }
        }

        if (!centerLatLng) { return; }
        const labelIcon = L.divIcon({ className: 'region-map-label-divicon', html: `<span>${namaWilayah}</span>`, iconSize: null });
        const markerLabel = L.marker(centerLatLng, { icon: labelIcon, interactive: false }); 
        (namaWilayah.toLowerCase().startsWith("kota ") || ["surabaya", "batu"].includes(namaWilayah.toLowerCase())) ? markerLabel.addTo(kotaLabelLayerGroup) : markerLabel.addTo(kabupatenLabelLayerGroup);
    }
}

// Fungsi style untuk layer komoditas
// <<< GANTI FUNGSI styleKomoditasDefault LAMA ANDA DENGAN YANG BARU INI >>>

function styleKomoditasDefault(feature, categoryKey) {
    let count = 0; // Mulai dengan hitungan 0
    if (feature.properties.categories && 
        Array.isArray(feature.properties.categories[categoryKey])) {
        // Hitung jumlah item dalam array komoditas
        count = feature.properties.categories[categoryKey].length;
    }

    return {
        // Gunakan fungsi skala warna kita untuk mengisi warna
        fillColor: getCommodityColor(count), 
        weight: 1.5, // Sedikit lebih tebal agar batas terlihat jelas
        opacity: 1, 
        color: 'white', 
        dashArray: '3', 
        fillOpacity: 0.8 // Sedikit lebih pekat
    };
}
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


// Fungsi untuk mengupdate visibilitas legenda
function updateVisibleLegends() {
    if (!legends) { console.warn("Objek 'legends' belum diinisialisasi."); return; }
    const isTkddLayerActive = tkddLayer && map.hasLayer(tkddLayer);

    const layerDisplayStatus = {
        stunting: stuntingLayer && map.hasLayer(stuntingLayer),
        tkdd: isTkddLayerActive,
        dbh: isTkddLayerActive, dau: isTkddLayerActive, dakFisik: isTkddLayerActive,
        dakNonFisik: isTkddLayerActive, hibahDaerah: isTkddLayerActive, danaDesa: isTkddLayerActive,
        insentifFiskal: isTkddLayerActive, jumlahTkdd: isTkddLayerActive,
        tanamanHias: tanamanHiasLayer && map.hasLayer(tanamanHiasLayer),
        tanamanPangan: tanamanPanganLayer && map.hasLayer(tanamanPanganLayer),
        tanamanSayuran: tanamanSayuranLayer && map.hasLayer(tanamanSayuranLayer),
        tanamanBiofarmaka: tanamanBiofarmakaLayer && map.hasLayer(tanamanBiofarmakaLayer),
        buah: buahLayer && map.hasLayer(buahLayer),
        perkebunan: perkebunanLayer && map.hasLayer(perkebunanLayer),
        dagingTernak: dagingTernakLayer && map.hasLayer(dagingTernakLayer),
        telurUnggas: telurUnggasLayer && map.hasLayer(telurUnggasLayer),
        perikananTangkap: perikananTangkapLayer && map.hasLayer(perikananTangkapLayer),
        perikananBudidaya: perikananBudidayaLayer && map.hasLayer(perikananBudidayaLayer),
    };

    for (const key in legends) {
        if (legends[key]) {
            legends[key].style.display = layerDisplayStatus[key] ? 'block' : 'none';
        }
    }
}

// Fungsi untuk menampilkan panel detail layer
function showLayerPanel(properties) {
    const panel = document.getElementById('layerPanel');
    const contentDiv = document.getElementById('layerContent');
    if (!panel || !contentDiv) { console.error("Elemen panel detail tidak ditemukan."); return; }

    panel.style.display = 'block';
     panel.style.width = '390px';
    const namaKabupaten = properties.WADMKK || 'Tidak Diketahui';
    
    let panelHtml = `<div class="panel-header-info">
                        <h3>${namaKabupaten}</h3>
                        <p class="panel-subtitle">Provinsi: ${properties.WADMPR || '-'}</p>
                     </div>`;
    let dataDisplayedInPanel = false;
    let isFirstSection = true;

    function addSectionSeparator() {
        if (!isFirstSection) panelHtml += `<hr class="panel-section-separator">`;
        isFirstSection = false;
    }

    if (stuntingLayer && map.hasLayer(stuntingLayer)) {
    addSectionSeparator();
    panelHtml += `<div class="panel-section stunting-section">`;

    // Kita buat variabel untuk menampung teks yang akan ditampilkan
    let stuntingDisplayText;

    // Cek jika properti stunting ada dan bukan "no data"
    if (typeof properties.stunting_rate !== 'undefined' && properties.stunting_rate !== null && properties.stunting_rate.toString().toLowerCase() !== 'no data') {
        // Jika ada data angka, tampilkan dengan persen
        stuntingDisplayText = `${properties.stunting_rate}%`;
    } else {
        // Jika nilainya "no data" atau tidak ada sama sekali, tampilkan strip
        stuntingDisplayText = 'Data Tidak Tersedia';
    }

    panelHtml += `<p class="panel-data-text"><strong>Tingkat Stunting:</strong> ${stuntingDisplayText}</p>`;
    
    panelHtml += `</div>`;
    dataDisplayedInPanel = true;
}

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
const legendHtml = `<div style="font-size: 11px; font-style: italic; color: #555; margin-top: 4px; margin-bottom: 10px;line-height: 1.6;">
                        <div><img src="image/prov.png" style="width: 21px; height: 21px; vertical-align: middle; margin-right: 4px;margin-bottom:5px;"> = Peringkat Jawa Timur</div>
                        <div><img src="image/nas.png" style="width: 21px; height: 20px; vertical-align: middle; margin-right: 4px;"> = Peringkat Nasional</div>
                    </div>`;
    for (const categoryName in categoriesToShowInPanel) {
        const catInfo = categoriesToShowInPanel[categoryName];
        if (catInfo.layer && map.hasLayer(catInfo.layer)) {
            addSectionSeparator();
            panelHtml += `<div class="panel-section commodity-section">
                            <h4 class="panel-section-title">Komoditas ${categoryName}:</h4>`;
             // <<< GANTI DENGAN KODE LEGENDA BARU INI >>>

                                
            panelHtml += legendHtml;
            if (properties.categories && properties.categories[catInfo.key] && properties.categories[catInfo.key].length > 0) {
                panelHtml += '<ul class="panel-data-list" style="padding-left: 20px;">';
                // <<< GANTI DENGAN BLOK KODE BARU INI (Lakukan di dua tempat) >>>
properties.categories[catInfo.key].forEach(item => {
    let displayValue = item.value;
    let peringkatLabelHtml = ''; // Variabel untuk menampung semua ikon

    // Cari peringkat PROVINSI
    // Regex ini dimodifikasi agar tidak mengambil peringkat dengan '*'
    let matchProvinsi = item.value.match(/\(#(\d+)\)(?!\*)/); // (?!\*) adalah "negative lookahead", artinya "jangan cocok jika diikuti oleh *"
    if (matchProvinsi) {
        let peringkatAngka = parseInt(matchProvinsi[1]);
        // Tambahkan ikon provinsi ke variabel HTML
        peringkatLabelHtml += getPeringkatProvinsiLabel(peringkatAngka);
    }
    // Cari peringkat NASIONAL
    let matchNasional = item.value.match(/\(#(\d+)\*\)/);
    if (matchNasional) {
        let peringkatAngka = parseInt(matchNasional[1]);
        // Tambahkan ikon nasional ke variabel HTML
        peringkatLabelHtml += getPeringkatNasionalLabel(peringkatAngka);
    }

    
    
    // Membersihkan SEMUA pola peringkat dari teks
    displayValue = item.value.replace(/\s*\(\#\d+\*?\)/g, '').trim();

    // Kode ini tidak perlu diubah (pastikan variabelnya benar, panelHtml atau content)
    // Untuk showLayerPanel:
    panelHtml += `<li class="panel-data-item" style="margin-bottom: 7px;"><strong>${item.name}</strong>: ${displayValue}${peringkatLabelHtml}</li>`;
    // Untuk createPopupContent:
    // content += `<li>${item.name}: ${displayValue}${peringkatLabelHtml}</li>`;
});
                panelHtml += '</ul>';
            } else {
                panelHtml += `<p class="panel-no-data"><em>Tidak ada data</em></p>`;
            }
            panelHtml += '</div>';
            dataDisplayedInPanel = true;
        }
    }
    
    const tkddLabels = {
        'dbh': 'Dana Bagi Hasil (DBH)', 'dau': 'Dana Alokasi Umum (DAU)', 'dak_fisik': 'DAK Fisik',
        'dak_non_fisik': 'DAK Non-Fisik', 'hibah_ke_daerah': 'Hibah ke Daerah', 'dana_desa': 'Dana Desa',
        'insentif_fiskal': 'Insentif Fiskal', 'jumlah_tkdd': 'Total TKDD', 'rasio_fisikal': 'Rasio Kapasital Fiskal Daerah'
    };

    if (tkddLayer && map.hasLayer(tkddLayer)) {
        addSectionSeparator();
        panelHtml += `<div class="panel-section tkdd-section"><h4 class="panel-section-title">Data Keuangan TKDD:</h4>`;
        let tkddHtmlList = '';
        let hasValidTkddItemPanel = false;
        if (properties.Keuangan && Array.isArray(properties.Keuangan.tkdd) && properties.Keuangan.tkdd.length > 0) {
    
    // (Opsional tapi direkomendasikan) Mengurutkan data agar rapi
    const sortedTkdd = [...properties.Keuangan.tkdd].sort((a, b) => {
        if (a.name === 'rasio_fisikal') return -1;
        if (b.name === 'rasio_fisikal') return 1;
        if (a.name === 'jumlah_tkdd') return 1;
        if (b.name === 'jumlah_tkdd') return -1;
        return 0;
    });

    sortedTkdd.forEach(item => {
        const label = tkddLabels[item.name] || item.name;
        if (item.value && item.value.trim() !== '-') {
            // INI PERBAIKANNYA: Kirim 'item.name' sebagai parameter kedua
            const formattedValue = formatRupiah(item.value, item.name);
            
            // Tambahkan <strong> agar nilainya tebal dan rapi
            tkddHtmlList += `<li class="panel-data-item" style="margin-bottom: 7px;">${label}: <strong>${formattedValue}</strong></li>`;
            hasValidTkddItemPanel = true;
        }
    });
}
        if (hasValidTkddItemPanel) {
            panelHtml += `<ul class="panel-data-list" style="padding-left: 20px;">${tkddHtmlList}</ul>`;
        } else {
            panelHtml += `<p class="panel-no-data" style="padding-left: 20px;"><em>Tidak ada data TKDD signifikan untuk wilayah ini.</em></p>`;
        }
        panelHtml += `</div>`;
        dataDisplayedInPanel = true;
    }

    if (!dataDisplayedInPanel) {
         panelHtml += `<p class="panel-message"><em>Pilih layer data pada "Daftar Layer" untuk menampilkan informasi.</em></p>`;
    }
    contentDiv.innerHTML = panelHtml;

    if (!panel.querySelector('button.close-btn')) {
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×'; closeButton.className = 'close-btn'; closeButton.title = 'Tutup Panel';
        closeButton.onclick = () => { panel.style.display = 'none'; };
        panel.insertBefore(closeButton, panel.firstChild);
    }

    let chartContainer = panel.querySelector('#chartContainer');
    if (stuntingLayer && map.hasLayer(stuntingLayer)) {
        // ===== KODE BARU (DENGAN TAMBAHAN SUMBER) =====
if (!chartContainer) {
    chartContainer = document.createElement('div');
    chartContainer.id = 'chartContainer';
    chartContainer.className = 'panel-section chart-section';
    if (dataDisplayedInPanel && !isFirstSection) chartContainer.innerHTML = `<hr class="panel-section-separator">`;
    
    // Modifikasi ada di sini
    chartContainer.innerHTML += `
        <h4 class="panel-section-title" ">Grafik Stunting</h4>
        <div class="chart-canvas-wrapper"><canvas id="stuntingChart"></canvas></div>
        <p class="chart-source" style="font-size:15px;font-family:italic;">Sumber Data: SSGI 2024</p> 
    `; // <-- TAMBAHKAN BARIS INI
    
    contentDiv.appendChild(chartContainer);
}
        chartContainer.style.display = 'block';
        const stuntingRateForChart = parseFloat(properties.stunting_rate);
        if (properties.stunting_rate !== undefined && !isNaN(stuntingRateForChart)) {
            updateChart([{ name: namaKabupaten, stunting_rate: stuntingRateForChart }]);
        } else {
            const chartCanvas = document.getElementById('stuntingChart');
            if (chartCanvas && chartCanvas.parentElement.classList.contains('chart-canvas-wrapper')) {
                const ctxChart = chartCanvas.getContext('2d');
                if (stuntingChart) stuntingChart.destroy();
                stuntingChart = null;
                ctxChart.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
                ctxChart.font = "13px Arial"; ctxChart.fillStyle = "#777"; ctxChart.textAlign = "center";
                ctxChart.fillText("Data stunting tidak tersedia untuk grafik.", chartCanvas.width / 2, chartCanvas.height / 2 - 10);
            }
        }
    } else {
        if (chartContainer) chartContainer.style.display = 'none';
        if (stuntingChart) { stuntingChart.destroy(); stuntingChart = null; }
    }
}

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
                    return color.startsWith('rgba') ? color.replace(/,(\s*\d?\.?\d+)\)/, ', 1)') : color;
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

    legends = {
        stunting: document.getElementById('legendaGroupStunting'),
        tkdd: document.getElementById('legendaGroupTkdd'),
        dbh: document.getElementById('legendaGroupDbh'), dau: document.getElementById('legendaGroupDau'),
        dakFisik: document.getElementById('legendaGroupDakFisik'), dakNonFisik: document.getElementById('legendaGroupDakNonFisik'),
        hibahDaerah: document.getElementById('legendaGroupHibahDaerah'), danaDesa: document.getElementById('legendaGroupDanaDesa'),
        insentifFiskal: document.getElementById('legendaGroupInsentifFiskal'), jumlahTkdd: document.getElementById('legendaGroupJumlahTkdd'),
        tanamanHias: document.getElementById('legendaGroupTanamanHias'),
        tanamanPangan: document.getElementById('legendaGroupTanamanPangan'),
        tanamanSayuran: document.getElementById('legendaGroupTanamanSayuran'),
        tanamanBiofarmaka: document.getElementById('legendaGroupTanamanBiofarmaka'),
        buah: document.getElementById('legendaGroupBuah'),
        perkebunan: document.getElementById('legendaGroupPerkebunan'),
        dagingTernak: document.getElementById('legendaGroupDagingTernak'),
        telurUnggas: document.getElementById('legendaGroupTelurUnggas'),
        perikananTangkap: document.getElementById('legendaGroupPerikananTangkap'),
        perikananBudidaya: document.getElementById('legendaGroupPerikananBudidaya'),
    };
    for (const key in legends) {
        if (!legends[key] && key !== 'tkdd' && !['dbh', 'dau', 'dakFisik', 'dakNonFisik', 'hibahDaerah', 'danaDesa', 'insentifFiskal', 'jumlahTkdd'].includes(key)) {
             console.warn(`Elemen legenda untuk '${key}' tidak ditemukan.`);
        } else if (key === 'tkdd' && !legends[key]) {
            console.info("Info: Master legenda 'legendaGroupTkdd' tidak ditemukan, ini opsional jika Anda menggunakan legenda komponen individual.");
        }
    }

    const layerMapping = {
        'stunting': stuntingLayer,'stunting': stuntingLayer, 'tkdd': tkddLayer,
        'tanamanHias': tanamanHiasLayer, 'tanamanPangan': tanamanPanganLayer,
        'tanamanSayuran': tanamanSayuranLayer, 'tanamanBiofarmaka': tanamanBiofarmakaLayer,
        'buah': buahLayer, 'perkebunan': perkebunanLayer,
        'dagingTernak': dagingTernakLayer, 'telurUnggas': telurUnggasLayer,
        'perikananTangkap': perikananTangkapLayer, 'perikananBudidaya': perikananBudidayaLayer,
    };

    const stuntingCheckbox = document.querySelector('input[data-layer-name="stunting"]');
    const komoditasMasterCheckbox = document.getElementById('komoditasMasterCheckbox');
    const komoditasChildCheckboxes = document.querySelectorAll('.komoditas-child-checkbox');
    const dataKeuanganTkddMasterCheckbox = document.getElementById('dataKeuanganTkddMasterCheckbox');

    const directLayerCheckboxes = document.querySelectorAll(
        'input[data-layer-name="stunting"], input[id="dataKeuanganTkddMasterCheckbox"], .komoditas-child-checkbox'
    );

    let masterActionInProgress = false;

    function updateMapLayersAndLegends() {
        if (masterActionInProgress) return;
        masterActionInProgress = true;

        directLayerCheckboxes.forEach(cb => {
            let layerName = cb.dataset.layerName;
            if (cb.id === 'dataKeuanganTkddMasterCheckbox' && !layerName) {
                layerName = 'tkdd';
            }
            if (!layerName || !layerMapping[layerName]) return;
            const layer = layerMapping[layerName];
            
            if (cb.checked) {
                if (layer && !map.hasLayer(layer)) map.addLayer(layer);
            } else {
                if (layer && map.hasLayer(layer)) map.removeLayer(layer);
            }
        });
        
        updateVisibleLegends(); 
        syncAllMasterCheckboxesStates(); 
        masterActionInProgress = false;
    }

    function syncAllMasterCheckboxesStates() {
        if (komoditasMasterCheckbox) {
            const childArray = Array.from(komoditasChildCheckboxes);
            const allChecked = childArray.every(cb => cb.checked);
            const someChecked = childArray.some(cb => cb.checked);

            if (allChecked) {
                komoditasMasterCheckbox.checked = true;
                komoditasMasterCheckbox.indeterminate = false;
            } else if (someChecked) {
                komoditasMasterCheckbox.checked = false;
                komoditasMasterCheckbox.indeterminate = true; // Status "setengah tercentang"
            } else {
                komoditasMasterCheckbox.checked = false;
                komoditasMasterCheckbox.indeterminate = false;
            }
        }
    }
    
    // Event listener untuk checkbox "Stunting" (sekarang bisa berdampingan dengan komoditas)
    // Listener untuk Stunting
    if (stuntingCheckbox) {
        stuntingCheckbox.addEventListener('change', function() {
            if (this.checked) {
                // Matikan yang lain
                komoditasMasterCheckbox.checked = false;
                komoditasChildCheckboxes.forEach(cb => cb.checked = false);
                dataKeuanganTkddMasterCheckbox.checked = false;
            }
            updateMapLayersAndLegends();
        });
    }
    
    // Listener untuk TKDD
    if (dataKeuanganTkddMasterCheckbox) {
        dataKeuanganTkddMasterCheckbox.addEventListener('change', function() {
            if (this.checked) {
                // Matikan yang lain
                stuntingCheckbox.checked = false;
                komoditasMasterCheckbox.checked = false;
                komoditasChildCheckboxes.forEach(cb => cb.checked = false);
            }
            updateMapLayersAndLegends();
        });
    }

    // Listener untuk Master Komoditas
    if (komoditasMasterCheckbox) {
        komoditasMasterCheckbox.addEventListener('change', function() {
            if (this.checked) {
                // Matikan yang lain
                stuntingCheckbox.checked = false;
                dataKeuanganTkddMasterCheckbox.checked = false;
            }
            // Atur semua anak berdasarkan status master
            komoditasChildCheckboxes.forEach(cb => cb.checked = this.checked);
            updateMapLayersAndLegends();
        });
    }

    // Listener untuk setiap anak komoditas
    komoditasChildCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                // Jika salah satu anak dicentang, matikan kategori utama lainnya
                stuntingCheckbox.checked = false;
                dataKeuanganTkddMasterCheckbox.checked = false;
            }
            updateMapLayersAndLegends();
        });
    });
    
    // Event listener untuk checkbox "TKDD" (sekarang bisa berdampingan dengan komoditas)
    if (dataKeuanganTkddMasterCheckbox) {
        dataKeuanganTkddMasterCheckbox.addEventListener('change', function() {
            // Logika untuk mematikan layer lain sudah dihapus
            updateMapLayersAndLegends();
        });
    }
    
    // Inisialisasi status awal (misalnya Stunting aktif, yang lain tidak)
    masterActionInProgress = true; 
    if (stuntingCheckbox) stuntingCheckbox.checked = true; 
    if (komoditasMasterCheckbox) komoditasMasterCheckbox.checked = false;
    komoditasChildCheckboxes.forEach(cb => cb.checked = false);
    if (dataKeuanganTkddMasterCheckbox) dataKeuanganTkddMasterCheckbox.checked = false; 
    masterActionInProgress = false;
    updateMapLayersAndLegends();
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
    }

    const customLayerControlPanel = document.getElementById('customLayerControl');
    const toggleLayerControlButton = document.getElementById('toggleLayerControlButton');
    const closeCustomLayerControlButton = document.getElementById('closeCustomLayerControl');
     if (closeCustomLayerControlButton && customLayerControlPanel) {
        closeCustomLayerControlButton.addEventListener('click', () => customLayerControlPanel.style.display = 'none');
    }
    if (toggleLayerControlButton && customLayerControlPanel) {
        const basemapGalleryPanel = document.getElementById('basemapGalleryPanel'); 
        const wilayahLabelControlPanel = document.getElementById('wilayahLabelControlPanel'); 
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

    const layerItemsWithLegend = document.querySelectorAll('.custom-layer-control-body .layer-item-with-legend');
    function updateArrowIcon(toggleBtn, legendContentPanel) {
        if (!toggleBtn) return;
        const arrowSpan = toggleBtn.querySelector('.toggle-arrow');
        if (!arrowSpan) return;
        if (!legendContentPanel) {
            arrowSpan.textContent = '▸'; return;
        }
        const isLegendaExpanded = legendContentPanel.style.display === 'block';
        arrowSpan.textContent = isLegendaExpanded ? '▾' : '▸';
    }

    layerItemsWithLegend.forEach(item => {
        const toggleBtn = item.querySelector('.legend-toggle-btn');
        const legendContentPanel = item.querySelector('.legend-content-panel');
        const checkbox = item.querySelector('input[type="checkbox"]');

        if (!toggleBtn || !checkbox || !legendContentPanel) {
            if(toggleBtn) toggleBtn.style.display = 'none'; return;
        }

        toggleBtn.style.visibility = 'hidden';
        legendContentPanel.style.display = 'none';
        const legendGroupId = checkbox.dataset.legendGroupId;

        if (legendGroupId) {
            const sourceLegendGroup = document.getElementById(legendGroupId); 
            if (sourceLegendGroup) {
                legendContentPanel.innerHTML = sourceLegendGroup.innerHTML; 
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
        }
    });

    const groupToggleButtons = document.querySelectorAll('.group-toggle-btn');
    groupToggleButtons.forEach(button => {
        const groupContentId = button.getAttribute('aria-controls');
        const groupContentPanel = document.getElementById(groupContentId);
        const arrowSpan = button.querySelector('.toggle-arrow');

        if (groupContentPanel && arrowSpan) {
            if (groupContentId === 'dataKeuanganTkddContent' && groupContentPanel.children.length === 0) {
                button.style.display = 'none'; return;
            }
            function updateGroupArrowIcon() {
                const isExpanded = groupContentPanel.style.display === 'block';
                arrowSpan.textContent = isExpanded ? '▾' : '▸';
            }
            updateGroupArrowIcon();

            const groupHeader = button.closest('.layer-group-header');
            if (groupHeader) {
                groupHeader.addEventListener('click', (event) => {
                    const masterLabel = groupHeader.querySelector('.group-master-label');
                    const masterCheckbox = masterLabel ? masterLabel.querySelector('input[type="checkbox"]') : null;
                    
                    if (event.target === masterCheckbox || (masterLabel && masterLabel.contains(event.target) && event.target.nodeName !== 'SPAN')) {
                        return;
                    }
                     if (event.target === button || button.contains(event.target) || (masterLabel && masterLabel.contains(event.target) && event.target.nodeName === 'SPAN')) {
                        const isExpanded = groupContentPanel.style.display === 'block';
                        groupContentPanel.style.display = isExpanded ? 'none' : 'block';
                        button.setAttribute('aria-expanded', String(!isExpanded));
                        updateGroupArrowIcon();
                    }
                });
            }
        }
    });

    function setBasemap(basemapType) {
        if (currentBasemapLayer) {
            map.removeLayer(currentBasemapLayer);
        }
        let newBasemap;
        if (basemapType === 'osmStandard') newBasemap = osmBasemap;
        else if (basemapType === 'esriImagery' && additionalTileLayers.esriImagery) newBasemap = additionalTileLayers.esriImagery;

        if (newBasemap) {
            map.addLayer(newBasemap);
            currentBasemapLayer = newBasemap;
            document.querySelectorAll('#basemapGalleryPanel .basemap-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.basemapType === basemapType) item.classList.add('active');
            });
        } else {
            console.warn("Tipe basemap tidak dikenal atau layer tidak tersedia:", basemapType);
        }
    }

    const basemapGalleryPanel = document.getElementById('basemapGalleryPanel');
    const toggleBasemapGalleryButton = document.getElementById('toggleBasemapGalleryButton');
    const closeBasemapGalleryButton = document.getElementById('closeBasemapGalleryButton');
     if (toggleBasemapGalleryButton && basemapGalleryPanel && closeBasemapGalleryButton) {
        toggleBasemapGalleryButton.addEventListener('click', () => {
            const isPanelHidden = basemapGalleryPanel.style.display === 'none' || basemapGalleryPanel.style.display === '';
            basemapGalleryPanel.style.display = isPanelHidden ? 'block' : 'none';
            if (isPanelHidden) {
                const galleryContent = basemapGalleryPanel.querySelector('.basemap-gallery-content');
                if (galleryContent) galleryContent.style.display = 'flex';
            }
            if (customLayerControlPanel && isPanelHidden && customLayerControlPanel.style.display !== 'none') customLayerControlPanel.style.display = 'none';
            if (wilayahLabelControlPanel && isPanelHidden && wilayahLabelControlPanel.style.display !== 'none') wilayahLabelControlPanel.style.display = 'none';
        });
        closeBasemapGalleryButton.addEventListener('click', () => {  basemapGalleryPanel.style.display = 'none' });
        document.querySelectorAll('#basemapGalleryPanel .basemap-item').forEach(item => {
            item.addEventListener('click', function() {
                const selectedBasemapType = this.dataset.basemapType;
                if (selectedBasemapType) setBasemap(selectedBasemapType);
            });
        });
    }
    // Penambahan untuk toggleWilayahLabelControlButton dan closeWilayahLabelControl
    const toggleWilayahLabelControlButton = document.getElementById('toggleWilayahLabelControlButton');
    const wilayahLabelControlPanel = document.getElementById('wilayahLabelControlPanel');
    const closeWilayahLabelControl = document.getElementById('closeWilayahLabelControl');

    if (closeWilayahLabelControl && wilayahLabelControlPanel) {
        closeWilayahLabelControl.addEventListener('click', () => wilayahLabelControlPanel.style.display = 'none');
    }
    if (toggleWilayahLabelControlButton && wilayahLabelControlPanel) {
        toggleWilayahLabelControlButton.addEventListener('click', () => {
            const isHidden = wilayahLabelControlPanel.style.display === 'none' || wilayahLabelControlPanel.style.display === '';
            wilayahLabelControlPanel.style.display = isHidden ? 'block' : 'none';
            if (customLayerControlPanel && isHidden && customLayerControlPanel.style.display !== 'none') customLayerControlPanel.style.display = 'none';
            if (basemapGalleryPanel && isHidden && basemapGalleryPanel.style.display !== 'none') basemapGalleryPanel.style.display = 'none';
        });
    }

    const defaultActiveBasemapItem = document.querySelector('.basemap-item[data-basemap-type="osmStandard"]');
    if (defaultActiveBasemapItem) defaultActiveBasemapItem.classList.add('active');
}

// <<< GANTI SELURUH BLOK Promise.all ANDA DENGAN VERSI INI >>>
Promise.all([
    fetch('data/coba.geojson').then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    }),
    fetch('data/data-tren.json').then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
]).then(([geojson, trendData]) => {
    console.log("GeoJSON dan Data Tren berhasil dimuat.");
    
    // 1. (TETAP) Proses data kemiskinan untuk layer spesifik
    const processedKemiskinanData = processTrendData(trendData);
    
    // 2. (TETAP) Proses SEMUA data indikator untuk tahun 2024
    const allIndicators2024 = processAllIndicatorsForYear(trendData, 2024);

    // 3. (DIPERBAIKI) Gabungkan data ke dalam GeoJSON dengan pencocokan nama yang fleksibel
    geojson.features.forEach(feature => {
        const geojsonRegionName = feature.properties.WADMKK;
        const normalizedGeojsonName = normalizeRegionName(geojsonRegionName);

        // Gabungkan data kemiskinan (untuk layer)
        const kemiskinanKey = Object.keys(processedKemiskinanData).find(key => normalizeRegionName(key) === normalizedGeojsonName);
        if (kemiskinanKey) {
            feature.properties.kemiskinan = processedKemiskinanData[kemiskinanKey];
        }

        // Gabungkan SEMUA data tren (untuk popup)
        const trendKey = Object.keys(allIndicators2024).find(key => normalizeRegionName(key) === normalizedGeojsonName);
        if (trendKey) {
            feature.properties.trendIndicators2024 = allIndicators2024[trendKey];
        } else {
            // Ini akan memberitahu Anda di console jika ada wilayah yang tidak cocok
            console.warn(`Tidak ada data tren yang cocok untuk: ${geojsonRegionName}`);
        }
    });

    geojsonData = geojson; // Simpan data yang sudah digabung
    kabupatenDataForSearch = geojson.features.map(feature => {
        // Ambil titik tengah poligon untuk zoom
        const center = L.geoJSON(feature).getBounds().getCenter();
        return {
            name: feature.properties.WADMKK,
            coords: [center.lat, center.lng],
            originalProperties: feature.properties // Simpan semua properti untuk popup
        };
    });
    console.log("Data untuk pencarian siap:", kabupatenDataForSearch.length, "wilayah.");

    // Inisialisasi semua layer (Tidak ada perubahan di sini)
    stuntingLayer = L.geoJson(geojsonData, { style: styleStunting, onEachFeature: onEachFeatureDefault });
    tkddLayer = L.geoJson(geojsonData, { style: styleTkdd, onEachFeature: onEachFeatureDefault });
    kemiskinanLayer = L.geoJson(geojsonData, { /* ... style ... */ onEachFeature: onEachFeatureDefault });
    tanamanHiasLayer = L.geoJson(geojsonData, { style: styleTanamanHias, onEachFeature: onEachFeatureDefault });
    // ... sisa inisialisasi layer Anda ...
    tanamanPanganLayer = L.geoJson(geojsonData, { style: styleTanamanPangan, onEachFeature: onEachFeatureDefault });
    tanamanSayuranLayer = L.geoJson(geojsonData, { style: styleTanamanSayuran, onEachFeature: onEachFeatureDefault });
    tanamanBiofarmakaLayer = L.geoJson(geojsonData, { style: styleTanamanBiofarmaka, onEachFeature: onEachFeatureDefault });
    buahLayer = L.geoJson(geojsonData, { style: styleBuah, onEachFeature: onEachFeatureDefault });
    perkebunanLayer = L.geoJson(geojsonData, { style: stylePerkebunan, onEachFeature: onEachFeatureDefault });
    dagingTernakLayer = L.geoJson(geojsonData, { style: styleDagingTernak, onEachFeature: onEachFeatureDefault });
    telurUnggasLayer = L.geoJson(geojsonData, { style: styleTelurUnggas, onEachFeature: onEachFeatureDefault });
    perikananTangkapLayer = L.geoJson(geojsonData, { style: stylePerikananTangkap, onEachFeature: onEachFeatureDefault });
    perikananBudidayaLayer = L.geoJson(geojsonData, { style: stylePerikananBudidaya, onEachFeature: onEachFeatureDefault });
    
    initializeApplication(); 
})
.catch(error => {
    console.error('GAGAL MEMUAT DATA:', error);
});

// Fungsi pencarian (search)
const searchContainer = document.createElement('div');
searchContainer.style = 'position: fixed; top: 85px; right: 20px; z-index: 1000; width: 390px;display: flex; flex-direction: column; align-items: center;';
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
        const filteredKab = kabupatenDataForSearch.filter(kab => kab.name.toLowerCase().includes(query));
        if (filteredKab.length > 0) {
            filteredKab.forEach(kab => {
                const li = document.createElement('li'); li.textContent = kab.name;
                li.style = 'padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;';
                li.onmouseover = function() { this.style.backgroundColor = '#f0f0f0'; };
                li.onmouseout = function() { this.style.backgroundColor = 'white'; };
                li.addEventListener('click', () => {
                    if (!kab.coords) { console.error("Koordinat tidak valid:", kab.name); return; }
                    map.setView(kab.coords, 10);
                    if (kab.originalProperties) {
                        const popupContentHtml = createPopupContent(kab.originalProperties);
                        L.popup({ maxWidth: 350 }).setLatLng(kab.coords).setContent(popupContentHtml).openOn(map);
                        showLayerPanel(kab.originalProperties);
                    }
                    resultContainer.style.display = 'none'; searchInput.value = kab.name; clearButton.style.display = 'block';
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