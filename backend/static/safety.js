// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeChat();
  initializeShelterFinder();
  initializeUI();
});

/**
 * Initialize the chat interface for safety assistant
 */
function initializeChat() {
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');
  const chatMessages = document.getElementById('chat-messages');
  const clearChatButton = document.getElementById('clear-chat');

  // Auto-resize textarea based on content
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
  });

  // Handle form submission
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = messageInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addUserMessage(message);
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Show typing indicator
    const typingIndicator = addTypingIndicator();
    
    try {
      // Send to backend API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Remove typing indicator and add assistant response
        if (typingIndicator) {
          typingIndicator.remove();
        }
        addAssistantMessage(data.response);
        // Save chat history
        saveChatHistory();
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error:', error);
      // Remove typing indicator and add error message
      if (typingIndicator) {
        typingIndicator.remove();
      }
      addAssistantMessage(
        'I\'m sorry, I\'m having trouble connecting to the server. Please try again later.'
      );
      // Save chat history
      saveChatHistory();
    }
    
    // Scroll to bottom
    scrollToBottom();
  });

  // Clear chat history
  clearChatButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      clearChat();
    }
  });

  // Load chat history from localStorage if exists
  loadChatHistory();
}

/**
 * Add a message to the chat interface
 * @param {string} sender - 'user' or 'assistant'
 * @param {string} message - Message content
 */
function addUserMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  const messageContainer = document.createElement('div');
  messageContainer.className = 'message-container';

  // Create message HTML
  messageContainer.innerHTML = `
    <div class="flex justify-end">
      <div class="user-message p-4 shadow-sm border border-gray-100">
        <p class="text-gray-700">${escapeHTML(message)}</p>
      </div>
      <div class="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center ml-3 mt-1">
        <i class="fas fa-user text-gray-600"></i>
      </div>
    </div>
  `;
  
  chatMessages.appendChild(messageContainer);
  scrollToBottom();
}

/**
 * Add a message to the chat interface
 * @param {string} sender - 'user' or 'assistant'
 * @param {string} message - Message content
 */
function addAssistantMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  const messageContainer = document.createElement('div');
  messageContainer.className = 'message-container';

  // Create message HTML
  messageContainer.innerHTML = `
    <div class="flex">
      <div class="w-10 h-10 rounded-full bg-primary-100 flex-shrink-0 flex items-center justify-center mr-3 mt-1">
        <i class="fas fa-robot text-primary-600"></i>
      </div>
      <div class="assistant-message p-4 shadow-sm border border-gray-100">
        <div class="prose prose-sm max-w-none">
          ${formatMessage(message)}
        </div>
      </div>
    </div>
  `;
  
  chatMessages.appendChild(messageContainer);
  
  // Add animation to assistant message
  const assistantMessage = messageContainer.querySelector('.assistant-message');
  assistantMessage.style.opacity = '0';
  assistantMessage.style.transform = 'translateY(10px)';
  assistantMessage.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  
  setTimeout(() => {
    assistantMessage.style.opacity = '1';
    assistantMessage.style.transform = 'translateY(0)';
  }, 10);
  
  scrollToBottom();
}

/**
 * Show typing indicator
 */
function addTypingIndicator() {
  const chatMessages = document.getElementById('chat-messages');
  const messageContainer = document.createElement('div');
  messageContainer.className = 'message-container typing-message';

  // Create typing indicator HTML
  messageContainer.innerHTML = `
    <div class="flex">
      <div class="w-10 h-10 rounded-full bg-primary-100 flex-shrink-0 flex items-center justify-center mr-3 mt-1">
        <i class="fas fa-robot text-primary-600"></i>
      </div>
      <div class="assistant-message p-4 shadow-sm border border-gray-100" style="min-height: 40px;">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  `;
  
  chatMessages.appendChild(messageContainer);
  scrollToBottom();
  
  return messageContainer;
}

/**
 * Format message with line breaks and links
 * @param {string} message - Raw message
 * @returns {string} Formatted HTML message
 */
function formatMessage(message) {
  // Convert URLs to links
  message = message.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" class="text-primary-600 hover:underline">$1</a>'
  );
  
  // Convert asterisks to bold
  message = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  message = message.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert bullet points
  message = message.replace(/^- (.*?)$/gm, '<li>$1</li>');
  message = message.replace(/<li>(.*?)<\/li>/g, '<ul class="ml-4 list-disc">$&</ul>');
  
  // Convert line breaks to paragraphs
  const paragraphs = message.split('\n\n');
  return paragraphs.map(p => {
    if (p.trim() === '') return '';
    if (p.includes('<ul')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

/**
 * Save chat history to localStorage
 */
function saveChatHistory() {
  const chatMessages = document.getElementById('chat-messages');
  localStorage.setItem('chatHistory', chatMessages.innerHTML);
}

/**
 * Load chat history from localStorage
 */
function loadChatHistory() {
  const chatHistory = localStorage.getItem('chatHistory');
  const chatMessages = document.getElementById('chat-messages');
  
  if (chatHistory) {
    chatMessages.innerHTML = chatHistory;
    scrollToBottom();
  }
}

/**
 * Clear chat history
 */
function clearChat() {
  const chatMessages = document.getElementById('chat-messages');
  
  // Remove all messages except the welcome message
  while (chatMessages.children.length > 1) {
    chatMessages.removeChild(chatMessages.lastChild);
  }
  
  // Clear localStorage
  localStorage.removeItem('chatHistory');
}

/**
 * Initialize shelter finder functionality
 */
function initializeShelterFinder() {
  const locateSheltersButton = document.getElementById('locate-shelters');
  const shelterList = document.getElementById('shelter-list');
  
  locateSheltersButton.addEventListener('click', () => {
    // Show loading state
    locateSheltersButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Finding shelters...';
    locateSheltersButton.disabled = true;
    
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In a real app, we would call an API with these coordinates
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          
          // For demo purposes, we'll show mock shelters after a short delay
          setTimeout(() => {
            showMockShelters(latitude, longitude);
            locateSheltersButton.innerHTML = '<i class="fas fa-location-arrow mr-2"></i> Refresh Shelters';
            locateSheltersButton.disabled = false;
          }, 1500);
        },
        (error) => {
          console.error('Geolocation error:', error);
          shelterList.innerHTML = `
            <div class="text-center py-4">
              <i class="fas fa-exclamation-circle text-red-500 text-2xl mb-2"></i>
              <p class="text-red-600">Unable to get your location.</p>
              <p class="text-xs text-gray-500 mt-1">Please enable location access and try again.</p>
            </div>
          `;
          shelterList.classList.remove('hidden');
          locateSheltersButton.innerHTML = '<i class="fas fa-location-arrow mr-2"></i> Try Again';
          locateSheltersButton.disabled = false;
        }
      );
    } else {
      shelterList.innerHTML = `
        <div class="text-center py-4">
          <i class="fas fa-exclamation-circle text-red-500 text-2xl mb-2"></i>
          <p class="text-red-600">Geolocation is not supported by your browser.</p>
        </div>
      `;
      shelterList.classList.remove('hidden');
      locateSheltersButton.innerHTML = '<i class="fas fa-location-arrow mr-2"></i> Find Nearby Shelters';
      locateSheltersButton.disabled = false;
    }
  });
}

/**
 * Display mock shelters
 * @param {number} latitude - User latitude
 * @param {number} longitude - User longitude
 */
function showMockShelters(latitude, longitude) {
  const shelterList = document.getElementById('shelter-list');
  
  // Mock shelter data - in a real app, this would come from an API
  const mockShelters = [
    {
      name: 'Central High School',
      address: '123 Main St',
      distance: '1.2 miles',
      status: 'Open'
    },
    {
      name: 'Community Center',
      address: '456 Oak Ave',
      distance: '2.5 miles',
      status: 'Open'
    },
    {
      name: 'Faith Baptist Church',
      address: '789 Church Rd',
      distance: '3.1 miles',
      status: 'Open'
    }
  ];
  
  // Clear previous results
  shelterList.innerHTML = '';
  
  // Add mock shelters to list
  mockShelters.forEach(shelter => {
    const shelterItem = document.createElement('div');
    shelterItem.className = 'p-3 bg-gray-50 rounded-lg';
    shelterItem.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h4 class="text-sm font-medium text-gray-800">${shelter.name}</h4>
          <p class="text-xs text-gray-500">${shelter.address}</p>
          <div class="mt-1 flex items-center">
            <span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">${shelter.status}</span>
            <span class="text-xs text-gray-500 ml-2">${shelter.distance}</span>
          </div>
        </div>
        <a 
          href="https://maps.google.com/?q=${encodeURIComponent(shelter.name + ' ' + shelter.address)}" 
          target="_blank"
          class="bg-primary-50 hover:bg-primary-100 text-primary-600 p-2 rounded-full"
          title="Get directions"
        >
          <i class="fas fa-directions"></i>
        </a>
      </div>
    `;
    shelterList.appendChild(shelterItem);
  });
  
  shelterList.classList.remove('hidden');
}

// Initialize UI elements
function initializeUI() {
  // Auto-growing textarea
  const textarea = document.getElementById("message-input");
  if (textarea) {
    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      textarea.style.height = (textarea.scrollHeight) + "px";
      // Reset height if empty
      if (textarea.value.trim() === "") {
        textarea.style.height = "";
      }
    });
  }

  // Clear chat button
  const clearChatBtn = document.getElementById("clear-chat");
  if (clearChatBtn) {
    clearChatBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear the chat history?")) {
        const chatMessages = document.getElementById("chat-messages");
        // Keep only the welcome message
        const welcomeMessage = chatMessages.querySelector(".message-container");
        chatMessages.innerHTML = "";
        chatMessages.appendChild(welcomeMessage);
        // Clear local storage chat history
        localStorage.removeItem("chatHistory");
      }
    });
  }
}

// Scroll to bottom of chat
function scrollToBottom() {
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

// Helper function to escape HTML
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
} 