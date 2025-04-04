// Check authentication state when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupProfileMenu();
});

function checkAuthState() {
    // Check if user is logged in (you can store this in localStorage after login)
    const user = JSON.parse(localStorage.getItem('user'));
    const loginBtn = document.getElementById('login-btn');
    const profileMenu = document.getElementById('profile-menu');
    
    if (user) {
        loginBtn.classList.add('hidden');
        profileMenu.classList.remove('hidden');
        document.getElementById('username').textContent = user.username;
    } else {
        loginBtn.classList.remove('hidden');
        profileMenu.classList.add('hidden');
    }
}

function setupProfileMenu() {
    const profileIcon = document.querySelector('.profile-icon');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const logoutBtn = document.getElementById('logout-btn');

    // Toggle dropdown menu
    profileIcon?.addEventListener('click', () => {
        dropdownMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileIcon?.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Handle logout
    logoutBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
}

function logout() {
    // Clear user data
    localStorage.removeItem('user');
    
    // Make logout request to server
    fetch('/logout', {
        method: 'POST',
        credentials: 'include'
    }).then(() => {
        // Redirect to home page
        window.location.href = '/';
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("search-form");
    const resultsDiv = document.getElementById("results");
  
    // Initialize the map
    const map = L.map("map").setView([20.5937, 78.9629], 5); // Default to India
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
  
    // Heatmap layer (empty initially)
    const heatLayer = L.heatLayer([], { 
        radius: 25, 
        blur: 15, 
        maxZoom: 17 
    }).addTo(map);
  
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const location = document.getElementById("location").value;
  
        try {
            const response = await fetch("/search", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `location=${location}`,
            });
  
            const data = await response.json();
  
            // Display the results dynamically
            resultsDiv.innerHTML = `
                <h2>Flood Prediction for ${data.location}</h2>
                <div class="stat">
                    <span class="stat-label">Rainfall:</span>
                    <span class="stat-value">${data.rainfall}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Wind Speed:</span>
                    <span class="stat-value">${data.wind_speed}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Topography:</span>
                    <span class="stat-value">${data.topography}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Flood Probability:</span>
                    <span class="stat-value">${data.flood_probability}</span>
                </div>
            `;
  
            // Update the map with the location's coordinates
            const { lat, lon } = data.coordinates;
            map.setView([lat, lon], 10); // Zoom to the location
  
            // Add a heatmap point (latitude, longitude, intensity)
            const intensity = data.flood_probability === "High" ? 1 : 0.5;
            heatLayer.setLatLngs([[lat, lon, intensity]]);
        } catch (error) {
            console.error("Error fetching data:", error);
            resultsDiv.innerHTML = `<p style="color: red;">Failed to fetch data. Please try again.</p>`;
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const locationInput = document.getElementById('location');
    const forecastBtn = document.getElementById('forecast-btn');

    // Handle form submission
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const location = locationInput.value;
        
        if (!location) {
            return;
        }

        try {
            const response = await fetch(`/api/forecast?location=${encodeURIComponent(location)}`);
            const data = await response.json();
            
            // Navigate to flood map section
            navigateToSection('flood-map');
            
            // Update map with forecast data
            updateMapWithForecast(data);
        } catch (error) {
            console.error('Error fetching forecast:', error);
        }
    });

    // Handle forecast button click
    forecastBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Get location value
        const location = locationInput.value;
        
        if (!location) {
            alert('Please enter a location');
            return;
        }

        try {
            // Make API call with location
            const response = await fetch(`/api/forecast?location=${encodeURIComponent(location)}`);
            const data = await response.json();

            // Navigate to flood map section
            navigateToSection('flood-map');

            // Update map with forecast data
            updateMapWithForecast(data);
            
        } catch (error) {
            console.error('Error fetching forecast:', error);
            alert('Error fetching forecast data. Please try again.');
        }
    });

    // Prevent form submission
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
    });
});