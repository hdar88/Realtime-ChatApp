// Set up socket for real-time communication
const socket = io('http://localhost:8080');

let currentChatUser = null;

/**
 * Initialize the chat application
 */
document.addEventListener('DOMContentLoaded', () => {
    fetchUserData();
    fetchUsersList();
    setupSettingsDropdown();

    // event listener for send button
    const sendButton = document.getElementById('send-btn');
    sendButton.addEventListener('click', () => {
        const user = getCurrentChatUser();
        sendMessage(user);
    });
});

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

    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('chat-room');
        userElement.textContent = user.fullName || 'Anonymous User';

        userElement.addEventListener('click', () => {
            openChatWithUser(user).then(r => console.log('Chat opened with:', user.fullName));
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
    const chatTitle = document.getElementById('chat-title');

    if (chatTitle) {
        chatTitle.textContent = user.fullName || 'Unknown User';
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
            console.log('Fetched messages successfully: ', response);
        }

        const messages = await response.json();
        const messagesContainerContent = document.querySelector('#chat-content');

        if (messagesContainerContent) {
            messagesContainerContent.innerHTML = '';
        }

        // Display the fetched messages
        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');

            // Apply 'sent' class if the message is from the current user
            if (message.senderId === user._id) {
                messageElement.classList.add('received');
            } else {
                messageElement.classList.add('sent');
            }

            messageElement.textContent = `${message.senderId}: ${message.message}`;
            messagesContainerContent.appendChild(messageElement);
            messagesContainerContent.prepend(messageElement);
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
};

/**
 * Listen for new messages and update the chat window
 *
 * @param {Object} newMessage New message object
 */
socket.on('newMessage', (newMessage) => {
    // Check if the current chat is with the sender of the new message
    if (currentChatUser && currentChatUser._id === newMessage.senderId) {
        const messagesContainerContent = document.querySelector('#chat-content');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (newMessage.senderId === currentChatUser._id) {
            messageElement.classList.add('sent');
        } else {
            messageElement.classList.add('received');
        }

        messageElement.textContent = `${newMessage.senderId}: ${newMessage.message}`;
        messagesContainerContent.prepend(messageElement);
        messagesContainerContent.scrollTop = messagesContainerContent.scrollHeight;
    }
});

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
    messageElement.textContent = `${user._id}: ${message}`;
    messagesContainerContent.prepend(messageElement);

    // Emit a new message event to the server
    socket.emit('newMessage', {
        senderId: user._id,
        message,
        receiverId: user._id
    });

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
            console.log('Message sent successfully: ', response);
        }

        messageInput.value = '';
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
    console.log('Connected to server');

    // Listen for new messages
    socket.on('message', (message) => {
        console.log('New message:', message);
        // Update the UI with the new message
    });

    // Listen for new users
    socket.on('user', (user) => {
        console.log('New user:', user);
    });

    // Listen for user typing
    socket.on('typing', (user) => {
        console.log('User typing:', user);
    });

    // Listen for user stopped typing
    socket.on('stopTyping', (user) => {
        console.log('User stopped typing:', user);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    // Handle server errors
    socket.on('error', (error) => {
        console.error('Server error:', error);
    });
});
