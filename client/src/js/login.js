document.getElementById("login-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    const loginData = {
        username: username,
        password: password
    };

    fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(loginData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = "chat.html";
            } else {
                alert(data.message || "Login failed");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("An error occurred. Please try again.");
        });
});
