// Get user information from server using JWT token
document.addEventListener('DOMContentLoaded', () => {
    // Fetch user data using the JWT token
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

        // Add sign out functionality
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
                    // Redirect to login page
                    window.location.href = "../pages/login.html";
                })
                .catch(error => {
                    console.error('Error during logout:', error);
                    // Even if the server call fails, we'll still redirect to login
                    window.location.href = "../pages/login.html";
                });
            }
        });
    })
    .catch(error => {
        console.error('Authentication error:', error);
        window.location.href = "../pages/login.html";
    });
});

/**
 * Fetch users and populate the sidebar
 * @param user user object
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch user list
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
        const chatRoomsContainer = document.querySelector('.chat-rooms');

        // Populate users in the sidebar
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.classList.add('chat-room');
            userElement.textContent = user.fullName || 'Unknown User';

            userElement.addEventListener('click', () => {
                openChatWithUser(user);
            });

            chatRoomsContainer.appendChild(userElement);
        });
    } catch (error) {
        console.error('Error fetching users:', error);
    }
});

/**
 * Open a chat with the selected user
 * @param user user object
 */
const openChatWithUser = (user) => {
    console.log('Opening chat with user:', user);
}
