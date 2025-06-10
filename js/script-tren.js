// Function to handle scrolling
function scrollToSection(id) {
  console.log("Scrolling to:", id); // For debugging - check console
  const section = document.getElementById(id);
  if (section) {
    section.scrollIntoView({
      behavior: "smooth", // Enable smooth scrolling
      block: "start", // Align the top of the section with the top of the viewport
    });
  } else {
    console.warn("Element with ID '" + id + "' not found!"); // Warning if target doesn't exist
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const locationSelector = document.getElementById("location-selector");
  const chartCanvases = {
    persentase: document.getElementById("chart-persentase-miskin"),
    jumlah: document.getElementById("chart-jumlah-miskin"),
    manusia: document.getElementById("chart-manusia"),
    terbuka: document.getElementById("chart-terbuka"),
    ekonomi: document.getElementById("chart-ekonomi"),
    gini: document.getElementById("chart-gini"),
    pangan: document.getElementById("chart-pangan"),
    stunting: document.getElementById("chart-stunting"),
  };
  const chartTitles = {
    persentase: document.getElementById("title-persentase-miskin"),
    jumlah: document.getElementById("title-jumlah-miskin"),
    manusia: document.getElementById("title-manusia"),
    terbuka: document.getElementById("title-terbuka"),
    ekonomi: document.getElementById("title-ekonomi"),
    gini: document.getElementById("title-gini"),
    pangan: document.getElementById("title-pangan"),
    stunting: document.getElementById("title-stunting"),
  };

  let allData = null; // To store the fetched data
  let chartInstances = {}; // To store Chart.js instances for updates/destruction

  // Function to render or update a chart
  function renderChart(canvasId, indicatorKey, selectedLocation) {
    if (!allData || !canvasId || !indicatorKey || !selectedLocation) {
      console.error(
        "Missing data for rendering chart:",
        canvasId,
        indicatorKey,
        selectedLocation
      );
      return;
    }

    const indicatorData = allData.indicators[indicatorKey];
    if (!indicatorData) {
      console.error(`Indicator data not found for key: ${indicatorKey}`);
      return;
    }

    // Definisikan nama provinsi utama. Idealnya dari allData.
    const provinceFullName = allData.provinceName || "Provinsi Jawa Timur";
    const legendColors = allData.legendColors || { // Fallback colors
        blue: "#0055ff",
        green: "#229100",
        red: "#de3d3d",
    };

    // Ambil data untuk lokasi yang dipilih (bisa jadi provinsi itu sendiri atau kab/kota)
    const locationDataForSelected = indicatorData.data[selectedLocation];

    // Jika 'selectedLocation' adalah provinsi, kita TIDAK AKAN menggunakan 'locationDataForSelected' untuk dataset BIRU.
    // Jika 'selectedLocation' adalah kab/kota, MAKA 'locationDataForSelected' AKAN digunakan untuk dataset BIRU.

    if (!locationDataForSelected && selectedLocation !== provinceFullName) { // Hanya error jika Kab/Kota dan datanya tidak ada
        console.warn(
            `Data not found for location "${selectedLocation}" in indicator "${indicatorKey}". Displaying empty chart.`
        );
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
            delete chartInstances[canvasId];
        }
        if (chartTitles[indicatorKey]) {
            chartTitles[
                indicatorKey
            ].innerHTML = `${indicatorData.name} - ${selectedLocation} <span>(${indicatorData.unit})</span> - Data Tidak Tersedia`;
        }
        // Opsional: Tampilkan pesan di canvas
        const tempCtx = chartCanvases[indicatorKey]?.getContext("2d");
        if (tempCtx) {
            tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);
            tempCtx.font = "14px Segoe UI"; tempCtx.fillStyle = "#6c757d"; tempCtx.textAlign = "center";
            tempCtx.fillText("Data tidak tersedia.", tempCtx.canvas.width/2, tempCtx.canvas.height/2);
        }
        return;
    }


    const ctx = chartCanvases[indicatorKey]?.getContext("2d");
    if (!ctx) {
        console.error(`Canvas context not found for ID: ${canvasId}`);
        return;
    }

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    if (chartTitles[indicatorKey]) {
        chartTitles[
            indicatorKey
        ].innerHTML = `${indicatorData.name} - ${selectedLocation} <span>(${indicatorData.unit})</span>`;
    }

    // --- DATASETS PREPARATION ---
    const datasets = [];

    // 1. Selected Location Data (BIRU - untuk Kabupaten/Kota)
    //    HANYA tambahkan dataset ini jika 'selectedLocation' BUKAN 'provinceFullName'.
    if (selectedLocation !== provinceFullName) {
        if (locationDataForSelected) { // Pastikan data untuk Kab/Kota ada
            datasets.push({
                label: selectedLocation, // Ini akan menjadi nama Kabupaten/Kota
                data: locationDataForSelected,
                fill: false,
                borderColor: legendColors.blue,
                backgroundColor: legendColors.blue,
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 7,
                // borderDash: undefined, // Garis solid secara default
            });
        } else {
            // Ini seharusnya sudah ditangani oleh pengecekan di atas, tapi sebagai pengaman
            console.warn(`Data tidak ditemukan untuk ${selectedLocation} (Kab/Kota), dataset biru tidak ditambahkan.`);
        }
    }

    // 2. Provincial Average Data (KUNING)
    //    Dataset ini akan selalu ditampilkan.
    //    Jika 'selectedLocation' adalah 'provinceFullName', maka label 'Rata-Rata Provinsi'
    //    sebenarnya merepresentasikan data provinsi itu sendiri.
    const provincialAverageData = indicatorData.data["Provinsi Jawa Timur"];
    if (provincialAverageData) {
        datasets.push({
            label: "Rata-Rata Provinsi",
            data: provincialAverageData,
            fill: false,
            borderColor: legendColors.green,
            backgroundColor: legendColors.green,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderDash: [6, 6], // Garis putus-putus
        });
    }

    // 3. National Average Data (MERAH)
    //    Dataset ini akan selalu ditampilkan.
    const nationalAverageData = indicatorData.data["Rata-Rata Nasional"];
    if (nationalAverageData) {
        datasets.push({
            label: "Rata-Rata Nasional",
            data: nationalAverageData,
            fill: false,
            borderColor: legendColors.red,
            backgroundColor: legendColors.red,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderDash: [6, 6], // Garis putus-putus
        });
    }
    // --- END DATASETS PREPARATION ---

    // Handle jika tidak ada dataset sama sekali (misal, Rata-Rata Provinsi/Nasional juga tidak ada)
    if (datasets.length === 0) {
        console.warn(`Tidak ada dataset yang dapat ditampilkan untuk ${indicatorKey} & ${selectedLocation}.`);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "14px Segoe UI"; ctx.fillStyle = "#6c757d"; ctx.textAlign = "center";
        ctx.fillText("Data tidak tersedia untuk ditampilkan.", ctx.canvas.width/2, ctx.canvas.height/2);
        return;
    }
    // --- END DATASETS PREPARATION ---


    // ----- REMOVE OLD ANNOTATION LOGIC or adapt if other annotations are needed -----
    // const annotations = [];
    // if (indicatorData.thresholds) { ... }
    // For this specific request, we are replacing threshold lines with data series.
    // If you have *other* types of static annotations you still want, you can keep the plugin
    // and add those annotations here. Otherwise, the annotation plugin part in options can be removed.

    chartInstances[canvasId] = new Chart(ctx, {
      type: "line",
      data: {
        labels: indicatorData.labels,
        datasets: datasets, // Use the dynamically created datasets array
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            // display: false, // Set to true if you want Chart.js internal legend
            // OR, if using the external HTML legend, you might want to customize clicks:
            onClick: (e, legendItem, legend) => {
                const index = legendItem.datasetIndex;
                const ci = legend.chart;
                if (ci.isDatasetVisible(index)) {
                    ci.hide(index);
                    legendItem.hidden = true;
                } else {
                    ci.show(index);
                    legendItem.hidden = false;
                }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${context.formattedValue} ${
                  indicatorData.unit || ""
                }`,
            },
          },
          // annotation: { // Only include if you still have other annotations.
          //   annotations: [], // Or your other annotations
          // },
        },
        scales: {
          y: {
            beginAtZero: indicatorKey === "ekonomi" ? undefined : false,
            title: {
              display: true,
              text: indicatorData.unit || "",
            },
            grid: {
              // color: 'rgba(0, 0, 0, 0.1)',
              // borderDash: [2, 2],
            },
          },
          x: {
            grid: {
              drawOnChartArea: true, // Can be true now, or false if you prefer
            },
            title: {
              display: true,
              text: "Tahun",
            },
          },
        },
      },
    });
  }

  // Function to update all charts based on selected location
  function updateAllCharts(selectedLocation) {
    if (!allData) return;
    renderChart("chart-persentase-miskin", "persentase", selectedLocation);
    renderChart("chart-jumlah-miskin", "jumlah", selectedLocation);
    renderChart("chart-manusia", "manusia", selectedLocation);
    renderChart("chart-terbuka", "terbuka", selectedLocation);
    renderChart("chart-ekonomi", "ekonomi", selectedLocation);
    renderChart("chart-gini", "gini", selectedLocation);
    renderChart("chart-pangan", "pangan", selectedLocation);
    renderChart("chart-stunting", "stunting", selectedLocation);
  }

  // Function to populate the location dropdown
  function populateDropdown(locations) {
    locationSelector.innerHTML = ""; // Clear loading message
    locations.forEach((location) => {
      const option = document.createElement("option");
      option.value = location;
      option.textContent = location;
      locationSelector.appendChild(option);
    });
  }

  // Fetch data and initialize
  fetch("data/data-tren.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      allData = data;

      if (
        !allData.indicators["terbuka"] ||
        !allData.indicators["ekonomi"] ||
        !allData.indicators["gini"]
      ) {
        console.warn(
          "Warning: Data for Gini Index, Poverty Ratio, or Income Classification might be missing in data-tren.json"
        );
      }
      // Pastikan legendColors dan provinceName ada, atau set default
      if (!allData.legendColors) {
        allData.legendColors = {
            blue: "#0055ff",
            green: "#229100",
            red: "#de3d3d",
            gray: "#bdbdbd", // Tambahkan warna lain jika perlu
        };
        console.warn("Objek 'legendColors' tidak ditemukan di data.json, menggunakan default.");
      }
       if (!allData.provinceName) {
        allData.provinceName = "Provinsi Jawa Timur"; // Set default jika tidak ada di JSON
        console.warn("Nama provinsi 'provinceName' tidak ditemukan di data.json, menggunakan default 'Provinsi Jawa Timur'.");
      }

      // Locations for the dropdown should be actual selectable regions,
      // not "Rata-Rata Provinsi" or "Rata-Rata Nasional".
      // The `data.locations` array in your JSON should list these.
      const selectableLocations = data.locations || Object.keys(data.indicators.persentase.data).filter(
          loc => loc !== "Rata-Rata Provinsi" && loc !== "Rata-Rata Nasional"
      );


      if (!selectableLocations || selectableLocations.length === 0) {
        console.error("No selectable locations found in data.");
        locationSelector.innerHTML =
          '<option value="">Tidak ada data wilayah</option>';
        return;
      }

      populateDropdown(selectableLocations);

      const initialLocation = selectableLocations[0];
      locationSelector.value = initialLocation;
      updateAllCharts(initialLocation);

      locationSelector.addEventListener("change", (event) => {
        updateAllCharts(event.target.value);
      });
    })
    .catch((error) => {
      console.error("Error fetching or processing data:", error);
      locationSelector.innerHTML =
        '<option value="">Gagal memuat data</option>';
    });
});