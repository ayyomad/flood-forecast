import requests
from flask import Flask, render_template, request, jsonify, session, redirect
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, template_folder="../frontend", static_folder="static")
app.secret_key = "your_secret_key"  # Add a secret key for session management

users = {}  # In-memory storage (replace with database in production)
posts = []  # In-memory storage for community posts

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/search", methods=["POST"])
def search():
    # Get the location and optional country code from the request
    location = request.form.get("location")
    country = request.form.get("country")  # Optional country code

    # Construct the query parameter
    query = f"{location},{country}" if country else location

    # OpenWeather API (replace 'YOUR_API_KEY' with your actual API key)
    weather_api_key = "4e16ff53aef1935c83cc71a14a23f8af"
    weather_url = f"https://api.openweathermap.org/data/2.5/weather?q={query}&appid={weather_api_key}&units=metric"

    try:
        # Fetch weather data from OpenWeather API
        weather_response = requests.get(weather_url)
        weather_data = weather_response.json()

        # Debugging: Log the API response
        print("Weather API Response:", weather_response.text)
        print("Status Code:", weather_response.status_code)

        # Check if the API returned valid data
        if weather_response.status_code != 200:
            error_message = weather_data.get("message", "Unknown error")
            return jsonify({"error": f"Could not fetch data for location: {query}. Error: {error_message}"}), 400

        # Extract relevant data from the API response
        rainfall = 0
        if "rain" in weather_data:
            rainfall = weather_data["rain"].get("1h", 0)
        elif "precipitation" in weather_data:
            rainfall = weather_data["precipitation"]
        wind_speed = weather_data["wind"]["speed"]  # Wind speed in m/s
        coordinates = weather_data["coord"]  # Latitude and longitude
        topography = "Low-lying"  # Placeholder for topography (replace with real data if available)

        # Calculate flood probability (simple logic for now)
        flood_probability = "High" if rainfall != 0 and float(rainfall) > 10 else "Low"

        # Return the data as JSON
        data = {
            "location": weather_data["name"],  # Resolved city name
            "coordinates": coordinates,  # Latitude and longitude
            "rainfall": f"{rainfall} mm" if rainfall != 0 else "No rainfall data",
            "wind_speed": f"{wind_speed} m/s",
            "topography": topography,
            "flood_probability": flood_probability,
        }
        return jsonify(data)

    except requests.exceptions.RequestException as e:
        # Handle network-related errors
        print("Network Error:", str(e))
        return jsonify({"error": "Network error occurred. Please try again later."}), 500

    except Exception as e:
        # Handle other unexpected errors
        print("Unexpected Error:", str(e))
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route("/auth")
def auth():
    return render_template("auth.html")

@app.route("/signup", methods=["POST"])
def signup():
    username = request.form.get("username")
    email = request.form.get("email")
    password = request.form.get("password")
    
    if email in users:
        return jsonify({"error": "Email already exists"}), 400
        
    users[email] = {
        "username": username,
        "password": generate_password_hash(password)
    }
    return redirect("/auth")

@app.route("/login", methods=["POST"])
def login():
    email = request.form.get("email")
    password = request.form.get("password")
    
    try:
        user = users.get(email)
        if user and check_password_hash(user["password"], password):
            session["user"] = email
            return jsonify({
                "success": True,
                "user": {
                    "username": user["username"],
                    "email": email
                }
            })
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        print("Login error:", str(e))  # For debugging
        return jsonify({"error": "An error occurred"}), 500

@app.route("/logout", methods=["POST"])
def logout():
    session.pop('user', None)
    return jsonify({"success": True})

@app.route("/community")
def community():
    return render_template("community.html")

@app.route("/community/posts", methods=["GET", "POST"])
def handle_posts():
    if request.method == "POST":
        post = {
            "title": request.form.get("title"),
            "description": request.form.get("description"),
            "location": request.form.get("location"),
            "urgency": request.form.get("urgency"),
            "user": session.get("user", "Anonymous")
        }
        posts.append(post)
    return jsonify(posts)

@app.route("/profile/<username>")
def profile(username):
    if "user" not in session:
        return redirect("/auth")
    return render_template("profile.html", username=username)

if __name__ == "__main__":
    app.run(debug=True)