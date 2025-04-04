document.addEventListener('DOMContentLoaded', () => {
    const profileTrigger = document.querySelector('.profile-trigger');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const logoutBtn = document.getElementById('logout-btn');
    const profileBtn = document.getElementById('profile-btn');

    // Toggle dropdown
    profileTrigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdownMenu?.classList.remove('show');
    });

    // Prevent dropdown from closing when clicking inside
    dropdownMenu?.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Handle logout
    logoutBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/logout', { method: 'POST' });
            if (response.ok) {
                localStorage.removeItem('user');
                window.location.href = '/';
            }
        } catch (err) {
            console.error('Logout failed:', err);
        }
    });

    // Handle profile navigation
    profileBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            window.location.href = `/profile/${user.username}`;
        }
    });

    // Initialize profile menu state
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('username').textContent = user.username;
        document.querySelector('.profile-menu').classList.remove('hidden');
        document.querySelector('.login-btn').classList.add('hidden');
    }
});