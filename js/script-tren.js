// Function to handle scrolling
function scrollToSection(id) {
  console.log("Scrolling to:", id); // For debugging - check console
  const section = document.getElementById(id);
  if (section) {
      section.scrollIntoView({
          behavior: "smooth", // Enable smooth scrolling
          block: "start"      // Align the top of the section with the top of the viewport
      });
  } else {
      console.warn("Element with ID '" + id + "' not found!"); // Warning if target doesn't exist
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const locationSelector = document.getElementById('location-selector');
  const chartCanvases = {
      persentase: document.getElementById('chart-persentase-miskin'),
      jumlah: document.getElementById('chart-jumlah-miskin'),
      manusia: document.getElementById('chart-manusia'),
      terbuka: document.getElementById('chart-terbuka'), 
      ekonomi: document.getElementById('chart-ekonomi'),
      gini: document.getElementById('chart-gini'),
      pangan: document.getElementById('chart-pangan'),
      stunting: document.getElementById('chart-stunting'),
  };
  const chartTitles = {
      persentase: document.getElementById('title-persentase-miskin'),
      jumlah: document.getElementById('title-jumlah-miskin'),
      manusia: document.getElementById('title-manusia'),
      terbuka: document.getElementById('title-terbuka'),
      ekonomi: document.getElementById('title-ekonomi'),
      gini: document.getElementById('title-gini'),
      pangan: document.getElementById('title-pangan'),
      stunting: document.getElementById('title-stunting'),
  };

  let allData = null; // To store the fetched data
  let chartInstances = {}; // To store Chart.js instances for updates/destruction

  // Function to render or update a chart
  function renderChart(canvasId, indicatorKey, selectedLocation) {
      if (!allData || !canvasId || !indicatorKey || !selectedLocation) {
          console.error("Missing data for rendering chart:", canvasId, indicatorKey, selectedLocation);
          return;
      }

      const indicatorData = allData.indicators[indicatorKey];
      if (!indicatorData) {
          console.error(`Indicator data not found for key: ${indicatorKey}`);
          return;
      }

      const locationValues = indicatorData.data[selectedLocation];
      if (!locationValues) {
          console.warn(`Data not found for location "${selectedLocation}" in indicator "${indicatorKey}". Displaying empty chart.`);
          // Optionally clear the chart or show a message
          if (chartInstances[canvasId]) {
              chartInstances[canvasId].destroy();
              delete chartInstances[canvasId];
          }
           // Update title even if data is missing
           if(chartTitles[indicatorKey]) {
              chartTitles[indicatorKey].innerHTML = `${indicatorData.name} - ${selectedLocation} <span>(${indicatorData.unit})</span>`;
          }
          return; // Stop if no data for this location
      }

      const ctx = chartCanvases[indicatorKey]?.getContext('2d');
      if (!ctx) {
          console.error(`Canvas context not found for ID: ${canvasId}`);
          return;
      }

      // Destroy previous chart instance if it exists
      if (chartInstances[canvasId]) {
          chartInstances[canvasId].destroy();
      }

       // Update chart title
      if(chartTitles[indicatorKey]) {
           chartTitles[indicatorKey].innerHTML = `${indicatorData.name} - ${selectedLocation} <span>(${indicatorData.unit})</span>`;
      }

            // ----- ANNOTATION LOGIC START -----
      const annotations = [];
      if (indicatorData.thresholds) {
          if (typeof indicatorData.thresholds.red !== 'undefined') {
              annotations.push({
                  type: 'line',
                  yMin: indicatorData.thresholds.red,
                  yMax: indicatorData.thresholds.red,
                  borderColor: '#FF0000', // Merah
                  borderWidth: 2,
                  borderDash: [6, 6], // Membuat garis putus-putus
                  label: { // Opsional: jika ingin memberi label pada garis
                      // content: 'Batas Merah',
                      // enabled: true,
                      // position: 'start' // atau 'center', 'end'
                  }
              });
          }
          if (typeof indicatorData.thresholds.yellow !== 'undefined') {
              annotations.push({
                  type: 'line',
                  yMin: indicatorData.thresholds.yellow,
                  yMax: indicatorData.thresholds.yellow,
                  borderColor: '#FFFF00', // Kuning
                  borderWidth: 2,
                  borderDash: [6, 6],
              });
          }
          if (typeof indicatorData.thresholds.green !== 'undefined') {
              annotations.push({
                  type: 'line',
                  yMin: indicatorData.thresholds.green,
                  yMax: indicatorData.thresholds.green,
                  borderColor: '#008000', // Hijau (Hijau tua agar lebih terlihat)
                  borderWidth: 2,
                  borderDash: [6, 6],
              });
          }
      }
      // ----- ANNOTATION LOGIC END -----


      chartInstances[canvasId] = new Chart(ctx, {
          type: 'line',
          data: {
              labels: indicatorData.labels,
              datasets: [{
                  label: selectedLocation,
                  data: locationValues,
                  fill: false,
                  borderColor: '#5a83b7',
                  backgroundColor: '#5a83b7',
                  tension: 0.3,
                  pointRadius: 5,
                  pointHoverRadius: 7
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                  legend: { display: false },
                  tooltip: {
                      callbacks: {
                          label: context => `${context.dataset.label}: ${context.formattedValue} ${indicatorData.unit || ''}`
                      }
                  },
                  annotation: { // AKTIFKAN ANNOTATION PLUGIN
                      annotations: annotations // Masukkan array anotasi yang sudah dibuat
                  }
              },
              scales: {
                  y: {
                      beginAtZero: (indicatorKey === 'ekonomi' ? undefined : false), // LPE bisa negatif, jadi jangan paksakan mulai dari 0. Lainnya bisa false.
                                                                                  // Atau true jika memang harus dari 0 (misal stunting/kemiskinan). Sesuaikan.
                      title: {
                          display: true,
                          text: indicatorData.unit || ''
                      },
                      grid: { // Tambahkan ini jika ingin garis grid y juga putus-putus (opsional)
                        // color: 'rgba(0, 0, 0, 0.1)',
                        // borderDash: [2, 2], // Garis grid putus-putus halus
                      }
                  },
                  x: {
                      grid: {
                        //   color: "#e6e6e6" // Warna grid x
                        drawOnChartArea: false, // Agar grid vertikal tidak bentrok dengan anotasi horizontal
                      },
                       title: {
                          display: true,
                          text: 'Tahun'
                      }
                  }
              }
          }
      });
  }
    
  

  // Function to update all charts based on selected location
  function updateAllCharts(selectedLocation) {
      if (!allData) return;
      renderChart('chart-persentase-miskin', 'persentase', selectedLocation);
      renderChart('chart-jumlah-miskin', 'jumlah', selectedLocation);
      renderChart('chart-manusia', 'manusia', selectedLocation);
      renderChart('chart-terbuka', 'terbuka', selectedLocation); 
      renderChart('chart-ekonomi', 'ekonomi', selectedLocation); 
      renderChart('chart-gini', 'gini', selectedLocation);
      renderChart('chart-pangan', 'pangan', selectedLocation);
      renderChart('chart-stunting', 'stunting', selectedLocation);
      // Add calls for other charts if you have more indicators
  }

  // Function to populate the location dropdown
  function populateDropdown(locations) {
      locationSelector.innerHTML = ''; // Clear loading message
      locations.forEach(location => {
          const option = document.createElement('option');
          option.value = location;
          option.textContent = location;
          locationSelector.appendChild(option);
      });
  }

  // Fetch data and initialize
  fetch('data/data-tren.json')
      .then(response => {
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
      })
      .then(data => {
          allData = data; // Store data globally

          // Check if indicators for the new sections exist in the data
          if (!allData.indicators['terbuka'] || !allData.indicators['ekonomi'] || !allData.indicators['gini']) {
            console.warn("Warning: Data for Gini Index, Poverty Ratio, or Income Classification might be missing in data-tren.json");
        }

          // Determine locations - use provided list or derive from data keys
          const locations = data.locations || Object.keys(data.indicators.persentase.data); // Fallback if locations array is missing

          if (!locations || locations.length === 0) {
              console.error("No locations found in data.");
               locationSelector.innerHTML = '<option value="">Tidak ada data wilayah</option>';
              return;
          }

          populateDropdown(locations);

          // Set initial chart display (e.g., first location)
          const initialLocation = locations[0];
          locationSelector.value = initialLocation; // Set dropdown value
          updateAllCharts(initialLocation);

          // Add event listener for dropdown changes
          locationSelector.addEventListener('change', (event) => {
              updateAllCharts(event.target.value);
          });
      })
      .catch(error => {
          console.error('Error fetching or processing data:', error);
          locationSelector.innerHTML = '<option value="">Gagal memuat data</option>';
          // Optionally display an error message to the user on the page
      });
});
