// Get user information from server using JWT token
document.addEventListener('DOMContentLoaded', () => {
    // Fetch user data using the JWT token
    fetch('http://localhost:8000/api/auth/me', {
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
                // Call the logout endpoint
                fetch('http://localhost:8000/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include', // Important for sending cookies
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
