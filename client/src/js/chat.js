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
                const messageElement = document.createElement('div');
                messageElement.classList.add('message');

                // Check if I'm the sender of this message
                if (message.senderId === myUserId) {
                    messageElement.classList.add('sent');
                    messageElement.textContent = `You: ${message.message}`;
                } else {
                    messageElement.classList.add('received');
                    messageElement.textContent = `${user.username || 'User'}: ${message.message}`;
                }

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
        const messagesContainerContent = document.querySelector('#chat-content');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        // If I am the sender (my ID matches the senderId)
        if (newMessage.senderId === currentUserId) {
            messageElement.classList.add('sent');
            messageElement.textContent = `You: ${newMessage.message}`;
        } else {
            messageElement.classList.add('received');
            messageElement.textContent = `${currentChatUser.username || 'User'}: ${newMessage.message}`;
            
            // Reset unread messages since we're viewing them
            resetUnreadMessages(newMessage.senderId);
        }

        messagesContainerContent.appendChild(messageElement); // Append to show newest at bottom
        messagesContainerContent.scrollTop = messagesContainerContent.scrollHeight;
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

    const messageData = {
        message,
        receiverId: user._id
    };

    // Display the message immediately as sent
    const messagesContainerContent = document.querySelector('#chat-content');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add('sent');
    messageElement.textContent = `You: ${message}`;
    messagesContainerContent.appendChild(messageElement);
    messagesContainerContent.scrollTop = messagesContainerContent.scrollHeight;

    // Clear input field right away for better UX
    messageInput.value = '';

    // Create message object with all required data
    const messageObject = {
        senderId: currentUserId,
        message: message,
        receiverId: user._id
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
            return;
        } else {
            console.log('Message saved to database successfully');
        }
    } catch (error) {
        console.error('Error sending message:', error);
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
