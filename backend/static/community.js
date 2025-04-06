// Main initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the community page functionality
    initializeFilters();
    initializePostForm();
    initializePostInteractions();
    fetchAndDisplayPosts();
});

/**
 * Initialize filter functionality for posts
 */
function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
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
                const allPosts = document.querySelectorAll('[data-category]');
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
 * Fetch posts from the server and display them
 */
function fetchAndDisplayPosts() {
    const postsContainer = document.getElementById('posts-container');
    
    if (!postsContainer) return;
    
    // Clear loading state or placeholder
    postsContainer.innerHTML = `
        <div class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
    `;
    
    // Fetch posts from the server
    fetch('/community/posts')
        .then(response => response.json())
        .then(posts => {
            if (posts.length === 0) {
                postsContainer.innerHTML = `
                    <div class="bg-white shadow-sm rounded-lg p-8 text-center">
                        <div class="text-gray-400 mb-4">
                            <i class="fas fa-comments text-4xl"></i>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                        <p class="text-gray-600 mb-4">Be the first to share an update with your community.</p>
                        <button id="empty-create-post-btn" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                            <i class="fas fa-plus mr-2"></i> Create Post
                        </button>
                    </div>
                `;
                
                // Add event listener to the button
                const emptyCreatePostBtn = document.getElementById('empty-create-post-btn');
                if (emptyCreatePostBtn) {
                    emptyCreatePostBtn.addEventListener('click', () => {
                        const createPostBtn = document.getElementById('create-post-btn');
                        if (createPostBtn) {
                            createPostBtn.click();
                        }
                    });
                }
                
                return;
            }
            
            // Clear container
            postsContainer.innerHTML = '';
            
            // Add each post to the container
            posts.forEach(post => {
                // Determine category styling
                let categoryClass, categoryIcon, categoryLabel;
                
                switch(post.category) {
                    case 'emergency':
                        categoryClass = 'bg-red-100 text-danger';
                        categoryIcon = 'fa-exclamation-circle';
                        categoryLabel = 'Emergency';
                        break;
                    case 'help':
                        categoryClass = 'bg-yellow-100 text-yellow-800';
                        categoryIcon = 'fa-hands-helping';
                        categoryLabel = 'Help Needed';
                        break;
                    case 'resource':
                        categoryClass = 'bg-green-100 text-green-800';
                        categoryIcon = 'fa-hand-holding-heart';
                        categoryLabel = 'Resource';
                        break;
                    case 'update':
                    default:
                        categoryClass = 'bg-blue-100 text-primary-800';
                        categoryIcon = 'fa-newspaper';
                        categoryLabel = 'Update';
                        break;
                }
                
                // Determine urgency styling and label
                let urgencyClass, urgencyLabel;
                
                switch(post.urgency) {
                    case 'critical':
                        urgencyClass = 'bg-red-100 text-danger';
                        urgencyLabel = 'Critical';
                        break;
                    case 'high':
                        urgencyClass = 'bg-orange-100 text-orange-800';
                        urgencyLabel = 'High';
                        break;
                    case 'low':
                        urgencyClass = 'bg-green-100 text-green-800';
                        urgencyLabel = 'Low';
                        break;
                    case 'medium':
                    default:
                        urgencyClass = 'bg-yellow-100 text-yellow-800';
                        urgencyLabel = 'Medium';
                        break;
                }
                
                // Determine border color based on category
                let borderColor;
                
                switch(post.category) {
                    case 'emergency':
                        borderColor = 'border-danger';
                        break;
                    case 'help':
                        borderColor = 'border-warning';
                        break;
                    case 'resource':
                        borderColor = 'border-success';
                        break;
                    case 'update':
                    default:
                        borderColor = 'border-primary-500';
                        break;
                }
                
                // Create post HTML
                const postHTML = `
                    <div class="bg-white shadow-sm rounded-lg overflow-hidden border-l-4 ${borderColor}" data-category="${post.category}" data-post-id="${post.id}">
                        <div class="p-4">
                            <div class="flex justify-between items-start">
                                <div class="flex items-start space-x-3">
                                    <div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-lg font-semibold text-gray-900">${post.title}</h3>
                                        <div class="mt-1 flex items-center">
                                            <span class="text-sm text-gray-600">Posted by</span>
                                            <span class="ml-1 text-sm font-medium text-gray-900">${post.username || 'Anonymous'}</span>
                                            <span class="mx-1 text-gray-500">•</span>
                                            <span class="text-sm text-gray-500">${post.created_at}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex space-x-2">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${urgencyClass}">
                                        <i class="fas fa-exclamation-circle mr-1"></i>
                                        ${urgencyLabel}
                                    </span>
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryClass}">
                                        <i class="fas ${categoryIcon} mr-1"></i>
                                        ${categoryLabel}
                                    </span>
                                </div>
                            </div>

                            <div class="mt-4">
                                <p class="text-gray-700">${post.description}</p>
                                <div class="mt-3 flex items-center text-sm text-gray-600">
                                    <i class="fas fa-map-marker-alt text-primary-500 mr-2"></i>
                                    <span>${post.location}</span>
                                </div>
                            </div>

                            <div class="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                                <div class="flex space-x-4">
                                    <button class="flex items-center text-gray-500 hover:text-primary-600 upvote-btn" data-post-id="${post.id}">
                                        <i class="fas fa-arrow-up mr-1"></i>
                                        <span>${post.upvotes}</span>
                                    </button>
                                    <button class="flex items-center text-gray-500 hover:text-primary-600 comment-btn" data-post-id="${post.id}">
                                        <i class="fas fa-comment mr-1"></i>
                                        <span>Comment</span>
                                    </button>
                                </div>
                                <div>
                                    <button class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-primary-700 bg-primary-50 hover:bg-primary-100 share-btn" data-post-id="${post.id}">
                                        <i class="fas fa-share-alt mr-1"></i>
                                        Share
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Comments section (hidden by default) -->
                            <div class="mt-4 pt-3 border-t border-gray-100 hidden comment-section" id="comments-${post.id}">
                                <h4 class="text-sm font-medium text-gray-900 mb-3">Comments</h4>
                                
                                <!-- Comment form -->
                                <form class="mb-4 comment-form" data-post-id="${post.id}">
                                    <div class="flex">
                                        <div class="flex-grow mr-3">
                                            <textarea 
                                                class="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500" 
                                                rows="2" 
                                                placeholder="Add a comment..."
                                                required
                                            ></textarea>
                                        </div>
                                        <div>
                                            <button type="submit" class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700">
                                                Post
                                            </button>
                                        </div>
                                    </div>
                                    <div class="mt-2">
                                        <label class="inline-flex items-center text-sm text-gray-600">
                                            <input type="checkbox" class="form-checkbox h-4 w-4 text-primary-600 transition duration-150 ease-in-out" name="anonymous">
                                            <span class="ml-2">Post anonymously</span>
                                        </label>
                                    </div>
                                </form>
                                
                                <!-- Comments container -->
                                <div class="space-y-3 comments-container">
                                    <!-- Comments will be loaded here -->
                                    <div class="text-center text-sm text-gray-500 py-4">
                                        No comments yet. Be the first to comment!
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add post to container
                postsContainer.insertAdjacentHTML('beforeend', postHTML);
            });
            
            // Initialize interactions for the new posts
            initializePostInteractions();
        })
        .catch(error => {
            console.error('Error fetching posts:', error);
            postsContainer.innerHTML = `
                <div class="bg-white shadow-sm rounded-lg p-8 text-center">
                    <div class="text-red-500 mb-4">
                        <i class="fas fa-exclamation-triangle text-4xl"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Error loading posts</h3>
                    <p class="text-gray-600 mb-4">There was a problem loading the community posts. Please try again later.</p>
                    <button onclick="fetchAndDisplayPosts()" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                        <i class="fas fa-redo mr-2"></i> Try Again
                    </button>
                </div>
            `;
        });
}

/**
 * Initialize post form functionality
 */
function initializePostForm() {
    const createPostBtn = document.getElementById('create-post-btn');
    const postForm = document.getElementById('post-form');
    const cancelPostBtn = document.getElementById('cancel-post');
    const postFormElement = postForm?.querySelector('form');
    
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
                // Clear form fields
                if (postFormElement) {
                    postFormElement.reset();
                }
            });
        }
        
        // Handle form submission
        if (postFormElement) {
            postFormElement.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Show loading state
                const submitBtn = postFormElement.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Posting...';
                
                // Get form data
                const formData = new FormData(postFormElement);
                
                // Basic validation
                const title = formData.get('title');
                const description = formData.get('description');
                const location = formData.get('location');
                
                if (!title || !description || !location) {
                    showNotification('Please fill in all required fields', 'error');
                    
                    // Reset button
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                    return;
                }
                
                // Send data to server (API call)
                fetch('/community/posts', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Server returned an error');
                    }
                    return response;
                })
                .then(() => {
                    // Hide form and reset
                    postForm.classList.add('hidden');
                    postFormElement.reset();
                    
                    // Show success message
                    showNotification('Your post has been created successfully!', 'success');
                    
                    // Refresh posts
                    setTimeout(fetchAndDisplayPosts, 500);
                })
                .catch(error => {
                    console.error('Error creating post:', error);
                    showNotification('Error creating post. Please try again.', 'error');
                })
                .finally(() => {
                    // Reset button
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
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
    initializeUpvotes();
    
    // Share buttons
    initializeShareButtons();
    
    // Comment buttons
    initializeCommentButtons();
    
    // Comment forms
    initializeCommentForms();
}

/**
 * Initialize upvote buttons
 */
function initializeUpvotes() {
    const upvoteButtons = document.querySelectorAll('.upvote-btn');
    
    upvoteButtons.forEach(button => {
        // Remove existing event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', () => {
            // Get the post ID
            const postId = newButton.getAttribute('data-post-id');
            
            // Toggle active state visually
            if (newButton.classList.contains('text-primary-600')) {
                newButton.classList.remove('text-primary-600');
                newButton.classList.add('text-gray-500');
                // Decrement counter
                const counter = newButton.querySelector('span');
                if (counter) {
                    counter.textContent = (parseInt(counter.textContent) - 1).toString();
                }
            } else {
                newButton.classList.add('text-primary-600');
                newButton.classList.remove('text-gray-500');
                // Increment counter
                const counter = newButton.querySelector('span');
                if (counter) {
                    counter.textContent = (parseInt(counter.textContent) + 1).toString();
                }
            }
            
            // In a real app, we would make an API call here to update the upvote count
            // For now, just show a notification
            showNotification('Vote recorded', 'success');
        });
    });
}

/**
 * Initialize share buttons
 */
function initializeShareButtons() {
    const shareButtons = document.querySelectorAll('.share-btn');
    
    shareButtons.forEach(button => {
        // Remove existing event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', () => {
            // Get the post ID
            const postId = newButton.getAttribute('data-post-id');
            
            // Get the post title
            const postCard = newButton.closest('[data-category]');
            const postTitle = postCard?.querySelector('h3')?.textContent || 'Community post';
            
            // Create a shareable link
            const shareLink = `${window.location.origin}/community#post-${postId}`;
            
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
 * Initialize comment buttons
 */
function initializeCommentButtons() {
    const commentButtons = document.querySelectorAll('.comment-btn');
    
    commentButtons.forEach(button => {
        // Remove existing event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', () => {
            // Get the post ID
            const postId = newButton.getAttribute('data-post-id');
            
            // Toggle comment section
            const commentSection = document.getElementById(`comments-${postId}`);
            if (commentSection) {
                commentSection.classList.toggle('hidden');
                
                // If opening, focus on the comment textarea
                if (!commentSection.classList.contains('hidden')) {
                    const textarea = commentSection.querySelector('textarea');
                    if (textarea) {
                        textarea.focus();
                    }
                }
            }
        });
    });
}

/**
 * Initialize comment forms
 */
function initializeCommentForms() {
    const commentForms = document.querySelectorAll('.comment-form');
    
    commentForms.forEach(form => {
        // Remove existing event listeners
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        newForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get the post ID
            const postId = newForm.getAttribute('data-post-id');
            
            // Get the comment text
            const textarea = newForm.querySelector('textarea');
            const commentText = textarea?.value.trim();
            
            // Get the anonymous checkbox
            const anonymousCheckbox = newForm.querySelector('input[name="anonymous"]');
            const isAnonymous = anonymousCheckbox?.checked || false;
            
            if (!commentText) {
                showNotification('Please enter a comment', 'error');
                return;
            }
            
            // In a real app, we would make an API call here to save the comment
            // For now, just simulate a successful comment submission
            
            // Add the comment to the UI
            const commentsContainer = newForm.closest('.comment-section').querySelector('.comments-container');
            
            // Clear the "no comments" message if it exists
            if (commentsContainer.textContent.includes('No comments yet')) {
                commentsContainer.innerHTML = '';
            }
            
            const commentHTML = `
                <div class="bg-gray-50 rounded-lg p-3">
                    <div class="flex items-start">
                        <div class="flex-shrink-0 mr-3">
                            <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                                <i class="fas fa-user text-sm"></i>
                            </div>
                        </div>
                        <div class="flex-grow">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-sm font-medium text-gray-900">${isAnonymous ? 'Anonymous' : 'You'}</span>
                                <span class="text-xs text-gray-500">Just now</span>
                            </div>
                            <p class="text-sm text-gray-700">${commentText}</p>
                        </div>
                    </div>
                </div>
            `;
            
            commentsContainer.insertAdjacentHTML('afterbegin', commentHTML);
            
            // Clear the textarea
            if (textarea) {
                textarea.value = '';
            }
            
            // Show success notification
            showNotification('Comment added successfully', 'success');
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