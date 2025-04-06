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
});

// Mobile menu functionality
function setupMobileMenu() {
  const mobileMenuButton = document.querySelector('.mobile-menu-button');
  const mobileMenu = document.querySelector('.mobile-menu');
  
  if (mobileMenuButton && mobileMenu) {
    // Toggle mobile menu visibility
    mobileMenuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle('hidden');
      
      // Toggle icon between bars and times
      const icon = mobileMenuButton.querySelector('i');
      if (icon) {
        if (icon.classList.contains('fa-bars')) {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-times');
        } else {
          icon.classList.remove('fa-times');
          icon.classList.add('fa-bars');
        }
      }
    });
    
    // Close mobile menu when clicking nav links
    const mobileNavLinks = mobileMenu.querySelectorAll('.nav-link');
    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        
        // Restore icon
        const icon = mobileMenuButton.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-times');
          icon.classList.add('fa-bars');
        }
        
        // Handle section navigation
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          const sectionId = href.substring(1);
          if (sectionId) {
            navigateToSection(sectionId);
          }
        }
      });
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (mobileMenu.classList.contains('hidden')) return;
      if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.add('hidden');
        
        // Restore icon
        const icon = mobileMenuButton.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-times');
          icon.classList.add('fa-bars');
        }
      }
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
  // Handle main search form on home page
    const searchForm = document.getElementById('search-form');
    const locationInput = document.getElementById('location');

  if (searchForm && locationInput) {
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
      
      const location = locationInput.value.trim();
      if (location) {
        // Show loading state on the button
        const searchButton = searchForm.querySelector('button[type="submit"]');
        const originalButtonText = searchButton.innerHTML;
        searchButton.disabled = true;
        searchButton.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-2"></i> Searching...`;
        
        // Fetch forecast data
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
            // Display results
            displayResults(data);
            
            // Update the main map
            updateMainMap(data);
            
            // Store data for flood map
            window.forecastData = data;
            
            // Restore button state
            searchButton.disabled = false;
            searchButton.innerHTML = originalButtonText;
            
            // Show success notification
            showNotification(`Forecast for ${data.location} loaded successfully`, 'success');
          })
          .catch(error => {
            console.error('Error fetching forecast:', error);
            
            // Show error in results div
            const resultsDiv = document.getElementById('results');
            if (resultsDiv) {
              resultsDiv.innerHTML = `
                <div class="p-4 text-center">
                  <div class="text-red-500 mb-2"><i class="fas fa-exclamation-triangle mr-2"></i> Error</div>
                  <p class="text-gray-700">${error.message || 'Error fetching forecast data'}. Please try again.</p>
                </div>
              `;
            }
            
            // Restore button state
            searchButton.disabled = false;
            searchButton.innerHTML = originalButtonText;
            
            // Show error notification
            showNotification(error.message || 'Error fetching data', 'error');
          });
      } else {
        showNotification('Please enter a location to search', 'error');
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
  
  const current = data.current;
  const riskClass = current.flood_probability === 'High' ? 'bg-red-50 text-red-600' : 
                   current.flood_probability === 'Medium' ? 'bg-amber-50 text-amber-600' : 
                   'bg-green-50 text-green-600';
  
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
          btn.classList.add('bg-white', 'text-gray-700', 'border', 'border-gray-200');
        });
        
        button.classList.remove('bg-white', 'text-gray-700', 'border', 'border-gray-200');
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
      
      // Store data globally
      window.forecastData = data;
      
      // Hide loading indicator
      if (mapLoadingIndicator) {
        mapLoadingIndicator.classList.add('hidden');
      }
      
      // Show success notification
      showNotification(`Forecast for ${data.location} loaded successfully`, 'success');
    })
    .catch(error => {
      console.error('Error fetching flood data:', error);
      
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