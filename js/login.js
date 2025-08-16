// This script handles the logic for the login page (index.html)

/**
 * Generates a unique 4-character App ID.
 * @returns {string} The generated App ID.
 */
const generateAppId = () => {
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

/**
 * Converts a 4-character App ID into a password string based on ASCII values.
 * @param {string} appId The App ID to convert.
 * @returns {string} The ASCII-based password.
 */
const getPasswordFromAppId = (appId) => {
    return Array.from(appId).map(char => {
        const ascii = char.charCodeAt(0);
        return String(ascii).padStart(3, '0');
    }).join('');
};

/**
 * Displays a non-intrusive message box with a given message and a color theme.
 * @param {string} message The message to display.
 * @param {string} theme The color theme ('success', 'error', 'info').
 */
function showMessage(message, theme = 'info') {
    const box = document.getElementById('message-box');
    const text = document.getElementById('message-text');

    if (!box || !text) return;

    box.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-xl transition-transform transform duration-300 z-50 ${theme}`;
    text.textContent = message;

    // Show the message box
    box.classList.add('show');

    // Hide the message box after 3 seconds
    setTimeout(() => {
        box.classList.remove('show');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const appIdDisplay = document.getElementById('app-id-display');

    /**
     * Sets up the App ID by checking local storage or generating a new one.
     */
    function setupAppId() {
        let currentAppId = localStorage.getItem('currentAppId');
        if (!currentAppId) {
            currentAppId = generateAppId();
            localStorage.setItem('currentAppId', currentAppId);
        }
        
        if (appIdDisplay) {
            appIdDisplay.textContent = currentAppId;
        } else {
            console.error("App ID display element 'app-id-display' not found.");
        }
    }

    // Check for an existing valid session and redirect if found
    const storedEndDate = localStorage.getItem('subscriptionEndDate');
    if (storedEndDate && new Date().getTime() < parseInt(storedEndDate)) {
        window.location.href = 'main.html';
        return; // Stop further execution
    } else {
        // If no valid session, clear old data and set up new App ID
        localStorage.removeItem('subscriptionEndDate');
        setupAppId();
    }
    
    if (loginForm && passwordInput) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentAppId = localStorage.getItem('currentAppId');
            const expectedPassword = getPasswordFromAppId(currentAppId);
            
            if (passwordInput.value === expectedPassword) {
                showMessage("Correct password.", 'success');
                
                const now = new Date();
                // Set the subscription to 90 days from now
                const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90);
                localStorage.setItem('subscriptionEndDate', endDate.getTime());
                
                // Redirect to the main app page after a short delay
                setTimeout(() => {
                    window.location.href = 'main.html';
                }, 1500);
            } else {
                showMessage("Incorrect password.", 'error');
            }
        });
    } else {
        console.error("Login form or password input element not found.");
    }
});
