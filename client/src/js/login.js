document.addEventListener('DOMContentLoaded', () => {
    // Password visibility toggle
    const passwordField = document.getElementById('login-password');
    const toggleButton = document.getElementById('password-toggle');
    
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                toggleButton.textContent = 'Hide';
            } else {
                passwordField.type = 'password';
                toggleButton.textContent = 'Show';
            }
        });
    }
    
    // Form validation
    const loginForm = document.getElementById('login-form');
    const usernameField = document.getElementById('login-username');
    const usernameError = document.getElementById('username-error');
    const passwordError = document.getElementById('password-error');
    const loginButton = document.getElementById('login-button');
    
    const validateForm = () => {
        let isValid = true;
        
        // Reset errors
        usernameError.textContent = '';
        usernameError.classList.remove('visible');
        passwordError.textContent = '';
        passwordError.classList.remove('visible');
        
        // Validate username
        if (!usernameField.value.trim()) {
            usernameError.textContent = 'Username is required';
            usernameError.classList.add('visible');
            isValid = false;
        }
        
        // Validate password
        if (!passwordField.value) {
            passwordError.textContent = 'Password is required';
            passwordError.classList.add('visible');
            isValid = false;
        } else if (passwordField.value.length < 6) {
            passwordError.textContent = 'Password must be at least 6 characters';
            passwordError.classList.add('visible');
            isValid = false;
        }
        
        return isValid;
    };
    
    // Form submit handler
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        loginButton.textContent = 'Logging in...';
        loginButton.disabled = true;

        const username = usernameField.value;
        const password = passwordField.value;
        const rememberMe = document.getElementById('remember-me')?.checked || false;

        const loginData = {
            username: username,
            password: password,
            rememberMe: rememberMe
        };

        fetch("http://localhost:8080/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: 'include', // This is important for cookies
            body: JSON.stringify(loginData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Login failed with status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data._id) {
                    // No need to store in localStorage, the JWT cookie is automatically handled
                    window.location.href = "../pages/chat.html";
                } else {
                    throw new Error(data.error || "Login failed. Please check your credentials.");
                }
            })
            .catch(error => {
                console.error("Error:", error);
                
                // Show error message
                passwordError.textContent = error.message || "Login failed. Please check your credentials.";
                passwordError.classList.add('visible');
                
                // Reset button
                loginButton.textContent = 'Log In';
                loginButton.disabled = false;
            });
    });
    
    // Input validation on change
    usernameField.addEventListener('input', () => {
        if (usernameField.value.trim()) {
            usernameError.textContent = '';
            usernameError.classList.remove('visible');
        }
    });
    
    passwordField.addEventListener('input', () => {
        if (passwordField.value.length >= 6) {
            passwordError.textContent = '';
            passwordError.classList.remove('visible');
        }
    });
    
    // Handle social login buttons (placeholder functionality)
    const socialButtons = document.querySelectorAll('.social-btn');
    socialButtons.forEach(button => {
        button.addEventListener('click', () => {
            alert('Social login is not implemented in this demo.');
        });
    });
});
