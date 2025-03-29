// Set up socket for real-time communication - don't connect yet
const socket = io('http://localhost:8080', { autoConnect: false });

let currentChatUser = null;
let currentUserId = null; // Store the user ID in variable
let unreadMessages = {}; // Track unread messages by user ID

/**
 * Fetch user data and update profile information
 */
const fetchUserData = () => {
    fetch('http://localhost:8080/api/auth/me', {
        method: 'GET',
        credentials: 'include', // Important for sending cookies
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Not authenticated');
            }
            return response.json();
        })
        .then(userData => {
            console.log("User data fetched:", userData);
            
            // Store the user ID for later use
            currentUserId = userData._id;
            console.log("Current user ID:", currentUserId);
            
            // Fetch unread messages from the server
            fetchUnreadMessages();
            
            // Configure socket with user ID
            socket.auth = { userId: currentUserId };
            
            // Connect socket after getting user ID
            socket.connect();
            
            // Also explicitly tell server about userId after connection
            socket.on('connect', () => {
                console.log("Socket connected with ID:", socket.id);
                socket.emit('setUserId', { userId: currentUserId });
            });
            
            // Update profile picture
            const userImage = document.querySelector('.user-image');
            if (userData.profilePic) {
                userImage.src = userData.profilePic;
            }

            // Update user name
            const userNameElement = document.getElementById('user-name');
            if (userData.fullName) {
                userNameElement.textContent = userData.fullName;
            }
            setupSignOutButton();
        })
        .catch(error => {
            console.error('Authentication error:', error);
            window.location.href = "../pages/login.html";
        });
};

/**
 * Fetch unread messages from the server
 */
const fetchUnreadMessages = () => {
    fetch('http://localhost:8080/api/unread', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch unread messages');
            }
            return response.json();
        })
        .then(data => {
            console.log('Unread messages fetched:', data);
            unreadMessages = data;
            
            // Update badges for all users
            updateAllUnreadBadges();
        })
        .catch(error => {
            console.error('Error fetching unread messages:', error);
        });
};

/**
 * Update unread badges for all users
 */
const updateAllUnreadBadges = () => {
    Object.keys(unreadMessages).forEach(userId => {
        updateUnreadBadge(userId);
    });
};

/**
 * Set up sign out functionality
 */
const setupSignOutButton = () => {
    const signOutBtn = document.getElementById('sign-out-btn');
    signOutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to sign out?')) {
            fetch('http://localhost:8080/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(data => {
                    window.location.href = "../pages/login.html";
                })
                .catch(error => {
                    console.error('Error during logout:', error);
                    window.location.href = "../pages/login.html";
                });
        }
    });
};

/**
 * Fetch and populate users list in the sidebar
 */
const fetchUsersList = async () => {
    try {
        const response = await fetch('http://localhost:8080/api/users', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch users: ' + response.status, response.statusText);
            throw new Error('Failed to fetch users');
        }

        const users = await response.json();
        populateUsersInSidebar(users);
    } catch (error) {
        console.error('Error fetching users:', error);
    }
};

/**
 * Populate users in the sidebar
 * @param {Array} users Array of user objects
 */
const populateUsersInSidebar = (users) => {
    const chatRoomsContainer = document.querySelector('.chat-rooms');
    chatRoomsContainer.innerHTML = ''; // Clear existing users first
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('chat-room', 'user-item');
        userElement.setAttribute('data-user-id', user._id);
        
        // Create status indicator
        const statusIndicator = document.createElement('span');
        statusIndicator.classList.add('status-indicator', 'offline');
        
        // Create user name element
        const userName = document.createElement('span');
        userName.classList.add('user-name');
        userName.textContent = user.fullName || user.username || 'Anonymous User';
        
        // Append elements to user container
        userElement.appendChild(statusIndicator);
        userElement.appendChild(userName);
        
        // Add unread message badge if there are unread messages
        if (unreadMessages[user._id] && unreadMessages[user._id] > 0) {
            const badge = document.createElement('span');
            badge.classList.add('unread-badge');
            badge.textContent = unreadMessages[user._id] > 99 ? '99+' : unreadMessages[user._id].toString();
            userElement.appendChild(badge);
        }

        userElement.addEventListener('click', () => {
            // Add selected class to current and remove from others
            document.querySelectorAll('.chat-room').forEach(el => el.classList.remove('selected'));
            userElement.classList.add('selected');
            
            openChatWithUser(user).then(r => console.log('Chat opened with:', user.fullName || user.username));
        });

        chatRoomsContainer.appendChild(userElement);
    });
};

/**
 * Format a date object to display time
 * @param {Date} date - The date to format
 * @returns {string} Formatted time string
 */
const formatMessageTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    
    // Format time as HH:MM
    const hours = messageDate.getHours().toString().padStart(2, '0');
    const minutes = messageDate.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    // If not today, add date
    if (now.toDateString() !== messageDate.toDateString()) {
        const month = messageDate.toLocaleDateString('en-US', { month: 'short' });
        const day = messageDate.getDate();
        return `${month} ${day}, ${timeString}`;
    }
    
    return timeString;
};

/**
 * Create a message element
 * @param {Object} message - Message object
 * @param {boolean} isSent - Whether message was sent by current user
 * @param {string} username - Username to display for received messages
 * @returns {HTMLElement} The message element
 */
const createMessageElement = (message, isSent, username) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(isSent ? 'sent' : 'received');
    
    // Add content wrapper div
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content');
    
    // Add message text
    const contentText = isSent ? `You: ${message.message}` : `${username || 'User'}: ${message.message}`;
    contentWrapper.textContent = contentText;
    
    messageElement.appendChild(contentWrapper);
    
    // Add timestamp
    const timestamp = document.createElement('span');
    timestamp.classList.add('message-time');
    timestamp.textContent = formatMessageTime(message.createdAt || new Date());
    messageElement.appendChild(timestamp);
    
    return messageElement;
};

/**
 * Open a chat with the selected user and load the chat history.
 * @param {Object} user User object
 */
const openChatWithUser = async (user) => {
    // Check if the chat is already open
    if (currentChatUser && currentChatUser._id === user._id) {
        console.log('This chat is already open.');
        return;
    }

    currentChatUser = user;
    
    // Clear unread messages for this user
    if (unreadMessages[user._id]) {
        resetUnreadMessages(user._id);
    }
    
    const chatTitle = document.getElementById('chat-title');

    if (chatTitle) {
        chatTitle.textContent = user.username || 'Unknown User';
    }

    try {
        const response = await fetch(`http://localhost:8080/api/messages/${user._id}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch messages: ' + response.status);
            return;
        } else {
            console.log('Fetched messages successfully');
        }

        const messages = await response.json();
        const messagesContainerContent = document.querySelector('#chat-content');

        if (messagesContainerContent) {
            messagesContainerContent.innerHTML = '';
        }

        // Get my user ID
        const myUserId = currentUserId;

        // Display the fetched messages
        if (messages.length > 0) {
            // Sort messages by creation date to show in chronological order
            messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            
            messages.forEach(message => {
                const isSent = message.senderId === myUserId;
                const messageElement = createMessageElement(message, isSent, user.username);
                messagesContainerContent.appendChild(messageElement);
            });
            
            // Scroll to the bottom of the chat to show most recent messages
            messagesContainerContent.scrollTop = messagesContainerContent.scrollHeight;
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
};

/**
 * Reset unread message count for a user
 * @param {string} userId - ID of the user to reset unread count for
 */
const resetUnreadMessages = (userId) => {
    // Update local state
    unreadMessages[userId] = 0;
    updateUnreadBadge(userId);
    
    // Update server
    fetch(`http://localhost:8080/api/unread/reset/${userId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to reset unread count');
            }
            return response.json();
        })
        .then(data => {
            console.log('Unread count reset:', data);
        })
        .catch(error => {
            console.error('Error resetting unread count:', error);
        });
};

/**
 * Listen for new messages and update the chat window
 *
 * @param {Object} newMessage New message object
 */
socket.on('newMessage', (newMessage) => {
    console.log('Received new message:', newMessage);
    
    // If message is from someone else, increment unread count if not in that chat
    if (newMessage.senderId !== currentUserId) {
        // If we're not currently chatting with this user, increment unread count
        if (!currentChatUser || currentChatUser._id !== newMessage.senderId) {
            // Initialize if not exists
            if (!unreadMessages[newMessage.senderId]) {
                unreadMessages[newMessage.senderId] = 0;
            }
            // Increment unread count
            unreadMessages[newMessage.senderId]++;
            // Update the badge
            updateUnreadBadge(newMessage.senderId);
        }
    }
    
    // Check if the current chat is with the sender of the new message
    if (currentChatUser && 
        (currentChatUser._id === newMessage.senderId || currentChatUser._id === newMessage.receiverId)) {
        
        // If this message has a tempId, it might be a confirmation of our own message
        if (newMessage.tempId) {
            // Check if we already have this message displayed with the temp ID
            const existingMsg = document.querySelector(`[data-message-id="${newMessage.tempId}"]`);
            if (existingMsg) {
                // This is a confirmation of our pending message, update it
                existingMsg.setAttribute('data-message-id', newMessage._id || newMessage.tempId);
                existingMsg.classList.remove('pending');
                
                // Remove the pending indicator if it exists
                const indicator = existingMsg.querySelector('.pending-indicator');
                if (indicator) {
                    indicator.remove();
                }
                
                // Update timestamp with the server timestamp
                const timestamp = existingMsg.querySelector('.message-time');
                if (timestamp && newMessage.createdAt) {
                    timestamp.textContent = formatMessageTime(newMessage.createdAt);
                }
                
                return; // Don't add a duplicate message
            }
        }
        
        const messagesContainerContent = document.querySelector('#chat-content');
        
        // Create message element - determine if sent by current user
        const isSent = newMessage.senderId === currentUserId;
        const messageElement = createMessageElement(newMessage, isSent, currentChatUser.username);
        
        // Set message ID for reference
        if (newMessage._id) {
            messageElement.setAttribute('data-message-id', newMessage._id);
        }
        
        // Add to chat and scroll
        messagesContainerContent.appendChild(messageElement);
        messagesContainerContent.scrollTop = messagesContainerContent.scrollHeight;
        
        // If this is a received message in the current chat, reset unread count
        if (!isSent) {
            resetUnreadMessages(newMessage.senderId);
        }
    }
});

/**
 * Update the unread message badge for a user
 * @param {string} userId - The ID of the user to update the badge for
 */
const updateUnreadBadge = (userId) => {
    const userElement = document.querySelector(`.user-item[data-user-id="${userId}"]`);
    if (!userElement) return;
    
    // Find existing badge or create a new one
    let badge = userElement.querySelector('.unread-badge');
    
    // If no unread messages, remove badge if exists
    if (!unreadMessages[userId] || unreadMessages[userId] === 0) {
        if (badge) {
            badge.remove();
        }
        return;
    }
    
    // If badge doesn't exist, create it
    if (!badge) {
        badge = document.createElement('span');
        badge.classList.add('unread-badge');
        userElement.appendChild(badge);
    }
    
    // Update badge count
    badge.textContent = unreadMessages[userId] > 99 ? '99+' : unreadMessages[userId].toString();
};

/**
 * Helper function to get the currently selected chat user (receiver)
 * @returns {Object} User object
 */
const getCurrentChatUser = () => {
    return currentChatUser;
}

/**
 * Send a message to the selected user
 * @param {Object} user User object
 */
const sendMessage = async (user) => {
    user = getCurrentChatUser();
    if (!user) {
        console.error('No user selected for chat.');
        return;
    }

    const messageInput = document.querySelector('#user-input');
    const message = messageInput.value.trim();

    if (!message) {
        return;
    }

    // Create a temporary message object for immediate display
    const tempMessageObj = {
        _id: 'temp-' + Date.now(), // Temporary ID
        senderId: currentUserId,
        receiverId: user._id,
        message: message,
        createdAt: new Date()
    };

    // Display the message immediately as sent
    const messagesContainerContent = document.querySelector('#chat-content');
    const messageElement = createMessageElement(tempMessageObj, true, null);
    messageElement.setAttribute('data-message-id', tempMessageObj._id);
    messageElement.classList.add('pending');
    
    // Add a subtle indicator that the message is pending
    const pendingIndicator = document.createElement('span');
    pendingIndicator.classList.add('pending-indicator');
    pendingIndicator.innerHTML = '⌛'; // Hourglass emoji
    pendingIndicator.title = 'Sending...';
    messageElement.appendChild(pendingIndicator);
    
    messagesContainerContent.appendChild(messageElement);
    messagesContainerContent.scrollTop = messagesContainerContent.scrollHeight;

    // Clear input field right away for better UX
    messageInput.value = '';

    // Prepare data for API call
    const messageData = {
        message,
        receiverId: user._id
    };

    // Create message object for socket
    const messageObject = {
        senderId: currentUserId,
        message: message,
        receiverId: user._id,
        tempId: tempMessageObj._id // Include temp ID for tracking
    };

    // First emit the message via socket for real-time delivery
    socket.emit('newMessage', messageObject);
    console.log('Message emitted to socket:', messageObject);

    // Then save it to the database via API
    try {
        const response = await fetch(`http://localhost:8080/api/messages/send/${user._id}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });

        if (!response.ok) {
            console.error('Failed to send message: ' + response.status);
            // Mark message as failed
            const pendingMsg = document.querySelector(`[data-message-id="${tempMessageObj._id}"]`);
            if (pendingMsg) {
                const indicator = pendingMsg.querySelector('.pending-indicator');
                if (indicator) {
                    indicator.innerHTML = '❌'; // X emoji
                    indicator.title = 'Failed to send';
                }
                pendingMsg.classList.add('failed');
            }
            return;
        } 
        
        const savedMessage = await response.json();
        console.log('Message saved to database successfully:', savedMessage);
        
        // Update the temporary message with the confirmed one
        const pendingMsg = document.querySelector(`[data-message-id="${tempMessageObj._id}"]`);
        if (pendingMsg) {
            pendingMsg.setAttribute('data-message-id', savedMessage._id);
            pendingMsg.classList.remove('pending');
            
            // Remove the pending indicator
            const indicator = pendingMsg.querySelector('.pending-indicator');
            if (indicator) {
                indicator.remove();
            }
            
            // Update timestamp with the server timestamp
            const timestamp = pendingMsg.querySelector('.message-time');
            if (timestamp && savedMessage.createdAt) {
                timestamp.textContent = formatMessageTime(savedMessage.createdAt);
            }
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        // Mark message as failed
        const pendingMsg = document.querySelector(`[data-message-id="${tempMessageObj._id}"]`);
        if (pendingMsg) {
            const indicator = pendingMsg.querySelector('.pending-indicator');
            if (indicator) {
                indicator.innerHTML = '❌'; // X emoji
                indicator.title = 'Failed to send';
            }
            pendingMsg.classList.add('failed');
        }
    }
};

/**
 * Set up settings dropdown functionality
 */
const setupSettingsDropdown = () => {
    const settingsIcon = document.querySelector('.settings-icon');
    const settingsDropdown = document.querySelector('.settings-dropdown');

    // Toggle dropdown visibility on settings icon click
    settingsIcon.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent click event from propagating
        settingsDropdown.style.display = settingsDropdown.style.display === 'flex' ? 'none' : 'flex';
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (!settingsIcon.contains(event.target) && !settingsDropdown.contains(event.target)) {
            settingsDropdown.style.display = 'none';
        }
    });
};

/**
 * Connect to the server socket and listen for events
 */
socket.on('connect', () => {
    console.log('Connected to server with socket ID:', socket.id);
    
    // Listen for online users updates
    socket.on('getOnlineUsers', (onlineUsers) => {
        console.log('Online users:', onlineUsers);
        updateOnlineStatus(onlineUsers);
    });
});

/**
 * Update the online status indicators in the user list
 * @param {Array} onlineUserIds Array of online user IDs
 */
const updateOnlineStatus = (onlineUserIds) => {
    console.log('Updating online status with IDs:', onlineUserIds);
    
    const userElements = document.querySelectorAll('.user-item');
    
    userElements.forEach(userElement => {
        const userId = userElement.getAttribute('data-user-id');
        const statusIndicator = userElement.querySelector('.status-indicator');
        
        if (statusIndicator && userId) {
            const isOnline = onlineUserIds.includes(userId);
            
            if (isOnline) {
                statusIndicator.classList.add('online');
                statusIndicator.classList.remove('offline');
                statusIndicator.title = 'Online';
            } else {
                statusIndicator.classList.add('offline');
                statusIndicator.classList.remove('online');
                statusIndicator.title = 'Offline';
            }
            
            console.log(`User ${userId} status: ${isOnline ? 'online' : 'offline'}`);
        }
    });
};

/**
 * Initialize the chat application
 */
const initializeChat = () => {
    fetchUserData();
    fetchUsersList();
    setupSignOutButton();
    setupSettingsDropdown();
    
    // Set up the send message button
    const sendButton = document.getElementById('send-btn');
    if (sendButton) {
        sendButton.addEventListener('click', () => sendMessage());
    }
    
    // Set up the enter key to send messages
    const messageInput = document.getElementById('user-input');
    if (messageInput) {
        messageInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    }
};

// Initialize the chat when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeChat);
