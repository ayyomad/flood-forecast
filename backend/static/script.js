document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("search-form");
    const resultsDiv = document.getElementById("results");
  
    // Initialize the map
    const map = L.map("map").setView([20.5937, 78.9629], 5); // Default to India
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
  
    // Heatmap layer (empty initially)
    const heatLayer = L.heatLayer([], { radius: 25, blur: 15, maxZoom: 17 }).addTo(map);
  
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