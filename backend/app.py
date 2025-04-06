import requests
import sqlite3
import os
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, g, url_for, flash
from werkzeug.security import generate_password_hash, check_password_hash
import random  # For generating mock data
from functools import wraps
import math
from werkzeug.utils import secure_filename
import time

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
    password_hash TEXT NOT NULL,
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
        db.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
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

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route("/")
def home():
    """Home page route"""
    # Check if user is logged in
    user = None
    notification_count = 0
    
    if 'user_id' in session:
        try:
            db = get_db()
            user = db.execute('SELECT id, username, email, display_name, bio, location, profile_image, reputation_points FROM users WHERE id = ?', 
                             (session['user_id'],)).fetchone()
            
            # Get notification count
            notification_count = db.execute('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
                                         (session['user_id'],)).fetchone()['count']
        except Exception as e:
            app.logger.error(f"Error getting user data: {str(e)}")
    
    return render_template("index.html", user=user, notification_count=notification_count)

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

@app.route('/auth')
def auth():
    return render_template("auth.html")

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        remember_me = request.form.get('remember-me') == 'on'
        
        if not email or not password:
            return redirect(url_for('auth', error='Email and password are required', action='login'))
        
        try:
            db = get_db()
            # Check if user exists with email or username
            user = db.execute(
                'SELECT * FROM users WHERE email = ? OR username = ?', 
                (email, email)
            ).fetchone()
            
            if user and check_password_hash(user['password_hash'], password):
                # Login successful
                session.clear()
                session['user_id'] = user['id']
                session['username'] = user['username']
                
                # If "remember me" is checked, set longer session expiry
                if remember_me:
                    session.permanent = True  # Extends session lifetime
                
                # Update last login timestamp
                db.execute(
                    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                    (user['id'],)
                )
                db.commit()
                
                # Create activity log entry for login
                db.execute(
                    'INSERT INTO user_activity (user_id, activity_type, description, points_earned) VALUES (?, ?, ?, ?)',
                    (user['id'], 'login', 'User logged in', 1)
                )
                db.commit()
                
                # Check if there's a next parameter for redirection
                next_page = request.args.get('next')
                if next_page:
                    return redirect(next_page)
                return redirect(url_for('home'))
            
            return redirect(url_for('auth', error='Invalid email/username or password', action='login'))
            
        except Exception as e:
            app.logger.error(f"Login error: {str(e)}")
            return redirect(url_for('auth', error='An error occurred during login', action='login'))
    
    # GET request, just redirect to auth page
    return redirect(url_for('auth'))

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        if not username or not email or not password:
            return redirect(url_for('auth', error='All fields are required', action='signup'))
        
        # Validate password strength
        if len(password) < 8:
            return redirect(url_for('auth', error='Password must be at least 8 characters', action='signup'))
        
        if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
            return redirect(url_for('auth', error='Password must contain at least one letter and one number', action='signup'))
        
        # Validate email format
        if '@' not in email or '.' not in email:
            return redirect(url_for('auth', error='Please enter a valid email address', action='signup'))
        
        try:
            db = get_db()
            
            # Check if username already exists
            if db.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone():
                return redirect(url_for('auth', error='Username already exists', action='signup'))
            
            # Check if email already exists
            if db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone():
                return redirect(url_for('auth', error='Email already registered', action='signup'))
            
            # Insert the new user
            db.execute(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                (username, email, generate_password_hash(password))
            )
            db.commit()
            
            # Get the new user's ID
            user = db.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
            
            # Create a welcome notification
            db.execute(
                'INSERT INTO notifications (user_id, title, content, notification_type) VALUES (?, ?, ?, ?)',
                (
                    user['id'], 
                    'Welcome to TidePulse!', 
                    'Thank you for joining TidePulse. Complete your profile to get started.',
                    'welcome'
                )
            )
            
            # Award first badge for joining
            # First check if "Newcomer" badge exists
            newcomer_badge = db.execute("SELECT id FROM badges WHERE name = 'Newcomer'").fetchone()
            if not newcomer_badge:
                # Create the badge if it doesn't exist
                db.execute(
                    'INSERT INTO badges (name, description, icon, criteria, category) VALUES (?, ?, ?, ?, ?)',
                    (
                        'Newcomer', 
                        'Joined the TidePulse community', 
                        'fas fa-award', 
                        'Join the platform', 
                        'account'
                    )
                )
                db.commit()
                newcomer_badge = db.execute("SELECT id FROM badges WHERE name = 'Newcomer'").fetchone()
            
            # Assign badge to user
            db.execute(
                'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)',
                (user['id'], newcomer_badge['id'])
            )
            
            # Add activity for joining
            db.execute(
                'INSERT INTO user_activity (user_id, activity_type, description, points_earned) VALUES (?, ?, ?, ?)',
                (user['id'], 'join', 'Joined TidePulse', 10)
            )
            
            db.commit()
            
            # Log user in automatically
            session['user_id'] = user['id']
            session['username'] = username
            
            flash('Account created successfully! Welcome to TidePulse.', 'success')
            return redirect(url_for('home'))
            
        except Exception as e:
            app.logger.error(f"Signup error: {str(e)}")
            return redirect(url_for('auth', error='An error occurred during signup', action='signup'))
    
    # GET request, just redirect to auth page
    return redirect(url_for('auth', action='signup'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('home'))

@app.route('/api/check-auth')
def check_auth():
    """API endpoint to check authentication status"""
    if 'user_id' in session:
        try:
            db = get_db()
            user = db.execute('SELECT id, username, email, display_name, bio, location, profile_image, reputation_points FROM users WHERE id = ?', 
                             (session['user_id'],)).fetchone()
            
            if user:
                return jsonify({
                    'authenticated': True,
                    'user': {
                        'id': user['id'],
                        'username': user['username'],
                        'email': user['email'],
                        'display_name': user.get('display_name'),
                        'bio': user.get('bio'),
                        'location': user.get('location'),
                        'profile_image': user.get('profile_image'),
                        'reputation_points': user.get('reputation_points', 0)
                    }
                })
            else:
                # User ID in session but not in database
                session.pop('user_id', None)
                return jsonify({'authenticated': False})
        except Exception as e:
            app.logger.error(f"Auth check error: {str(e)}")
            return jsonify({'authenticated': False, 'error': str(e)})

    return jsonify({'authenticated': False})

@app.route("/community")
def community():
    """Community page with posts and discussions"""
    # Check if user is logged in
    user = None
    notification_count = 0
    
    if 'user_id' in session:
        try:
            db = get_db()
            user = db.execute('SELECT id, username, email, display_name, bio, location, profile_image, reputation_points FROM users WHERE id = ?', 
                             (session['user_id'],)).fetchone()
            
            # Get notification count
            notification_count = db.execute('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
                                         (session['user_id'],)).fetchone()['count']
        except Exception as e:
            app.logger.error(f"Error getting user data: {str(e)}")
    
    return render_template("community.html", user=user, notification_count=notification_count)

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

@app.route('/profile')
@login_required
def profile():
    try:
        # Get user data
        db = get_db()
        user = db.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        
        # Get user badges
        badges = db.execute('''
            SELECT b.* FROM badges b
            JOIN user_badges ub ON b.id = ub.badge_id
            WHERE ub.user_id = ?
            ORDER BY ub.earned_at DESC
        ''', (session['user_id'],)).fetchall()
        
        # Get user posts
        posts = db.execute('''
            SELECT p.*, COUNT(c.id) as comment_count
            FROM posts p
            LEFT JOIN comments c ON p.id = c.post_id
            WHERE p.user_id = ?
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT 10
        ''', (session['user_id'],)).fetchall()
        
        # Get user activity
        activity = db.execute('''
            SELECT * FROM user_activity
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        ''', (session['user_id'],)).fetchall()
        
        return render_template('profile.html', 
                              user=user, 
                              badges=badges, 
                              posts=posts, 
                              activity=activity)
    
    except Exception as e:
        app.logger.error(f"Profile error: {str(e)}")
        flash('An error occurred while loading your profile', 'error')
        return redirect(url_for('home'))

@app.route('/profile/edit', methods=['GET', 'POST'])
@login_required
def edit_profile():
    if request.method == 'POST':
        display_name = request.form.get('display_name')
        bio = request.form.get('bio')
        location = request.form.get('location')
        
        try:
            db = get_db()
            
            # Handle profile image upload if present
            profile_image = None
            if 'profile_image' in request.files:
                file = request.files['profile_image']
                if file and file.filename:
                    # Ensure uploads directory exists
                    uploads_dir = os.path.join(app.root_path, 'static/uploads')
                    if not os.path.exists(uploads_dir):
                        os.makedirs(uploads_dir)
                    
                    # Generate secure filename and save
                    filename = secure_filename(f"{session['user_id']}_{int(time.time())}_{file.filename}")
                    file_path = os.path.join(uploads_dir, filename)
                    file.save(file_path)
                    
                    # Store relative path in database
                    profile_image = f"/static/uploads/{filename}"
            
            # Update profile
            query = 'UPDATE users SET display_name = ?, bio = ?, location = ?'
            params = [display_name, bio, location]
            
            if profile_image:
                query += ', profile_image = ?'
                params.append(profile_image)
            
            query += ' WHERE id = ?'
            params.append(session['user_id'])
            
            db.execute(query, params)
            db.commit()
            
            flash('Profile updated successfully', 'success')
            
            # Check if this is first profile update
            profile_complete_badge = db.execute('''
                SELECT ub.id FROM user_badges ub
                JOIN badges b ON ub.badge_id = b.id
                WHERE ub.user_id = ? AND b.name = 'Profile Complete'
            ''', (session['user_id'],)).fetchone()
            
            if not profile_complete_badge and display_name and bio and location:
                # Award badge for completing profile
                badge = db.execute("SELECT id FROM badges WHERE name = 'Profile Complete'").fetchone()
                
                if not badge:
                    # Create badge if it doesn't exist
                    db.execute(
                        'INSERT INTO badges (name, description, icon, criteria, category) VALUES (?, ?, ?, ?, ?)',
                        (
                            'Profile Complete', 
                            'Completed your profile information', 
                            'fas fa-user-check', 
                            'Fill all profile fields', 
                            'account'
                        )
                    )
                    db.commit()
                    badge = db.execute("SELECT id FROM badges WHERE name = 'Profile Complete'").fetchone()
                
                # Award badge to user
                db.execute(
                    'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)',
                    (session['user_id'], badge['id'])
                )
                
                # Add points for completing profile
                db.execute(
                    'UPDATE users SET reputation_points = reputation_points + ? WHERE id = ?',
                    (5, session['user_id'])
                )
                
                # Add activity record
                db.execute(
                    'INSERT INTO user_activity (user_id, activity_type, description, points_earned) VALUES (?, ?, ?, ?)',
                    (session['user_id'], 'profile', 'Completed profile information', 5)
                )
                
                # Add notification
                db.execute(
                    'INSERT INTO notifications (user_id, title, content, notification_type) VALUES (?, ?, ?, ?)',
                    (
                        session['user_id'], 
                        'New Badge: Profile Complete!', 
                        'You earned 5 points for completing your profile information.',
                        'badge'
                    )
                )
                
                db.commit()
                
                flash('You earned the "Profile Complete" badge!', 'success')
            
            return redirect(url_for('profile'))
            
        except Exception as e:
            app.logger.error(f"Edit profile error: {str(e)}")
            flash('An error occurred while updating your profile', 'error')
            return redirect(url_for('edit_profile'))
    
    # GET request - show edit form
    try:
        db = get_db()
        user = db.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        return render_template('edit_profile.html', user=user)
    
    except Exception as e:
        app.logger.error(f"Edit profile page error: {str(e)}")
        flash('An error occurred while loading your profile', 'error')
        return redirect(url_for('profile'))

@app.route('/profile/<username>')
def view_profile(username):
    try:
        db = get_db()
        
        # Get user data
        user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        
        if not user:
            flash('User not found', 'error')
            return redirect(url_for('home'))
        
        # Get public badges
        badges = db.execute('''
            SELECT b.* FROM badges b
            JOIN user_badges ub ON b.id = ub.badge_id
            WHERE ub.user_id = ?
            ORDER BY ub.earned_at DESC
        ''', (user['id'],)).fetchall()
        
        # Get public posts (non-anonymous)
        posts = db.execute('''
            SELECT p.*, COUNT(c.id) as comment_count
            FROM posts p
            LEFT JOIN comments c ON p.id = c.post_id
            WHERE p.user_id = ? AND p.anonymous = 0
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT 10
        ''', (user['id'],)).fetchall()
        
        # Get activity count and stats
        post_count = db.execute('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', (user['id'],)).fetchone()['count']
        
        comment_count = db.execute('SELECT COUNT(*) as count FROM comments WHERE user_id = ?', (user['id'],)).fetchone()['count']
        
        return render_template('public_profile.html', 
                              user=user, 
                              badges=badges, 
                              posts=posts,
                              post_count=post_count,
                              comment_count=comment_count)
    
    except Exception as e:
        app.logger.error(f"View profile error: {str(e)}")
        flash('An error occurred while loading the profile', 'error')
        return redirect(url_for('home'))

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

# Notification routes
@app.route('/notifications')
@login_required
def notifications():
    try:
        db = get_db()
        
        # Get user's notifications
        notifications = db.execute('''
            SELECT * FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        ''', (session['user_id'],)).fetchall()
        
        # Mark notifications as read
        db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', (session['user_id'],))
        db.commit()
        
        return render_template('notifications.html', notifications=notifications)
    
    except Exception as e:
        app.logger.error(f"Notifications error: {str(e)}")
        flash('An error occurred while loading notifications', 'error')
        return redirect(url_for('home'))

@app.route('/api/notifications')
@login_required
def api_notifications():
    try:
        db = get_db()
        
        # Get user's unread notifications
        notifications = db.execute('''
            SELECT * FROM notifications
            WHERE user_id = ? AND is_read = 0
            ORDER BY created_at DESC
            LIMIT 10
        ''', (session['user_id'],)).fetchall()
        
        # Convert to list of dictionaries
        result = []
        for notification in notifications:
            result.append({
                'id': notification['id'],
                'title': notification['title'],
                'content': notification['content'],
                'type': notification['notification_type'],
                'created_at': notification['created_at']
            })
        
        return jsonify(result)
    
    except Exception as e:
        app.logger.error(f"API notifications error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/mark-read', methods=['POST'])
@login_required
def mark_notifications_read():
    try:
        notification_id = request.json.get('notification_id')
        
        db = get_db()
        
        if notification_id:
            # Mark specific notification as read
            db.execute(
                'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', 
                (notification_id, session['user_id'])
            )
        else:
            # Mark all notifications as read
            db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', (session['user_id'],))
        
        db.commit()
        
        return jsonify({'success': True})
    
    except Exception as e:
        app.logger.error(f"Mark notifications read error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Badge routes
@app.route('/badges')
@login_required
def badges():
    try:
        db = get_db()
        
        # Get user's earned badges
        earned_badges = db.execute('''
            SELECT b.*, ub.earned_at 
            FROM badges b
            JOIN user_badges ub ON b.id = ub.badge_id
            WHERE ub.user_id = ?
            ORDER BY ub.earned_at DESC
        ''', (session['user_id'],)).fetchall()
        
        # Get all available badges
        all_badges = db.execute('SELECT * FROM badges ORDER BY category, name').fetchall()
        
        # Create a set of earned badge IDs for easy lookup
        earned_badge_ids = {badge['id'] for badge in earned_badges}
        
        # Separate badges into earned and unearned
        unearned_badges = [badge for badge in all_badges if badge['id'] not in earned_badge_ids]
        
        return render_template('badges.html', 
                              earned_badges=earned_badges, 
                              unearned_badges=unearned_badges)
    
    except Exception as e:
        app.logger.error(f"Badges error: {str(e)}")
        flash('An error occurred while loading badges', 'error')
        return redirect(url_for('profile'))

# Debug routes for authentication testing
@app.route('/api/debug/all-users')
def debug_all_users():
    """API endpoint to list all users for debugging"""
    try:
        db = get_db()
        users = db.execute('SELECT id, username, email, display_name, profile_image, joined_at FROM users').fetchall()
        
        result = []
        for user in users:
            result.append({
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'display_name': user['display_name'],
                'profile_image': user['profile_image'],
                'joined_at': user['joined_at']
            })
        
        return jsonify({'users': result})
    except Exception as e:
        app.logger.error(f"Error listing users: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/debug/table-schema')
def debug_table_schema():
    """API endpoint to view database table schema"""
    try:
        db = get_db()
        # Get the schema for the users table
        schema = db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").fetchone()
        
        return jsonify({'schema': schema['sql'] if schema else 'Table not found'})
    except Exception as e:
        app.logger.error(f"Error getting schema: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/safety')
def safety():
    """Render the safety page with AI chat assistant"""
    # Check if user is logged in
    user = None
    notification_count = 0
    
    if 'user_id' in session:
        try:
            db = get_db()
            user = db.execute('SELECT id, username, email, display_name, bio, location, profile_image, reputation_points FROM users WHERE id = ?', 
                             (session['user_id'],)).fetchone()
            
            # Get notification count
            notification_count = db.execute('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
                                         (session['user_id'],)).fetchone()['count']
        except Exception as e:
            app.logger.error(f"Error getting user data: {str(e)}")
    
    return render_template('safety.html', user=user, notification_count=notification_count)

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
            
        user_message = data['message'].strip()
        
        # Log the incoming message
        app.logger.info(f"Chat request: {user_message}")
        
        # Process the message and generate a response
        response = generate_safety_response(user_message)
        
        return jsonify({
            'response': response,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        app.logger.error(f"Error in chat API: {str(e)}")
        return jsonify({'error': 'An error occurred processing your request'}), 500

def generate_safety_response(message):
    """
    Generate a response to user's safety question.
    This is a placeholder function - in a real app, this would call an AI model or API.
    """
    message = message.lower()
    
    # Emergency plan related responses
    if any(keyword in message for keyword in ['emergency plan', 'prepare', 'kit', 'evacuation']):
        return """**Emergency Preparedness Guide**

Here's how to create an effective emergency plan:

- **Create a family communication plan** - Ensure everyone knows how to contact each other
- **Designate meeting locations** - Choose places to reunite after an evacuation
- **Prepare an emergency kit** containing:
  - 3-day supply of non-perishable food and water (1 gallon per person per day)
  - Medications and medical supplies
  - Flashlight, batteries, and radio
  - First aid supplies
  - Important documents in waterproof container
  - Cash and emergency contact information

Remember to review and practice your plan regularly with all family members."""
    
    # During flood responses
    elif any(keyword in message for keyword in ['during flood', 'flooding now', 'water rising', 'flash flood']):
        return """**Immediate Actions During a Flood**

If you're experiencing flooding right now:

1. **Move to higher ground immediately** - Don't wait for instructions
2. **Stay out of floodwaters** - Just 6 inches of moving water can knock you down
3. **Disconnect utilities** if safe to do so
4. **Avoid bridges** over fast-moving water
5. **If trapped in a building**, go to the highest level (but not into closed attics)
6. **If in a vehicle in rising water**, abandon it and move to higher ground

Please monitor emergency channels and follow all evacuation orders from authorities."""
    
    # Post-flood responses
    elif any(keyword in message for keyword in ['after flood', 'clean up', 'return home', 'recovery']):
        return """**Post-Flood Safety Guidelines**

After a flood:

- **Don't return home until authorities say it's safe**
- **Check for structural damage** before entering buildings
- **Watch for wildlife** that may have entered your home (snakes, rodents)
- **Discard all food** that came in contact with floodwater
- **Wear protective clothing** during cleanup (gloves, boots, masks)
- **Document damage** with photos for insurance claims
- **Clean and disinfect everything** that got wet to prevent mold
- **Be aware of risk of electrocution** - have utilities checked by professionals

Contact your insurance provider as soon as possible to begin the claims process."""
    
    # Health concerns
    elif any(keyword in message for keyword in ['health', 'disease', 'infection', 'sick', 'illness', 'water quality']):
        return """**Flood-Related Health Concerns**

Flooding can create serious health risks:

- **Contaminated water** may contain sewage, chemicals, and bacteria
- **Waterborne diseases** like E. coli, Salmonella, and Hepatitis A are common
- **Standing water** becomes a breeding ground for mosquitoes
- **Mold growth** can cause respiratory problems

To protect yourself:
- Avoid direct contact with floodwater
- Wash hands frequently with soap and clean water
- Disinfect items that have touched floodwater
- Get medical attention for wounds exposed to floodwater
- Watch for symptoms of gastrointestinal illness

If you're experiencing symptoms, seek medical attention immediately."""
    
    # Pet safety
    elif any(keyword in message for keyword in ['pet', 'animal', 'dog', 'cat']):
        return """**Keeping Pets Safe During Floods**

Your pets rely on you during disasters:

- **Never leave pets behind** during evacuations
- **Prepare a pet emergency kit** including:
  - Food and water for at least 5 days
  - Medications and medical records
  - Leashes, harnesses, and carriers
  - Current photos of your pets
  - Comfort items (toys, blankets)
  
- **Make sure pets wear collars with ID tags**
- **Consider microchipping** your pets
- **Know pet-friendly shelters** or hotels in your area
- **After a flood**, keep pets away from contaminated water

If you get separated from your pet during a disaster, contact local animal shelters immediately."""
    
    # Warning systems and alerts
    elif any(keyword in message for keyword in ['warning', 'alert', 'notification', 'watch', 'monitor']):
        return """**Understanding Flood Warnings and Alerts**

Know the difference between alert types:

- **Flood Watch**: Flooding is possible. Be prepared to move to higher ground.
- **Flood Warning**: Flooding is occurring or imminent. Take action immediately.
- **Flash Flood Watch**: Flash flooding is possible. Be prepared to move to higher ground.
- **Flash Flood Warning**: Flash flooding is occurring or imminent. Seek higher ground immediately.

Stay informed through:
- NOAA Weather Radio
- Local TV and radio stations
- Weather apps with emergency alerts
- Emergency notification systems in your area

Sign up for your community's emergency alert system if available."""
    
    # Helping others
    elif any(keyword in message for keyword in ['help others', 'community', 'volunteer', 'assist', 'neighbor']):
        return """**Supporting Your Community During Floods**

Here's how you can help others safely:

- **Check on vulnerable neighbors** (elderly, disabled, those with young children)
- **Share resources** like food, water, and shelter when possible
- **Volunteer with recognized organizations** rather than self-deploying
- **Donate to reputable disaster relief organizations**
- **Offer transportation** to those who need evacuation assistance
- **Help others prepare** by sharing information about emergency plans

Remember: Your safety comes first. Don't put yourself at risk while trying to help others."""
    
    # General flood information
    elif any(keyword in message for keyword in ['what is flood', 'flood type', 'cause of flood']):
        return """**Understanding Different Types of Floods**

Floods come in several forms:

- **Flash floods**: Rapid flooding of low-lying areas, typically within 6 hours of heavy rain
- **River floods**: Occur when water levels rise over river banks
- **Coastal floods**: Result from storm surges, tsunamis, or rising sea levels
- **Urban floods**: Happen when drainage systems are overwhelmed
- **Pluvial floods**: Surface water flooding from heavy rainfall before reaching waterways

Flooding can be caused by:
- Heavy rainfall
- Snow melt
- Dam or levee breaks
- Storm surges
- Urban development (increased impermeable surfaces)
- Climate change (increasing frequency and intensity of extreme weather events)"""
    
    # Flood insurance
    elif any(keyword in message for keyword in ['insurance', 'coverage', 'claim', 'property', 'damage']):
        return """**Flood Insurance and Damage Claims**

Important information about flood insurance:

- **Standard homeowner's insurance typically doesn't cover flood damage**
- **National Flood Insurance Program (NFIP)** provides coverage in participating communities
- **30-day waiting period** usually applies before coverage takes effect
- **Document all damaged items** with photos and detailed descriptions
- **Keep all receipts** for repairs and replacement items
- **Contact your insurance agent immediately** after a flood

If you're in a high-risk flood area with a federally-backed mortgage, flood insurance is legally required."""
    
    # Driving in floods
    elif any(keyword in message for keyword in ['drive', 'car', 'vehicle', 'driving']):
        return """**Safety Rules for Driving Near Floods**

Follow these critical guidelines:

- **NEVER drive through flooded roadways** - "Turn Around, Don't Drown"
- **Just 12 inches of water** can float most vehicles
- **6 inches of water** can cause loss of control or stalling
- **2 feet of rushing water** can carry away most vehicles, including SUVs and pickups
- **Hidden dangers** beneath floodwater include:
  - Washed-out roads
  - Debris and downed power lines
  - Unstable road surfaces

If your vehicle is surrounded by rising water, abandon it quickly and move to higher ground."""
    
    # Greeting or help request
    elif any(keyword in message for keyword in ['hello', 'hi', 'help', 'information', 'assist']):
        return """**Welcome to the Flood Safety Assistant**

I'm here to provide flood-related safety information and guidance. You can ask me about:

- Creating emergency plans and evacuation procedures
- What to do before, during, and after a flood
- Health concerns related to flooding
- Keeping pets safe during floods
- Understanding flood warnings and alerts
- How to help others in your community
- Different types of floods and their causes
- Flood insurance and damage claims

How can I assist you with flood safety today?"""
    
    # Default response for unrecognized queries
    else:
        return """I'm your flood safety assistant, focused on providing information about flood preparation, response, and recovery.

If you have a specific flood safety question, please try rephrasing it. You can ask about:

- Emergency preparedness
- What to do during a flood
- Health concerns
- Pet safety
- Warning systems
- Helping others
- Types of floods
- Insurance coverage
- Driving safety

For immediate emergency assistance, please call 911 or your local emergency services."""

if __name__ == "__main__":
    app.run(debug=True)