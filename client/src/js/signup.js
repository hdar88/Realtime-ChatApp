// Handle password visibility toggle
document.getElementById("password-toggle").addEventListener("click", function() {
    const passwordInput = document.getElementById("signup-password");
    const toggleButton = this;
    
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleButton.querySelector("img").src = "../assets/eye-slash-icon.svg";
    } else {
        passwordInput.type = "password";
        toggleButton.querySelector("img").src = "../assets/eye-icon.svg";
    }
});

document.getElementById("confirm-password-toggle").addEventListener("click", function() {
    const passwordInput = document.getElementById("signup-confirm-password");
    const toggleButton = this;
    
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleButton.querySelector("img").src = "../assets/eye-slash-icon.svg";
    } else {
        passwordInput.type = "password";
        toggleButton.querySelector("img").src = "../assets/eye-icon.svg";
    }
});

// Form validation
function validateForm() {
    let isValid = true;
    
    // Full Name validation
    const fullName = document.getElementById("signup-fullname").value.trim();
    const fullNameError = document.getElementById("fullname-error");
    
    if (!fullName) {
        fullNameError.textContent = "Full name is required";
        isValid = false;
    } else {
        fullNameError.textContent = "";
    }
    
    // Username validation
    const username = document.getElementById("signup-username").value.trim();
    const usernameError = document.getElementById("username-error");
    
    if (!username) {
        usernameError.textContent = "Username is required";
        isValid = false;
    } else if (username.length < 3) {
        usernameError.textContent = "Username must be at least 3 characters";
        isValid = false;
    } else {
        usernameError.textContent = "";
    }
    
    // Password validation
    const password = document.getElementById("signup-password").value;
    const passwordError = document.getElementById("password-error");
    
    if (!password) {
        passwordError.textContent = "Password is required";
        isValid = false;
    } else if (password.length < 6) {
        passwordError.textContent = "Password must be at least 6 characters";
        isValid = false;
    } else {
        passwordError.textContent = "";
    }
    
    // Confirm Password validation
    const confirmPassword = document.getElementById("signup-confirm-password").value;
    const confirmPasswordError = document.getElementById("confirm-password-error");
    
    if (!confirmPassword) {
        confirmPasswordError.textContent = "Please confirm your password";
        isValid = false;
    } else if (password !== confirmPassword) {
        confirmPasswordError.textContent = "Passwords do not match";
        isValid = false;
    } else {
        confirmPasswordError.textContent = "";
    }
    
    // Gender validation
    const gender = document.getElementById("signup-gender").value;
    const genderError = document.getElementById("gender-error");
    
    if (!gender) {
        genderError.textContent = "Please select your gender";
        isValid = false;
    } else {
        genderError.textContent = "";
    }
    
    return isValid;
}

// Input field validation on change
document.getElementById("signup-fullname").addEventListener("input", function() {
    const fullNameError = document.getElementById("fullname-error");
    if (this.value.trim()) {
        fullNameError.textContent = "";
    }
});

document.getElementById("signup-username").addEventListener("input", function() {
    const usernameError = document.getElementById("username-error");
    if (this.value.trim().length >= 3) {
        usernameError.textContent = "";
    }
});

document.getElementById("signup-password").addEventListener("input", function() {
    const passwordError = document.getElementById("password-error");
    if (this.value.length >= 6) {
        passwordError.textContent = "";
    }
    
    // Update confirm password validation if it has a value
    const confirmPassword = document.getElementById("signup-confirm-password");
    const confirmPasswordError = document.getElementById("confirm-password-error");
    
    if (confirmPassword.value && confirmPassword.value !== this.value) {
        confirmPasswordError.textContent = "Passwords do not match";
    } else if (confirmPassword.value) {
        confirmPasswordError.textContent = "";
    }
});

document.getElementById("signup-confirm-password").addEventListener("input", function() {
    const password = document.getElementById("signup-password").value;
    const confirmPasswordError = document.getElementById("confirm-password-error");
    
    if (this.value && this.value !== password) {
        confirmPasswordError.textContent = "Passwords do not match";
    } else {
        confirmPasswordError.textContent = "";
    }
});

document.getElementById("signup-gender").addEventListener("change", function() {
    const genderError = document.getElementById("gender-error");
    if (this.value) {
        genderError.textContent = "";
    }
});

// Social login buttons (placeholders)
document.querySelector(".google-btn").addEventListener("click", function(event) {
    event.preventDefault();
    alert("Google sign up integration coming soon!");
});

document.querySelector(".github-btn").addEventListener("click", function(event) {
    event.preventDefault();
    alert("GitHub sign up integration coming soon!");
});

// Form submission handler
document.getElementById("signup-form").addEventListener("submit", function(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    const fullName = document.getElementById("signup-fullname").value.trim();
    const username = document.getElementById("signup-username").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;
    const gender = document.getElementById("signup-gender").value;
    
    const signupData = {
        fullName: fullName,
        username: username,
        password: password,
        confirmPassword: confirmPassword,
        gender: gender
    };
    
    // Show loading state
    const submitButton = document.querySelector(".submit-btn");
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = "Signing up...";
    submitButton.disabled = true;
    
    fetch("http://localhost:8080/api/auth/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(signupData)
    })
    .then(response => {
        // Reset button state
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
        
        if (response.ok) {
            return response.json();
        } else {
            return response.json().then(err => {
                throw new Error(err.message || "Sign up failed. Please try again.");
            });
        }
    })
    .then(data => {
        // Show success message
        alert("Sign up successful! Please log in to continue.");
        window.location.href = "login.html";
    })
    .catch(error => {
        console.error("Error:", error);
        const errorMessage = error.message || "An error occurred. Please try again.";
        alert(errorMessage);
    });
});
