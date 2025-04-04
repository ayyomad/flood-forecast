function toggleForm() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    // Smooth transition
    loginForm.style.opacity = '0';
    signupForm.style.opacity = '0';
    
    setTimeout(() => {
        loginForm.classList.toggle('hidden');
        signupForm.classList.toggle('hidden');
        
        // Show the visible form
        const visibleForm = loginForm.classList.contains('hidden') ? signupForm : loginForm;
        visibleForm.style.opacity = '1';
    }, 200);
}

// Show error messages if any
function showError(message) {
    const container = document.getElementById('auth-container');
    const existingError = container.querySelector('.error-message');
    
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    container.insertBefore(errorDiv, container.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Add this to handle form submissions
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(formData),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store user data
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/';
        } else {
            showError(data.error || 'Invalid credentials');
        }
    } catch (err) {
        console.error('Login error:', err);
        showError('An error occurred. Please try again.');
    }
});

// Add these functions
function updateAuthUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const profileMenu = document.getElementById('profile-menu');
    const username = document.getElementById('username');

    if (user) {
        loginBtn.classList.add('hidden');
        profileMenu.classList.remove('hidden');
        username.textContent = user.username;
    } else {
        loginBtn.classList.remove('hidden');
        profileMenu.classList.add('hidden');
    }
}

// Check auth state on page load
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        updateAuthUI(user);
    }
});