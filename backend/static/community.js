// Main initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the community page functionality
    initializeFilters();
    initializePostForm();
    initializePostInteractions();
});

/**
 * Initialize filter functionality for posts
 */
function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const allPosts = document.querySelectorAll('[data-category]');
    
    if (filterButtons.length > 0) {
        // Set initial active state
        const activeFilterBtn = document.querySelector('[data-filter="all"]');
        if (activeFilterBtn) {
            activeFilterBtn.classList.add('bg-primary-50', 'text-primary-700');
            activeFilterBtn.classList.remove('text-gray-700', 'hover:bg-gray-50');
        }
        
        // Add click event to each filter button
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active state from all buttons
                filterButtons.forEach(btn => {
                    btn.classList.remove('bg-primary-50', 'text-primary-700');
                    btn.classList.add('text-gray-700', 'hover:bg-gray-50');
                });
                
                // Add active state to clicked button
                button.classList.add('bg-primary-50', 'text-primary-700');
                button.classList.remove('text-gray-700', 'hover:bg-gray-50');
                
                // Get filter value
                const filter = button.getAttribute('data-filter');
                
                // Filter posts
                allPosts.forEach(post => {
                    if (filter === 'all' || post.getAttribute('data-category') === filter) {
                        post.classList.remove('hidden');
                    } else {
                        post.classList.add('hidden');
                    }
                });
            });
        });
    }
}

/**
 * Initialize post form functionality
 */
function initializePostForm() {
    const createPostBtn = document.getElementById('create-post-btn');
    const postForm = document.getElementById('post-form');
    const cancelPostBtn = document.getElementById('cancel-post');
    const postFormSubmit = postForm?.querySelector('form');
    
    if (createPostBtn && postForm) {
        // Show post form when create post button is clicked
        createPostBtn.addEventListener('click', () => {
            postForm.classList.remove('hidden');
            // Scroll to form
            postForm.scrollIntoView({ behavior: 'smooth' });
        });
        
        // Hide post form when cancel button is clicked
        if (cancelPostBtn) {
            cancelPostBtn.addEventListener('click', () => {
                postForm.classList.add('hidden');
            });
        }
        
        // Handle form submission
        if (postFormSubmit) {
            postFormSubmit.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Get form data
                const formData = new FormData(postFormSubmit);
                const title = formData.get('title');
                const description = formData.get('description');
                const location = formData.get('location');
                const category = formData.get('category');
                const urgency = formData.get('urgency');
                const anonymous = formData.get('anonymous') === 'on';
                
                // Basic validation
                if (!title || !description || !location) {
                    showNotification('Please fill in all required fields', 'error');
                    return;
                }
                
                // Send data to server (API call)
                fetch('/community/posts', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error creating post');
                    }
                    return response.json();
                })
                .then(data => {
                    // Hide form
                    postForm.classList.add('hidden');
                    
                    // Show success message
                    showNotification('Your post has been created successfully!', 'success');
                    
                    // Refresh posts (or add the new post to the DOM)
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                })
                .catch(error => {
                    showNotification('Error creating post: ' + error.message, 'error');
                });
            });
        }
    }
}

/**
 * Initialize post interaction functionality
 */
function initializePostInteractions() {
    // Upvote buttons
    const upvoteButtons = document.querySelectorAll('.upvote-btn');
    
    upvoteButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Toggle active state
            if (button.classList.contains('text-primary-600')) {
                button.classList.remove('text-primary-600');
                button.classList.add('text-gray-500');
                // Decrement counter
                const counter = button.querySelector('span');
                if (counter) {
                    counter.textContent = (parseInt(counter.textContent) - 1).toString();
                }
            } else {
                button.classList.add('text-primary-600');
                button.classList.remove('text-gray-500');
                // Increment counter
                const counter = button.querySelector('span');
                if (counter) {
                    counter.textContent = (parseInt(counter.textContent) + 1).toString();
                }
            }
            
            // If we had a backend, we would make an API call here
            // For now, just simulate a success notification
            showNotification('Vote recorded', 'success');
        });
    });
    
    // Share buttons
    const shareButtons = document.querySelectorAll('.share-btn');
    
    shareButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get the post title from a parent element
            const postCard = button.closest('[data-category]');
            const postTitle = postCard?.querySelector('h3')?.textContent || 'Community post';
            
            // Create a shareable link (in a real app, this would be a unique URL)
            const shareLink = window.location.href;
            
            // Try to use the Web Share API if available
            if (navigator.share) {
                navigator.share({
                    title: postTitle,
                    text: 'Check out this post on TidePulse',
                    url: shareLink
                })
                .catch(error => {
                    console.error('Error sharing:', error);
                });
            } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(shareLink)
                    .then(() => {
                        showNotification('Link copied to clipboard', 'success');
                    })
                    .catch(err => {
                        showNotification('Failed to copy link', 'error');
                    });
            }
        });
    });
}

/**
 * Show notification toast
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification-toast');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `fixed top-24 right-4 z-50 max-w-sm bg-white rounded-lg shadow-lg border-l-4 overflow-hidden transform transition-all duration-300 opacity-0 translate-x-full notification-toast ${
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