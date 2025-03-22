document.getElementById("signup-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const fullName = document.getElementById("signup-fullname").value;
    const username = document.getElementById("signup-username").value;
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;
    const gender = document.getElementById("signup-gender").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    const signupData = {
        fullName: fullName,
        username: username,
        password: password,
        confirmPassword: confirmPassword,
        gender: gender
    };

    fetch("http://localhost:8080/api/auth/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(signupData)
    })
        .then(response => response.json())
        .then(data => {
            console.log("data:" + data);
            if (data.success) {
                alert("Signup successful!");
                window.location.href = "../pages/login.html";
            } else {
                alert(data.message || "Signup failed");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("An error occurred. Please try again.");
        });
});
