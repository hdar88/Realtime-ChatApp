// Set up socket for real-time communication - don't connect yet
const socket = io('http://localhost:8080', {autoConnect: false});

let currentChatUser = null;
let currentUserId = null; // Store the user ID in variable
let unreadMessages = {}; // Track unread messages by user ID
let groupUnreadCounts = {}; // Track unread messages for groups
let currentGroupChat = null; // Current open group chat
let userGroups = []; // Store user's groups
let allUsers = []; // Store all users for reference
let isGroupChat = false; // Flag to indicate if current chat is a group chat

const messageInput = document.getElementById('user-input');
const typingIndicator = document.getElementById('typing-indicator');
let typingTimeout;

/**
 * Check if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to check
 * @returns {boolean} - True if it's a valid MongoDB ObjectId
 */
const isValidMongoId = (id) => {
    return id && typeof id === 'string' && id.length === 24 && /^[0-9a-f]{24}$/i.test(id);
};

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
            socket.auth = {userId: currentUserId};

            // Connect socket after getting user ID
            socket.connect();

            // Also explicitly tell server about userId after connection
            socket.on('connect', () => {
                console.log("Socket connected with ID:", socket.id);
                socket.emit('setUserId', {userId: currentUserId});
            });
            
            // Set up all socket event listeners
            setupSocketListeners();

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
    const directChatsContainer = document.getElementById('direct-chats');
    directChatsContainer.innerHTML = ''; // Clear existing users first
    
    // Store all users for reference when creating groups
    allUsers = users;

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
            
            // Reset group chat state
            isGroupChat = false;
            currentGroupChat = null;
            document.getElementById('chat-header-actions').style.display = 'none';

            openChatWithUser(user).then(r => console.log('Chat opened with:', user.fullName || user.username));
        });

        directChatsContainer.appendChild(userElement);
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
        const month = messageDate.toLocaleDateString('en-US', {month: 'short'});
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

    // Add read status indicator for sent direct messages only
    // Group chat read status will be handled separately
    if (isSent && !isGroupChat) {
        const readStatus = document.createElement('span');
        readStatus.classList.add('read-status');

        if (message.isRead) {
            readStatus.innerHTML = '✓✓'; // Double check mark for read
            readStatus.classList.add('read');
            readStatus.title = 'Read';
        } else {
            readStatus.innerHTML = '✓'; // Single check for delivered
            readStatus.classList.add('delivered');
            readStatus.title = 'Delivered';
        }

        messageElement.appendChild(readStatus);
    }

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

            const unreadMessages = [];

            messages.forEach(message => {
                const isSent = message.senderId === myUserId;
                const messageElement = createMessageElement(message, isSent, user.username);

                // Set message ID for reference
                if (message._id) {
                    messageElement.setAttribute('data-message-id', message._id);
                }

                // Ensure no pending indicators or pending classes
                messageElement.classList.remove('pending', 'pending-id');

                messagesContainerContent.appendChild(messageElement);

                // If this is a received message that's not read, add to unread list to mark as read
                if (!isSent && !message.isRead) {
                    unreadMessages.push(message);
                }
            });

            // Cleanup any pending indicators that might be left over
            const pendingIndicators = messagesContainerContent.querySelectorAll('.pending-indicator');
            pendingIndicators.forEach(indicator => indicator.remove());

            // Scroll to the bottom of the chat to show most recent messages
            messagesContainerContent.scrollTop = messagesContainerContent.scrollHeight;

            // Mark all unread messages as read after a short delay to ensure rendering completed
            if (unreadMessages.length > 0) {
                setTimeout(() => {
                    unreadMessages.forEach(message => {
                        markMessageAsRead(message._id, message.senderId);
                    });
                }, 500);
            }
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
        } else {
            // We are currently chatting with this user, mark as read if it has a valid MongoDB ID
            const messageId = newMessage._id;
            if (messageId && isValidMongoId(messageId)) {
                console.log('Marking received message as read, ID:', messageId);
                markMessageAsRead(messageId, newMessage.senderId);
            } else {
                console.log('Received message ID not valid for marking as read:', messageId);
            }
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
                } else {
                    // Check if there are any other pending indicators that might need removal
                    const otherIndicators = existingMsg.querySelectorAll('.pending-indicator');
                    otherIndicators.forEach(ind => ind.remove());
                }

                // Update timestamp with the server timestamp
                const timestamp = existingMsg.querySelector('.message-time');
                if (timestamp && newMessage.createdAt) {
                    timestamp.textContent = formatMessageTime(newMessage.createdAt);
                }

                // Add read status for sent message
                if (!existingMsg.querySelector('.read-status')) {
                    const readStatus = document.createElement('span');
                    readStatus.classList.add('read-status', 'delivered');
                    readStatus.innerHTML = '✓';
                    readStatus.title = 'Delivered';
                    existingMsg.appendChild(readStatus);
                }

                return; // Don't add a duplicate message
            }
        }

        const messagesContainerContent = document.querySelector('#chat-content');

        // Create message element - determine if sent by current user
        const isSent = newMessage.senderId === currentUserId;
        const messageElement = createMessageElement(newMessage, isSent, currentChatUser.username);

        // Set message ID for reference - use a consistent approach to identify real vs temporary IDs
        if (newMessage._id) {
            messageElement.setAttribute('data-message-id', newMessage._id);
            // Only add the pending-id class if it's clearly NOT a valid MongoDB ID
            if (!isValidMongoId(newMessage._id)) {
                messageElement.classList.add('pending-id');
            }
        } else {
            // No ID at all, generate a temporary one
            const tempId = 'temp-' + Date.now();
            messageElement.setAttribute('data-message-id', tempId);
            messageElement.classList.add('pending-id');
        }

        // Add to chat and scroll
        messagesContainerContent.appendChild(messageElement);
        messagesContainerContent.scrollTop = messagesContainerContent.scrollHeight;

        // If this is a received message in the current chat, handle read receipt
        if (!isSent) {
            resetUnreadMessages(newMessage.senderId);

            // Only mark as read if it has a valid MongoDB ID
            const messageId = newMessage._id;
            if (messageId && isValidMongoId(messageId)) {
                console.log('Marking received message as read, ID:', messageId);
                markMessageAsRead(messageId, newMessage.senderId);
            } else {
                console.log('Received message has an invalid or temporary ID, not marking as read yet:', messageId);
            }
        }
    }
});

/**
 * Listen for message read status updates
 */
socket.on('messageRead', (data) => {
    console.log('Message read event received:', data);

    // Update the read status of the message in the UI
    updateMessageReadStatus(data.messageId);
});

/**
 * Mark a message as read
 * @param {string} messageId - ID of the message to mark as read
 * @param {string} senderId - ID of the sender of the message
 */
const markMessageAsRead = (messageId, senderId) => {
    if (!messageId || !senderId) {
        console.error('Missing message ID or sender ID for read receipt');
        return;
    }

    // Always update the UI to show message as read immediately
    updateMessageReadStatus(messageId);

    // Don't process temporary IDs on the server - only notify via socket for client-side UI update
    if (messageId.startsWith('temp-') || !isValidMongoId(messageId)) {
        console.log(`Using socket only for temporary message ID: ${messageId}`);

        // Send read receipt via socket only (not to server)
        socket.emit('markAsRead', {
            messageId: messageId,
            senderId: senderId,
            readerId: currentUserId,
            isTemporary: true
        });
        return;
    }

    console.log(`Marking message ${messageId} from ${senderId} as read`);

    // Send read receipt via socket
    socket.emit('markAsRead', {
        messageId: messageId,
        senderId: senderId,
        readerId: currentUserId
    });

    // Also update via API to persist in database
    fetch(`http://localhost:8080/api/messages/read/${messageId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                // If status is 404, the message might not be saved yet - this is OK
                if (response.status === 404) {
                    console.warn(`Message ${messageId} not found in database yet - this is normal for new messages`);
                    return {success: false, reason: 'not_found'};
                }
                throw new Error(`Failed to update message read status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Read status updated in database:', data);
        })
        .catch(error => {
            console.error('Error updating read status:', error);
        });
};

/**
 * Update the read status of a message in the UI
 * @param {string} messageId - ID of the message to update
 */
const updateMessageReadStatus = (messageId) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        const readStatus = messageElement.querySelector('.read-status');
        if (readStatus) {
            readStatus.innerHTML = '✓✓'; // Double check mark
            readStatus.classList.remove('delivered');
            readStatus.classList.add('read');
            readStatus.title = 'Read';
        }
    }
};

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
        receiverId: user._id,
        tempId: tempMessageObj._id // Include temp ID for database tracking
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
            // Store the new ID for reference
            const savedMessageId = savedMessage._id;
            pendingMsg.setAttribute('data-message-id', savedMessageId);
            pendingMsg.classList.remove('pending');

            // Remove the pending indicator
            const indicator = pendingMsg.querySelector('.pending-indicator');
            if (indicator) {
                indicator.remove();
            } else {
                // Check if there are any other pending indicators that might need removal
                const otherIndicators = pendingMsg.querySelectorAll('.pending-indicator');
                otherIndicators.forEach(ind => ind.remove());
            }

            // Update timestamp with the server timestamp
            const timestamp = pendingMsg.querySelector('.message-time');
            if (timestamp && savedMessage.createdAt) {
                timestamp.textContent = formatMessageTime(savedMessage.createdAt);
            }

            // Also check if there are any pending-id messages from this person that need updating
            if (currentChatUser) {
                const pendingIdMessages = document.querySelectorAll(`.pending-id[data-message-id^="pending-${tempMessageObj._id}"]`);
                pendingIdMessages.forEach(msg => {
                    msg.setAttribute('data-message-id', savedMessageId);
                    msg.classList.remove('pending-id');
                    msg.classList.remove('pending');

                    // Remove any pending indicators
                    const pendingIndicator = msg.querySelector('.pending-indicator');
                    if (pendingIndicator) {
                        pendingIndicator.remove();
                    }

                    // If this was a received message and we now have the real ID, mark it as read
                    if (!msg.classList.contains('sent')) {
                        markMessageAsRead(savedMessageId, currentChatUser._id);
                    }
                });
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
 * Set up settings dropdown toggle
 */
const setupSettingsDropdown = () => {
    const settingsIcon = document.querySelector('.settings-icon');
    const settingsDropdown = document.querySelector('.settings-dropdown');
    
    if (settingsIcon && settingsDropdown) {
        settingsIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            settingsDropdown.style.display = settingsDropdown.style.display === 'flex' ? 'none' : 'flex';
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', () => {
            if (settingsDropdown.style.display === 'flex') {
                settingsDropdown.style.display = 'none';
            }
        });
        
        // Prevent dropdown from closing when clicking inside it
        settingsDropdown.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }
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
    // Fetch user data (this sets up socket connection and socket listeners)
    fetchUserData();
    
    // Load lists of users and groups
    fetchUsersList();
    fetchUserGroups();
    
    // Set up UI components
    setupSignOutButton();
    setupSettingsDropdown();
    setupTabSwitching();
    setupGroupChatUI();
    
    // Set up search functionality if it exists
    if (typeof setupSearchBar === 'function') {
        setupSearchBar();
    }

    // Set up the send message button
    const sendButton = document.getElementById('send-btn');
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            if (isGroupChat) {
                sendGroupMessage();
            } else {
                sendMessage();
            }
        });
    }

    // Set up the enter key to send messages
    if (messageInput) {
        messageInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (isGroupChat) {
                    sendGroupMessage();
                } else {
                    sendMessage();
                }
            }
        });

        // Set up typing indicator events
        messageInput.addEventListener('input', () => {
            if (isGroupChat && currentGroupChat) {
                handleGroupTyping(true);
            } else if (currentChatUser) {
                handleTyping(true);
            }
        });

        messageInput.addEventListener('blur', () => {
            if (isGroupChat && currentGroupChat) {
                handleGroupTyping(false);
            } else if (currentChatUser) {
                handleTyping(false);
            }
        });
    }
    
    console.log("Chat application initialized");
};

// Initialize the chat when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeChat);

// Listen for message ID updates
socket.on('messageIdUpdate', (data) => {
    console.log('Message ID update received:', data);
    const {tempId, realId} = data;

    if (!tempId || !realId) {
        console.error('Invalid message ID update data', data);
        return;
    }

    // Find any messages with this temp ID
    const pendingMessages = document.querySelectorAll(`[data-message-id="${tempId}"]`);
    if (pendingMessages.length > 0) {
        console.log(`Updating ${pendingMessages.length} messages with temp ID ${tempId} to real ID ${realId}`);

        pendingMessages.forEach(msg => {
            // Update the message ID
            msg.setAttribute('data-message-id', realId);
            msg.classList.remove('pending-id');
            msg.classList.remove('pending');

            // Remove the pending indicator (hourglass) if it exists
            const pendingIndicator = msg.querySelector('.pending-indicator');
            if (pendingIndicator) {
                pendingIndicator.remove();
            }

            // If this is a received message (not sent by current user), mark it as read
            if (msg.classList.contains('received') && currentChatUser) {
                markMessageAsRead(realId, currentChatUser._id);
            }
        });
    }

    // Also check for pending-id messages with this prefix
    const pendingIdMessages = document.querySelectorAll(`.pending-id[data-message-id^="pending-${tempId}"]`);
    pendingIdMessages.forEach(msg => {
        msg.setAttribute('data-message-id', realId);
        msg.classList.remove('pending-id');
        msg.classList.remove('pending');

        // Remove the pending indicator (hourglass) if it exists
        const pendingIndicator = msg.querySelector('.pending-indicator');
        if (pendingIndicator) {
            pendingIndicator.remove();
        }

        // If this was a received message and we now have the real ID, mark it as read
        if (msg.classList.contains('received') && currentChatUser) {
            markMessageAsRead(realId, currentChatUser._id);
        }
    });
});

// Event Listener for message input
messageInput.addEventListener("input", () => {
    if (currentChatUser == null || currentChatUser._id == null || currentUserId == null) {
        return;
    }

    socket.emit("typing", {senderId: currentUserId, receiverId: currentChatUser._id, isTyping: true});
    console.log("Typing event emitted");

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit("typing", { senderId: currentUserId, receiverId: currentChatUser._id, isTyping: false });
    }, 2000);
});

// Handle typing indicator events
socket.on('typing', (data) => {
    const { senderId, isTyping } = data;

    if (currentChatUser && senderId === currentChatUser._id) {
        typingIndicator.style.display = isTyping ? 'inline-block' : 'none';
    }
});

/**
 * Set up tab switching between direct messages and group chats
 */
const setupTabSwitching = () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const directChats = document.getElementById('direct-chats');
    const groupChats = document.getElementById('group-chats');

    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            // Handle tab selection UI
            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show/hide content based on selected tab
            if (tab.getAttribute('data-tab') === 'direct') {
                directChats.style.display = 'block';
                groupChats.style.display = 'none';
                // If we were in a group chat, close it
                if (isGroupChat) {
                    isGroupChat = false;
                    currentGroupChat = null;
                    document.getElementById('chat-header-actions').style.display = 'none';
                    document.getElementById('chat-title').textContent = 'Select a chat';
                    document.getElementById('chat-content').innerHTML = '';
                }
            } else {
                directChats.style.display = 'none';
                groupChats.style.display = 'block';
                // If we were in a direct chat, close it
                if (!isGroupChat && currentChatUser) {
                    currentChatUser = null;
                    document.getElementById('chat-title').textContent = 'Select a group';
                    document.getElementById('chat-content').innerHTML = '';
                }
            }
        });
    });
};

/**
 * Set up group chat related UI elements and event listeners
 */
const setupGroupChatUI = () => {
    // Set up create group button
    const createGroupBtn = document.getElementById('create-group-btn');
    const createGroupModal = document.getElementById('create-group-modal');
    const closeButtons = document.querySelectorAll('.close');
    const createGroupSubmit = document.getElementById('create-group-submit');
    
    // Group info related elements
    const groupInfoBtn = document.getElementById('group-info-btn');
    const groupInfoModal = document.getElementById('group-info-modal');
    const addMemberBtn = document.getElementById('add-member-btn');
    const deleteGroupBtn = document.getElementById('delete-group-btn');

    // Set up modal open/close
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', () => {
            createGroupModal.style.display = 'block';
            populateMemberSelection();
        });
    }

    if (groupInfoBtn) {
        groupInfoBtn.addEventListener('click', () => {
            if (currentGroupChat) {
                openGroupInfo(currentGroupChat);
            }
        });
    }

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            createGroupModal.style.display = 'none';
            groupInfoModal.style.display = 'none';
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === createGroupModal) {
            createGroupModal.style.display = 'none';
        }
        if (e.target === groupInfoModal) {
            groupInfoModal.style.display = 'none';
        }
    });

    // Set up group creation
    if (createGroupSubmit) {
        createGroupSubmit.addEventListener('click', createNewGroup);
    }

    // Set up add member functionality
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', addMemberToGroup);
    }

    // Set up delete group functionality
    if (deleteGroupBtn) {
        deleteGroupBtn.addEventListener('click', deleteGroup);
    }

    // Fetch user's groups initially
    fetchUserGroups();
};

/**
 * Populate the member selection list in the create group modal
 */
const populateMemberSelection = () => {
    const memberSelection = document.getElementById('member-selection');
    memberSelection.innerHTML = '';

    // If we have users, populate the selection
    if (allUsers && allUsers.length > 0) {
        allUsers.forEach(user => {
            // Don't include current user in the selection
            if (user._id !== currentUserId) {
                const memberItem = document.createElement('div');
                memberItem.classList.add('member-item');

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = user._id;
                checkbox.id = `member-${user._id}`;

                const label = document.createElement('label');
                label.htmlFor = `member-${user._id}`;
                label.textContent = user.fullName || user.username;

                memberItem.appendChild(checkbox);
                memberItem.appendChild(label);
                memberSelection.appendChild(memberItem);
            }
        });
    } else {
        memberSelection.innerHTML = '<p>No users available</p>';
    }
};

/**
 * Fetch user's group chats
 */
const fetchUserGroups = async () => {
    try {
        const response = await fetch('http://localhost:8080/api/groups', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch groups');
        }

        const groups = await response.json();
        userGroups = groups;
        displayUserGroups(groups);

        // Fetch unread counts for all groups
        fetchGroupsUnreadCounts();
    } catch (error) {
        console.error('Error fetching groups:', error);
    }
};

/**
 * Display user's group chats in the sidebar
 * @param {Array} groups - Array of group chat objects
 */
const displayUserGroups = (groups) => {
    const groupChatsContainer = document.getElementById('group-chats');
    groupChatsContainer.innerHTML = '';

    if (groups.length === 0) {
        const noGroupsMsg = document.createElement('div');
        noGroupsMsg.classList.add('no-groups-message');
        noGroupsMsg.textContent = 'You have no groups yet. Create a group to get started!';
        groupChatsContainer.appendChild(noGroupsMsg);
        return;
    }

    groups.forEach(group => {
        const groupElement = document.createElement('div');
        groupElement.classList.add('chat-room', 'group-item');
        groupElement.setAttribute('data-group-id', group._id);

        // Group icon or initial
        const groupIcon = document.createElement('div');
        groupIcon.classList.add('group-icon');
        groupIcon.textContent = group.name.charAt(0).toUpperCase();

        // Group details container
        const groupDetails = document.createElement('div');
        groupDetails.classList.add('group-details');

        // Group name
        const groupName = document.createElement('div');
        groupName.classList.add('group-name');
        groupName.textContent = group.name;

        // Add role tags
        if (group.creator._id === currentUserId) {
            const creatorTag = document.createElement('span');
            creatorTag.classList.add('group-tag', 'creator-tag');
            creatorTag.textContent = 'Creator';
            groupName.appendChild(creatorTag);
        } else if (group.admins.some(admin => admin._id === currentUserId)) {
            const adminTag = document.createElement('span');
            adminTag.classList.add('group-tag', 'admin-tag');
            adminTag.textContent = 'Admin';
            groupName.appendChild(adminTag);
        }

        // Group description
        const groupDescription = document.createElement('div');
        groupDescription.classList.add('group-description');
        groupDescription.textContent = group.description || `${group.members.length} members`;

        // Append elements to group details
        groupDetails.appendChild(groupName);
        groupDetails.appendChild(groupDescription);

        // Add unread message badge if there are unread messages
        if (groupUnreadCounts[group._id] && groupUnreadCounts[group._id] > 0) {
            const badge = document.createElement('span');
            badge.classList.add('unread-badge');
            badge.textContent = groupUnreadCounts[group._id] > 99 ? '99+' : groupUnreadCounts[group._id].toString();
            groupElement.appendChild(badge);
        }

        // Append elements to group container
        groupElement.appendChild(groupIcon);
        groupElement.appendChild(groupDetails);

        // Add click event to open chat
        groupElement.addEventListener('click', () => {
            // Add selected class to current and remove from others
            document.querySelectorAll('.chat-room').forEach(el => el.classList.remove('selected'));
            groupElement.classList.add('selected');

            openGroupChat(group);
        });

        groupChatsContainer.appendChild(groupElement);
    });
};

/**
 * Open a group chat and load its messages
 * @param {Object} group - Group chat object
 */
const openGroupChat = async (group) => {
    // Set the current state
    isGroupChat = true;
    currentGroupChat = group;
    currentChatUser = null; // Clear the direct chat user

    // Update UI
    const chatTitle = document.getElementById('chat-title');
    chatTitle.textContent = group.name;

    // Show group info button 
    document.getElementById('chat-header-actions').style.display = 'flex';

    // Clear previous chat content
    const chatContent = document.getElementById('chat-content');
    chatContent.innerHTML = '';

    // Fetch messages for the group
    try {
        const response = await fetch(`http://localhost:8080/api/groups/${group._id}/messages`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch group messages');
        }

        const messages = await response.json();
        displayGroupMessages(messages, group);

        // Mark all messages as read
        markAllGroupMessagesAsRead(group._id);

        // Join the group socket room
        socket.emit('joinGroup', { groupId: group._id, userId: currentUserId });

    } catch (error) {
        console.error('Error opening group chat:', error);
    }
};

/**
 * Display messages for a group chat
 * @param {Array} messages - Array of message objects
 * @param {Object} group - Group chat object
 */
const displayGroupMessages = (messages, group) => {
    const chatContent = document.getElementById('chat-content');
    chatContent.innerHTML = ''; // Clear existing messages
    
    messages.forEach(message => {
        const isSent = message.senderId._id === currentUserId;
        processGroupMessage(message, isSent);
    });
    
    // Scroll to bottom
    chatContent.scrollTop = chatContent.scrollHeight;
};

/**
 * Fetch unread counts for all groups
 */
const fetchGroupsUnreadCounts = async () => {
    try {
        const response = await fetch('http://localhost:8080/api/groups/unread/all', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch group unread counts');
        }

        groupUnreadCounts = await response.json();
        updateGroupUnreadBadges();
    } catch (error) {
        console.error('Error fetching group unread counts:', error);
    }
};

/**
 * Update unread badges for all groups
 */
const updateGroupUnreadBadges = () => {
    const groupItems = document.querySelectorAll('#group-chats .group-item');
    
    groupItems.forEach(groupElement => {
        const groupId = groupElement.getAttribute('data-group-id');
        
        // Remove existing badge if any
        const existingBadge = groupElement.querySelector('.unread-badge');
        if (existingBadge) {
            groupElement.removeChild(existingBadge);
        }
        
        // Add new badge if there are unread messages
        if (groupUnreadCounts[groupId] && groupUnreadCounts[groupId] > 0) {
            const badge = document.createElement('span');
            badge.classList.add('unread-badge');
            badge.textContent = groupUnreadCounts[groupId] > 99 ? '99+' : groupUnreadCounts[groupId].toString();
            groupElement.appendChild(badge);
        }
    });
};

/**
 * Mark all messages in a group as read
 * @param {string} groupId - ID of the group
 */
const markAllGroupMessagesAsRead = async (groupId) => {
    try {
        const response = await fetch(`http://localhost:8080/api/groups/${groupId}/messages/read/all`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to mark messages as read');
        }

        // Update unread counts
        groupUnreadCounts[groupId] = 0;
        updateGroupUnreadBadges();
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
};

/**
 * Create a new group chat
 */
const createNewGroup = async () => {
    const groupName = document.getElementById('group-name').value.trim();
    const groupDescription = document.getElementById('group-description').value.trim();
    const memberCheckboxes = document.querySelectorAll('#member-selection input[type="checkbox"]:checked');
    
    if (!groupName) {
        alert('Please enter a group name.');
        return;
    }
    
    if (memberCheckboxes.length === 0) {
        alert('Please select at least one member for the group.');
        return;
    }
    
    // Get selected member IDs
    const members = Array.from(memberCheckboxes).map(checkbox => checkbox.value);
    
    try {
        const response = await fetch('http://localhost:8080/api/groups', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: groupName,
                description: groupDescription,
                members
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create group');
        }
        
        const newGroup = await response.json();
        

        
        // Close the modal
        document.getElementById('create-group-modal').style.display = 'none';
        
        // Clear the form
        document.getElementById('group-name').value = '';
        document.getElementById('group-description').value = '';
        
        // Switch to the groups tab and open the new group
        document.querySelector('.tab-btn[data-tab="groups"]').click();
        openGroupChat(newGroup);
        
    } catch (error) {
        console.error('Error creating group:', error);
        alert('Failed to create group. Please try again.');
    }
};

/**
 * Send a message to the current group chat
 */
const sendGroupMessage = async () => {
    if (!currentGroupChat) {
        console.error('No group selected for chat.');
        return;
    }
    
    const message = messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    // Create a temporary message object for immediate display
    const tempMessageId = 'temp-' + Date.now();
    const tempMessageObj = {
        _id: tempMessageId,
        senderId: { _id: currentUserId },
        groupId: currentGroupChat._id,
        message: message,
        createdAt: new Date(),
        readBy: [currentUserId]
    };
    
    // Display the message immediately with 'pending' state
    const messageElement = processGroupMessage(tempMessageObj, true);
    messageElement.classList.add('pending');
    
    // Add a pending indicator
    const pendingIndicator = document.createElement('span');
    pendingIndicator.classList.add('pending-indicator');
    pendingIndicator.innerHTML = '⌛';
    pendingIndicator.title = 'Sending...';
    messageElement.appendChild(pendingIndicator);
    
    // Clear input field
    messageInput.value = '';
    
    try {
        const response = await fetch(`http://localhost:8080/api/groups/${currentGroupChat._id}/messages`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                tempId: tempMessageId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        
        const sentMessage = await response.json();
        
        // Update the temporary message with the real one
        messageElement.classList.remove('pending');
        messageElement.removeChild(pendingIndicator);
        messageElement.setAttribute('data-message-id', sentMessage._id);
        
        // Find the existing read status and make sure it's showing delivered
        let readStatus = messageElement.querySelector('.read-status');
        if (readStatus) {
            readStatus.textContent = 'Delivered';
            readStatus.classList.remove('read');
            readStatus.classList.add('delivered');
        }
        
    } catch (error) {
        console.error('Error sending group message:', error);
        
        // Show error state for the message
        messageElement.classList.add('failed');
        pendingIndicator.innerHTML = '❌';
        pendingIndicator.title = 'Failed to send message';
    }
};

/**
 * Open the group info modal for a group
 * @param {Object} group - Group chat object
 */
const openGroupInfo = (group) => {
    const modal = document.getElementById('group-info-modal');
    const titleElem = document.getElementById('group-info-title');
    const descriptionElem = document.getElementById('group-info-description');
    const creatorElem = document.getElementById('group-creator-name');
    const membersList = document.getElementById('group-members-list');
    const adminActions = document.getElementById('admin-actions');
    const creatorActions = document.getElementById('creator-actions');
    
    // Set basic group info
    titleElem.textContent = group.name;
    descriptionElem.textContent = group.description || 'No description';
    creatorElem.textContent = group.creator.fullName || group.creator.username;
    
    // Clear members list
    membersList.innerHTML = '';
    
    // Check user's role in the group
    const isCreator = group.creator._id === currentUserId;
    const isAdmin = group.admins.some(admin => admin._id === currentUserId);
    
    // Show/hide admin actions
    adminActions.style.display = isAdmin ? 'block' : 'none';
    
    // Show/hide creator actions
    creatorActions.style.display = isCreator ? 'block' : 'none';
    
    // Populate members list
    group.members.forEach(member => {
        const memberRow = document.createElement('div');
        memberRow.classList.add('member-row');
        
        // Member info
        const memberInfo = document.createElement('div');
        memberInfo.classList.add('member-info');
        
        const memberName = document.createElement('div');
        memberName.classList.add('member-name');
        memberName.textContent = member.fullName || member.username;
        
        // Add role tag if applicable
        if (member._id === group.creator._id) {
            const roleTag = document.createElement('span');
            roleTag.classList.add('group-tag', 'creator-tag');
            roleTag.textContent = 'Creator';
            memberName.appendChild(roleTag);
        } else if (group.admins.some(admin => admin._id === member._id)) {
            const roleTag = document.createElement('span');
            roleTag.classList.add('group-tag', 'admin-tag');
            roleTag.textContent = 'Admin';
            memberName.appendChild(roleTag);
        }
        
        memberInfo.appendChild(memberName);
        memberRow.appendChild(memberInfo);
        
        // Add action buttons if user is admin
        if ((isAdmin || isCreator) && member._id !== currentUserId) {
            const actionDiv = document.createElement('div');
            actionDiv.classList.add('member-actions');
            
            if (isCreator) {
                // Only creator can manage admins
                const isAdminMember = group.admins.some(admin => admin._id === member._id);
                
                if (isAdminMember) {
                    // Option to demote admin
                    const demoteBtn = document.createElement('button');
                    demoteBtn.classList.add('demote-btn');
                    demoteBtn.textContent = 'Demote';
                    demoteBtn.addEventListener('click', () => removeAdmin(group._id, member._id));
                    actionDiv.appendChild(demoteBtn);
                } else {
                    // Option to promote to admin
                    const promoteBtn = document.createElement('button');
                    promoteBtn.classList.add('promote-btn');
                    promoteBtn.textContent = 'Make Admin';
                    promoteBtn.addEventListener('click', () => makeAdmin(group._id, member._id));
                    actionDiv.appendChild(promoteBtn);
                }
            }
            
            // Both admins and creator can remove members
            const removeBtn = document.createElement('button');
            removeBtn.classList.add('remove-btn');
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => removeMemberFromGroup(group._id, member._id));
            actionDiv.appendChild(removeBtn);
            
            memberRow.appendChild(actionDiv);
        }
        
        membersList.appendChild(memberRow);
    });
    
    // Populate add member dropdown if user is admin
    if (isAdmin || isCreator) {
        const addMemberDropdown = document.getElementById('add-member-input');
        addMemberDropdown.innerHTML = '';
        
        // Get users who are not in the group
        const nonMembers = allUsers.filter(user => 
            user._id !== currentUserId && 
            !group.members.some(member => member._id === user._id)
        );
        
        if (nonMembers.length === 0) {
            const option = document.createElement('option');
            option.disabled = true;
            option.selected = true;
            option.textContent = 'No users available';
            addMemberDropdown.appendChild(option);
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.disabled = true;
            defaultOption.selected = true;
            defaultOption.textContent = 'Select a user';
            addMemberDropdown.appendChild(defaultOption);
            
            nonMembers.forEach(user => {
                const option = document.createElement('option');
                option.value = user._id;
                option.textContent = user.fullName || user.username;
                addMemberDropdown.appendChild(option);
            });
        }
    }
    
    // Show the modal
    modal.style.display = 'block';
};

/**
 * Add a member to the current group
 */
const addMemberToGroup = async () => {
    if (!currentGroupChat) return;
    
    const memberDropdown = document.getElementById('add-member-input');
    const memberId = memberDropdown.value;
    
    if (!memberId || memberId === 'Select a user') {
        alert('Please select a user to add');
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:8080/api/groups/${currentGroupChat._id}/members`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                members: [memberId]
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add member');
        }
        
        const updatedGroup = await response.json();
        
        // Update our local group data
        currentGroupChat = updatedGroup;
        
        // Update the group in userGroups
        const groupIndex = userGroups.findIndex(g => g._id === updatedGroup._id);
        if (groupIndex !== -1) {
            userGroups[groupIndex] = updatedGroup;
        }
        
        // Refresh the group info modal
        openGroupInfo(updatedGroup);
        
        // Show success message
        alert('Member added successfully');
        
    } catch (error) {
        console.error('Error adding member:', error);
        alert('Failed to add member');
    }
};

/**
 * Remove a member from a group
 * @param {string} groupId - ID of the group
 * @param {string} memberId - ID of the member to remove
 */
const removeMemberFromGroup = async (groupId, memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) {
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:8080/api/groups/${groupId}/members/${memberId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove member');
        }
        
        const updatedGroup = await response.json();
        
        // Update our local group data
        if (currentGroupChat && currentGroupChat._id === groupId) {
            currentGroupChat = updatedGroup;
        }
        
        // Update the group in userGroups
        const groupIndex = userGroups.findIndex(g => g._id === updatedGroup._id);
        if (groupIndex !== -1) {
            userGroups[groupIndex] = updatedGroup;
        }
        
        // Refresh the group info modal
        openGroupInfo(updatedGroup);
        
        // Show success message
        alert('Member removed successfully');
        
    } catch (error) {
        console.error('Error removing member:', error);
        alert('Failed to remove member');
    }
};

/**
 * Make a user an admin of a group
 * @param {string} groupId - ID of the group
 * @param {string} memberId - ID of the member to promote
 */
const makeAdmin = async (groupId, memberId) => {
    try {
        const response = await fetch(`http://localhost:8080/api/groups/${groupId}/admins/${memberId}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to make admin');
        }
        
        const updatedGroup = await response.json();
        
        // Update our local group data
        if (currentGroupChat && currentGroupChat._id === groupId) {
            currentGroupChat = updatedGroup;
        }
        
        // Update the group in userGroups
        const groupIndex = userGroups.findIndex(g => g._id === updatedGroup._id);
        if (groupIndex !== -1) {
            userGroups[groupIndex] = updatedGroup;
        }
        
        // Refresh the group info modal
        openGroupInfo(updatedGroup);
        
        // Show success message
        alert('User is now an admin');
        
    } catch (error) {
        console.error('Error making admin:', error);
        alert('Failed to make admin');
    }
};

/**
 * Remove admin status from a user
 * @param {string} groupId - ID of the group
 * @param {string} adminId - ID of the admin to demote
 */
const removeAdmin = async (groupId, adminId) => {
    try {
        const response = await fetch(`http://localhost:8080/api/groups/${groupId}/admins/${adminId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove admin');
        }
        
        const updatedGroup = await response.json();
        
        // Update our local group data
        if (currentGroupChat && currentGroupChat._id === groupId) {
            currentGroupChat = updatedGroup;
        }
        
        // Update the group in userGroups
        const groupIndex = userGroups.findIndex(g => g._id === updatedGroup._id);
        if (groupIndex !== -1) {
            userGroups[groupIndex] = updatedGroup;
        }
        
        // Refresh the group info modal
        openGroupInfo(updatedGroup);
        
        // Show success message
        alert('Admin status removed');
        
    } catch (error) {
        console.error('Error removing admin:', error);
        alert('Failed to remove admin');
    }
};

/**
 * Delete a group chat
 */
const deleteGroup = async () => {
    if (!currentGroupChat) return;
    
    if (!confirm(`Are you sure you want to delete the group "${currentGroupChat.name}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:8080/api/groups/${currentGroupChat._id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete group');
        }
        
        // Remove from local storage
        userGroups = userGroups.filter(g => g._id !== currentGroupChat._id);
        
        // Refresh the UI
        displayUserGroups(userGroups);
        
        // Close the modal
        document.getElementById('group-info-modal').style.display = 'none';
        
        // Clear the chat area
        const chatTitle = document.getElementById('chat-title');
        chatTitle.textContent = 'Select a chat';
        
        document.getElementById('chat-content').innerHTML = '';
        document.getElementById('chat-header-actions').style.display = 'none';
        
        currentGroupChat = null;
        isGroupChat = false;
        
        // Show success message
        alert('Group deleted successfully');
        
    } catch (error) {
        console.error('Error deleting group:', error);
        alert('Failed to delete group');
    }
};

/**
 * Handle typing indicator for group chats
 * @param {boolean} isTyping - Whether the user is typing
 */
const handleGroupTyping = (isTyping) => {
    if (!currentGroupChat) return;
    
    // Clear any existing timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // Emit typing event
    socket.emit('typingInGroup', {
        senderId: currentUserId,
        groupId: currentGroupChat._id,
        isTyping
    });
    
    // If typing has stopped, set a timeout to ensure it stops after a while
    if (!isTyping) {
        typingTimeout = setTimeout(() => {
            socket.emit('typingInGroup', {
                senderId: currentUserId,
                groupId: currentGroupChat._id,
                isTyping: false
            });
        }, 1000);
    }
};

/**
 * Set up socket event listeners for group chat functionality
 */
const setupSocketListeners = () => {
    // Existing socket handlers for direct messages
    socket.on('messageRead', (data) => {
        console.log('Message read event received:', data);
        updateMessageReadStatus(data.messageId);
    });
    
    socket.on('getOnlineUsers', (onlineUserIds) => {
        console.log('Online users received:', onlineUserIds);
        updateOnlineStatus(onlineUserIds);
    });
    
    socket.on('typing', ({senderId, isTyping}) => {
        if (currentChatUser && senderId === currentChatUser._id) {
            if (isTyping) {
                typingIndicator.style.display = 'block';
            } else {
                typingIndicator.style.display = 'none';
            }
        }
    });
    
    // New handlers for group chat
    
    // New group chat created or added to
    socket.on('newGroupChat', (group) => {
        console.log('New group chat received:', group);
        
        // Check if we already have this group
        const existingIndex = userGroups.findIndex(g => g._id === group._id);
        if (existingIndex !== -1) {
            userGroups[existingIndex] = group;
        } else {
            userGroups.push(group);
        }
        
        // Refresh the groups list
        displayUserGroups(userGroups);
    });
    
    // Group chat updated
    socket.on('groupChatUpdated', (updatedGroup) => {
        console.log('Group chat updated:', updatedGroup);
        
        // Update in our list
        const groupIndex = userGroups.findIndex(g => g._id === updatedGroup._id);
        if (groupIndex !== -1) {
            userGroups[groupIndex] = updatedGroup;
            displayUserGroups(userGroups);
        }
        
        // If this is the currently open group, update the current data
        if (currentGroupChat && currentGroupChat._id === updatedGroup._id) {
            currentGroupChat = updatedGroup;
            
            // If the group info modal is open, refresh it
            if (document.getElementById('group-info-modal').style.display === 'block') {
                openGroupInfo(updatedGroup);
            }
        }
    });
    
    // Removed from group
    socket.on('removedFromGroup', ({groupId, groupName}) => {
        console.log('Removed from group:', groupId);
        
        // Remove from our list
        userGroups = userGroups.filter(g => g._id !== groupId);
        displayUserGroups(userGroups);
        
        // If this was the current group, close it
        if (currentGroupChat && currentGroupChat._id === groupId) {
            document.getElementById('chat-title').textContent = 'Select a chat';
            document.getElementById('chat-content').innerHTML = '';
            document.getElementById('chat-header-actions').style.display = 'none';
            currentGroupChat = null;
            isGroupChat = false;
        }
        
        // Close modal if open
        document.getElementById('group-info-modal').style.display = 'none';
        
        // Show notification
        alert(`You have been removed from the group: ${groupName}`);
    });
    
    // Group deleted
    socket.on('groupChatDeleted', ({groupId, groupName}) => {
        console.log('Group chat deleted:', groupId);
        
        // Remove from our list
        userGroups = userGroups.filter(g => g._id !== groupId);
        displayUserGroups(userGroups);
        
        // If this was the current group, close it
        if (currentGroupChat && currentGroupChat._id === groupId) {
            document.getElementById('chat-title').textContent = 'Select a chat';
            document.getElementById('chat-content').innerHTML = '';
            document.getElementById('chat-header-actions').style.display = 'none';
            currentGroupChat = null;
            isGroupChat = false;
        }
        
        // Close modal if open
        document.getElementById('group-info-modal').style.display = 'none';
        
        // Show notification
        alert(`The group "${groupName}" has been deleted`);
    });
    
    // Made admin of a group
    socket.on('madeGroupAdmin', ({groupId, groupName}) => {
        console.log('Made admin of group:', groupId);
        
        // Refresh groups to get latest data
        fetchUserGroups();
        
        // Show notification
        alert(`You are now an admin of the group: ${groupName}`);
    });
    
    // Removed as admin
    socket.on('removedAsGroupAdmin', ({groupId, groupName}) => {
        console.log('Removed as admin from group:', groupId);
        
        // Refresh groups to get latest data
        fetchUserGroups();
        
        // If the info modal is open and this is the current group, refresh it
        if (currentGroupChat && currentGroupChat._id === groupId && 
            document.getElementById('group-info-modal').style.display === 'block') {
            fetchGroupDetails(groupId).then(group => {
                if (group) openGroupInfo(group);
            });
        }
        
        // Show notification
        alert(`You are no longer an admin of the group: ${groupName}`);
    });
    
    // New group message
    socket.on('newGroupMessage', (message) => {
        console.log('New group message received:', message);
        
        // If this is for the current group chat, display it
        if (currentGroupChat && message.groupId === currentGroupChat._id) {
            processGroupMessage(message, false);
        } else {
            // Increment unread count for this group
            if (!groupUnreadCounts[message.groupId]) {
                groupUnreadCounts[message.groupId] = 0;
            }
            groupUnreadCounts[message.groupId]++;
            updateGroupUnreadBadges();
        }
    });
    
    // Group message read
    socket.on('groupMessageRead', (data) => {
        console.log('Group message read:', data);
        
        // Update read status for the message if we're in the group chat
        if (currentGroupChat && currentGroupChat._id === data.groupId) {
            updateGroupMessageReadStatus(data.messageId);
        }
    });
    
    // Group typing indicator
    socket.on('typingInGroup', ({senderId, groupId, isTyping}) => {
        if (currentGroupChat && currentGroupChat._id === groupId && senderId !== currentUserId) {
            // Find sender info
            const sender = currentGroupChat.members.find(m => m._id === senderId);
            const senderName = sender ? (sender.fullName || sender.username) : 'Someone';
            
            if (isTyping) {
                typingIndicator.textContent = `${senderName} is typing...`;
                typingIndicator.style.display = 'block';
            } else {
                typingIndicator.style.display = 'none';
            }
        }
    });
};

/**
 * Mark a group message as read
 * @param {string} messageId - ID of the message
 * @param {string} senderId - ID of the sender
 */
const markGroupMessageAsRead = async (messageId, senderId) => {
    try {
        // First emit the read event via socket
        socket.emit('markGroupMessageAsRead', {
            messageId,
            groupId: currentGroupChat._id,
            readerId: currentUserId,
            senderId
        });
        
        // Then make the API call
        const response = await fetch(`http://localhost:8080/api/groups/messages/read/${messageId}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to mark message as read');
        }
    } catch (error) {
        console.error('Error marking group message as read:', error);
    }
};

/**
 * Update the read status display for a group message
 * @param {string} messageId - ID of the message
 */
const updateGroupMessageReadStatus = (messageId) => {
    if (!currentGroupChat) return;
    
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return;
    
    // Only update for sent messages (our own messages)
    if (!messageElement.classList.contains('sent')) return;
    
    // Get the read status element or create one if it doesn't exist
    let readStatus = messageElement.querySelector('.read-status');
    if (!readStatus) {
        readStatus = document.createElement('span');
        readStatus.classList.add('read-status', 'delivered');
        messageElement.appendChild(readStatus);
    }
    
    // Fetch the latest message data to get accurate read count
    fetchGroupMessageDetails(messageId).then(message => {
        if (!message || !message.readBy) return;
        
        // Get a list of active member IDs from the current group chat
        const memberIds = currentGroupChat.members.map(member => 
            typeof member === 'object' ? member._id : member
        );
        
        // Filter out the sender (current user) from the count
        const otherMemberIds = memberIds.filter(id => id !== currentUserId);
        
        // Check which members have read the message
        let allMembersRead = true;
        
        // Convert readBy to string IDs if they're objects
        const readByIds = message.readBy.map(reader => 
            typeof reader === 'object' ? reader._id : reader
        );
        
        // Check if all other members have read the message
        for (const memberId of otherMemberIds) {
            if (!readByIds.includes(memberId)) {
                allMembersRead = false;
                break;
            }
        }
        
        if (allMembersRead && otherMemberIds.length > 0) {
            readStatus.classList.remove('delivered');
            readStatus.classList.add('read');
            readStatus.textContent = 'Read by all';
        } else {
            // Don't show the count, just indicate it's delivered
            readStatus.classList.remove('read');
            readStatus.classList.add('delivered');
            readStatus.textContent = 'Delivered';
        }
    });
};

/**
 * Fetch details for a specific group message
 * @param {string} messageId - ID of the message
 * @returns {Promise<Object|null>} - Message object or null
 */
const fetchGroupMessageDetails = async (messageId) => {
    try {
        const response = await fetch(`http://localhost:8080/api/groups/${currentGroupChat._id}/messages`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch messages');
        }
        
        const messages = await response.json();
        return messages.find(msg => msg._id === messageId) || null;
    } catch (error) {
        console.error('Error fetching message details:', error);
        return null;
    }
};

/**
 * Fetch details for a specific group
 * @param {string} groupId - ID of the group
 * @returns {Promise<Object|null>} - Group object or null
 */
const fetchGroupDetails = async (groupId) => {
    try {
        const response = await fetch(`http://localhost:8080/api/groups/${groupId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch group details');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching group details:', error);
        return null;
    }
};

/**
 * Process and display a group message
 * @param {Object} message - Message object
 * @param {boolean} isFromCurrentUser - Whether the message is from the current user
 */
const processGroupMessage = (message, isFromCurrentUser = false) => {
    if (!message || !currentGroupChat) return;
    
    // Get sender name
    let senderName = isFromCurrentUser ? 'You' : 'Unknown User';
    
    if (!isFromCurrentUser) {
        // If message has populated sender data
        if (message.senderId && typeof message.senderId === 'object' && message.senderId.username) {
            senderName = message.senderId.fullName || message.senderId.username;
        } else {
            // Try to find sender in group members
            const sender = currentGroupChat.members.find(m => {
                const memberId = typeof m === 'object' ? m._id : m;
                const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
                return memberId === senderId;
            });
            
            if (sender && typeof sender === 'object') {
                senderName = sender.fullName || sender.username;
            }
        }
    }
    
    // Display the message
    const chatContent = document.getElementById('chat-content');
    const messageElement = createMessageElement(message, isFromCurrentUser, senderName);
    
    // Add read status for sent messages
    if (isFromCurrentUser) {
        const readStatus = document.createElement('span');
        readStatus.classList.add('read-status', 'delivered');
        readStatus.textContent = 'Delivered';
        messageElement.appendChild(readStatus);
        
        // If this is an existing message with read status info, update the status
        if (message.readBy && message.readBy.length > 0) {
            updateGroupMessageReadStatus(message._id);
        }
    }
    
    chatContent.appendChild(messageElement);
    chatContent.scrollTop = chatContent.scrollHeight;
    
    // Mark as read if not from current user
    if (!isFromCurrentUser && message._id) {
        markGroupMessageAsRead(message._id, typeof message.senderId === 'object' ? message.senderId._id : message.senderId);
    }
    
    return messageElement;
};