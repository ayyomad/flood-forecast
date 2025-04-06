// Community page functionality

document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const createPostBtn = document.getElementById('create-post-btn');
  const postForm = document.getElementById('post-form');
  const cancelPostBtn = document.getElementById('cancel-post');
  const postsContainer = document.getElementById('posts-container');
  const filterButtons = document.querySelectorAll('[data-filter]');
  
  // Toggle post form visibility
  if (createPostBtn) {
    createPostBtn.addEventListener('click', function() {
      postForm.classList.toggle('hidden');
      
      // Scroll to form if visible
      if (!postForm.classList.contains('hidden')) {
        postForm.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  
  // Cancel post creation
  if (cancelPostBtn) {
    cancelPostBtn.addEventListener('click', function() {
      postForm.classList.add('hidden');
    });
  }
  
  // Filter posts
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all filter buttons
      filterButtons.forEach(btn => {
        btn.classList.remove('bg-primary-50', 'text-primary-700');
        btn.classList.add('text-gray-700', 'hover:bg-gray-50');
      });
      
      // Add active class to clicked button
      this.classList.remove('text-gray-700', 'hover:bg-gray-50');
      this.classList.add('bg-primary-50', 'text-primary-700');
      
      const filter = this.getAttribute('data-filter');
      filterPosts(filter);
    });
  });
  
  // Handle post form submission
  if (postForm) {
    const form = postForm.querySelector('form');
    
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form data
      const title = form.querySelector('#title').value;
      const location = form.querySelector('#location').value;
      const category = form.querySelector('#category').value;
      const urgency = form.querySelector('#urgency').value;
      const description = form.querySelector('#description').value;
      const anonymous = form.querySelector('#anonymous').checked;
      
      // Create post (in a real app, this would send data to the server)
      createPost({
        title,
        location,
        category,
        urgency,
        description,
        anonymous,
        timestamp: new Date(),
        authorName: anonymous ? 'Anonymous' : 'Current User',
        authorImg: anonymous ? 
          'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' : 
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        upvotes: 0,
        comments: 0
      });
      
      // Reset form and hide it
      form.reset();
      postForm.classList.add('hidden');
      
      // Show success message
      showNotification('Post created successfully!', 'success');
    });
  }
  
  // Function to create a new post
  function createPost(postData) {
    // Get border color based on category
    let borderColor = 'border-primary-500';
    let badgeColor = 'bg-blue-100 text-primary-800';
    let iconClass = 'fas fa-newspaper';
    
    switch (postData.category) {
      case 'emergency':
        borderColor = 'border-danger';
        badgeColor = 'bg-red-100 text-danger';
        iconClass = 'fas fa-exclamation-circle';
        break;
      case 'help':
        borderColor = 'border-warning';
        badgeColor = 'bg-yellow-100 text-yellow-800';
        iconClass = 'fas fa-hands-helping';
        break;
      case 'resource':
        borderColor = 'border-success';
        badgeColor = 'bg-green-100 text-green-800';
        iconClass = 'fas fa-hand-holding-heart';
        break;
      case 'warning':
        borderColor = 'border-orange-500';
        badgeColor = 'bg-orange-100 text-orange-800';
        iconClass = 'fas fa-exclamation-triangle';
        break;
    }
    
    // Get text for urgency
    let urgencyText = 'Low Priority';
    switch (postData.urgency) {
      case 'low':
        urgencyText = 'Low - For Awareness';
        break;
      case 'medium':
        urgencyText = 'Medium - Needs Attention';
        break;
      case 'high':
        urgencyText = 'High - Urgent Action Required';
        break;
      case 'critical':
        urgencyText = 'Critical - Life-threatening';
        break;
    }
    
    // Format the time
    const timeAgo = getTimeAgo(postData.timestamp);
    
    // Create post HTML
    const postHTML = `
      <div class="bg-white shadow-sm rounded-lg overflow-hidden border-l-4 ${borderColor}" data-category="${postData.category}">
        <div class="p-4">
          <div class="flex justify-between items-start">
            <div class="flex items-start space-x-3">
              <img class="h-10 w-10 rounded-full" src="${postData.authorImg}" alt="">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">${postData.title}</h3>
                <div class="mt-1 flex items-center">
                  <span class="text-sm text-gray-600">Posted by</span>
                  <span class="ml-1 text-sm font-medium text-gray-900">${postData.authorName}</span>
                  <span class="mx-1 text-gray-500">•</span>
                  <span class="text-sm text-gray-500">${timeAgo}</span>
                </div>
              </div>
            </div>
            <div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}">
                <i class="${iconClass} mr-1"></i>
                ${urgencyText}
              </span>
            </div>
          </div>
          
          <div class="mt-4">
            <p class="text-gray-700">${postData.description}</p>
            <div class="mt-3 flex items-center text-sm text-gray-600">
              <i class="fas fa-map-marker-alt text-primary-500 mr-2"></i>
              <span>${postData.location}</span>
            </div>
          </div>
          
          <div class="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <div class="flex space-x-4">
              <button class="flex items-center text-gray-500 hover:text-primary-600 upvote-btn">
                <i class="fas fa-arrow-up mr-1"></i>
                <span>${postData.upvotes}</span>
              </button>
              <button class="flex items-center text-gray-500 hover:text-primary-600">
                <i class="fas fa-comment mr-1"></i>
                <span>${postData.comments} comments</span>
              </button>
            </div>
            <div>
              <button class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-primary-700 bg-primary-50 hover:bg-primary-100">
                <i class="fas fa-share-alt mr-1"></i>
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add post to top of container
    postsContainer.insertAdjacentHTML('afterbegin', postHTML);
    
    // Add event listener to new upvote button
    const newPost = postsContainer.firstElementChild;
    const upvoteBtn = newPost.querySelector('.upvote-btn');
    
    upvoteBtn.addEventListener('click', function() {
      const countSpan = this.querySelector('span');
      let count = parseInt(countSpan.textContent);
      countSpan.textContent = count + 1;
      
      // Temporarily show appreciation
      this.classList.add('text-primary-600');
      setTimeout(() => {
        this.classList.remove('text-primary-600');
      }, 500);
    });
  }
  
  // Function to filter posts
  function filterPosts(filter) {
    const posts = postsContainer.querySelectorAll('[data-category]');
    
    posts.forEach(post => {
      if (filter === 'all' || post.getAttribute('data-category') === filter) {
        post.classList.remove('hidden');
      } else {
        post.classList.add('hidden');
      }
    });
  }
  
  // Helper function to format time ago
  function getTimeAgo(timestamp) {
    const now = new Date();
    const diff = Math.floor((now - timestamp) / 1000); // seconds ago
    
    if (diff < 60) {
      return 'just now';
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diff / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }
  
  // Function to show notifications
  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 transform transition-transform duration-300 ease-in-out translate-y-0`;
    
    // Set background color based on type
    switch (type) {
      case 'success':
        notification.classList.add('bg-green-500', 'text-white');
        break;
      case 'error':
        notification.classList.add('bg-red-500', 'text-white');
        break;
      case 'warning':
        notification.classList.add('bg-yellow-500', 'text-white');
        break;
      default:
        notification.classList.add('bg-primary-500', 'text-white');
    }
    
    // Set content
    notification.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} mr-3"></i>
        <span>${message}</span>
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('translate-y-full', 'opacity-0');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
  
  // Add upvote functionality to existing posts
  const upvoteBtns = document.querySelectorAll('.upvote-btn');
  upvoteBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const countSpan = this.querySelector('span');
      let count = parseInt(countSpan.textContent);
      countSpan.textContent = count + 1;
      
      // Temporarily show appreciation
      this.classList.add('text-primary-600');
      setTimeout(() => {
        this.classList.remove('text-primary-600');
      }, 500);
    });
  });
}); 