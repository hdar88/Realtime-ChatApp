document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("login-form").addEventListener("submit", function(event) {
        event.preventDefault();

        const username = document.getElementById("login-username").value;
        const password = document.getElementById("login-password").value;

        const loginData = {
            username: username,
            password: password
        };

        fetch("http://localhost:8000/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: 'include', // This is important for cookies
            body: JSON.stringify(loginData)
        })
            .then(response => response.json())
            .then(data => {
                if (data._id) {
                    // No need to store in localStorage, the JWT cookie is automatically handled
                    window.location.href = "../pages/chat.html";
                } else {
                    alert(data.error || "Login failed. Please check your credentials.");
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("An error occurred. Please try again.");
            });
    });
});
