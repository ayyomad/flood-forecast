// Main initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Setup mobile menu
  setupMobileMenu();
  
  // Initialize sections
  initializeNavigation();
  
  // Initialize search functionality
  initializeSearchForms();
  
  // Initialize maps
  initializeMainMap();
  initializeFloodMap();
  
  // Initialize charts (empty initially)
  initializeCharts();
  
  // Add event listeners for map controls
  initializeMapControls();
  
  // Initialize authentication UI
  initializeAuth();
});

// Setup mobile menu functionality
function setupMobileMenu() {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const closeMenuButton = document.getElementById('close-mobile-menu');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileMenuButton && mobileMenu) {
    // Toggle mobile menu
    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
      document.body.classList.toggle('overflow-hidden');
    });
    
    // Close mobile menu
    if (closeMenuButton) {
      closeMenuButton.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      });
    }
    
    // Close when clicking outside
    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) {
        mobileMenu.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    });
    
    // Handle mobile navigation
    const mobileNavLinks = document.querySelectorAll('.mobile-nav');
    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      });
    });
  }
}

// Navigation system
function initializeNavigation() {
  // Setup navigation links with transitions
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const sectionId = href.substring(1);
        if (sectionId) {
          navigateToSection(sectionId);
        }
      }
    });
  });
  
  // Check URL hash on page load
  const hash = window.location.hash.substring(1);
  if (hash && document.getElementById(hash)) {
    setTimeout(() => {
      navigateToSection(hash);
    }, 100);
  } else {
    // Default to home section if no hash
    setTimeout(() => {
      navigateToSection('home');
    }, 100);
  }
}

function navigateToSection(sectionId) {
  // Hide all sections
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    section.classList.remove('active');
  });

  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
    
    // Scroll to top with smooth behavior
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Update active nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      // Remove active styles
      link.classList.remove('text-primary', 'font-medium', 'text-primary-600');
      link.classList.add('text-gray-700');
      
      // Add active styles to matching link
      const href = link.getAttribute('href');
      if (href === `#${sectionId}` || link.getAttribute('data-section') === sectionId) {
        link.classList.remove('text-gray-700');
        
        // Support both index.html and community.html color schemes
        if (link.classList.contains('hover:text-primary')) {
          link.classList.add('text-primary', 'font-medium');
        } else if (link.classList.contains('hover:text-primary-600')) {
          link.classList.add('text-primary-600', 'font-medium');
        }
      }
    });
    
    // Update URL hash without scrolling
    history.pushState(null, '', `#${sectionId}`);
    
    // Trigger map resize if navigating to map section to fix rendering issues
    if (sectionId === 'flood-map') {
      setTimeout(() => {
        if (floodMap) {
          floodMap.invalidateSize();
        }
      }, 300);
    }
  }
}

// Search functionality
function initializeSearchForms() {
  const searchForm = document.getElementById('search-form');
  const locationInput = document.getElementById('location');
  const useLocationBtn = document.getElementById('use-location-btn');
  
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
      
      const location = locationInput.value.trim();
      if (!location) return;
      
      // Update button to loading state
      const submitButton = searchForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Loading...';
      
      // Make API call to get forecast
      fetchForecastData(location)
        .then(data => {
          // Update UI with the forecast data
          displayResults(data);
          updateSidebarWidgets(data);
          
          // If on mobile, scroll to results
          if (window.innerWidth < 768) {
            document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
          }
        })
        .catch(error => {
          console.error('Error fetching forecast:', error);
          // Show error message
          const resultsDiv = document.getElementById('results');
          if (resultsDiv) {
            resultsDiv.innerHTML = `
              <div class="text-center py-8">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i class="fas fa-exclamation-triangle text-red-500"></i>
                </div>
                <h3 class="text-xl font-medium text-gray-800 mb-2">Location Not Found</h3>
                <p class="text-gray-600 mb-4">
                  We couldn't find the location you entered. Please try again with a different location.
                </p>
              </div>
            `;
            resultsDiv.classList.remove('hidden');
          }
        })
        .finally(() => {
          // Reset button state
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonText;
        });
    });
  }
  
  // Add geolocation functionality
  if (useLocationBtn) {
    useLocationBtn.addEventListener('click', function() {
      if (navigator.geolocation) {
        // Update button to loading state
        useLocationBtn.disabled = true;
        useLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Success - get coordinates and set input value
            const latitude = position.coords.latitude.toFixed(4);
            const longitude = position.coords.longitude.toFixed(4);
            locationInput.value = `${latitude}, ${longitude}`;
            
            // Reset button state
            useLocationBtn.disabled = false;
            useLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
            
            // Trigger the search
            searchForm.dispatchEvent(new Event('submit'));
          },
          (error) => {
            // Error
            console.error("Geolocation error:", error);
            useLocationBtn.disabled = false;
            useLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
            
            // Show error message
            let errorMessage = "Unable to access your location. ";
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage += "Please enable location services in your browser settings.";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage += "Location information is unavailable.";
                break;
              case error.TIMEOUT:
                errorMessage += "The request to get your location timed out.";
                break;
              default:
                errorMessage += "An unknown error occurred.";
            }
            
            alert(errorMessage);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        // Geolocation not supported
        alert("Geolocation is not supported by your browser.");
      }
    });
  }
  
  // Handle forecast button click
  const forecastBtn = document.getElementById('forecast-btn');
  if (forecastBtn && locationInput) {
    forecastBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      if (locationInput.value.trim()) {
        // First trigger the search to get data
        searchForm.dispatchEvent(new Event('submit'));
        
        // Navigate to flood map section
        setTimeout(() => {
          navigateToSection('flood-map');
        }, 500);
      } else {
        showNotification('Please enter a location first', 'error');
      }
    });
  }

  // Handle map search in flood map section
  const mapSearchBtn = document.getElementById('map-search-btn');
  const mapSearchInput = document.getElementById('map-search-input');
  
  if (mapSearchBtn && mapSearchInput) {
    // Remove any redundant buttons
    const redundantButtons = document.querySelectorAll('#map-search-btn + button');
    redundantButtons.forEach(btn => btn.remove());
    
    mapSearchBtn.addEventListener('click', () => {
      if (mapSearchInput.value.trim()) {
        fetchFloodMapData(mapSearchInput.value.trim());
      } else {
        showNotification('Please enter a location to search', 'error');
      }
    });
    
    mapSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (mapSearchInput.value.trim()) {
          fetchFloodMapData(mapSearchInput.value.trim());
        } else {
          showNotification('Please enter a location to search', 'error');
        }
      }
    });
  }
}

// Display results in the home page results panel
function displayResults(data) {
  const resultsDiv = document.getElementById('results');
  if (!resultsDiv) return;
  
  // Show the results div if hidden
  resultsDiv.classList.remove('hidden');
  
  const current = data.current;
  
  // Determine risk class based on flood probability
  const riskClass = 
    current.flood_probability === 'High' ? 'bg-red-50 text-red-600' : 
    current.flood_probability === 'Medium' ? 'bg-amber-50 text-amber-600' : 
    'bg-green-50 text-green-600';
  
  // Update results panel with location and main metrics
  resultsDiv.innerHTML = `
    <div>
      <h2 class="text-xl font-semibold mb-4 flex items-center">
        <i class="fas fa-map-marker-alt text-primary mr-2"></i>
        ${data.location}
      </h2>
      
      <div class="space-y-3">
        <div class="flex justify-between p-3 bg-blue-50 rounded-lg">
          <span class="text-gray-700 font-medium">Rainfall:</span>
          <span class="text-blue-700">${current.rainfall}</span>
        </div>
        
        <div class="flex justify-between p-3 bg-gray-50 rounded-lg">
          <span class="text-gray-700 font-medium">Wind Speed:</span>
          <span class="text-gray-900">${current.wind_speed}</span>
        </div>
        
        <div class="flex justify-between p-3 bg-gray-50 rounded-lg">
          <span class="text-gray-700 font-medium">Temperature:</span>
          <span class="text-gray-900">${current.temp}°C</span>
        </div>
        
        <div class="flex justify-between p-3 rounded-lg ${riskClass}">
          <span class="text-gray-700 font-medium">Flood Risk:</span>
          <span class="font-medium">${current.flood_probability}</span>
        </div>
      </div>
      
      <div class="mt-4 p-3 bg-blue-50 rounded-lg flex">
        <div class="text-blue-600 mr-3 flex-shrink-0">
          <i class="fas fa-info-circle text-lg"></i>
        </div>
        <div class="text-sm text-gray-600">
          The heatmap shows potential flood risk areas. Areas in red indicate higher risk zones.
        </div>
      </div>
    </div>
  `;
  
  // Update the sidebar widgets
  updateSidebarWidgets(data);
}

// Update the sidebar widgets with flood data
function updateSidebarWidgets(data) {
  const current = data.current;
  
  // Update weather values
  document.getElementById('rainfall-value').textContent = current.rainfall || '0 mm';
  document.getElementById('temp-value').textContent = `${current.temp}°C`;
  document.getElementById('wind-value').textContent = current.wind_speed;
  document.getElementById('humidity-value').textContent = `${current.humidity || '0'}%`;
  
  // Update risk assessment
  const riskCard = document.getElementById('risk-card');
  const riskBadge = document.getElementById('risk-badge');
  const riskMeter = document.getElementById('risk-meter');
  const riskDescription = document.getElementById('risk-description');
  
  // Set risk level styling
  let riskLevel = 0, badgeClass = '', meterColor = '';
  
  if (current.flood_probability === 'High') {
    riskLevel = 90;
    badgeClass = 'bg-red-100 text-red-700';
    meterColor = 'bg-red-500';
    riskDescription.textContent = 'High risk of flooding. Take immediate precautions and stay informed about evacuation orders.';
  } else if (current.flood_probability === 'Medium') {
    riskLevel = 50;
    badgeClass = 'bg-amber-100 text-amber-700';
    meterColor = 'bg-amber-500';
    riskDescription.textContent = 'Medium risk of flooding. Prepare for possible water accumulation and monitor local alerts.';
  } else {
    riskLevel = 20;
    badgeClass = 'bg-green-100 text-green-700';
    meterColor = 'bg-green-500';
    riskDescription.textContent = 'Low risk of flooding. Normal conditions with minimal chance of water-related issues.';
  }
  
  // Apply styling
  riskCard.className = `rounded-xl p-4 ${current.flood_probability === 'High' ? 'bg-red-50/50' : current.flood_probability === 'Medium' ? 'bg-amber-50/50' : 'bg-green-50/50'}`;
  riskBadge.className = `px-2 py-0.5 rounded text-xs font-medium ${badgeClass}`;
  riskBadge.textContent = current.flood_probability;
  riskMeter.className = `h-full rounded-full ${meterColor}`;
  riskMeter.style.width = `${riskLevel}%`;
  
  // Update safety tips based on risk level
  const safetyTips = document.getElementById('safety-tips');
  
  if (current.flood_probability === 'High') {
    safetyTips.innerHTML = `
      <ul class="list-disc pl-4 mt-2 space-y-1">
        <li>Move to higher ground immediately</li>
        <li>Avoid walking through flowing water</li>
        <li>Prepare for possible evacuation</li>
        <li>Charge devices and prepare emergency kit</li>
      </ul>
    `;
  } else if (current.flood_probability === 'Medium') {
    safetyTips.innerHTML = `
      <ul class="list-disc pl-4 mt-2 space-y-1">
        <li>Monitor weather updates regularly</li>
        <li>Prepare emergency supplies</li>
        <li>Check drainage systems around your home</li>
        <li>Have evacuation plan ready</li>
      </ul>
    `;
  } else {
    safetyTips.innerHTML = `
      <ul class="list-disc pl-4 mt-2 space-y-1">
        <li>Stay informed about weather changes</li>
        <li>Be aware of your surroundings</li>
        <li>Know your emergency contacts</li>
      </ul>
    `;
  }
  
  // Setup view details button
  const viewDetailsBtn = document.getElementById('view-details-btn');
  if (viewDetailsBtn) {
    // Remove existing event listeners
    const newBtn = viewDetailsBtn.cloneNode(true);
    viewDetailsBtn.parentNode.replaceChild(newBtn, viewDetailsBtn);
    
    // Add new event listener
    newBtn.addEventListener('click', () => {
      navigateToSection('flood-map');
    });
  }
}

// Map functionality
let mainMap, mainHeatLayer;
let floodMap, floodHeatLayer;

function initializeMainMap() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;
  
  // Create map
  mainMap = L.map('map').setView([20.5937, 78.9629], 5); // Default to India
  
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(mainMap);
  
    // Heatmap layer (empty initially)
  mainHeatLayer = L.heatLayer([], { 
        radius: 25, 
        blur: 15, 
    maxZoom: 17,
    max: 1.0,
    gradient: {
      0.1: '#60a5fa',  // blue-400
      0.3: '#34d399',  // emerald-400
      0.5: '#fcd34d',  // amber-300
      0.7: '#fb923c',  // orange-400
      1.0: '#ef4444'   // red-500
    }
  }).addTo(mainMap);
}

function updateMainMap(data) {
  if (!mainMap || !data || !data.coordinates) return;
  
  // Center the map on the location
  const lat = data.coordinates.lat;
  const lon = data.coordinates.lon;
  mainMap.setView([lat, lon], 10);
  
  // Clear existing markers
  mainMap.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      mainMap.removeLayer(layer);
    }
  });
  
  // Add a marker for the location
  const marker = L.marker([lat, lon])
    .addTo(mainMap)
    .bindPopup(`
      <div class="p-2">
        <h3 class="text-base font-medium">${data.location}</h3>
        <p class="text-sm mt-1">${data.current.description || 'Current conditions'}</p>
        <p class="text-sm">Temperature: ${data.current.temp}°C</p>
        <p class="text-sm">Rainfall: ${data.current.rainfall}</p>
        <p class="text-sm">Flood Risk: 
          <span class="${
            data.current.flood_probability === 'High' ? 'text-red-600 font-medium' : 
            data.current.flood_probability === 'Medium' ? 'text-amber-600 font-medium' : 
            'text-green-600 font-medium'
          }">
            ${data.current.flood_probability}
          </span>
        </p>
      </div>
    `)
    .openPopup();
  
  // Update heat layer if flood data is available
  if (data.flood_data && data.flood_data.points && data.flood_data.points.length > 0) {
    const heatData = data.flood_data.points.map(point => [point[0], point[1], point[2]]);
    mainHeatLayer.setLatLngs(heatData);
  }
}

function initializeFloodMap() {
  const floodMapContainer = document.getElementById('flood-map-view');
  if (!floodMapContainer) return;
  
  // Create map
  floodMap = L.map('flood-map-view').setView([20.5937, 78.9629], 5); // Default to India
  
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(floodMap);
  
  // Heatmap layer
  floodHeatLayer = L.heatLayer([], { 
    radius: 25, 
    blur: 15, 
    maxZoom: 17,
    max: 1.0,
    gradient: {
      0.1: '#60a5fa',  // blue-400
      0.3: '#34d399',  // emerald-400
      0.5: '#fcd34d',  // amber-300
      0.7: '#fb923c',  // orange-400
      1.0: '#ef4444'   // red-500
    }
  }).addTo(floodMap);
  
  // Setup map layer toggle buttons
  const layerButtons = document.querySelectorAll('.map-layer-toggle');
  if (layerButtons) {
    layerButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update button states
        layerButtons.forEach(btn => {
          btn.classList.remove('bg-primary', 'text-white');
          btn.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-50');
        });
        
        button.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-50');
        button.classList.add('bg-primary', 'text-white');
        
        // Change map layer based on button data
        const layerType = button.getAttribute('data-layer');
        changeMapLayer(layerType);
      });
    });
  }
  
  // Check if we have forecast data stored from home page search
  if (window.forecastData) {
    updateFloodMap(window.forecastData);
    updateCurrentConditions(window.forecastData);
    updateForecastPanel(window.forecastData);
    updateDataVisualizations(window.forecastData);
    updateFloodAlert(window.forecastData);
  }
}

function changeMapLayer(layerType) {
  if (!floodMap) return;
  
  // Remove existing tile layer
  floodMap.eachLayer(layer => {
    if (!(layer instanceof L.HeatLayer)) {
      floodMap.removeLayer(layer);
    }
  });
  
  // Add new tile layer based on selected type
  switch(layerType) {
    case 'satellite':
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }).addTo(floodMap);
      break;
    case 'terrain':
      L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
      }).addTo(floodMap);
      break;
    case 'elevation':
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: US National Park Service'
      }).addTo(floodMap);
      break;
    default:
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(floodMap);
  }
}

function fetchFloodMapData(location) {
  const mapLoadingIndicator = document.getElementById('map-loading');
  if (mapLoadingIndicator) {
    mapLoadingIndicator.classList.remove('hidden');
    mapLoadingIndicator.style.display = 'flex';
  }
  
  // Update map info text
  const mapInfoText = document.getElementById('map-info-text');
  if (mapInfoText) {
    mapInfoText.textContent = `Fetching data for ${location}...`;
  }
  
  fetch(`/api/forecast?location=${encodeURIComponent(location)}`)
    .then(response => {
      if (!response.ok) {
        return response.json().then(errorData => {
          throw new Error(errorData.error || 'Failed to fetch forecast data');
        });
      }
      return response.json();
    })
    .then(data => {
      // Update the flood map
      updateFloodMap(data);
      
      // Update the current conditions panel
      updateCurrentConditions(data);
      
      // Update the forecast panel
      updateForecastPanel(data);
      
      // Update data visualizations
      updateDataVisualizations(data);
      
      // Update flood alert
      updateFloodAlert(data);
      
      // Store data globally
      window.forecastData = data;
      
      // Update map info text
      if (mapInfoText) {
        const displayMode = document.getElementById('map-display-mode')?.value || 'risk';
        mapInfoText.textContent = `Showing ${
          displayMode === 'risk' ? 'flood risk heatmap' :
          displayMode === 'rainfall' ? 'rainfall intensity' :
          'historical flood events'
        } for ${data.location}`;
      }
      
      // Hide loading indicator
      if (mapLoadingIndicator) {
        mapLoadingIndicator.classList.add('hidden');
      }
      
      // Show success notification
      showNotification(`Forecast for ${data.location} loaded successfully`, 'success');
    })
    .catch(error => {
      console.error('Error fetching flood data:', error);
      
      // Update map info text
      if (mapInfoText) {
        mapInfoText.textContent = `Error fetching data for ${location}`;
      }
      
      // Hide loading indicator
      if (mapLoadingIndicator) {
        mapLoadingIndicator.classList.add('hidden');
      }
      
      // Show error notification
      showNotification(error.message || 'Error fetching data', 'error');
    });
}

function updateFloodMap(data) {
  if (!floodMap || !data || !data.flood_data) return;
  
  // Center the map on the location
  const lat = data.coordinates.lat;
  const lon = data.coordinates.lon;
  floodMap.setView([lat, lon], 10);
  
  // Clear existing markers
  floodMap.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      floodMap.removeLayer(layer);
    }
  });
  
  // Add a marker for the location
  L.marker([lat, lon])
    .addTo(floodMap)
    .bindPopup(`
      <div class="p-2">
        <h3 class="text-base font-medium">${data.location}</h3>
        <p class="text-sm mt-1">${data.current.description || 'Current conditions'}</p>
        <p class="text-sm">Flood Risk: 
          <span class="${
            data.current.flood_probability === 'High' ? 'text-red-600 font-medium' : 
            data.current.flood_probability === 'Medium' ? 'text-amber-600 font-medium' : 
            'text-green-600 font-medium'
          }">
            ${data.current.flood_probability}
          </span>
        </p>
                </div>
    `)
    .openPopup();
  
  // Update heat layer if flood data is available
  if (data.flood_data.points && data.flood_data.points.length > 0) {
    const heatData = data.flood_data.points.map(point => [point[0], point[1], point[2]]);
    floodHeatLayer.setLatLngs(heatData);
  }
}

function updateCurrentConditions(data) {
  const currentConditionsDiv = document.getElementById('current-conditions');
  if (!currentConditionsDiv || !data.current) return;
  
  const current = data.current;
  const riskColor = 
    current.flood_probability === 'High' ? 'text-red-600' : 
    current.flood_probability === 'Medium' ? 'text-amber-500' : 
    'text-green-600';
  
  currentConditionsDiv.innerHTML = `
    <h3 class="font-medium text-gray-900 mb-3 flex items-center">
      <i class="fas fa-cloud-sun text-primary mr-2"></i> Current Conditions
    </h3>
    <div class="text-center mb-3">
      <h4 class="font-medium text-gray-900">${data.location}</h4>
      <p class="text-sm text-gray-500">${current.description || 'Current weather'}</p>
                </div>
    <div class="grid grid-cols-2 gap-2 text-sm">
      <div class="bg-gray-50 p-2 rounded">
        <span class="block text-gray-500">Temperature</span>
        <span class="font-medium">${current.temp}°C</span>
                </div>
      <div class="bg-gray-50 p-2 rounded">
        <span class="block text-gray-500">Humidity</span>
        <span class="font-medium">${current.humidity || '0'}%</span>
      </div>
      <div class="bg-gray-50 p-2 rounded">
        <span class="block text-gray-500">Wind Speed</span>
        <span class="font-medium">${current.wind_speed}</span>
      </div>
      <div class="bg-gray-50 p-2 rounded">
        <span class="block text-gray-500">Rainfall</span>
        <span class="font-medium">${current.rainfall}</span>
      </div>
    </div>
    <div class="mt-3 pt-3 border-t border-gray-100">
      <div class="flex justify-between items-center">
        <span class="text-gray-700">Flood Risk:</span>
        <span class="font-medium ${riskColor}">${current.flood_probability}</span>
      </div>
                </div>
            `;
}

function updateForecastPanel(data) {
  const forecastPanel = document.getElementById('forecast-panel');
  if (!forecastPanel) return;
  
  // If we have forecast data
  if (data.forecast && data.forecast.length > 0) {
    let forecastHtml = `<div class="space-y-3">`;
    
    // Add each day's forecast
    data.forecast.forEach((day, index) => {
      const date = new Date(day.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const riskClass = 
        day.flood_risk === 'High' ? 'bg-red-100 text-red-700' : 
        day.flood_risk === 'Medium' ? 'bg-amber-100 text-amber-700' : 
        'bg-green-100 text-green-700';
      
      forecastHtml += `
        <div class="bg-gray-50 rounded-lg p-3 ${index === 0 ? 'border-l-4 border-primary' : ''}">
          <div class="flex justify-between items-center">
            <div>
              <span class="font-medium">${dayName}</span>
              <span class="text-xs text-gray-500 ml-1">${dateStr}</span>
            </div>
            <span class="text-sm px-2 py-0.5 rounded ${riskClass}">${day.flood_risk}</span>
          </div>
          <div class="mt-2 flex justify-between items-center">
            <div class="text-sm">
              <div>${day.temp}°C</div>
              <div class="text-xs text-gray-500">${day.rainfall}</div>
            </div>
            <div class="text-xs">
              <div class="text-gray-500">${day.description || 'Forecast'}</div>
            </div>
          </div>
        </div>
      `;
    });
    
    forecastHtml += `</div>`;
    forecastPanel.innerHTML = forecastHtml;
  } else {
    // If no forecast data
    forecastPanel.innerHTML = `
      <div class="text-center py-6 text-gray-500">
        <div class="w-12 h-12 mx-auto mb-2 flex items-center justify-center rounded-full bg-gray-50">
          <i class="fas fa-calendar-alt text-lg text-gray-400"></i>
        </div>
        <p>No forecast data available</p>
      </div>
    `;
  }
}

// Initialize map controls like zoom buttons
function initializeMapControls() {
  // Zoom controls
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  
  if (zoomInBtn && floodMap) {
    zoomInBtn.addEventListener('click', () => {
      floodMap.zoomIn();
    });
  }
  
  if (zoomOutBtn && floodMap) {
    zoomOutBtn.addEventListener('click', () => {
      floodMap.zoomOut();
    });
  }
  
  // Map info text
  const mapInfoText = document.getElementById('map-info-text');
  
  // Map timeframe change
  const mapTimeframe = document.getElementById('map-timeframe');
  if (mapTimeframe) {
    mapTimeframe.addEventListener('change', () => {
      const selectedValue = mapTimeframe.value;
      if (mapInfoText) {
        mapInfoText.textContent = `Showing flood risk data for ${
          selectedValue === 'current' ? 'current conditions' :
          selectedValue === '24h' ? 'the last 24 hours' :
          selectedValue === '7d' ? 'the last 7 days' :
          'the last 30 days'
        }`;
      }
      
      // If we have data, update the map
      if (window.forecastData) {
        // In a real app, we would fetch new data for the selected timeframe
        // For now, just show a notification
        showNotification(`Displaying data for ${
          selectedValue === 'current' ? 'current conditions' :
          selectedValue === '24h' ? 'the last 24 hours' :
          selectedValue === '7d' ? 'the last 7 days' :
          'the last 30 days'
        }`, 'info');
      }
    });
  }
  
  // Map display mode change
  const mapDisplayMode = document.getElementById('map-display-mode');
  if (mapDisplayMode) {
    mapDisplayMode.addEventListener('change', () => {
      const selectedValue = mapDisplayMode.value;
      
      // Update info text
      if (mapInfoText) {
        mapInfoText.textContent = `Showing ${
          selectedValue === 'risk' ? 'flood risk heatmap' :
          selectedValue === 'rainfall' ? 'rainfall intensity' :
          'historical flood events'
        }`;
      }
      
      // In a real app, we would update the visualization based on the selected mode
      // For now, just show a notification
      showNotification(`Displaying ${
        selectedValue === 'risk' ? 'flood risk heatmap' :
        selectedValue === 'rainfall' ? 'rainfall intensity' :
        'historical flood events'
      }`, 'info');
    });
  }
}

// Initialize chart visualizations
function initializeCharts() {
  // We'll use placeholder elements initially
  // Charts will be populated with data when a location is selected
}

// Update all data visualizations
function updateDataVisualizations(data) {
  // Update the rainfall chart
  updateRainfallChart(data);
  
  // Update historical events
  updateHistoricalEvents(data);
  
  // Update risk distribution
  updateRiskDistribution(data);
  
  // Update monitoring stations
  updateMonitoringStations(data);
}

// Update rainfall trend chart
function updateRainfallChart(data) {
  const rainfallChartEl = document.getElementById('rainfall-chart');
  if (!rainfallChartEl) return;
  
  // Clear previous content
  rainfallChartEl.innerHTML = '';
  
  // Create a simple bar chart UI to show rainfall data
  const rainfallData = data.forecast.map(day => parseFloat(day.rainfall.replace(' mm', '')) || 0);
  const maxRainfall = Math.max(...rainfallData, 0.1); // Ensure we don't divide by zero
  
  // Create chart bars
  const chartHTML = `
    <div class="h-full flex items-end justify-between">
      ${data.forecast.map((day, index) => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const rainfall = parseFloat(day.rainfall.replace(' mm', '')) || 0;
        const height = Math.round((rainfall / maxRainfall) * 100);
        
        const barColor = 
          day.flood_risk === 'High' ? 'bg-red-500' :
          day.flood_risk === 'Medium' ? 'bg-amber-500' :
          'bg-blue-500';
          
        return `
          <div class="flex flex-col items-center">
            <div class="text-xs text-gray-500 mb-1">${rainfall} mm</div>
            <div class="w-8 ${barColor} rounded-t-sm" style="height: ${height}%;"></div>
            <div class="text-xs font-medium mt-1">${dayName}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  rainfallChartEl.innerHTML = chartHTML;
}

// Update historical events
function updateHistoricalEvents(data) {
  const historicalEventsEl = document.getElementById('historical-events');
  if (!historicalEventsEl) return;
  
  // In a real app, we would fetch historical data from an API
  // For now, let's create some mock data based on the location
  
  // Generate some dummy historical flood events
  const years = [2022, 2021, 2020, 2019, 2018];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const severities = ['High', 'Medium', 'Low'];
  
  // Create a seed based on location name to generate consistent mock data for the same location
  const seed = data.location.charCodeAt(0) + data.location.charCodeAt(data.location.length - 1);
  const getRandomItem = (array) => array[Math.floor((seed * array.length) / 100) % array.length];
  
  // Generate 4 historical events
  const events = [];
  for (let i = 0; i < 4; i++) {
    const year = years[i % years.length];
    const month = getRandomItem(months);
    const severity = getRandomItem(severities);
    const rainfall = 5 + (seed % 20) + (i * 3);
    
    events.push({
      date: `${month} ${year}`,
      severity,
      rainfall: `${rainfall} mm`,
      duration: `${1 + (i % 5)} days`
    });
  }
  
  const eventsHTML = `
    <div class="overflow-y-auto h-full">
      ${events.map(event => {
        const severityClass = 
          event.severity === 'High' ? 'text-red-700 bg-red-100' :
          event.severity === 'Medium' ? 'text-amber-700 bg-amber-100' :
          'text-green-700 bg-green-100';
          
        return `
          <div class="mb-2 p-2 border border-gray-100 rounded-lg">
            <div class="flex justify-between items-center mb-1">
              <span class="text-xs font-medium">${event.date}</span>
              <span class="text-xs px-1.5 py-0.5 rounded ${severityClass}">${event.severity}</span>
            </div>
            <div class="text-xs text-gray-600">
              <span class="block">Rainfall: ${event.rainfall}</span>
              <span>Duration: ${event.duration}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  historicalEventsEl.innerHTML = eventsHTML;
}

// Update risk distribution chart
function updateRiskDistribution(data) {
  const riskDistributionEl = document.getElementById('risk-distribution');
  if (!riskDistributionEl) return;
  
  // Clear previous content
  riskDistributionEl.innerHTML = '';
  
  // For this demo, we'll create a simple circular gauge chart
  // In a real app, you might use a proper chart library like Chart.js
  
  // Calculate risk percentage based on current flood probability
  let riskPercentage = 0;
  let riskColor = '';
  
  if (data.current.flood_probability === 'High') {
    riskPercentage = 85;
    riskColor = 'text-red-600';
  } else if (data.current.flood_probability === 'Medium') {
    riskPercentage = 50;
    riskColor = 'text-amber-600';
  } else {
    riskPercentage = 20;
    riskColor = 'text-green-600';
  }
  
  // Create a simple circular gauge
  const gaugeHTML = `
    <div class="h-full flex flex-col items-center justify-center">
      <div class="relative w-24 h-24 mb-2">
        <!-- Background circle -->
        <div class="absolute inset-0 rounded-full border-8 border-gray-100"></div>
        
        <!-- Progress circle with stroke-dasharray trick -->
        <svg class="absolute inset-0" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="${riskColor.replace('text-', 'var(--color-')}"
            stroke-width="10"
            stroke-linecap="round"
            stroke-dasharray="${riskPercentage * 2.51}, 251"
            transform="rotate(-90 50 50)"
          />
        </svg>
        
        <!-- Percentage text -->
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-lg font-bold ${riskColor}">${riskPercentage}%</span>
        </div>
      </div>
      
      <div class="text-center">
        <p class="text-sm font-medium text-gray-700">Current Risk Level</p>
        <p class="text-xs text-gray-500">Based on rainfall, terrain and historical data</p>
      </div>
      
      <!-- Risk levels legend -->
      <div class="mt-3 flex justify-center items-center gap-3">
        <div class="flex items-center">
          <div class="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
          <span class="text-xs">High</span>
        </div>
        <div class="flex items-center">
          <div class="w-2 h-2 rounded-full bg-amber-500 mr-1"></div>
          <span class="text-xs">Medium</span>
        </div>
        <div class="flex items-center">
          <div class="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
          <span class="text-xs">Low</span>
        </div>
      </div>
    </div>
  `;
  
  riskDistributionEl.innerHTML = gaugeHTML;
}

// Update monitoring stations
function updateMonitoringStations(data) {
  const monitoringStationsEl = document.getElementById('monitoring-stations');
  if (!monitoringStationsEl) return;
  
  // Generate mock monitoring stations data based on location
  // In a real app, this would come from an API
  
  const stationTypes = ['Rain Gauge', 'Weather Station', 'River Level', 'Dam Monitor'];
  const statuses = ['Active', 'Active', 'Active', 'Maintenance'];
  
  // Create a seed based on location
  const seed = data.location.charCodeAt(0) + data.location.charCodeAt(data.location.length - 1);
  
  // Generate 3 monitoring stations
  const stations = [];
  for (let i = 0; i < 3; i++) {
    const stationNumber = (seed + i) % 100;
    const type = stationTypes[i % stationTypes.length];
    const distance = 1 + (i * 2) + (seed % 5);
    const status = statuses[i % statuses.length];
    
    stations.push({
      name: `Station ${stationNumber}`,
      type,
      distance: `${distance} km`,
      status
    });
  }
  
  const stationsHTML = `
    <div class="overflow-y-auto max-h-32">
      ${stations.map(station => {
        const statusClass = station.status === 'Active' ? 'text-green-600' : 'text-amber-600';
        
        return `
          <div class="flex items-center justify-between p-2 border-b border-gray-100 last:border-0">
            <div>
              <div class="text-xs font-medium">${station.name}</div>
              <div class="text-xs text-gray-500">${station.type} • ${station.distance}</div>
            </div>
            <div class="text-xs ${statusClass}">
              <i class="fas fa-circle text-xs mr-1"></i>
              ${station.status}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  monitoringStationsEl.innerHTML = stationsHTML;
}

// Update flood alert based on risk level
function updateFloodAlert(data) {
  const floodAlertEl = document.getElementById('flood-alert');
  const alertMessageEl = document.getElementById('alert-message');
  
  if (!floodAlertEl || !alertMessageEl) return;
  
  // Show alert only for high risk
  if (data.current.flood_probability === 'High') {
    // Show the alert
    floodAlertEl.classList.remove('hidden');
    
    // Customize message based on rainfall
    const rainfall = parseFloat(data.current.rainfall) || 0;
    
    if (rainfall > 15) {
      alertMessageEl.textContent = `Heavy rainfall (${data.current.rainfall}) has been detected in ${data.location}. There is a high risk of flooding. Please avoid low-lying areas and follow local emergency instructions.`;
    } else {
      alertMessageEl.textContent = `${data.location} is currently experiencing conditions that may lead to flooding. Stay alert and monitor local emergency channels.`;
    }
  } else {
    // Hide the alert for medium and low risk
    floodAlertEl.classList.add('hidden');
  }
}

// Notification system
function showNotification(message, type = 'info', duration = 3000) {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.notification-toast');
  existingNotifications.forEach(notification => {
    notification.remove();
  });
  
  // Create new notification
  const notification = document.createElement('div');
  notification.className = `fixed top-20 right-4 z-50 max-w-sm bg-white rounded-lg shadow-lg border-l-4 overflow-hidden transform transition-all duration-300 opacity-0 translate-x-full notification-toast ${
    type === 'success' ? 'border-green-500' :
    type === 'error' ? 'border-red-500' :
    type === 'warning' ? 'border-amber-500' :
    'border-blue-500'
  }`;
  
  // Add icon based on type
  const icon = 
    type === 'success' ? 'fa-check-circle text-green-500' :
    type === 'error' ? 'fa-exclamation-circle text-red-500' :
    type === 'warning' ? 'fa-exclamation-triangle text-amber-500' :
    'fa-info-circle text-blue-500';
  
  notification.innerHTML = `
    <div class="p-4 flex items-center">
      <i class="fas ${icon} mr-3 text-lg"></i>
      <p class="text-gray-700">${message}</p>
      <button class="ml-auto text-gray-400 hover:text-gray-500" onclick="this.parentElement.parentElement.classList.add('opacity-0', 'translate-x-full')">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.remove('translate-x-full', 'opacity-0');
  }, 10);
  
  // Automatically remove after duration
  setTimeout(() => {
    notification.classList.add('translate-x-full', 'opacity-0');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, duration);
}

// Initialize authentication and user interface
function initializeAuth() {
  // Get UI elements
  const userLoggedIn = document.getElementById('user-logged-in');
  const mobileLoggedIn = document.getElementById('mobile-logged-in');
  const authBtn = document.getElementById('auth-btn');
  const mobileLoggedOut = document.getElementById('mobile-logged-out');
  const userMenuButton = document.getElementById('user-menu-button');
  const userDropdown = document.getElementById('user-dropdown');
  const userDisplayName = document.getElementById('user-display-name');
  const userEmail = document.getElementById('user-email');
  const profileImage = document.getElementById('profile-image');
  const notificationsButton = document.getElementById('notifications-button');
  const notificationsDropdown = document.getElementById('notifications-dropdown');
  const notificationBadge = document.getElementById('notification-badge');
  const menuNotificationBadge = document.getElementById('menu-notification-badge');
  const markAllReadBtn = document.getElementById('mark-all-read');
  
  // Check if user is logged in
  fetch('/api/check-auth')
    .then(response => response.json())
    .then(data => {
      if (data.authenticated) {
        // User is logged in
        const user = data.user;
        
        // Update UI for logged in state
        if (userLoggedIn) userLoggedIn.classList.remove('hidden');
        if (mobileLoggedIn) mobileLoggedIn.classList.remove('hidden');
        if (authBtn) authBtn.classList.add('hidden');
        if (mobileLoggedOut) mobileLoggedOut.classList.add('hidden');
        
        // Update user info
        if (userDisplayName) userDisplayName.textContent = user.display_name || user.username;
        if (userEmail) userEmail.textContent = user.email;
        
        // Update profile image if available
        if (profileImage && user.profile_image) {
          profileImage.innerHTML = `<img src="${user.profile_image}" alt="Profile" class="w-full h-full object-cover">`;
        }
        
        // Fetch notifications
        fetchNotifications();
      } else {
        // User is not logged in
        if (userLoggedIn) userLoggedIn.classList.add('hidden');
        if (mobileLoggedIn) mobileLoggedIn.classList.add('hidden');
        if (authBtn) authBtn.classList.remove('hidden');
        if (mobileLoggedOut) mobileLoggedOut.classList.remove('hidden');
      }
    })
    .catch(error => {
      console.error('Error checking authentication:', error);
      // Default to logged out state on error
      if (userLoggedIn) userLoggedIn.classList.add('hidden');
      if (mobileLoggedIn) mobileLoggedIn.classList.add('hidden');
      if (authBtn) authBtn.classList.remove('hidden');
      if (mobileLoggedOut) mobileLoggedOut.classList.remove('hidden');
    });
    
  // User menu dropdown toggle
  if (userMenuButton && userDropdown) {
    userMenuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
      // Close notifications dropdown if open
      if (notificationsDropdown && !notificationsDropdown.classList.contains('hidden')) {
        notificationsDropdown.classList.add('hidden');
      }
    });
  }
  
  // Notifications dropdown toggle
  if (notificationsButton && notificationsDropdown) {
    notificationsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      notificationsDropdown.classList.toggle('hidden');
      // Close user dropdown if open
      if (userDropdown && !userDropdown.classList.contains('hidden')) {
        userDropdown.classList.add('hidden');
      }
    });
  }

  // Mark all notifications as read
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      markAllNotificationsRead();
    });
  }
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    // Close user dropdown
    if (userDropdown && !userDropdown.classList.contains('hidden')) {
      const isUserMenuClick = userMenuButton.contains(e.target) || userDropdown.contains(e.target);
      if (!isUserMenuClick) {
        userDropdown.classList.add('hidden');
      }
    }
    
    // Close notifications dropdown
    if (notificationsDropdown && !notificationsDropdown.classList.contains('hidden')) {
      const isNotificationsClick = notificationsButton.contains(e.target) || notificationsDropdown.contains(e.target);
      if (!isNotificationsClick) {
        notificationsDropdown.classList.add('hidden');
      }
    }
  });
}

// Fetch notifications from the API
function fetchNotifications() {
  const notificationsList = document.getElementById('notifications-list');
  
  if (!notificationsList) return;
  
  fetch('/api/notifications')
    .then(response => response.json())
    .then(notifications => {
      if (notifications.length > 0) {
        // Clear the container
        notificationsList.innerHTML = '';
        
        // Create notification items
        notifications.forEach(notification => {
          const notificationEl = document.createElement('div');
          notificationEl.className = 'px-4 py-3 hover:bg-gray-50 border-b border-gray-100';
          
          let iconClass = 'fas fa-bell text-primary-500';
          
          // Set icon based on notification type
          if (notification.type === 'badge') {
            iconClass = 'fas fa-award text-purple-500';
          } else if (notification.type === 'upvote') {
            iconClass = 'fas fa-thumbs-up text-amber-500';
          } else if (notification.type === 'comment') {
            iconClass = 'fas fa-comment-alt text-green-500';
          } else if (notification.type === 'welcome') {
            iconClass = 'fas fa-hand-wave text-blue-500';
          }
          
          notificationEl.innerHTML = `
            <div class="flex items-start">
              <div class="mr-3">
                <div class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <i class="${iconClass}"></i>
                </div>
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">${notification.title}</p>
                <p class="text-xs text-gray-500 mt-0.5">${notification.content}</p>
                <div class="text-xs text-gray-400 mt-1">${formatTimeAgo(notification.created_at)}</div>
              </div>
              <button class="text-gray-400 hover:text-gray-600 ml-2 mark-read-btn" data-id="${notification.id}">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
          
          notificationsList.appendChild(notificationEl);
          
          // Add event listener to mark as read button
          const markReadBtn = notificationEl.querySelector('.mark-read-btn');
          if (markReadBtn) {
            markReadBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              markNotificationRead(notification.id);
              notificationEl.remove();
              
              // Show empty state if no more notifications
              if (notificationsList.children.length === 0) {
                showEmptyNotificationsState();
              }
            });
          }
        });
      } else {
        showEmptyNotificationsState();
      }
    })
    .catch(error => {
      console.error('Error fetching notifications:', error);
      showEmptyNotificationsState();
    });
}

// Show empty state for notifications
function showEmptyNotificationsState() {
  const notificationsList = document.getElementById('notifications-list');
  
  if (notificationsList) {
    notificationsList.innerHTML = `
      <div class="py-8 text-center text-gray-500">
        <i class="fas fa-bell-slash text-gray-300 text-2xl mb-2"></i>
        <p>No new notifications</p>
      </div>
    `;
  }
}

// Mark a single notification as read
function markNotificationRead(notificationId) {
  fetch('/api/notifications/mark-read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notification_id: notificationId }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Update notification badge count
        updateNotificationBadge(-1);
      }
    })
    .catch(error => {
      console.error('Error marking notification as read:', error);
    });
}

// Mark all notifications as read
function markAllNotificationsRead() {
  fetch('/api/notifications/mark-read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Hide notification badges
        const notificationBadge = document.getElementById('notification-badge');
        const menuNotificationBadge = document.getElementById('menu-notification-badge');
        
        if (notificationBadge) notificationBadge.classList.add('hidden');
        if (menuNotificationBadge) menuNotificationBadge.classList.add('hidden');
        
        // Show empty state
        showEmptyNotificationsState();
      }
    })
    .catch(error => {
      console.error('Error marking all notifications as read:', error);
    });
}

// Update notification badge count
function updateNotificationBadge(change) {
  const notificationBadge = document.getElementById('notification-badge');
  const menuNotificationBadge = document.getElementById('menu-notification-badge');
  
  if (notificationBadge) {
    const count = parseInt(notificationBadge.textContent) + change;
    
    if (count <= 0) {
      notificationBadge.classList.add('hidden');
      if (menuNotificationBadge) menuNotificationBadge.classList.add('hidden');
    } else {
      notificationBadge.textContent = count;
      if (menuNotificationBadge) menuNotificationBadge.textContent = count;
    }
  }
}

// Format relative time (e.g., "5 minutes ago")
function formatTimeAgo(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return interval === 1 ? '1 year ago' : `${interval} years ago`;
  }
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return interval === 1 ? '1 month ago' : `${interval} months ago`;
  }
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return interval === 1 ? '1 day ago' : `${interval} days ago`;
  }
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
  }
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
  }
  
  return 'Just now';
}

/**
 * Fetch forecast data from the API
 * @param {string} location - The location to fetch data for
 * @returns {Promise} - A promise that resolves to the forecast data
 */
function fetchForecastData(location) {
  return new Promise((resolve, reject) => {
    fetch(`/api/forecast?location=${encodeURIComponent(location)}`)
      .then(response => {
        if (!response.ok) {
          return response.json().then(errorData => {
            throw new Error(errorData.error || 'Failed to fetch forecast data');
          });
        }
        return response.json();
      })
      .then(data => {
        // Store data for flood map and other uses
        window.forecastData = data;
        
        // Update the main map
        updateMainMap(data);
        
        // Make results visible
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
          resultsDiv.classList.remove('hidden');
        }
        
        // Show success notification
        showNotification(`Forecast for ${data.location} loaded successfully`, 'success');
        
        resolve(data);
      })
      .catch(error => {
        // Show error notification
        showNotification(error.message || 'Error fetching data', 'error');
        
        reject(error);
      });
  });
}