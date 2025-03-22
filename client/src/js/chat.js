// Get user information from localStorage
const userId = localStorage.getItem('userId');
const userFullName = localStorage.getItem('userFullName');
const userProfilePic = localStorage.getItem('userProfilePic');

// Check if user is logged in
if (!userId) {
    window.location.href = "../pages/login.html";
    exit();
}

// Update user profile information in the UI
document.addEventListener('DOMContentLoaded', () => {
    // Update profile picture
    const userImage = document.querySelector('.user-image');
    if (userProfilePic) {
        userImage.src = userProfilePic;
    }

    // Update user name
    const userNameElement = document.getElementById('user-name');
    if (userFullName) {
        userNameElement.textContent = userFullName;
    }

    // Add sign out functionality
    const signOutBtn = document.getElementById('sign-out-btn');
    signOutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to sign out?')) {
            // Call the logout endpoint
            fetch('http://localhost:8000/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                // Clear localStorage
                localStorage.removeItem('userId');
                localStorage.removeItem('userFullName');
                localStorage.removeItem('userProfilePic');
                // Redirect to login page
                window.location.href = "../pages/login.html";
            })
            .catch(error => {
                console.error('Error during logout:', error);
                // Even if the server call fails, we'll still log out locally
                localStorage.removeItem('userId');
                localStorage.removeItem('userFullName');
                localStorage.removeItem('userProfilePic');
                window.location.href = "../pages/login.html";
            });
        }
    });
});
