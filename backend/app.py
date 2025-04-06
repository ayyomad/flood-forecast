import requests
import sqlite3
import os
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, g, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import random  # For generating mock data

# Create the application instance
app = Flask(__name__, template_folder="../frontend", static_folder="static")
app.secret_key = "your_secret_key"  # Add a secret key for session management

# Database setup
DATABASE = 'tidepulse.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

# Create the schema.sql file if it doesn't exist
if not os.path.exists(os.path.join(app.root_path, 'schema.sql')):
    with open(os.path.join(app.root_path, 'schema.sql'), 'w') as f:
        f.write('''
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Community posts table
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    category TEXT NOT NULL,
    urgency TEXT NOT NULL,
    user_id INTEGER,
    anonymous BOOLEAN DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER,
    content TEXT NOT NULL,
    anonymous BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);
''')

# Initialize the database if it doesn't exist
if not os.path.exists(os.path.join(app.root_path, DATABASE)):
    init_db()
    
    # Insert some sample data
    with app.app_context():
        db = get_db()
        # Add a sample user
        db.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                  ['admin', 'admin@example.com', generate_password_hash('password')])
        
        # Add sample posts
        sample_posts = [
            ('Urgent: Flooding at Downtown Bridge', 'The Main Street bridge is completely underwater and becoming dangerous. Several cars are stranded.', 'Downtown Miami, Main Street Bridge', 'emergency', 'critical', 1, 0, 138),
            ('Need Help: Supplies for Elderly Community', 'The Riverside Senior Living center is running low on drinking water and medications.', 'Riverside Senior Living, 1200 Pine Street', 'help', 'high', 1, 0, 89),
            ('Update: Water Receding on East Side', 'Good news! The water level on Oak Avenue and surrounding streets has dropped by about 8 inches in the last 3 hours.', 'East District, Oak Avenue', 'update', 'medium', 1, 0, 76),
            ('Resource: Free Shelter at Community Center', 'The Westside Community Center has been converted to an emergency shelter with capacity for 200 people.', 'Westside Community Center, 450 Highland Avenue', 'resource', 'medium', 1, 0, 112)
        ]
        
        for post in sample_posts:
            db.execute('''
                INSERT INTO posts (title, description, location, category, urgency, user_id, anonymous, upvotes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', post)
        
        db.commit()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/search", methods=["POST"])
def search():
    location = request.form.get("location")
    country = request.form.get("country")  # Optional country code
    query = f"{location},{country}" if country else location

    weather_api_key = "4e16ff53aef1935c83cc71a14a23f8af"
    weather_url = f"https://api.openweathermap.org/data/2.5/weather?q={query}&appid={weather_api_key}&units=metric"

    try:
        weather_response = requests.get(weather_url)
        weather_data = weather_response.json()

        if weather_response.status_code != 200:
            error_message = weather_data.get("message", "Unknown error")
            return jsonify({"error": f"Could not fetch data for location: {query}. Error: {error_message}"}), 400

        rainfall = weather_data.get("rain", {}).get("1h", 0)
        wind_speed = weather_data["wind"]["speed"]
        coordinates = weather_data["coord"]
        topography = "Low-lying"  # Placeholder for topography

        flood_probability = "High" if rainfall > 10 else "Low"

        data = {
            "location": weather_data["name"],
            "coordinates": coordinates,
            "rainfall": f"{rainfall} mm" if rainfall else "No rainfall data",
            "wind_speed": f"{wind_speed} m/s",
            "topography": topography,
            "flood_probability": flood_probability,
        }
        return jsonify(data)

    except requests.exceptions.RequestException as e:
        return jsonify({"error": "Network error occurred. Please try again later."}), 500

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route("/auth")
def auth():
    return render_template("auth.html")

@app.route("/signup", methods=["POST"])
def signup():
    username = request.form.get("username")
    email = request.form.get("email")
    password = request.form.get("password")
    
    # Check if email exists
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    
    if user:
        return jsonify({"error": "Email already exists"}), 400
    
    # Insert new user
    cursor.execute(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        (username, email, generate_password_hash(password))
    )
    db.commit()
    
    # Log user in
    cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    session['user_id'] = user['id']
    session['username'] = username
    
    return redirect("/")

@app.route("/login", methods=["POST"])
def login():
    email = request.form.get("email")
    password = request.form.get("password")
    
    # Check credentials
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    
    if user and check_password_hash(user['password'], password):
        session['user_id'] = user['id']
        session['username'] = user['username']
        return redirect("/")
    
    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/logout")
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    return redirect("/")

@app.route("/community")
def community():
    return render_template("community.html")

@app.route("/community/posts", methods=["GET", "POST"])
def handle_posts():
    if request.method == "POST":
        # Get form data
        title = request.form.get("title")
        description = request.form.get("description")
        location = request.form.get("location")
        category = request.form.get("category", "update")
        urgency = request.form.get("urgency", "medium")
        anonymous = 1 if request.form.get("anonymous") == "on" else 0
        
        # Get user_id from session (if logged in)
        user_id = session.get("user_id", None)
        
        # Insert into database
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            INSERT INTO posts (title, description, location, category, urgency, user_id, anonymous)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (title, description, location, category, urgency, user_id, anonymous))
        db.commit()
        
        # Return all posts (including the new one)
        return redirect("/community")
    else:
        # Return all posts
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            SELECT p.*, u.username
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        ''')
        posts = cursor.fetchall()
        
        # Convert to list of dictionaries
        result = []
        for post in posts:
            post_dict = dict(post)
            # Format date
            post_dict['created_at'] = datetime.fromisoformat(post_dict['created_at']).strftime('%b %d, %Y %I:%M %p')
            # Handle anonymous posts
            if post_dict['anonymous'] == 1:
                post_dict['username'] = 'Anonymous'
            result.append(post_dict)
        
        return jsonify(result)

@app.route("/profile/<username>")
def profile(username):
    if "user_id" not in session:
        return redirect("/auth")
    return render_template("profile.html", username=username)

@app.route("/api/flood-data", methods=["GET"])
def get_flood_data():
    """Get flood data for visualization on the map"""
    location = request.args.get("location", "")
    
    # Geocode the location to get coordinates
    try:
        geocoding_url = f"https://nominatim.openstreetmap.org/search?q={location}&format=json&limit=1"
        geocode_response = requests.get(geocoding_url, headers={"User-Agent": "TidePulse Flood App"})
        geocode_data = geocode_response.json()
        
        if not geocode_data:
            return jsonify({"error": "Location not found"}), 404
            
        lat = float(geocode_data[0]["lat"])
        lon = float(geocode_data[0]["lon"])
        
        # Get bounding box for the area (roughly 50km radius)
        delta = 0.5  # Approximately 50km
        bbox = {
            "min_lat": lat - delta,
            "max_lat": lat + delta,
            "min_lon": lon - delta,
            "max_lon": lon + delta
        }
        
        # Generate heatmap data
        points = generate_flood_risk_data(lat, lon, bbox)
        
        return jsonify({
            "center": {"lat": lat, "lon": lon},
            "points": points
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def generate_flood_risk_data(center_lat, center_lon, bbox):
    """
    Generate realistic flood risk data for the given area.
    This function simulates flood data but could be replaced with real API data.
    """
    # Try to get river data from the USGS Water Services API
    try:
        usgs_url = f"https://waterservices.usgs.gov/nwis/iv/?format=json&sites=&latitude={center_lat}&longitude={center_lon}&radius=50&parameterCd=00065&siteStatus=active"
        usgs_response = requests.get(usgs_url)
        usgs_data = usgs_response.json()
        
        # If we got river data, use it to generate more realistic flood points
        points = []
        
        if "value" in usgs_data and "timeSeries" in usgs_data["value"]:
            # Add points near rivers with higher intensity
            for site in usgs_data["value"]["timeSeries"]:
                if "sourceInfo" in site and "geoLocation" in site["sourceInfo"]:
                    site_lat = site["sourceInfo"]["geoLocation"]["geogLocation"]["latitude"]
                    site_lon = site["sourceInfo"]["geoLocation"]["geogLocation"]["longitude"]
                    
                    # Get the gauge height if available
                    height = 0
                    if "values" in site and len(site["values"]) > 0:
                        if "value" in site["values"][0] and len(site["values"][0]["value"]) > 0:
                            if "value" in site["values"][0]["value"][0]:
                                height = float(site["values"][0]["value"][0]["value"])
                    
                    # Create intensity based on height
                    intensity = min(1.0, height / 10.0) if height > 0 else 0.7
                    points.append([site_lat, site_lon, intensity])
                    
                    # Add more points around rivers
                    for _ in range(15):
                        # Random points within ~5km
                        rlat = site_lat + (random.random() - 0.5) * 0.05
                        rlon = site_lon + (random.random() - 0.5) * 0.05
                        # Intensity decreases with distance from river
                        dist_factor = 1 - (((rlat - site_lat)**2 + (rlon - site_lon)**2)**0.5) / 0.05
                        rintensity = intensity * dist_factor * random.uniform(0.6, 1.0)
                        points.append([rlat, rlon, rintensity])
        
        # If no river data or we need more points, generate points across the area
        if len(points) < 30:
            # Generate random points with varying intensity
            for _ in range(50):
                lat = random.uniform(bbox["min_lat"], bbox["max_lat"])
                lon = random.uniform(bbox["min_lon"], bbox["max_lon"])
                
                # Distance from center affects intensity (closer to center = higher risk)
                distance = ((lat - center_lat)**2 + (lon - center_lon)**2)**0.5
                max_distance = ((bbox["max_lat"] - bbox["min_lat"])**2 + (bbox["max_lon"] - bbox["min_lon"])**2)**0.5 / 2
                
                # Adjust intensity based on distance and add randomness
                base_intensity = max(0.1, 1 - (distance / max_distance))
                intensity = base_intensity * random.uniform(0.6, 1.0)
                
                points.append([lat, lon, intensity])
        
        return points
        
    except Exception as e:
        # Fallback to random data if API fails
        print(f"Error getting USGS data: {str(e)}")
        points = []
        
        # Generate random points with varying intensity
        for _ in range(50):
            lat = random.uniform(bbox["min_lat"], bbox["max_lat"])
            lon = random.uniform(bbox["min_lon"], bbox["max_lon"])
            
            # Distance from center affects intensity (closer to center = higher risk)
            distance = ((lat - center_lat)**2 + (lon - center_lon)**2)**0.5
            max_distance = ((bbox["max_lat"] - bbox["min_lat"])**2 + (bbox["max_lon"] - bbox["min_lon"])**2)**0.5 / 2
            
            # Adjust intensity based on distance and add randomness
            base_intensity = max(0.1, 1 - (distance / max_distance))
            intensity = base_intensity * random.uniform(0.6, 1.0)
            
            points.append([lat, lon, intensity])
        
        return points

@app.route("/api/forecast", methods=["GET"])
def forecast():
    """Get comprehensive forecast data for a location"""
    location = request.args.get("location", "")
    
    if not location:
        return jsonify({"error": "Location parameter is required"}), 400
    
    try:
        # Get weather data from OpenWeatherMap API
        weather_api_key = "4e16ff53aef1935c83cc71a14a23f8af"  # Replace with your actual API key
        weather_url = f"https://api.openweathermap.org/data/2.5/weather?q={location}&appid={weather_api_key}&units=metric"
        
        weather_response = requests.get(weather_url)
        weather_data = weather_response.json()
        
        if weather_response.status_code != 200:
            error_message = weather_data.get("message", "Unknown error")
            return jsonify({"error": f"Could not fetch weather data for {location}. Error: {error_message}"}), 400
        
        # Extract coordinates for flood data
        lat = weather_data["coord"]["lat"]
        lon = weather_data["coord"]["lon"]
        
        # Get 5-day forecast
        forecast_url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={weather_api_key}&units=metric"
        forecast_response = requests.get(forecast_url)
        forecast_data = forecast_response.json()
        
        # Generate flood data
        flood_data = generate_flood_data(lat, lon, weather_data)
        
        # Extract current conditions
        rainfall = weather_data.get("rain", {}).get("1h", 0)
        temp = weather_data["main"]["temp"]
        humidity = weather_data["main"]["humidity"]
        wind_speed = weather_data["wind"]["speed"]
        description = weather_data["weather"][0]["description"]
        icon = weather_data["weather"][0]["icon"]
        
        # Determine flood probability based on rainfall and other factors
        flood_probability = determine_flood_risk(rainfall, weather_data)
        
        # Create the response object
        response = {
            "location": weather_data["name"],
            "coordinates": {
                "lat": lat,
                "lon": lon
            },
            "current": {
                "temp": round(temp),
                "humidity": humidity,
                "wind_speed": f"{wind_speed} m/s",
                "rainfall": f"{rainfall} mm" if rainfall else "0 mm",
                "description": description,
                "icon": icon,
                "flood_probability": flood_probability
            },
            "forecast": extract_daily_forecast(forecast_data),
            "flood_data": flood_data
        }
        
        return jsonify(response)
        
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "Network error occurred. Please try again later."}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

def extract_daily_forecast(forecast_data):
    """Extract daily forecast from 5-day/3-hour forecast data"""
    if "list" not in forecast_data:
        return []
    
    daily_forecasts = []
    seen_dates = set()
    
    for item in forecast_data["list"]:
        date = item["dt_txt"].split(" ")[0]
        
        # Only take one forecast per day
        if date in seen_dates:
            continue
        
        seen_dates.add(date)
        
        # Get data for this day
        temp = item["main"]["temp"]
        description = item["weather"][0]["description"]
        icon = item["weather"][0]["icon"]
        rainfall = item.get("rain", {}).get("3h", 0)
        
        # Determine flood risk
        flood_risk = "Low"
        if rainfall > 15:
            flood_risk = "High"
        elif rainfall > 5:
            flood_risk = "Medium"
        
        daily_forecasts.append({
            "date": date,
            "temp": round(temp),
            "description": description,
            "icon": icon,
            "rainfall": f"{rainfall} mm" if rainfall else "0 mm",
            "flood_risk": flood_risk
        })
        
        # Only take up to 5 days
        if len(daily_forecasts) >= 5:
            break
    
    # If the API didn't return enough data, generate some mock data
    while len(daily_forecasts) < 5:
        # Generate date for the next day
        if daily_forecasts:
            last_date = daily_forecasts[-1]["date"]
            next_date = (datetime.strptime(last_date, "%Y-%m-%d") + 
                         datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        else:
            next_date = datetime.now().strftime("%Y-%m-%d")
        
        # Mock data
        temp = random.randint(20, 35)
        rainfall = random.uniform(0, 20)
        flood_risk = "Low"
        if rainfall > 15:
            flood_risk = "High"
        elif rainfall > 5:
            flood_risk = "Medium"
        
        daily_forecasts.append({
            "date": next_date,
            "temp": temp,
            "description": "Forecast data",
            "icon": "04d",
            "rainfall": f"{rainfall:.1f} mm",
            "flood_risk": flood_risk
        })
    
    return daily_forecasts

def determine_flood_risk(rainfall, weather_data):
    """Determine flood risk based on weather conditions"""
    # Basic risk assessment based on rainfall
    if rainfall > 15:
        return "High"
    elif rainfall > 5:
        return "Medium"
    else:
        return "Low"

def generate_flood_data(center_lat, center_lon, weather_data):
    """Generate flood risk data for visualization"""
    # Determine risk factors
    rainfall = weather_data.get("rain", {}).get("1h", 0)
    wind_speed = weather_data["wind"]["speed"]
    
    # Generate points within ~25km radius
    points = []
    delta = 0.25  # approx 25km
    
    # Generate points with varying intensity
    num_points = 50
    
    for _ in range(num_points):
        # Random point around the center
        lat = center_lat + (random.random() - 0.5) * delta * 2
        lon = center_lon + (random.random() - 0.5) * delta * 2
        
        # Distance from center affects intensity
        distance = ((lat - center_lat)**2 + (lon - center_lon)**2)**0.5
        max_distance = delta
        
        # Base intensity inversely proportional to distance
        base_intensity = 1 - (distance / max_distance)
        
        # Adjust for weather factors
        weather_factor = min(1.0, (rainfall / 20) + (wind_speed / 30))
        
        # Final intensity with some randomness
        intensity = min(1.0, base_intensity * weather_factor * random.uniform(0.7, 1.3))
        
        # Add jitter to avoid perfect circular patterns
        intensity = max(0.1, min(1.0, intensity + random.uniform(-0.1, 0.1)))
        
        points.append([lat, lon, intensity])
    
    return {
        "center": {"lat": center_lat, "lon": center_lon},
        "points": points
    }

if __name__ == "__main__":
    app.run(debug=True)