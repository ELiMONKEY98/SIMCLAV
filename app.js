const appState = {
    locations: {},
    currentData: null,
    currentLocation: null,
    weatherMap: null,
    csvLoading: false,
    allPointsVisible: true 
};

let weatherMarkers = [];
let windLayer = null;
let windLayerVisible = false;
let customLayers = [];
let activeLayer = null;
let layerModal = null;
let interpolationBoundaryLayer = null;
let interpolationBoundaryVisible = true;
let interpolationMethodModal = null;
let interpolationLayer = null;
let pointsLegendVisible = true;
let interpolationLegendVisible = true;

const attributeColors = {
    TMax: ['#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
    TMin: ['#08306b', '#08519c', '#2171b5', '#4292c6', '#9ecae1', '#fdae61'],
    P_Lluvia: ['#E6F2FF', '#6BB9FF', '#FFD966', '#FF8C66', '#FF4D4D'],
    mm: ['#E6F7FF', '#6BB5FF', '#3A66FF', '#2600ffff', '#aa149eff'],
    VientoMax: ['#c4ff76ff', '#4bd12aff', '#0aa805ff', '#018508ff', '#014607ff'],
    Rafagas: ['#f189ffff', '#ff32e4ff', '#b8007aff', '#ff0000ff']
};

function initApp() {
    console.log("Inicializando la aplicación...");
    if (!localStorage.getItem('UbicacionClima')) {
        localStorage.setItem('UbicacionClima', JSON.stringify({}));
    }
    appState.locations = JSON.parse(localStorage.getItem('UbicacionClima'));
    customLayers = [];
    updateDateTime();
    setInterval(updateDateTime, 60000);
    updateLocationDropdowns();
    
    const firstLocation = Object.keys(appState.locations)[0];
    if (firstLocation) loadTableData(firstLocation);
    
    setupEventListeners();
    setupLogoModal();


    const layerModalEl = document.getElementById('layerManagementModal');
    if (layerModalEl) {
        layerModal = new bootstrap.Modal(layerModalEl);
    }

    const interpolationMethodModalEl = document.getElementById('interpolationMethodModal');
    if (interpolationMethodModalEl) {
        interpolationMethodModal = new bootstrap.Modal(interpolationMethodModalEl);
    }
}

function showTab(tabId) {
    const tabElement = document.querySelector(`[data-bs-target="#${tabId}"]`);
    if (tabElement) {
        new bootstrap.Tab(tabElement).show();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    themeToggle.addEventListener('click', function() {
        if (body.getAttribute('data-theme') === 'dark') {
            body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    
    document.getElementById('currentDateTime').textContent = 
        now.toLocaleDateString('es-ES', options);
}

async function downloadAllDataAsCsv() {
    if (Object.keys(appState.locations).length === 0) {
        alert('No hay ubicaciones cargadas. Por favor cargue datos primero.');
        return;
    }
    
    const originalText = document.getElementById('downloadAllCsvBtn').innerHTML;
    document.getElementById('downloadAllCsvBtn').innerHTML = 
        '<span class="spinner-border spinner-border-sm"></span> Procesando...';
    document.getElementById('downloadAllCsvBtn').disabled = true;

    try {
        const allData = [];
        
        for (const [locationId, location] of Object.entries(appState.locations)) {
            try {
                await loadTableData(locationId);
                
                appState.currentData.forEach((dayData, index) => {
                    allData.push({
                        Ubicación: location.name,
                        ID: index + 1,
                        Fecha: dayData.Fecha,
                        'Temperatura Máxima (°C)': dayData.TMax,
                        'Temperatura Mínima (°C)': dayData.TMin,
                        'Probabilidad Lluvia (%)': dayData.P_Lluvia,
                        'Precipitación (mm)': dayData.mm,
                        'Velocidad Viento (km/h)': dayData.VientoMax,
                        'Ráfagas (km/h)': dayData.Rafagas,
                        'Dirección Viento': dayData.DireccionViento,
                        'Suma de Radiación de Onda Corta (kWh/m²)': dayData.Radiacion,
                        'GHI (W/m²)': dayData.ghi_avg,
                        'GHI (W/m²)_Max': dayData.ghi_max,
                        'Radiación Solar Directa (W/m²)': dayData.dhi_avg,
                        'Radiación Solar Directa (W/m²)_Max': dayData.dhi_max,
                        'DNI (W/m²)': dayData.dni_avg,
                        'DNI (W/m²)_Max': dayData.dni_max,
                        'Duración de la luz del Día (h)': dayData.DuracionDia,
                        'Índice UV': dayData.IndiceUV
                    });
                });
            } catch (error) {
                console.error(`Error processing data for ${location.name}:`, error);
            }
        }

        if (allData.length === 0) {
            alert('No se pudieron obtener datos de ninguna ubicación.');
            return;
        }
                        const headers = [
                            'Ubicación',
                            'ID',
                            'Fecha', 
                            'Temperatura Máxima (°C)', 
                            'Temperatura Mínima (°C)', 
                            'Probabilidad Lluvia (%)', 
                            'Precipitación (mm)', 
                            'Velocidad Viento (km/h)', 
                            'Ráfagas (km/h)', 
                            'Dirección Viento',
                            'Suma de Radiación de Onda Corta (kWh/m²)',
                            'GHI (W/m²)',
                            'GHI (W/m²)_Max',
                            'Radiación Solar Directa (W/m²)',
                            'Radiación Solar Directa (W/m²)_Max',
                            'DNI (W/m²)',
                            'DNI (W/m²)_Max',
                            'Duración de la luz del Día (h)',
                            'Índice UV'
                        ];
                        
                        const rows = allData.map(item => [
                            item.Ubicación,
                            item.ID,
                            item.Fecha,
                            item['Temperatura Máxima (°C)'],
                            item['Temperatura Mínima (°C)'],
                            item['Probabilidad Lluvia (%)'],
                            item['Precipitación (mm)'],
                            item['Velocidad Viento (km/h)'],
                            item['Ráfagas (km/h)'],
                            item['Dirección Viento'],
                            item['Suma de Radiación de Onda Corta (kWh/m²)'],
                            item['GHI (W/m²)'],
                            item['GHI (W/m²)_Max'],
                            item['Radiación Solar Directa (W/m²)'],
                            item['Radiación Solar Directa (W/m²)_Max'],
                            item['DNI (W/m²)'],
                            item['DNI (W/m²)_Max'],
                            item['Duración de la luz del Día (h)'],
                            item['Índice UV']
                        ]);
        
        let csvContent = headers.join(',') + '\r\n';
        rows.forEach(rowArray => {
            const row = rowArray.map(item => `"${item}"`).join(',');
            csvContent += row + '\r\n';
        });

        const now = new Date();
        const dateStr = formatDateForFilename(now);
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Datos_Concentrados_${dateStr}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error("Error downloading all data:", error);
        alert('Error al descargar datos concentrados: ' + error.message);
    } finally {
        document.getElementById('downloadAllCsvBtn').innerHTML = originalText;
        document.getElementById('downloadAllCsvBtn').disabled = false;
        
        if (appState.currentLocation) {
            loadTableData(appState.currentLocation);
        }
    }
}

function addCustomLayer(geojsonData, layerName) {
    const layerId = `custom-layer-${Date.now()}`;
    const randomColor = getRandomColor();
    const randomFill = getRandomColor();
    const newLayer = L.geoJSON(geojsonData, {
        style: function(feature) {
            if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
                return {
                    color: randomColor,
                    weight: 3,
                    opacity: 0.7,
                    fillColor: randomFill,
                    fillOpacity: 0.2
                };
            } else {
                return {
                    color: randomColor,
                    weight: 3,
                    opacity: 0.7
                };
            }
        },
        onEachFeature: function(feature, layer) {
            if (feature.properties) {
                let popupContent = '<div class="custom-popup">';
                for (const key in feature.properties) {
                    popupContent += `<b>${key}:</b> ${feature.properties[key]}<br>`;
                }
                popupContent += '</div>';
                layer.bindPopup(popupContent);
            }
        }
    }).addTo(appState.weatherMap);

    let style = newLayer.options.style || {};
    if (newLayer.getLayers().length > 0 && newLayer.getLayers()[0].options) {
        style = newLayer.getLayers()[0].options;
    }

    customLayers.push({
        id: layerId,
        name: layerName,
        visible: true,
        layer: newLayer,
        color: style.color || randomColor,
        opacity: style.opacity || 0.7,
        weight: style.weight || 3,
        fillColor: style.fillColor || randomFill,
        fillOpacity: style.fillOpacity !== undefined ? style.fillOpacity : 0.2
    });

    updateLayerList();
}

function updateLayerList() {
    const layerList = document.getElementById('layerList');
    layerList.innerHTML = '';
    
    customLayers.forEach((layer, index) => {
        const layerItem = document.createElement('div');
        layerItem.className = 'd-flex align-items-center mb-2 p-2 border rounded';
        layerItem.innerHTML = `
            <div class="form-check form-switch me-3">
                <input class="form-check-input layer-toggle" type="checkbox" 
                    ${layer.visible ? 'checked' : ''} data-index="${index}">
            </div>
            <div class="flex-grow-1 me-2">${layer.name}</div>
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-primary edit-layer" 
                    data-index="${index}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger remove-layer" 
                    data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        layerList.appendChild(layerItem);
    });

    document.querySelectorAll('.layer-toggle').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const index = this.dataset.index;
            toggleLayerVisibility(index);
        });
    });
    
    document.querySelectorAll('.remove-layer').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = this.dataset.index;
            removeCustomLayer(index);
        });
    });
    
    document.querySelectorAll('.edit-layer').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = this.dataset.index;
            editLayerProperties(index);
        });
    });
}

function toggleLayerVisibility(index) {
    const layer = customLayers[index];
    layer.visible = !layer.visible;
    
    if (layer.visible) {
        layer.layer.addTo(appState.weatherMap);
    } else {
        appState.weatherMap.removeLayer(layer.layer);
    }
}

function removeCustomLayer(index) {
    const layer = customLayers[index];
    appState.weatherMap.removeLayer(layer.layer);
    customLayers.splice(index, 1);
    updateLayerList();
}

function editLayerProperties(index) {
    const layer = customLayers[index];
    activeLayer = layer;

    document.getElementById('activeLayerControls').classList.remove('d-none');
    document.getElementById('layerColor').value = rgbToHex(layer.color);
    document.getElementById('layerOpacity').value = layer.opacity;
    document.getElementById('layerWeight').value = layer.weight;

    document.getElementById('layerFillColor').value = rgbToHex(layer.fillColor || '#ffffff');
    document.getElementById('layerFillOpacity').value = layer.fillOpacity !== undefined ? layer.fillOpacity : 0.2;

    const fillColorInput = document.getElementById('layerFillColor');
    const fillOpacityInput = document.getElementById('layerFillOpacity');
    fillColorInput.oninput = null;
    fillOpacityInput.oninput = null;

    document.getElementById('layerColor').oninput = function() {
        activeLayer.color = this.value;
        updateLayerStyle();
    };
    document.getElementById('layerOpacity').oninput = function() {
        activeLayer.opacity = parseFloat(this.value);
        updateLayerStyle();
    };
    document.getElementById('layerWeight').oninput = function() {
        activeLayer.weight = parseInt(this.value);
        updateLayerStyle();
    };

    fillColorInput.oninput = function() {
        activeLayer.fillColor = this.value;
        updateLayerStyle();
    };
    fillOpacityInput.oninput = function() {
        activeLayer.fillOpacity = parseFloat(this.value);
        updateLayerStyle();
    };
}

function updateLayerStyle() {
    if (!activeLayer) return;

    activeLayer.layer.setStyle(function(feature) {
        const isPoly = feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon";
        return {
            color: activeLayer.color,
            opacity: activeLayer.opacity,
            weight: activeLayer.weight,
            fillColor: isPoly ? activeLayer.fillColor : undefined,
            fillOpacity: isPoly ? activeLayer.fillOpacity : 0
        };
    });
}

function getRandomColor() {
    return `#${Math.floor(Math.random()*16777215).toString(16)}`;
}

function rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;
    
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#000000';
    
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}`;
}

// Obtener archivo GeoJSON para capas personalizadas
document.getElementById('customLayersFileInput').addEventListener('change', function(e) {
    const files = e.target.files;
    if (!files.length) return;
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const geojsonData = JSON.parse(e.target.result);
                addCustomLayer(geojsonData, file.name);
            } catch (error) {
                alert(`Error al procesar ${file.name}: ${error.message}`);
            }
        };
        reader.readAsText(file);
    });
});

function setupAllPointsToggle() {
    const toggleBtn = document.getElementById('toggleAllPointsBtn');
    
    toggleBtn.addEventListener('click', function() {
        appState.allPointsVisible = !appState.allPointsVisible;

        if (appState.allPointsVisible) {
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash me-1"></i> Ocultar Puntos';
            document.getElementById('pointsLegendContent').style.display = 'block';
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-eye me-1"></i> Mostrar Puntos';
            document.getElementById('pointsLegendContent').style.display = 'none';
        }

        updateMapMarkers();
    });
}

function toggleWindLayer() {
    windLayerVisible = !windLayerVisible;
    if (windLayerVisible) {
        createWindLayer();
    } else {
        removeWindLayer();
    }
}

function toggleWindLayer() {
    windLayerVisible = !windLayerVisible;
    if (windLayerVisible) {
        createWindLayer();
    } else {
        removeWindLayer();
    }
}

function createWindLayer() {
    removeWindLayer();
    
    const selectedDayIndex = document.getElementById('mapDaySelect').value || 0;
    windLayer = L.layerGroup().addTo(appState.weatherMap);
    
    const arrowSize = 50;  
    const arrowColor = '#0000ffff'; 
    const arrowShadow = '0 0 5px white'; 
    const arrowWeight = 'bold'; 
    
    Object.entries(appState.locations).forEach(([id, location]) => {
        const data = appState.mapLocationsData[id];
        if (!data) return;
        
        const dayData = data[selectedDayIndex];
        if (!dayData) return;
        
        const windDirection = (dayData.windDirection + 180) % 360;
        const windSpeed = dayData.VientoMax || 0;
        
        const dynamicSize = Math.min(35, Math.max(16, arrowSize * (1 + windSpeed/30)));
        
        const icon = L.divIcon({
            className: 'wind-direction-icon',
            html: `
                <div style="
                    transform: rotate(${windDirection}deg);
                    font-size: ${dynamicSize}px;
                    color: ${arrowColor};
                    text-shadow: ${arrowShadow};
                    font-weight: ${arrowWeight};
                ">↑</div>
            `,
            iconSize: [dynamicSize + 6, dynamicSize + 6],  
            iconAnchor: [(dynamicSize + 6)/2, (dynamicSize + 6)/2]  
        });
        
        L.marker([location.lat, location.lon], { icon: icon }).addTo(windLayer);
    });
}

function removeWindLayer() {
    if (windLayer) {
        appState.weatherMap.removeLayer(windLayer);
        windLayer = null;
    }
}

function downloadCustomGraph() {
    const locationSelect = document.getElementById('graphLocationSelect');
    const locationName = locationSelect.options[locationSelect.selectedIndex].text;
    const now = new Date();
    const dateStr = formatDateForFilename(now);
    
    const cleanLocation = locationName.replace(/[^a-zA-Z0-9]/g, '_');
    
    Plotly.downloadImage('weatherChart', {
        format: 'png',
        width: 1100,
        height: 600,
        filename: `grafica_${dateStr}_${cleanLocation}`
    });
}

// Función para configurar el modal del logo
function setupLogoModal() {
    const navbarBrand = document.querySelector('.navbar-brand');
    const overlay = document.getElementById('logoOverlay');
    
    if (!navbarBrand || !overlay) return;

    navbarBrand.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });
    
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.style.display === 'flex') {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}

function clearInterpolation() {
    if (interpolationLayer) {
        appState.weatherMap.removeLayer(interpolationLayer);
        interpolationLayer = null;
    }
    document.getElementById('interpolationLegend').classList.add('d-none');
}

function toggleLegendVisibility(legendType, button) {
    const legendId = legendType === 'points' ? 'pointsLegend' : 'interpolationLegend';
    const legend = document.getElementById(legendId);
    
    if (legendType === 'points') {
        pointsLegendVisible = !pointsLegendVisible;
    } else {
        interpolationLegendVisible = !interpolationLegendVisible;
    }
    
    const contentId = legendType === 'points' ? 'pointsLegendContent' : 'interpolationLegendContent';
    const content = document.getElementById(contentId);
    
    if ((legendType === 'points' && !pointsLegendVisible) || 
        (legendType === 'interpolation' && !interpolationLegendVisible)) {
        content.style.display = 'none';
        button.classList.add('active');
        button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        content.style.display = 'block';
        button.classList.remove('active');
        button.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

function setupEventListeners() {
    document.getElementById('loadDataBtn').addEventListener('click', () => {
        const location = document.getElementById('locationSelect').value;
        loadTableData(location);
    });
    setupAllPointsToggle();
    document.getElementById('loadCsvBtn').addEventListener('click', handleCsvUpload);
    document.getElementById('downloadCsvBtn').addEventListener('click', downloadDataAsCsv);
    document.getElementById('updateGraphBtn').addEventListener('click', updateGraph);
    document.getElementById('updateStatsBtn').addEventListener('click', updateStats);
    document.getElementById('saveGraphBtn').addEventListener('click', downloadCustomGraph);
    document.getElementById('downloadAllCsvBtn').addEventListener('click', downloadAllDataAsCsv);
    document.getElementById('deleteAllBtn').addEventListener('click', deleteAllLocations);
    document.getElementById('toggleWindBtn').addEventListener('click', toggleWindLayer);
/////////////////////
    document.getElementById('exportInterpolationBtn').addEventListener('click', exportInterpolationMap);
////////////////////////
    document.getElementById('csvFileInput').addEventListener('change', function() {
    document.getElementById('csvFeedback').textContent = '';
    document.getElementById('csvFeedback').classList.remove('text-success', 'text-danger');
    });
    
    document.getElementById('graphLocationSelect').addEventListener('change', updateGraph);
    document.getElementById('statsLocationSelect').addEventListener('change', updateStats);

    document.querySelectorAll('.nav-tabs button').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (e) => {
            if (e.target.id === 'graphs-tab') updateGraph();
            if (e.target.id === 'stats-tab') updateStats();
            if (e.target.id === 'map-tab') initMap();
        });
    });
    
    document.getElementById('loadBoundaryBtn').addEventListener('click', () => {
        document.getElementById('boundaryFileInput').click();
    });
    
    document.getElementById('addLayersBtn').addEventListener('click', () => {
        document.getElementById('customLayersFileInput').click();
    });
    
    document.getElementById('boundaryFileInput').addEventListener('change', handleBoundaryUpload);
    document.getElementById('removeGeojsonBtn').addEventListener('click', removeBoundaryLayer);
    document.getElementById('toggleGeojsonBtn').addEventListener('click', toggleBoundaryVisibility);

    document.getElementById('toggleWindBtn').addEventListener('click', toggleWindLayer);
    document.getElementById('manageLayersBtn').addEventListener('click', function() {
        if (layerModal) layerModal.show();
    });
    
    document.getElementById('generateSnapshot').addEventListener('click', generateMapSnapshot);
    
    document.getElementById('interpolateBtn').addEventListener('click', function() {
        if (interpolationMethodModal) interpolationMethodModal.show();
    });
    
    document.getElementById('interpolationMethodSelect').addEventListener('change', function() {
        if (this.value === 'kriging') {
            document.getElementById('krigingOptions').classList.remove('d-none');
        } else {
            document.getElementById('krigingOptions').classList.add('d-none');
        }
    });
    

document.getElementById('confirmInterpolation').addEventListener('click', function() {
    if (interpolationMethodModal) interpolationMethodModal.hide();
    runInterpolation('idw');
});

    document.addEventListener('click', function(e) {
        if (e.target.closest('.toggle-legend')) {
            const button = e.target.closest('.toggle-legend');
            const legendType = button.dataset.legend;
            toggleLegendVisibility(legendType, button);
        }
    });

    document.getElementById('clearInterpolationBtn').addEventListener('click', clearInterpolation);
}

function deleteAllLocations() {
    if (Object.keys(appState.locations).length === 0) {
        alert('No hay ubicaciones para eliminar.');
        return;
    }
    
    const confirmDelete = confirm('¿Está seguro de que desea eliminar TODAS las ubicaciones? Esta acción no se puede deshacer.');
    
    if (confirmDelete) {
        appState.locations = {};
        localStorage.setItem('UbicacionClima', JSON.stringify({}));
        appState.currentData = null;
        appState.currentLocation = null;
        updateLocationDropdowns();
        document.querySelector('#weatherTable tbody').innerHTML = '';
        document.getElementById('currentWeatherCard').innerHTML = 
            '<div class="text-center py-4"><div class="spinner-border text-info"></div></div>';
        document.getElementById('tableTitle').textContent = 'Datos Climáticos';
        alert('Todas las ubicaciones han sido eliminadas correctamente.');
    }
}



function generateMapSnapshot() {
    snapshotModal.hide();
    
    const title = document.getElementById('snapshotTitle').value || 'Mapa del Pronóstico';
    const quality = parseFloat(document.getElementById('snapshotQuality').value);
    const includeDateTime = document.getElementById('includeDateTime').checked;
    const includeLegend = document.getElementById('includeLegend').checked;
    const includeScale = document.getElementById('includeScale').checked;
    
    const snapshotContainer = document.createElement('div');
    snapshotContainer.style.position = 'fixed';
    snapshotContainer.style.top = '0';
    snapshotContainer.style.left = '0';
    snapshotContainer.style.width = '100%';
    snapshotContainer.style.height = '100%';
    snapshotContainer.style.backgroundColor = 'white';
    snapshotContainer.style.zIndex = '10000';
    snapshotContainer.style.overflow = 'auto';
    snapshotContainer.style.padding = '20px';
    snapshotContainer.style.boxSizing = 'border-box';
    document.body.appendChild(snapshotContainer);


    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.textAlign = 'center';
    titleEl.style.marginBottom = '15px';
    titleEl.style.color = '#2c3e50';
    snapshotContainer.appendChild(titleEl);
    
    if (includeDateTime) {
        const dateEl = document.createElement('div');
        dateEl.textContent = `Generado: ${new Date().toLocaleString('es-ES')}`;
        dateEl.style.textAlign = 'center';
        dateEl.style.marginBottom = '15px';
        dateEl.style.color = '#7f8c8d';
        dateEl.style.fontSize = '14px';
        snapshotContainer.appendChild(dateEl);
    }
    

    const mapContainer = document.createElement('div');
    mapContainer.style.width = '100%';
    mapContainer.style.height = '600px';
    mapContainer.style.position = 'relative';
    mapContainer.style.margin = '0 auto';
    mapContainer.style.border = '1px solid #ddd';
    mapContainer.style.borderRadius = '8px';
    mapContainer.style.overflow = 'hidden';
    snapshotContainer.appendChild(mapContainer);
    
    const mapClone = document.getElementById('weatherMap').cloneNode(true);
    mapClone.style.width = '100%';
    mapClone.style.height = '100%';
    mapClone.style.position = 'relative';
    mapContainer.appendChild(mapClone);

    if (includeLegend) {
        const legendClone = document.getElementById('mapLegendContainer').cloneNode(true);
        legendClone.style.position = 'absolute';
        legendClone.style.top = '10px';
        legendClone.style.right = '10px';
        legendClone.style.zIndex = '1000';
        mapContainer.appendChild(legendClone);
    }

    if (includeScale) {
        const scaleContainer = document.createElement('div');
        scaleContainer.style.position = 'absolute';
        scaleContainer.style.bottom = '30px';
        scaleContainer.style.left = '10px';
        scaleContainer.style.zIndex = '1000';
        scaleContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        scaleContainer.style.padding = '5px';
        scaleContainer.style.borderRadius = '3px';
        scaleContainer.style.fontSize = '12px';

        const center = appState.weatherMap.getCenter();
        const bounds = appState.weatherMap.getBounds();
        const distance = center.distanceTo(L.latLng(bounds.getNorth(), bounds.getWest()));
        const scaleKm = Math.round(distance / 1000);
        
        scaleContainer.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="width: 100px; height: 2px; background: black; margin-right: 5px;"></div>
                ${scaleKm} km
            </div>
        `;
        
        mapContainer.appendChild(scaleContainer);
    }

    const attribution = document.createElement('div');
    attribution.style.position = 'absolute';
    attribution.style.bottom = '10px';
    attribution.style.right = '10px';
    attribution.style.zIndex = '1000';
    attribution.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    attribution.style.padding = '2px 5px';
    attribution.style.borderRadius = '2px';
    attribution.style.fontSize = '10px';
    attribution.textContent = '© OpenStreetMap contributors';
    mapContainer.appendChild(attribution);

    const footer = document.createElement('div');
    footer.style.textAlign = 'center';
    footer.style.marginTop = '15px';
    footer.style.color = '#7f8c8d';
    footer.style.fontSize = '12px';
    footer.textContent = 'SIMCLAV + CSAA®2025 - Sistema Integrado de Meteorología y Cartografía Semi-Automatizada Avanzada';
    snapshotContainer.appendChild(footer);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Cerrar';
    closeButton.className = 'btn btn-secondary';
    closeButton.style.marginTop = '15px';
    closeButton.style.display = 'block';
    closeButton.style.margin = '15px auto';
    closeButton.addEventListener('click', function() {
        document.body.removeChild(snapshotContainer);
        appState.weatherMap.removeControl(loadingControl);
    });
    snapshotContainer.appendChild(closeButton);

    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Descargar Imagen';
    downloadButton.className = 'btn btn-primary';
    downloadButton.style.marginTop = '10px';
    downloadButton.style.display = 'block';
    downloadButton.style.margin = '0 auto';
    downloadButton.addEventListener('click', function() {

        html2canvas(snapshotContainer, {
            scale: 2, 
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const image = canvas.toDataURL('image/png', quality);
            const link = document.createElement('a');
            const fileName = `mapa_${formatDateForFilename(new Date())}.png`;
            
            link.href = image;
            link.download = fileName;
            link.click();
        }).catch(error => {
            console.error('Error generating snapshot:', error);
            alert('Error al generar la imagen: ' + error.message);
        });
    });
    snapshotContainer.appendChild(downloadButton);
}

function handleBoundaryUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const geojsonData = JSON.parse(e.target.result);
            displayInterpolationBoundary(geojsonData);
            document.getElementById('geojsonControls').classList.remove('d-none');
        } catch (error) {
            alert('Error al procesar el archivo GeoJSON: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function displayInterpolationBoundary(geojsonData) {
    if (interpolationBoundaryLayer) {
        appState.weatherMap.removeLayer(interpolationBoundaryLayer);
    }

    interpolationBoundaryLayer = L.geoJSON(geojsonData, {
        style: {
            color: '#0000ff', 
            weight: 3,       
            opacity: 1,       
            fillOpacity: 0   
        },
        onEachFeature: function(feature, layer) {
            if (feature.properties) {
                let popupContent = '<div class="custom-popup">';
                for (const key in feature.properties) {
                    popupContent += `<b>${key}:</b> ${feature.properties[key]}<br>`;
                }
                popupContent += '</div>';
                layer.bindPopup(popupContent);
            }
        }
    }).addTo(appState.weatherMap);


    appState.weatherMap.fitBounds(interpolationBoundaryLayer.getBounds());
}

function removeBoundaryLayer() {
    if (interpolationBoundaryLayer) {
        appState.weatherMap.removeLayer(interpolationBoundaryLayer);
        interpolationBoundaryLayer = null;
        document.getElementById('boundaryFileInput').value = '';
    }
}

function toggleBoundaryVisibility() {
    if (interpolationBoundaryLayer) {
        if (interpolationBoundaryVisible) {
            appState.weatherMap.removeLayer(interpolationBoundaryLayer);
        } else {
            interpolationBoundaryLayer.addTo(appState.weatherMap);
        }
        interpolationBoundaryVisible = !interpolationBoundaryVisible;
    }
}


async function fetchWeatherData(lat, lon) {
    try {
        const dailyParams = "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,daylight_duration,uv_index_max";
        const hourlyParams = "shortwave_radiation,direct_radiation,direct_normal_irradiance";
        
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=${dailyParams}&hourly=${hourlyParams}&timezone=auto&forecast_days=14`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Error de red: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching weather data:", error);
        throw error;
    }
}

async function runInterpolation(method = 'idw') {
    if (!interpolationBoundaryLayer || !interpolationBoundaryVisible) {
        alert('Carga y muestra una capa de límite primero');
        return;
    }

    const selectedDayIndex = document.getElementById('mapDaySelect').value || 0;
    const selectedAttribute = document.getElementById('mapAttributeSelect').value;
    const geojson = interpolationBoundaryLayer.toGeoJSON();
    
    if (!geojson.features.length) {
        alert('El GeoJSON no contiene características válidas');
        return;
    }

    
    const loadingControl = L.control({position: 'bottomright'});
    loadingControl.onAdd = () => {
        const div = L.DomUtil.create('div', 'map-loading');
        div.innerHTML = '<div class="spinner-border text-primary"></div> Interpolando...';
        return div;
    };
    loadingControl.addTo(appState.weatherMap);

    try {
 
        
        const points = [];
        for (const [id, location] of Object.entries(appState.locations)) {
            const pt = turf.point([location.lon, location.lat]);
            if (turf.booleanPointInPolygon(pt, geojson.features[0])) {
                const weatherData = await fetchWeatherData(location.lat, location.lon);
                const processedData = processWeatherData(weatherData);
                const value = parseFloat(processedData[selectedDayIndex][selectedAttribute]) || 0;
                points.push(turf.point([location.lon, location.lat], { value }));
            }
        }

        if (points.length < 3) {
            throw new Error(`Se necesitan al menos 3 puntos. Encontrados: ${points.length}`);
        }

        const pointCollection = turf.featureCollection(points);
        const bbox = turf.bbox(geojson);
        const cellSize = 0.05;
        const grid = turf.pointGrid(bbox, cellSize, { units: 'degrees' });

        grid.features.forEach(point => {
            if (turf.booleanPointInPolygon(point, geojson.features[0])) {
                point.properties.value = interpolateValue(point, pointCollection);
            }
        });

        createInterpolationLayer(grid, selectedAttribute);

    } catch (error) {
        console.error("Error de interpolación:", error);
        alert(`Error: ${error.message}`);
    } finally {
        appState.weatherMap.removeControl(loadingControl);
    }
}

function interpolateValue(targetPoint, points, power = 80) {
    let numerator = 0;
    let denominator = 0;

    points.features.forEach(point => {
        const distance = turf.distance(targetPoint, point);
        if (distance === 0) return point.properties.value;
        
        const weight = 1 / Math.pow(distance, power);
        numerator += weight * point.properties.value;
        denominator += weight;
    });

    return numerator / denominator;
}


function createInterpolationLayer(grid, attribute) {
    if (interpolationLayer) {
        appState.weatherMap.removeLayer(interpolationLayer);
    }

    const values = grid.features
        .filter(f => f.properties.value !== undefined)
        .map(f => f.properties.value);
    
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const colorScale = attributeColors[attribute];

    interpolationLayer = L.geoJSON(grid, {
        pointToLayer: (feature, latlng) => {
            const value = feature.properties.value;
            const ratio = Math.min(1, Math.max(0, (value - minVal) / (maxVal - minVal)));
            const colorIdx = Math.floor(ratio * (colorScale.length - 0.7));
            const color = colorScale[colorIdx];
            
            return L.circleMarker(latlng, {
                radius: 4,
                fillColor: color,
                color: 'rgba(0, 0, 0, 0)',
                weight: 1,
                fillOpacity: 0.7
            });
        }
    }).addTo(appState.weatherMap);

    updateMapLegend(attribute, minVal, maxVal, 'interpolation');
}

document.getElementById('mapDaySelect').addEventListener('change', () => {
    clearInterpolation();
});

document.getElementById('mapAttributeSelect').addEventListener('change', () => {
    clearInterpolation();
});

async function handleCsvUpload() {
    const fileInput = document.getElementById('csvFileInput');
    const feedbackEl = document.getElementById('csvFeedback');
    const spinner = document.getElementById('csvSpinner');
    const loadBtn = document.getElementById('loadCsvBtn');

    if (!fileInput.files.length) {
        showFeedback(feedbackEl, 'Seleccione un archivo CSV', 'danger');
        return;
    }

    if (appState.csvLoading) return;
    appState.csvLoading = true;
    
    spinner.classList.remove('d-none');
    loadBtn.disabled = true;
    feedbackEl.textContent = '';

    try {
        const file = fileInput.files[0];
        const result = await processCsvFile(file);
        
        if (result.success) {
            const newLocations = {};
            let addedCount = 0;
            
            for (const [id, location] of Object.entries(result.locations)) {
                if (!appState.locations[id]) {
                    newLocations[id] = location;
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                appState.locations = { ...appState.locations, ...newLocations };
                localStorage.setItem('UbicacionClima', JSON.stringify(appState.locations));

                updateLocationDropdowns();

                showFeedback(
                    feedbackEl, 
                    `¡Datos cargados exitosamente! ${addedCount} ubicación(es) añadida(s)`, 
                    'success'
                );

                if (!appState.currentLocation) {
                    const firstNew = Object.keys(newLocations)[0];
                    loadTableData(firstNew);
                }
            } else {
                showFeedback(feedbackEl, 'El archivo no contenía ubicaciones nuevas', 'info');
            }
        } else {
            showFeedback(feedbackEl, `Error: ${result.message}`, 'danger');
        }
    } catch (error) {
        showFeedback(feedbackEl, `Error: ${error.message}`, 'danger');
    } finally {
        spinner.classList.add('d-none');
        loadBtn.disabled = false;
        appState.csvLoading = false;
        fileInput.value = '';
    }
}

function showFeedback(element, message, type) {
    element.textContent = message;
    element.className = 'form-text'; 
    element.classList.add(`text-${type}`);
    element.style.display = 'block';
    element.style.visibility = 'visible';
}

function processCsvFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const lines = content.split('\n');
                const newLocations = {};
                let added = 0;
                let errors = [];
                
                lines.forEach((line, i) => {
                    try {
                        line = line.trim();
                        if (!line || line.startsWith('#') || line.startsWith('Nombre')) {
                            return;
                        }

                        let parts = line.includes(';') ?
                            line.split(';').map(p => p.trim()) :
                            line.split(',').map(p => p.trim());

                        if (parts.length !== 3) {
                            errors.push(`Línea ${i+1}: Formato incorrecto (necesita 3 valores)`);
                            return;
                        }
                        
                        const [name, latStr, lonStr] = parts;
                        const cleanLatStr = latStr.replace(',', '.');
                        const cleanLonStr = lonStr.replace(',', '.');
                        const lat = parseFloat(cleanLatStr);
                        const lon = parseFloat(cleanLonStr);
                        if (!name || isNaN(lat) || isNaN(lon)) {
                            errors.push(`Línea ${i+1}: Datos inválidos (${line})`);
                            return;
                        }

                        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                            errors.push(`Línea ${i+1}: Coordenadas fuera de rango`);
                            return;
                        }
                        
                        const id = name.toLowerCase().replace(/\s+/g, '-');
                        
                        if (!appState.locations[id]) {
                            newLocations[id] = { name, lat, lon };
                            added++;
                        }
                    } catch (error) {
                        errors.push(`Línea ${i+1}: Error procesando - ${error.message}`);
                    }
                });
                
                resolve({
                    success: errors.length === 0,
                    locations: newLocations,
                    added,
                    message: errors.length > 0 ? 
                        `Errores encontrados: ${errors.join('; ')}` : 
                        'CSV procesado correctamente'
                });
            } catch (error) {
                resolve({
                    success: false,
                    message: `Error procesando archivo: ${error.message}`
                });
            }
        };
        
        reader.onerror = () => {
            resolve({
                success: false,
                message: 'Error al leer el archivo'
            });
        };
        
        reader.readAsText(file);
    });
}

function downloadDataAsCsv() {
    if (!appState.currentData || !appState.currentLocation) {
        alert('No hay datos para descargar. Por favor cargue datos primero.');
        return;
    }

    const location = appState.locations[appState.currentLocation];
    const now = new Date();
    const dateStr = formatDateForFilename(now);

    const headers = [
            'id', 
            'Fecha', 
            'Temperatura Máxima (°C)', 
            'Temperatura Mínima (°C)', 
            'Probabilidad Lluvia (%)', 
            'Precipitación (mm)', 
            'Velocidad Viento (km/h)', 
            'Ráfagas (km/h)', 
            'Dirección Viento',
            'Suma de Radiación de Onda Corta (kWh/m²)',
            'GHI (W/m²)',
            'GHI (W/m²)_Max',
            'Radiación Solar Directa (W/m²)',
            'Radiación Solar Directa (W/m²)_Max',
            'DNI (W/m²)',
            'DNI (W/m²)_Max',
            'Duración de la luz del Día (h)',
            'Índice UV'
    ];
    
    const rows = appState.currentData.map((item, index) => [
        index + 1,
        item.Fecha,
        item.TMax,
        item.TMin,
        item.P_Lluvia,
        item.mm,
        item.VientoMax,
        item.Rafagas,
        item.DireccionViento,
        item.Radiacion,
        item.ghi_avg,
        item.ghi_max,
        item.dhi_avg,
        item.dhi_max,
        item.dni_avg,
        item.dni_max,
        item.DuracionDia,
        item.IndiceUV
    ]);


    let csvContent = headers.join(',') + '\r\n';
    rows.forEach(rowArray => {
        const row = rowArray.map(item => `"${item}"`).join(',');
        csvContent += row + '\r\n';
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Datos_Climaticos_${location.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatDateForFilename(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}${month}${day}`;
}


async function loadTableData(locationId) {
    if (!locationId || !appState.locations[locationId]) {
        console.warn("ID de ubicación no válido o no encontrado:", locationId);
        document.getElementById('currentWeatherCard').innerHTML = 
            '<div class="text-center text-muted p-4">Seleccione una ubicación válida.</div>';
        return;
    }

    appState.currentLocation = locationId;
    const location = appState.locations[locationId];

    document.getElementById('tableTitle').textContent = `Datos Climáticos - ${location.name}`;
    document.getElementById('currentWeatherCard').innerHTML = 
        '<div class="text-center py-4"><div class="spinner-border text-info"></div></div>';
    document.querySelector('#weatherTable tbody').innerHTML = 
        '<tr><td colspan="15" class="text-center"><div class="spinner-border spinner-border-sm"></div> Cargando...</td></tr>';

    try {
        const lat = location.lat;
        const lon = location.lon;
        const dailyParams = "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,daylight_duration,uv_index_max";
        const hourlyParams = "shortwave_radiation,direct_radiation,direct_normal_irradiance";
       
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=${dailyParams}&hourly=${hourlyParams}&timezone=auto&forecast_days=14`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Error de red: ${response.statusText}`);
        }
        const data = await response.json();

        appState.currentData = data.daily.time.map((date, i) => {

            const hourlyStartIndex = i * 24;
            const hourlyEndIndex = (i + 1) * 24;

            const calculateAverage = (slice) => {
                if (!slice) return 0; 
                const validValues = slice.filter(v => v !== null && v !== undefined);
                if (validValues.length === 0) return 0;
                const sum = validValues.reduce((a, b) => a + b, 0);
                return (sum / validValues.length);
            };

            const calculateMax = (slice) => {
                if (!slice) return 0;
                const validValues = slice.filter(v => v !== null && v !== undefined);
                if (validValues.length === 0) return 0;
                return Math.max(...validValues);
            };

            const ghiSlice = data.hourly.shortwave_radiation ? data.hourly.shortwave_radiation.slice(hourlyStartIndex, hourlyEndIndex) : [];
            const dhiSlice = data.hourly.direct_radiation ? data.hourly.direct_radiation.slice(hourlyStartIndex, hourlyEndIndex) : [];
            const dniSlice = data.hourly.direct_normal_irradiance ? data.hourly.direct_normal_irradiance.slice(hourlyStartIndex, hourlyEndIndex) : [];

            return {
                Fecha: date,
                TMax: data.daily.temperature_2m_max[i],
                TMin: data.daily.temperature_2m_min[i],
                P_Lluvia: data.daily.precipitation_probability_max[i],
                mm: data.daily.precipitation_sum[i],
                VientoMax: data.daily.wind_speed_10m_max[i],
                Rafagas: data.daily.wind_gusts_10m_max[i],
                DireccionViento: data.daily.wind_direction_10m_dominant[i],
                Radiacion: data.daily.shortwave_radiation_sum[i],
                ghi_avg: calculateAverage(ghiSlice),
                ghi_max: calculateMax(ghiSlice),
                dhi_avg: calculateAverage(dhiSlice),
                dhi_max: calculateMax(dhiSlice),
                dni_avg: calculateAverage(dniSlice),
                dni_max: calculateMax(dniSlice),
                DuracionDia: data.daily.daylight_duration[i] / 3600,
                IndiceUV: data.daily.uv_index_max[i]
            };
        });


        updateTable();
        updateCurrentWeatherCard();
        

        document.getElementById('graphLocationSelect').value = locationId;
        document.getElementById('statsLocationSelect').value = locationId;

    } catch (error) {
        console.error("Error fetching weather data:", error);
        document.getElementById('currentWeatherCard').innerHTML = 
            `<div class="alert alert-danger m-3">Error al cargar datos: ${error.message}</div>`;
        document.querySelector('#weatherTable tbody').innerHTML = 
            `<tr><td colspan="15" class="text-center text-danger">Error al cargar datos.</td></tr>`; 
    }
}
function exportInterpolationMap() {
    if (!interpolationBoundaryLayer) {
        alert('Primero debe cargar un límite GeoJSON para exportar el mapa');
        return;
    }

    const selectedDayIndex = document.getElementById('mapDaySelect').value || 0;
    const selectedAttribute = document.getElementById('mapAttributeSelect').value;
    const selectedDate = document.getElementById('mapDaySelect').options[selectedDayIndex].text;
    
    const attributeNames = {
        TMax: 'Temperatura Máxima (°C)',
        TMin: 'Temperatura Mínima (°C)', 
        P_Lluvia: 'Probabilidad de Lluvia (%)',
        mm: 'Precipitación (mm)',
        VientoMax: 'Viento Predominante (km/h)',
        Rafagas: 'Ráfagas Máximas (km/h)'
    };
    
    const variableName = attributeNames[selectedAttribute];
    const cleanVariable = variableName.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanDate = selectedDate.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Map_${cleanVariable}_${cleanDate}.png`;
    const loadingOverlay = document.createElement('div');
    loadingOverlay.style.position = 'fixed';
    loadingOverlay.style.top = '0';
    loadingOverlay.style.left = '0';
    loadingOverlay.style.width = '100%';
    loadingOverlay.style.height = '100%';
    loadingOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    loadingOverlay.style.zIndex = '10000';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.flexDirection = 'column';
    loadingOverlay.style.alignItems = 'center';
    loadingOverlay.style.justifyContent = 'center';
    loadingOverlay.innerHTML = `
        <div class="text-center p-4 bg-white rounded shadow-lg">
            <div class="spinner-border text-primary mb-3"></div>
            <div class="fw-bold">Generando imagen del área delimitada...</div>
            <div class="small text-muted mt-2">Calculando área de interés</div>
            <div class="progress mt-3" style="height: 10px; width: 200px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%"></div>
            </div>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
    const originalCenter = appState.weatherMap.getCenter();
    const originalZoom = appState.weatherMap.getZoom();
    const bounds = interpolationBoundaryLayer.getBounds();
    const topLeftPixel = appState.weatherMap.latLngToContainerPoint(bounds.getNorthWest());
    const bottomRightPixel = appState.weatherMap.latLngToContainerPoint(bounds.getSouthEast());
    const boundaryWidth = bottomRightPixel.x - topLeftPixel.x;
    const boundaryHeight = bottomRightPixel.y - topLeftPixel.y;
    const padding = 50;
    const paddedWidth = boundaryWidth + (padding * 2);
    const paddedHeight = boundaryHeight + (padding * 2);
    
    const exportWidth = 2000;
    const exportHeight = 1400;

    const scaleX = exportWidth / paddedWidth;
    const scaleY = exportHeight / paddedHeight;
    const scale = Math.min(scaleX, scaleY);
    const finalWidth = Math.floor(paddedWidth * scale);
    const finalHeight = Math.floor(paddedHeight * scale);
    
    console.log(`Boundary area: ${boundaryWidth}x${boundaryHeight}, Export: ${finalWidth}x${finalHeight}`);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = finalWidth;
    canvas.height = finalHeight;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);

    function latLngToPixel(latLng) {
        const point = appState.weatherMap.latLngToContainerPoint(latLng);     
        const relativeX = point.x - topLeftPixel.x + padding;
        const relativeY = point.y - topLeftPixel.y + padding;
        return {
            x: relativeX * scale,
            y: relativeY * scale
        };
    }
    

    function isPointInBoundaryArea(point) {
        const relativeX = point.x - topLeftPixel.x;
        const relativeY = point.y - topLeftPixel.y;
        return relativeX >= -padding && relativeX <= boundaryWidth + padding && 
               relativeY >= -padding && relativeY <= boundaryHeight + padding;
    }
    

    function drawBoundary() {
        const boundaryData = interpolationBoundaryLayer.toGeoJSON();
        boundaryData.features.forEach(feature => {
            if (feature.geometry.type === 'Polygon') {
                feature.geometry.coordinates.forEach(polygon => {
                    ctx.beginPath();
                    polygon.forEach((coord, index) => {
                        const point = latLngToPixel(L.latLng(coord[1], coord[0]));
                        if (index === 0) {
                            ctx.moveTo(point.x, point.y);
                        } else {
                            ctx.lineTo(point.x, point.y);
                        }
                    });
                    ctx.closePath();
                    ctx.strokeStyle = '#000000ff';
                    ctx.lineWidth = 2 * scale;
                    ctx.stroke();
                });
            }
        });
    }


    function drawCustomLayers() {
        customLayers.forEach(customLayer => {
            if (customLayer.visible) {
                const layerData = customLayer.layer.toGeoJSON();
                layerData.features.forEach(feature => {
                    if (feature.geometry.type === 'Polygon') {
                        feature.geometry.coordinates.forEach(polygon => {
                            ctx.beginPath();
                            let hasPointsInView = false;
                            
                            polygon.forEach((coord, index) => {
                                const latLng = L.latLng(coord[1], coord[0]);
                                const containerPoint = appState.weatherMap.latLngToContainerPoint(latLng);
                                
                                if (isPointInBoundaryArea(containerPoint)) {
                                    hasPointsInView = true;
                                    const point = latLngToPixel(latLng);
                                    if (index === 0) {
                                        ctx.moveTo(point.x, point.y);
                                    } else {
                                        ctx.lineTo(point.x, point.y);
                                    }
                                }
                            });
                            
                            if (hasPointsInView) {
                                ctx.closePath();
                                ctx.strokeStyle = customLayer.color;
                                ctx.lineWidth = customLayer.weight * scale;
                                ctx.globalAlpha = customLayer.opacity;
                                ctx.stroke();
                                
                                if (customLayer.fillColor && customLayer.fillOpacity > 0) {
                                    ctx.fillStyle = customLayer.fillColor;
                                    ctx.globalAlpha = customLayer.fillOpacity;
                                    ctx.fill();
                                }
                                ctx.globalAlpha = 1.0;
                            }
                        });
                    }
                    else if (feature.geometry.type === 'LineString') {
                        ctx.beginPath();
                        let hasPointsInView = false;
                        
                        feature.geometry.coordinates.forEach((coord, index) => {
                            const latLng = L.latLng(coord[1], coord[0]);
                            const containerPoint = appState.weatherMap.latLngToContainerPoint(latLng);
                            
                            if (isPointInBoundaryArea(containerPoint)) {
                                hasPointsInView = true;
                                const point = latLngToPixel(latLng);
                                if (index === 0) {
                                    ctx.moveTo(point.x, point.y);
                                } else {
                                    ctx.lineTo(point.x, point.y);
                                }
                            }
                        });
                        
                        if (hasPointsInView) {
                            ctx.strokeStyle = customLayer.color;
                            ctx.lineWidth = customLayer.weight * scale;
                            ctx.globalAlpha = customLayer.opacity;
                            ctx.stroke();
                            ctx.globalAlpha = 1.0;
                        }
                    }
                    else if (feature.geometry.type === 'Point') {
                        const latLng = L.latLng(
                            feature.geometry.coordinates[1],
                            feature.geometry.coordinates[0]
                        );
                        const containerPoint = appState.weatherMap.latLngToContainerPoint(latLng);
                        
                        if (isPointInBoundaryArea(containerPoint)) {
                            const point = latLngToPixel(latLng);
                            
                            ctx.beginPath();
                            ctx.arc(point.x, point.y, 6 * scale, 0, 2 * Math.PI);
                            ctx.fillStyle = customLayer.color;
                            ctx.globalAlpha = customLayer.opacity;
                            ctx.fill();
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 2 * scale;
                            ctx.stroke();
                            ctx.globalAlpha = 1.0;
                        }
                    }
                });
            }
        });
    }
    
function drawInterpolation() {
    if (!interpolationLayer) return;
    
    const interpolationData = interpolationLayer.toGeoJSON();
        const values = interpolationData.features
        .filter(f => f.properties.value !== undefined)
        .map(f => f.properties.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const colorScale = attributeColors[selectedAttribute];
    const gridSize = 1 * scale;
    const points = [];

    interpolationData.features.forEach(feature => {
        if (feature.geometry.type === 'Point' && feature.properties.value !== undefined) {
            const latLng = L.latLng(
                feature.geometry.coordinates[1],
                feature.geometry.coordinates[0]
            );
            const containerPoint = appState.weatherMap.latLngToContainerPoint(latLng);
            
            if (isPointInBoundaryArea(containerPoint)) {
                const point = latLngToPixel(latLng);
                const ratio = Math.min(1, Math.max(0, (feature.properties.value - minVal) / (maxVal - minVal)));
                
                points.push({
                    x: point.x,
                    y: point.y,
                    value: ratio,
                    originalValue: feature.properties.value
                });
            }
        }
    });
    
    if (points.length === 0) return;

    const influenceRadius = 20 * scale;
    
    for (let x = 0; x < finalWidth; x += gridSize) {
        for (let y = 0; y < finalHeight; y += gridSize) {
            let totalInfluence = 0;
            let weightedValue = 0;

            points.forEach(point => {
                const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
                
                if (distance < influenceRadius) {
                    const influence = 1 - (distance / influenceRadius);
                    weightedValue += point.value * influence;
                    totalInfluence += influence;
                }
            });
            
            if (totalInfluence > 0) {
                const interpolatedValue = weightedValue / totalInfluence;
                const colorIdx = Math.floor(interpolatedValue * (colorScale.length - 1));
                const color = colorScale[colorIdx];
                
                ctx.fillStyle = color;
                ctx.globalAlpha = .9;
                ctx.fillRect(x, y, gridSize, gridSize);
            }
        }
    }
    
    ctx.globalAlpha = 1.0;
    
    points.forEach(point => {
        const colorIdx = Math.floor(point.value * (colorScale.length - 1));
        const color = colorScale[colorIdx];
        
        ctx.beginPath();
        ctx.arc(point.x, point.y, 0 * scale, 0, 0 * Math.PI);
        ctx.fillStyle = color;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1 * scale;
        ctx.fill();
        ctx.stroke();
    });
}
    

    function drawWeatherMarkers() {
        if (!appState.allPointsVisible || !appState.mapLocationsData) return;
        
        Object.entries(appState.locations).forEach(([id, location]) => {
            const locationData = appState.mapLocationsData[id];
            if (locationData) {
                const latLng = L.latLng(location.lat, location.lon);
                const containerPoint = appState.weatherMap.latLngToContainerPoint(latLng);
                
                if (isPointInBoundaryArea(containerPoint)) {
                    const point = latLngToPixel(latLng);
                    
                    const allValues = Object.values(appState.mapLocationsData).map(data => {
                        const d = data[selectedDayIndex];
                        return parseFloat(d[selectedAttribute]) || 0;
                    });
                    const minVal = Math.min(...allValues);
                    const maxVal = Math.max(...allValues);
                    const value = parseFloat(locationData[selectedDayIndex][selectedAttribute]) || 0;
                    
                    const colorScale = attributeColors[selectedAttribute];
                    const colorIndex = Math.floor(((value - minVal) / (maxVal - minVal)) * (colorScale.length - 1)) || 0;
                    const color = colorScale[Math.min(colorIndex, colorScale.length - 1)];
                    
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 8 * scale, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 1 * scale;
                    ctx.stroke();
                }
            }
        });
    }
    

    function drawWindArrows() {
        if (!windLayerVisible || !appState.mapLocationsData) return;
        
        Object.entries(appState.locations).forEach(([id, location]) => {
            const data = appState.mapLocationsData[id];
            if (!data) return;
            
            const dayData = data[selectedDayIndex];
            if (!dayData) return;
            
            const latLng = L.latLng(location.lat, location.lon);
            const containerPoint = appState.weatherMap.latLngToContainerPoint(latLng);
            
            if (isPointInBoundaryArea(containerPoint)) {
                const point = latLngToPixel(latLng);
                const windDirection = (dayData.windDirection + 180) % 360;
                
                ctx.save();
                ctx.translate(point.x, point.y);
                ctx.rotate(windDirection * Math.PI / 180);
                
                ctx.beginPath();
                ctx.moveTo(0, -15 * scale);
                ctx.lineTo(-8 * scale, 0);
                ctx.lineTo(8 * scale, 0);
                ctx.closePath();
                ctx.fillStyle = '#000000ff';
                ctx.fill();
                
                ctx.restore();
            }
        });
    }
    

function addTextOverlay() {
    const baseFontSize = 24 * scale;
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = `bold ${baseFontSize * 0.9}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`Mapa de ${variableName}`, finalWidth / 2, 25 * scale);
    ctx.font = `${baseFontSize * 0.6}px Arial`;
    ctx.fillText(`Fecha: ${selectedDate}`, finalWidth / 2, 40 * scale);
    ctx.font = `${baseFontSize * 0.4}px Arial`;
    ctx.textAlign = 'right';
    ctx.fillText(`Generado: ${new Date().toLocaleString('es-ES')}`, finalWidth - (20 * scale), (finalHeight / 2) + (310 * scale));
    ctx.textAlign = 'center';  
    ctx.font = `${baseFontSize * 0.5}px Arial`;
    ctx.fillText('SIMCLAV + CSAA®2025 - Sistema Integrado de Meteorología y Cartografía Semi-Automatizada Avanzada', finalWidth / 2, finalHeight - 28 * scale);
}
    
    function addLegend() {
        const legendWidth = 170 * scale;
        const legendHeight = 90 * scale;
        const legendX = finalWidth - legendWidth - (40 * scale);
        const legendY = 340 * scale;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
        ctx.strokeStyle = '#ccc';
        ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
        
        ctx.fillStyle = '#2c3e50';
        ctx.font = `bold ${12 * scale}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(variableName, legendX + (3 * scale), legendY + (35 * scale));
        
        const gradient = ctx.createLinearGradient(
            legendX + (10 * scale), 
            legendY + (40 * scale), 
            legendX + legendWidth - (10 * scale), 
            legendY + (40 * scale)
        );
        const colorScale = attributeColors[selectedAttribute];
        colorScale.forEach((color, index) => {
            gradient.addColorStop(index / (colorScale.length - 1), color);
        });
        
        ctx.fillStyle = gradient;
        ctx.fillRect(
            legendX + (10 * scale), 
            legendY + (40 * scale), 
            legendWidth - (20 * scale), 
            20 * scale
        );
        
        ctx.fillStyle = '#666';
        ctx.font = `${10 * scale}px Arial`;
        
        let minVal = 0, maxVal = 0;
        if (appState.mapLocationsData) {
            const allValues = Object.values(appState.mapLocationsData).map(data => {
                const d = data[selectedDayIndex];
                return parseFloat(d[selectedAttribute]) || 0;
            });
            minVal = Math.min(...allValues);
            maxVal = Math.max(...allValues);
        }
        
        ctx.fillText(minVal.toFixed(1), legendX + (10 * scale), legendY + (75 * scale));
        ctx.fillText(maxVal.toFixed(1), legendX + legendWidth - (30 * scale), legendY + (75 * scale));
    }
    
    try {
        drawCustomLayers();
        drawInterpolation();
        drawWeatherMarkers();
        drawWindArrows();
        drawBoundary();
        addTextOverlay();
        addLegend();
        
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = fileName;
        link.click();
        
        document.body.removeChild(loadingOverlay);
        appState.weatherMap.setView(originalCenter, originalZoom);
        
    } catch (error) {
        console.error('Error drawing map:', error);
        alert('Error al generar el mapa: ' + error.message);
        document.body.removeChild(loadingOverlay);
        appState.weatherMap.setView(originalCenter, originalZoom);
    }
}

function updateCurrentWeatherCard() {
    if (!appState.currentData || !appState.currentLocation) return;
    
    const location = appState.locations[appState.currentLocation];
    const todayData = appState.currentData[0]; 
    
    const card = document.getElementById('currentWeatherCard');
    

    let weatherIcon = 'wi-day-sunny';
    if (todayData.P_Lluvia > 50) {
        weatherIcon = 'wi-rain';
    } else if (todayData.P_Lluvia > 20) {
        weatherIcon = 'wi-day-rain';
    } else if (todayData.VientoMax > 20) {
        weatherIcon = 'wi-strong-wind';
    } else if (todayData.TMax > 30) {
        weatherIcon = 'wi-hot';
    } else if (todayData.TMin < 5) {
        weatherIcon = 'wi-snowflake-cold';
    }
    
    card.innerHTML = `
        <div class="weather-current">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="mb-0">${location.name}</h4>
                <i class="wi ${weatherIcon}" style="font-size: 2.5rem; color: var(--primary);"></i>
            </div>
            <div class="text-center mb-3">
                <div class="display-6 fw-bold text-primary">${todayData.TMax}°C</div>
                <div class="text-muted small">Máxima / ${todayData.TMin}°C Mínima</div>
            </div>
            <table class="table table-sm table-borderless">
                <tr>
                    <td><i class="wi wi-raindrop me-2"></i>Lluvia</td>
                    <td class="text-end">${todayData.P_Lluvia}% (${todayData.mm}mm)</td>
                </tr>
                <tr>
                    <td><i class="wi wi-strong-wind me-2"></i>Viento</td>
                    <td class="text-end">${todayData.VientoMax} km/h</td>
                </tr>
                <tr>
                    <td><i class="wi wi-wind-direction me-2"></i>Dirección</td>
                    <td class="text-end">${todayData.DireccionViento}</td>
                </tr>
                <tr>
                    <td><i class="wi wi-windy me-2"></i>Ráfagas</td>
                    <td class="text-end">${todayData.Rafagas} km/h</td>
                </tr>

            </table>
            <div class="text-muted small mt-2 text-center">
                <i class="fas fa-sync-alt me-1"></i>
                Actualizado: ${new Date().toLocaleTimeString('es-ES')}
            </div>
        </div>
    `;
}

function updateTable() {
    const tableBody = document.querySelector("#weatherTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = ""; 

    if (!appState.currentData) {
        tableBody.innerHTML = '<tr><td colspan="15" class="text-center">No hay datos para mostrar.</td></tr>'; // Colspan 15
        return;
    }

    appState.currentData.forEach((dayData, index) => {
        const row = document.createElement("tr");
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${dayData.Fecha}</td>
            <td>${dayData.TMax.toFixed(1)}</td>
            <td>${dayData.TMin.toFixed(1)}</td>
            <td>${dayData.P_Lluvia}</td>
            <td>${dayData.mm.toFixed(1)}</td>
            <td>${dayData.VientoMax.toFixed(1)}</td>
            <td>${dayData.Rafagas.toFixed(1)}</td>
            <td>${dayData.DireccionViento}</td>
            <td>${dayData.Radiacion.toFixed(2)}</td>
            <td>${dayData.ghi_avg.toFixed(2)}</td>
            <td>${dayData.ghi_max.toFixed(2)}</td>
            <td>${dayData.dhi_avg.toFixed(2)}</td>
            <td>${dayData.dhi_max.toFixed(2)}</td>
            <td>${dayData.dni_avg.toFixed(2)}</td>
            <td>${dayData.dni_max.toFixed(2)}</td>
            <td>${dayData.DuracionDia.toFixed(2)}</td>
            <td>${dayData.IndiceUV.toFixed(1)}</td>
        `;
        tableBody.appendChild(row);
    });
}
function displayCurrentWeather(data) {
    const current = data.current;
    const card = document.getElementById('currentWeatherCard');
    
    card.innerHTML = `
        <div class="weather-current">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="mb-0">${current.temperature_2m}°C</h4>
                <i class="wi ${getWeatherIcon(current)}" style="font-size: 2.5rem;"></i>
            </div>
            <table class="table table-sm">
                <tr>
                    <td><i class="wi wi-raindrop"></i> Precipitación</td>
                    <td class="text-end">${current.precipitation} mm</td>
                </tr>
                <tr>
                    <td><i class="wi wi-strong-wind"></i> Viento</td>
                    <td class="text-end">${current.wind_speed_10m} km/h</td>
                </tr>
                <tr>
                    <td><i class="wi wi-wind-direction"></i> Dirección</td>
                    <td class="text-end">${convertWindDirection(current.wind_direction_10m)}</td>
                </tr>
                <tr>
                    <td><i class="wi wi-windy"></i> Ráfagas</td>
                    <td class="text-end">${current.wind_gusts_10m} km/h</td>
                </tr>
            </table>
            <div class="text-muted small mt-2">
                Actualizado: ${new Date().toLocaleTimeString('es-ES')}
            </div>
        </div>
    `;
}

function getWeatherIcon(currentData) {
    if (currentData.precipitation > 0) return 'wi-rain';
    if (currentData.wind_speed_10m > 20) return 'wi-strong-wind';
    return 'wi-day-sunny';
}

function convertWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return directions[Math.round(degrees / 22.5) % 16] || 'N/A';
}

function convertToCsv(data, locationName) {
    const headers = "ID,Fecha,T. Max (C),T. Min (C),Lluvia (%),Precip. (mm),Viento (km/h),Rafagas (km/h),Direccion,Radiacion (kWh/m2),Duracion Dia (h),Indice UV";
    let csv = `Ubicacion,${locationName}\r\n`;
    csv += headers + "\r\n";
    
    data.forEach((row, index) => {
        csv += [
            index + 1,
            row.Fecha,
            row.TMax.toFixed(1),
            row.TMin.toFixed(1),
            row.P_Lluvia,
            row.mm.toFixed(1),
            row.VientoMax.toFixed(1),
            row.Rafagas.toFixed(1),
            row.DireccionViento,
            row.Radiacion.toFixed(2),
            row.DuracionDia.toFixed(2),
            row.IndiceUV.toFixed(1),
            row.ghi_avg.toFixed(2),
            row.dhi_avg.toFixed(2),
            row.dni_avg.toFixed(2)
        ].join(',') + '\r\n';
    });
    
    return csv;
}

async function updateGraph() {
    const locationSelect = document.getElementById('graphLocationSelect');
    const locationId = locationSelect.value;
    if (!locationId) return;
    if (appState.currentLocation !== locationId) {
        await loadTableData(locationId);
    }
    const locationName = locationSelect.options[locationSelect.selectedIndex].text;
    const attributes = [];
    if (document.getElementById('attr1').checked) attributes.push('TMax');
    if (document.getElementById('attr2').checked) attributes.push('TMin');
    if (document.getElementById('attr3').checked) attributes.push('P_Lluvia');
    if (document.getElementById('attr4').checked) attributes.push('mm');
    if (document.getElementById('attr5').checked) attributes.push('VientoMax');
    if (document.getElementById('attr6').checked) attributes.push('Rafagas');
    if (document.getElementById('attr7').checked) attributes.push('Radiacion');
    if (document.getElementById('attr8').checked) attributes.push('ghi_avg');
    if (document.getElementById('attr9').checked) attributes.push('ghi_max');
    if (document.getElementById('attr10').checked) attributes.push('dhi_avg');
    if (document.getElementById('attr11').checked) attributes.push('dhi_max');
    if (document.getElementById('attr12').checked) attributes.push('dni_avg');
    if (document.getElementById('attr13').checked) attributes.push('dni_max');
    if (document.getElementById('attr14').checked) attributes.push('DuracionDia');
    if (document.getElementById('attr15').checked) attributes.push('IndiceUV');
    if (attributes.length === 0) {
        alert('Seleccione al menos un atributo');
        return;
    }
    createWeatherChart(attributes, locationName);
    document.getElementById('graphTitle').textContent = `Gráfica - ${locationName}`;
}

function createWeatherChart(attributes, locationName) {
    const data = appState.currentData;
    const traces = [];
    
    const colorMap = {
        'TMax': '#ff0000ff',
        'TMin': '#0004ffff',
        'P_Lluvia': '#eba328ff',
        'mm': '#00fddbff',
        'VientoMax': '#bf59d1ff',
        'Rafagas': '#670fffff',
        'Radiacion': '#000000ff',
        'ghi_avg': '#cdba4eff',
        'ghi_max': '#d1a045ff',
        'dhi_avg': '#08e400ff',
        'dhi_max': '#fe57b8ff',
        'dni_avg': '#ff9ff3ff',
        'dni_max': '#54a0ffff',
        'DuracionDia': '#5f27cdff',
        'IndiceUV': '#00d2d3ff'
    };
    
    const nameMap = {
        'TMax': 'Temp. Máx (°C)',
        'TMin': 'Temp. Mín (°C)',
        'P_Lluvia': 'Lluvia (%)',
        'mm': 'Precip. (mm)',
        'VientoMax': 'Viento (km/h)',
        'Rafagas': 'Ráfagas (km/h)',
        'Radiacion': 'Radiación (kWh/m²)',
        'ghi_avg': 'GHI (W/m²)',
        'ghi_max': 'GHI (W/m²)_Max',
        'dhi_avg': 'Radiación Solar Directa (W/m²)',
        'dhi_max': 'Radiación Solar Directa (W/m²)_Max',
        'dni_avg': 'DNI (W/m²)',
        'dni_max': 'DNI (W/m²)_Max',
        'DuracionDia': 'Duración Luz Día (h)',
        'IndiceUV': 'Índice UV'
    };
        attributes.forEach(attr => {
                traces.push({
                    x: data.map(d => d.Fecha),
                    y: data.map(d => parseFloat(d[attr])),
                    name: nameMap[attr],
                    type: 'lines+markers',
                    line: { color: colorMap[attr], width: 3 },
                    marker: { size: 8 }
                });
            });
            
            const layout = {
                title: `Pronóstico 14 Días - ${locationName}`,
                xaxis: { 
                    title: 'Fecha',
                    tickangle: -45,
                    type: 'category'
                },
                yaxis: { title: 'Valores' },
                legend: { 
                    orientation: 'h',
                    y: -0.3
                },
                margin: { t: 50, b: 100, l: 50, r: 50 },
                hovermode: 'x unified'
            };
            
            Plotly.newPlot('weatherChart', traces, layout);
        }

async function updateStats() {
    const locationId = document.getElementById('statsLocationSelect').value;
    if (!locationId) return;

    if (appState.currentLocation !== locationId) {
        await loadTableData(locationId);
    }

    const location = appState.locations[locationId];
    if (!location || !appState.currentData) return;

    const data = appState.currentData;
    const statsDiv = document.getElementById('statsContent');
    const attributes = ['TMax', 'TMin', 'P_Lluvia', 'mm', 'VientoMax', 'Rafagas', 
                       'Radiacion', 'ghi_avg', 'ghi_max', 'dhi_avg', 'dhi_max', 
                       'dni_avg', 'dni_max', 'DuracionDia', 'IndiceUV'];
    
    const nameMap = {
        'TMax': 'Temperatura Máxima (°C)',
        'TMin': 'Temperatura Mínima (°C)',
        'P_Lluvia': 'Probabilidad de Lluvia (%)',
        'mm': 'Precipitación (mm)',
        'VientoMax': 'Velocidad del Viento (km/h)',
        'Rafagas': 'Ráfagas Máximas (km/h)',
        'Radiacion': 'Suma de Radiación de Onda Corta (kWh/m²)',
        'ghi_avg': 'GHI (W/m²)',
        'ghi_max': 'GHI (W/m²)_Max',
        'dhi_avg': 'Radiación Solar Directa (W/m²)',
        'dhi_max': 'Radiación Solar Directa (W/m²)_Max',
        'dni_avg': 'DNI (W/m²)',
        'dni_max': 'DNI (W/m²)_Max',
        'DuracionDia': 'Duración de la luz del Día (h)',
        'IndiceUV': 'Índice UV'
    };
    
    let statsHTML = `
        <h4 class="mb-4">Estadísticas - ${location.name}</h4>
        <div class="row">
    `;
    
    attributes.forEach(attr => {
        const values = data.map(d => parseFloat(d[attr])).filter(v => !isNaN(v));
        if (values.length === 0) return;
        
        const min = Math.min(...values).toFixed(1);
        const max = Math.max(...values).toFixed(1);
        const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
        
        statsHTML += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-header bg-light">
                        <h5 class="card-title mb-0">${nameMap[attr]}</h5>
                    </div>
                    <div class="card-body">
                        <table class="table table-sm mb-0">
                            <tr><td>Mínimo</td><td class="text-end">${min}</td></tr>
                            <tr><td>Máximo</td><td class="text-end">${max}</td></tr>
                            <tr><td>Promedio</td><td class="text-end">${avg}</td></tr>
                        </table>
                    </div>
                </div>
            </div>
        `;
    });
    
    statsHTML += `</div>`;
    statsDiv.innerHTML = statsHTML;
    document.getElementById('statsTitle').textContent = `Resumen Estadístico - ${location.name}`;
}

function initMap() {
    if (appState.weatherMap) {
        appState.weatherMap.invalidateSize();
        updateMapMarkers();
        return;
    }

    appState.weatherMap = L.map('weatherMap', {
        zoomControl: true,
        wheelPxPerZoomLevel: 160, 
        zoomSnap: 0.25,   
        zoomDelta: 0.5,
    }).setView([20.6345, -101.0528], 8);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(appState.weatherMap);

    setupMapDaySelector();
    updateMapMarkers();

    document.getElementById('mapDaySelect').addEventListener('change', updateMapMarkers);
    document.getElementById('mapAttributeSelect').addEventListener('change', updateMapMarkers);
}

function setupMapDaySelector() {
    const select = document.getElementById('mapDaySelect');
    select.innerHTML = '';
    
    if (!appState.currentData) return;
    
    appState.currentData.forEach((day, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = day.Fecha;
        select.appendChild(option);
    });
}

async function updateMapMarkers() {
    const selectedDayIndex = document.getElementById('mapDaySelect').value || 0;
    const selectedAttribute = document.getElementById('mapAttributeSelect').value;

    weatherMarkers.forEach(marker => appState.weatherMap.removeLayer(marker));
    weatherMarkers = [];
    
    const loadingControl = L.control({position: 'bottomright'});
    loadingControl.onAdd = function() {
        this._div = L.DomUtil.create('div', 'map-loading');
        this._div.innerHTML = '<div class="spinner-border text-primary"></div> Cargando datos...';
        return this._div;
    };
    loadingControl.addTo(appState.weatherMap);
    
    try {
        const locationsData = {};
        for (const [id, location] of Object.entries(appState.locations)) {
            const weatherData = await fetchWeatherData(location.lat, location.lon);
            locationsData[id] = processWeatherData(weatherData);
        }

        appState.mapLocationsData = locationsData;

        const allValues = Object.values(locationsData).map(data => {
            const dayData = data[selectedDayIndex];
            return parseFloat(dayData[selectedAttribute]) || 0;
        });
        
        const minVal = Math.min(...allValues);
        const maxVal = Math.max(...allValues);

        if (appState.allPointsVisible) {
            for (const [id, location] of Object.entries(appState.locations)) {
                const locationData = locationsData[id];
                const dayData = locationData[selectedDayIndex];
                const value = parseFloat(dayData[selectedAttribute]) || 0;
                
                const colorScale = attributeColors[selectedAttribute];
                const colorIndex = Math.floor(((value - minVal) / (maxVal - minVal)) * (colorScale.length - 1)) || 0;
                const color = colorScale[Math.min(colorIndex, colorScale.length - 1)];
                
                const marker = L.marker([location.lat, location.lon], {
                    icon: getColoredMarkerIcon(color)
                }).addTo(appState.weatherMap);

                marker.bindPopup(`
                    <b>${location.name}</b><br>
                    <small>${appState.currentData[selectedDayIndex].Fecha}</small>
                    <table class="table table-sm mt-2">
                        <tr><td><i class="wi wi-thermometer"></i> Temp Máx:</td><td>${dayData.TMax}°C</td></tr>
                        <tr><td><i class="wi wi-thermometer-exterior"></i> Temp Mín:</td><td>${dayData.TMin}°C</td></tr>
                        <tr><td><i class="wi wi-rain"></i> Lluvia:</td><td>${dayData.P_Lluvia}% (${dayData.mm}mm)</td></tr>
                        <tr><td><i class="wi wi-windy"></i> Viento:</td><td>${dayData.VientoMax} km/h</td></tr>
                        <tr><td><i class="wi wi-strong-wind"></i> Ráfagas:</td><td>${dayData.Rafagas} km/h</td></tr>
                        <tr><td><i class="wi wi-wind-direction"></i> Dirección:</td><td>${dayData.DireccionViento}</td></tr>
                    </table>
                `);
                
                weatherMarkers.push(marker);
            }
            
            updateMapLegend(selectedAttribute, minVal, maxVal, 'points');
        } else {
            document.getElementById('pointsLegendContent').innerHTML = '<div class="text-muted small">Puntos ocultos</div>';
        }

        if (interpolationLayer) {
            const interpolationValues = [];
            interpolationLayer.eachLayer(layer => {
                if (layer.feature && layer.feature.properties.value !== undefined) {
                    interpolationValues.push(layer.feature.properties.value);
                }
            });
            
            if (interpolationValues.length > 0) {
                const interpMinVal = Math.min(...interpolationValues);
                const interpMaxVal = Math.max(...interpolationValues);
                updateMapLegend(selectedAttribute, interpMinVal, interpMaxVal, 'interpolation');
            }
        }
        
    } catch (error) {
        console.error("Error updating map markers:", error);
        L.popup()
            .setLatLng(appState.weatherMap.getCenter())
            .setContent('<div class="alert alert-danger">Error al cargar datos del mapa</div>')
            .openOn(appState.weatherMap);
    } finally {
        appState.weatherMap.removeControl(loadingControl);
    }

    if (windLayerVisible && appState.allPointsVisible) {
        createWindLayer();
    }
}

function processWeatherData(weatherData) {
    return weatherData.daily.time.map((date, i) => {
        const localDate = new Date(date);
        
        return {
            Fecha: localDate.toLocaleDateString('es-ES', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short'
            }),
            TMax: weatherData.daily.temperature_2m_max[i]?.toFixed(1) || 'N/A',
            TMin: weatherData.daily.temperature_2m_min[i]?.toFixed(1) || 'N/A',
            P_Lluvia: weatherData.daily.precipitation_probability_max[i] || '0',
            mm: weatherData.daily.precipitation_sum[i]?.toFixed(1) || '0',
            VientoMax: weatherData.daily.wind_speed_10m_max[i]?.toFixed(1) || '0',
            Rafagas: weatherData.daily.wind_gusts_10m_max[i]?.toFixed(1) || '0',
            DireccionViento: convertWindDirection(weatherData.daily.wind_direction_10m_dominant[i]),
            Radiacion: weatherData.daily.shortwave_radiation_sum[i]?.toFixed(1) || 'N/A',
            DuracionDia: (weatherData.daily.daylight_duration[i] / 3600).toFixed(1) || 'N/A',
            IndiceUV: weatherData.daily.uv_index_max[i]?.toFixed(1) || 'N/A'
        };
    });
}

function updateMapLegend(attribute, minVal, maxVal, legendType = 'points') {
    const legendId = legendType === 'points' ? 'pointsLegendContent' : 'interpolationLegendContent';
    const containerId = legendType === 'points' ? 'pointsLegend' : 'interpolationLegend';
    const legend = document.getElementById(legendId);
    const colorScale = attributeColors[attribute];
    
    const attributeNames = {
        TMax: 'Temperatura Máxima (°C)',
        TMin: 'Temperatura Mínima (°C)',
        P_Lluvia: 'Probabilidad de Lluvia (%)',
        mm: 'Precipitación (mm)',
        VientoMax: 'Viento Máximo (km/h)',
        Rafagas: 'Ráfagas Máximas (km/h)'
    };
    
    legend.innerHTML = `
        <div class="small mb-1">${attributeNames[attribute]}</div>
        <div class="legend-gradient" style="background: linear-gradient(to right, ${colorScale.join(',')})"></div>
        <div class="legend-values">
            <span>${minVal.toFixed(1)}</span>
            <span>${maxVal.toFixed(1)}</span>
        </div>
    `;
    
    if (legendType === 'interpolation') {
        document.getElementById(containerId).classList.remove('d-none');
    }
}

function getColoredMarkerIcon(color) {
    return L.divIcon({
        html: `<svg viewBox="0 0 32 32" width="25" height="25" xmlns="http://www.w3.org/2000/svg">
                  <path fill="${color}" d="M16 0a11 11 0 0 0-11 11c0 9 11 21 11 21s11-12 11-21a11 11 0 0 0-11-11z"/>
                  <circle fill="white" cx="16" cy="11" r="5"/>
              </svg>`,
        className: 'leaflet-custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 24]
    });
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    
    document.getElementById('currentDateTime').textContent = 
        now.toLocaleDateString('es-ES', options);

    setTimeout(updateDateTime, 1000);
}
document.addEventListener('DOMContentLoaded', function() {
    updateDateTime(); 
});

function updateLocationDropdowns() {
    const dropdowns = ['locationSelect', 'graphLocationSelect', 'statsLocationSelect', 'reportLocation'];
    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '';
        Object.entries(appState.locations).forEach(([locId, loc]) => {
            const option = document.createElement('option');
            option.value = locId;
            option.textContent = loc.name;
            select.appendChild(option);
        });
    });


    const comparisonSelect = document.getElementById('comparisonLocations');
    if (comparisonSelect) {
        comparisonSelect.innerHTML = '';
        Object.entries(appState.locations).forEach(([locId, loc]) => {
            const option = document.createElement('option');
            option.value = locId;
            option.textContent = loc.name;
            comparisonSelect.appendChild(option);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const compareBtn = document.getElementById('compareBtn');
    if (compareBtn) {
        compareBtn.addEventListener('click', async () => {
            const select = document.getElementById('comparisonLocations');
            const selected = Array.from(select.selectedOptions).map(opt => opt.value);
            const attrs = [];
            if (document.getElementById('compAttr1').checked) attrs.push('TMax');
            if (document.getElementById('compAttr2').checked) attrs.push('TMin');
            if (document.getElementById('compAttr3').checked) attrs.push('P_Lluvia');
            if (document.getElementById('compAttr4').checked) attrs.push('mm');
            if (document.getElementById('compAttr5').checked) attrs.push('VientoMax');
            if (document.getElementById('compAttr6').checked) attrs.push('Rafagas');
            if (document.getElementById('compAttr7').checked) attrs.push('Radiacion');
            if (document.getElementById('compAttr8').checked) attrs.push('ghi_avg');
            if (document.getElementById('compAttr9').checked) attrs.push('ghi_max');
            if (document.getElementById('compAttr10').checked) attrs.push('dhi_avg');
            if (document.getElementById('compAttr11').checked) attrs.push('dhi_max');
            if (document.getElementById('compAttr12').checked) attrs.push('dni_avg');
            if (document.getElementById('compAttr13').checked) attrs.push('dni_max');
            if (document.getElementById('compAttr14').checked) attrs.push('DuracionDia');
            if (document.getElementById('compAttr15').checked) attrs.push('IndiceUV');
            
            if (selected.length < 2 || attrs.length === 0) {
                document.getElementById('comparisonContent').innerHTML = '<div class="alert alert-warning">Seleccione al menos dos ubicaciones y un atributo.</div>';
                return;
            }
            
            let allData = {};
            for (const locId of selected) {
                await loadTableData(locId);
                allData[locId] = { name: appState.locations[locId].name, data: appState.currentData };
            }
            
            let html = '<div class="table-responsive"><table class="table table-bordered"><thead><tr><th>Fecha</th>';
            selected.forEach(locId => {
                attrs.forEach(attr => html += `<th>${allData[locId].name} - ${getAttributeDisplayName(attr)}</th>`);
            });
            html += '</tr></thead><tbody>';
            
            const dates = allData[selected[0]].data.map(d => d.Fecha);
            dates.forEach((date, i) => {
                html += `<tr><td>${date}</td>`;
                selected.forEach(locId => {
                    attrs.forEach(attr => {
                        const d = allData[locId].data[i];
                        html += `<td>${d[attr]}</td>`;
                    });
                });
                html += '</tr>';
            });
            html += '</tbody></table></div>';
            document.getElementById('comparisonContent').innerHTML = html;
        });
    }

    function getAttributeDisplayName(attr) {
        const nameMap = {
            'TMax': 'Temp. Máx (°C)',
            'TMin': 'Temp. Mín (°C)',
            'P_Lluvia': 'Lluvia (%)',
            'mm': 'Precip. (mm)',
            'VientoMax': 'Viento (km/h)',
            'Rafagas': 'Ráfagas (km/h)',
            'Radiacion': 'Radiación (kWh/m²)',
            'ghi_avg': 'GHI (W/m²)',
            'ghi_max': 'GHI (W/m²)_Max',
            'dhi_avg': 'Rad. Solar Directa (W/m²)',
            'dhi_max': 'Rad. Solar Directa (W/m²)_Max',
            'dni_avg': 'DNI (W/m²)',
            'dni_max': 'DNI (W/m²)_Max',
            'DuracionDia': 'Duración Día (h)',
            'IndiceUV': 'Índice UV'
        };
        return nameMap[attr] || attr;
    }

 const compareGraphBtn = document.getElementById('compareGraphBtn');
    if (compareGraphBtn) {
        compareGraphBtn.addEventListener('click', async () => {
            const select = document.getElementById('comparisonLocations');
            const selected = Array.from(select.selectedOptions).map(opt => opt.value);
            const attr = document.getElementById('comparisonGraphAttr').value;
            if (selected.length < 2 || !attr) {
                document.getElementById('comparisonChart').innerHTML = '<div class="alert alert-warning">Seleccione al menos dos ubicaciones y un atributo para la gráfica.</div>';
                return;
            }
            
            let allData = {};
            for (const locId of selected) {
                await loadTableData(locId);
                allData[locId] = { name: appState.locations[locId].name, data: appState.currentData };
            }
            
            const traces = selected.map(locId => ({
                x: allData[locId].data.map(d => d.Fecha),
                y: allData[locId].data.map(d => parseFloat(d[attr])),
                name: allData[locId].name,
                type: 'lines+markers'
            }));
            
            const nameMap = {
                'TMax': 'Temperatura Máxima (°C)',
                'TMin': 'Temperatura Mínima (°C)',
                'P_Lluvia': 'Probabilidad de Lluvia (%)',
                'mm': 'Precipitación (mm)',
                'VientoMax': 'Viento (km/h)',
                'Rafagas': 'Ráfagas (km/h)',
                'Radiacion': 'Suma de Radiación de Onda Corta (kWh/m²)',
                'ghi_avg': 'GHI (W/m²)',
                'ghi_max': 'GHI (W/m²)_Max',
                'dhi_avg': 'Radiación Solar Directa (W/m²)',
                'dhi_max': 'Radiación Solar Directa (W/m²)_Max',
                'dni_avg': 'DNI (W/m²)',
                'dni_max': 'DNI (W/m²)_Max',
                'DuracionDia': 'Duración de la luz del Día (h)',
                'IndiceUV': 'Índice UV'
            };
            
            const layout = {
                title: `Comparativa de ${nameMap[attr]}`,
                xaxis: { title: 'Fecha', tickangle: -45, type: 'category' },
                yaxis: { title: nameMap[attr] },
                legend: { orientation: 'h', y: -0.3 },
                margin: { t: 50, b: 100, l: 50, r: 50 },
                hovermode: 'x unified'
            };
            
            Plotly.newPlot('comparisonChart', traces, layout);
        });
    }
});

    const compareGraphBtn = document.getElementById('compareGraphBtn');
    if (compareGraphBtn) {
        compareGraphBtn.addEventListener('click', async () => {
            const select = document.getElementById('comparisonLocations');
            const selected = Array.from(select.selectedOptions).map(opt => opt.value);
            const attr = document.getElementById('comparisonGraphAttr').value;
            if (selected.length < 2 || !attr) {
                document.getElementById('comparisonChart').innerHTML = '<div class="alert alert-warning">Seleccione al menos dos ubicaciones y un atributo para la gráfica.</div>';
                return;
            }
            let allData = {};
            for (const locId of selected) {
                await loadTableData(locId);
                allData[locId] = { name: appState.locations[locId].name, data: appState.currentData };
            }
            const traces = selected.map(locId => ({
                x: allData[locId].data.map(d => d.Fecha),
                y: allData[locId].data.map(d => parseFloat(d[attr])),
                name: allData[locId].name,
                type: 'lines+markers'
            }));
            const nameMap = {
                'TMax': 'Temperatura Máxima (°C)',
                'TMin': 'Temperatura Mínima (°C)',
                'P_Lluvia': 'Probabilidad de Lluvia (%)',
                'mm': 'Precipitación (mm)',
                'VientoMax': 'Viento (km/h)',
                'Rafagas': 'Ráfagas (km/h)'
            };
            const layout = {
                title: `Comparativa de ${nameMap[attr]}`,
                xaxis: { title: 'Fecha', tickangle: -45, type: 'category' },
                yaxis: { title: nameMap[attr] },
                legend: { orientation: 'h', y: -0.3 },
                margin: { t: 50, b: 100, l: 50, r: 50 },
                hovermode: 'x unified'
            };
            Plotly.newPlot('comparisonChart', traces, layout);
        });
    };


if (document.readyState === 'complete') {
    initApp();
} else {
    document.addEventListener('DOMContentLoaded', initApp);
}