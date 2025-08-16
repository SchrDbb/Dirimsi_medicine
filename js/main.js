import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables for Firebase configuration and authentication
// __app_id and __firebase_config are provided by the Canvas environment.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
// __initial_auth_token is provided by the Canvas environment for custom authentication.
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app = null;
let auth = null;
let db = null;
let userId = null;
let profileDocRef = null;
let userIsAuthenticated = false;
let isFirebaseInitialized = false;

// Audio for correct and incorrect answers (subtle, professional tones)
// Note: External sound URLs are used here. For new code, consider Tone.js.
const correctSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568.wav'); // Soft chime
const incorrectSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2569/2569.wav'); // Soft error chime

// Dummy notes content for Study Mode
const notes = {
    biology: {
        title: "Biology Basics",
        content: `
            <h3>Cell Structure and Function</h3>
            <p>The cell is the basic structural and functional unit of all known living organisms, and it is the smallest unit of life that can replicate independently. It consists of cytoplasm enclosed within a membrane, which contains many biomolecules such as proteins and nucleic acids.</p>
            <p><strong>Prokaryotic Cells:</strong> These are the simplest cell types, lacking a true nucleus and other membrane-bound organelles. Bacteria and Archaea are examples of prokaryotes. Their genetic material is located in a nucleoid region.</p>
            <p><strong>Eukaryotic Cells:</strong> More complex, eukaryotic cells possess a nucleus enclosed within a nuclear membrane and various membrane-bound organelles like mitochondria, endoplasmic reticulum, and Golgi apparatus. Animals, plants, fungi, and protists are eukaryotes.</p>
            <h3>Genetics and Heredity</h3>
            <p>Genetics is the study of genes, genetic variation, and heredity in organisms. It explores how traits are passed from parents to offspring. The fundamental unit of heredity is the gene, a segment of DNA that codes for a specific protein or functional RNA molecule.</p>
            <p><strong>DNA (Deoxyribonucleic Acid):</strong> The genetic material found in all living organisms, structured as a double helix. It carries the instructions for an organism's development, functioning, growth, and reproduction.</p>
            <p><strong>RNA (Ribonucleic Acid):</strong> Primarily involved in protein synthesis, gene regulation, and can carry genetic information in some viruses. Different types include mRNA, tRNA, and rRNA.</p>
            <p><strong>Mendelian Inheritance:</strong> Basic principles of heredity, including concepts of dominant and recessive alleles, segregation, and independent assortment, first described by Gregor Mendel.</p>
        `
    },
    chemistry: {
        title: "Introduction to Organic Chemistry",
        content: `
            <h3>Hydrocarbons</h3>
            <p>Hydrocarbons are organic compounds that are entirely composed of hydrogen and carbon atoms. They are the principal constituents of petroleum and natural gas. They can be saturated (alkanes) or unsaturated (alkenes and alkynes), depending on the types of bonds between carbon atoms.</p>
            <p><strong>Alkanes:</strong> Saturated hydrocarbons containing only single bonds between carbon atoms (e.g., methane, ethane).</p>
            <p><strong>Alkenes:</strong> Unsaturated hydrocarbons containing at least one carbon-carbon double bond (e.g., ethene, propene).</p>
            <p><strong>Alkynes:</strong> Unsaturated hydrocarbons containing at least one carbon-carbon triple bond (e.g., ethyne, propyne).</p>
            <h3>Functional Groups</h3>
            <p>A functional group is a specific group of atoms within a molecule that is responsible for the characteristic chemical reactions of that molecule. These groups determine how organic compounds will react. Common functional groups include hydroxyl (-OH), carboxyl (-COOH), amino (-NH2), and carbonyl (C=O).</p>
            <p><strong>Alcohols:</strong> Contain a hydroxyl (-OH) group (e.g., ethanol).</p>
            <p><strong>Carboxylic Acids:</strong> Contain a carboxyl (-COOH) group (e.g., acetic acid).</p>
            <p><strong>Amines:</strong> Contain an amino (-NH2) group (e.g., methylamine).</p>
            <p>Understanding functional groups is key to predicting the properties and reactions of organic compounds.</p>
        `
    },
    'internal-medicine': {
        title: 'Internal Medicine',
        content: `
            <h3>Diabetes Mellitus</h3>
            <p>Diabetes is a chronic condition that affects how your body turns food into energy. Most of the food you eat is broken down into sugar (glucose) and released into your bloodstream. When your blood sugar goes up, it signals your pancreas to release insulin. Insulin acts like a key to let blood sugar into your body’s cells for use as energy.</p>
            <p><strong>Type 1 Diabetes:</strong> An autoimmune condition where the body does not produce insulin. Requires daily insulin injections.</p>
            <p><strong>Type 2 Diabetes:</strong> The body doesn't use insulin well and can't keep blood sugar at normal levels. Often managed with lifestyle changes, oral medications, or insulin.</p>
            <p><strong>Gestational Diabetes:</strong> Occurs during pregnancy in women who haven't previously had diabetes. It can lead to health problems for both mother and baby if not managed.</p>
            <h3>Hypertension</h3>
            <p>Hypertension, or high blood pressure, is a condition in which the force of the blood against the artery walls is too high. Over time, uncontrolled high blood pressure increases the risk of heart disease, stroke, and other serious health problems.</p>
            <p><strong>Causes:</strong> Primary (essential) hypertension often develops gradually over many years with no identifiable cause. Secondary hypertension is caused by an underlying condition, such as kidney disease, thyroid problems, or certain medications.</p>
            <p><strong>Symptoms:</strong> Hypertension often has no symptoms, which is why it's sometimes called the "silent killer." Regular blood pressure checks are essential.</p>
            <p><strong>Management:</strong> Lifestyle modifications (diet, exercise, weight management) are crucial. Medications, such as diuretics, ACE inhibitors, and calcium channel blockers, may also be prescribed.</p>
        `
    }
};

// Dummy questions for arcade mode (Course Test and International Exams)
const dummyQuestions = [
    {
        question: "What is the primary source of energy for Earth's climate system?",
        options: ["The Sun", "Geothermal energy", "Nuclear energy", "Wind energy"],
        correctAnswer: "The Sun"
    },
    {
        question: "Which organ is responsible for insulin production?",
        options: ["Liver", "Pancreas", "Kidney", "Stomach"],
        correctAnswer: "Pancreas"
    },
    {
        question: "What is the chemical symbol for water?",
        options: ["H2O", "CO2", "O2", "H2SO4"],
        correctAnswer: "H2O"
    },
    {
        question: "Which of the following is the largest artery in the human body?",
        options: ["Aorta", "Pulmonary Artery", "Carotid Artery", "Femoral Artery"],
        correctAnswer: "Aorta"
    },
    {
        question: "What is the normal body temperature in Celsius?",
        options: ["37°C", "35°C", "39°C", "40°C"],
        correctAnswer: "37°C"
    },
    {
        question: "The process by which plants make their own food is called?",
        options: ["Photosynthesis", "Respiration", "Transpiration", "Fermentation"],
        correctAnswer: "Photosynthesis"
    },
    {
        question: "Which bone is commonly known as the 'kneecap'?",
        options: ["Patella", "Tibia", "Fibula", "Femur"],
        correctAnswer: "Patella"
    },
    {
        question: "What is the main function of red blood cells?",
        options: ["Carry oxygen", "Fight infection", "Clot blood", "Produce antibodies"],
        correctAnswer: "Carry oxygen"
    }
];


// Generates a 4-character alphanumeric App ID and its ASCII sum password.
// This is used for the contact modal when coins run out, not for actual app authentication.
function generateAppIdAndPassword() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let localAppId = '';
    for (let i = 0; i < 4; i++) {
        localAppId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    // Sum of ASCII values as a password
    const password = localAppId.split('').map(char => char.charCodeAt(0)).reduce((sum, val) => sum + val, 0).toString();
    return { appId: localAppId, password: password };
}

// Displays a temporary message box at the bottom right of the screen.
// @param {string} message - The text content of the message.
// @param {string} theme - The styling theme ('info', 'success', 'error').
function showMessage(message, theme = 'info') {
    const box = document.getElementById('message-box');
    const text = document.getElementById('message-text');
    if (!box || !text) return; // Exit if elements are not found

    let bgColor, textColor;
    if (theme === 'success') {
        bgColor = 'bg-golden-yellow';
        textColor = 'text-brown-dark';
    } else if (theme === 'error') {
        bgColor = 'bg-dark-red';
        textColor = 'text-yellow-highlight';
    } else { // Default 'info'
        bgColor = 'bg-brown-accent';
        textColor = 'text-yellow-text';
    }

    // Apply classes for styling and animation
    box.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-xl transition-transform transform duration-300 z-50 ${bgColor} ${textColor}`;
    text.textContent = message;
    box.classList.add('show'); // Trigger the 'show' animation (translateY(0))

    // Hide the message after 3 seconds
    setTimeout(() => box.classList.remove('show'), 3000);
}

// Updates the subscription countdown timer in the header.
// Also handles subscription expiration by redirecting to the login page.
// @param {Date} endTime - The end date of the subscription.
function updateCountdown(endTime) {
    const countdownDisplay = document.getElementById('countdown-display');
    const countdownLoading = document.getElementById('countdown-loading');
    if (!countdownDisplay || !countdownLoading) return; // Exit if elements are not found

    // Hide loading text and show countdown numbers
    countdownLoading.classList.add('hidden');
    countdownDisplay.classList.remove('hidden');

    const countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime.getTime() - now;

        // If countdown has expired
        if (distance < 0) {
            clearInterval(countdownInterval); // Stop the timer
            document.getElementById('countdown-timer').textContent = "Subscription Expired!";
            showMessage("Your subscription has expired. Please log in again to renew.", "error");
            // Redirect to login page after a delay
            setTimeout(() => {
                // Clear relevant local storage items on expiration
                localStorage.removeItem('subscriptionEndDate');
                localStorage.removeItem('currentAppId');
                window.location.href = 'index.html';
            }, 3000);
            return;
        }

        // Calculate time remaining
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Update display with padded numbers
        document.getElementById('countdown-days').textContent = days.toString().padStart(2, '0');
        document.getElementById('countdown-hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('countdown-minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('countdown-seconds').textContent = seconds.toString().padStart(2, '0');
    }, 1000);
}

// Updates the user's coin balance in Firestore and on the UI.
// @param {number} newBalance - The new coin balance.
async function updateCoinBalance(newBalance) {
    // Check if Firebase is initialized and user is authenticated for persistence
    if (!isFirebaseInitialized || !userIsAuthenticated || !profileDocRef) {
        showMessage("Cannot update coins in Demo Mode.", "info");
        return; // Prevent update if not in authenticated mode
    }

    try {
        await updateDoc(profileDocRef, { coins: newBalance }); // Update Firestore document
        document.getElementById('coin-balance').textContent = newBalance; // Update profile section
        document.getElementById('header-coin-balance').textContent = newBalance; // Update header
        showMessage(`Coin balance updated: ${newBalance} coins`, "success");
    } catch (e) {
        console.error("Error updating coins:", e);
        showMessage("Failed to update coins.", "error");
    }
}

// Awards 1 daily coin if the user hasn't logged in today.
// @param {object} lastLogin - Firestore Timestamp object for last login.
async function awardDailyCoin(lastLogin) {
    // Only proceed if Firebase is initialized and user is authenticated
    if (!isFirebaseInitialized || !userIsAuthenticated || !profileDocRef) return;

    const now = new Date();
    // Convert Firestore Timestamp to Date object
    const lastLoginDate = lastLogin ? lastLogin.toDate() : null;
    
    // Normalize dates to just the day for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLoginDay = lastLoginDate ? new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate()) : null;

    // Award coin if it's a new day since last login
    if (!lastLoginDay || today > lastLoginDay) {
        const currentCoins = parseInt(document.getElementById('coin-balance').textContent) || 1000;
        await updateDoc(profileDocRef, {
            coins: currentCoins + 1,
            lastLogin: now // Update last login to current time
        });
        document.getElementById('coin-balance').textContent = currentCoins + 1;
        document.getElementById('header-coin-balance').textContent = currentCoins + 1;
        showMessage("You received 1 daily coin!", "success");
    }
}

// Fetches user data from Firestore and updates the UI.
// Also initializes subscription countdown and awards daily coin if applicable.
async function fetchUserData() {
    // If not authenticated or Firebase not initialized, use localStorage for countdown (Demo Mode fallback)
    if (!profileDocRef || !userIsAuthenticated) {
        const storedEndDate = localStorage.getItem('subscriptionEndDate');
        if (storedEndDate) updateCountdown(new Date(parseInt(storedEndDate)));
        else document.getElementById('countdown-loading').textContent = "No subscription found.";
        return;
    }

    // Listen for real-time updates to the user's profile document
    onSnapshot(profileDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Populate profile fields
            document.getElementById('name').value = data.name || '';
            document.getElementById('educational-level').value = data.educationalLevel || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('whatsapp-number').value = data.whatsappNumber || '';
            
            // Update coin balance displays
            document.getElementById('coin-balance').textContent = data.coins || 1000;
            document.getElementById('header-coin-balance').textContent = data.coins || 1000;
            
            // Update profile picture
            if (data.profilePicUrl) document.getElementById('profile-pic-display').src = data.profilePicUrl;
            
            // Update subscription countdown
            if (data.subscriptionEndDate) updateCountdown(data.subscriptionEndDate.toDate());
            
            // Award daily coin if applicable
            if (data.lastLogin) awardDailyCoin(data.lastLogin);
        } else {
            // If profile document doesn't exist, create it with initial data
            const initialData = {
                name: '',
                educationalLevel: '',
                email: '',
                whatsappNumber: '',
                profilePicUrl: 'https://placehold.co/150x150/42322a/d4c2a5?text=Profile',
                subscriptionEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
                coins: 1000,
                lastLogin: new Date()
            };
            setDoc(profileDocRef, initialData)
                .then(() => {
                    showMessage("Welcome! Your 90-day subscription has started with 1000 coins.", "success");
                    document.getElementById('coin-balance').textContent = 1000;
                    document.getElementById('header-coin-balance').textContent = 1000;
                })
                .catch(error => {
                    console.error("Error setting initial document:", error);
                    showMessage("Error setting up your profile.", "error");
                });
        }
    }, (error) => {
        console.error("Error listening to document:", error);
        showMessage("Failed to load user data.", "error");
    });
}

// Saves the user's profile data to Firestore.
async function saveProfile() {
    // Prevent saving in Demo Mode or if not authenticated
    if (!isFirebaseInitialized || !userIsAuthenticated) {
        showMessage("Cannot save profile in Demo Mode.", "info");
        return;
    }
    if (!profileDocRef) {
        showMessage("Authentication error. Please refresh the page.", "error");
        return;
    }

    // Get current values from input fields
    const name = document.getElementById('name').value;
    const educationalLevel = document.getElementById('educational-level').value;
    const email = document.getElementById('email').value;
    const whatsappNumber = document.getElementById('whatsapp-number').value;
    const profilePicUrl = document.getElementById('profile-pic-display').src; // Get current image src

    try {
        // Use setDoc with merge: true to update fields without overwriting the entire document
        await setDoc(profileDocRef, { name, educationalLevel, email, whatsappNumber, profilePicUrl }, { merge: true });
        showMessage("Profile saved successfully!", "success");
    } catch (e) {
        console.error("Error saving profile:", e);
        showMessage("Failed to save profile.", "error");
    }
}

// Hides all page sections and shows the specified one.
// Also updates navigation link styling to indicate the active page.
// @param {string} pageId - The ID of the section to show (e.g., 'profile', 'modes').
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => section.classList.add('hidden'));
    const targetSection = document.getElementById(pageId + '-section');
    if (targetSection) targetSection.classList.remove('hidden');

    // Update navigation link styles
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('text-golden-yellow', 'font-bold');
        link.classList.add('text-yellow-text');
    });
    const activeLink = document.querySelector(`a[data-page="${pageId}"]`);
    if (activeLink) {
        activeLink.classList.remove('text-yellow-text');
        activeLink.classList.add('text-golden-yellow', 'font-bold');
    }
}

// Starts the Test Quiz in Arcade Mode.
// This function will now be called from quiz.html, not directly from main.js buttons.
// @param {string} type - 'course' or 'international'.
// @param {string} topicOrExam - The specific topic (e.g., 'biology') or exam (e.g., 'usmle').
function startQuiz(type, topicOrExam) {
    let currentCoins = parseInt(document.getElementById('coin-balance').textContent);
    // Check if user has enough coins, if not, show contact modal
    if (currentCoins <= 0) {
        const { appId: contactAppId, password: contactPassword } = generateAppIdAndPassword();
        document.getElementById('app-id-display').textContent = contactAppId;
        document.getElementById('password-display').textContent = contactPassword;
        document.getElementById('whatsapp-link').href = `https://wa.me/+237652659429?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
        document.getElementById('telegram-link').href = `https://t.me/SchrDbb?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
        document.getElementById('contact-modal').classList.remove('hidden');
        return;
    }

    // Now, this part would ideally be moved to a separate quiz.html or handled dynamically within main.html
    // For now, if called directly, it would proceed as before.
    // However, the new flow will be: main.html -> selection.html -> quiz.html
    // So, this function as it is, needs to be adapted or its logic moved.
    // For demonstration, let's assume quiz.html will handle its own question loading based on params.
    // The previous implementation of startTestQuiz is essentially this,
    // but without explicit topic/exam selection.

    // Display relevant quiz title
    let quizTitle = '';
    if (type === 'course') {
        quizTitle = `Course Test: ${topicOrExam.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`;
    } else if (type === 'international') {
        quizTitle = `International Exam: ${topicOrExam.toUpperCase()}`;
    }

    document.getElementById('test-quiz-title').textContent = quizTitle;
    document.getElementById('test-quiz-content').classList.remove('hidden'); // Show quiz content

    let currentQuestionIndex = 0;
    let correctAnswers = 0;

    function loadQuestion() {
        if (currentQuestionIndex >= dummyQuestions.length) {
            showMessage(`Quiz completed! Score: ${correctAnswers}/${dummyQuestions.length}`, "success");
            document.getElementById('test-quiz-content').classList.add('hidden');
            return;
        }

        const question = dummyQuestions[currentQuestionIndex];
        document.getElementById('quiz-question').textContent = question.question;
        const optionsContainer = document.getElementById('quiz-options');
        optionsContainer.innerHTML = '';
        question.options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'py-2 px-4 bg-brown-accent text-yellow-text rounded-lg hover:bg-golden-yellow hover:text-brown-dark transition-all';
            button.textContent = option;
            button.addEventListener('click', () => {
                if (option === question.correctAnswer) {
                    correctAnswers++;
                    correctSound.play().catch(e => console.error("Sound play error:", e));
                    showMessage("Correct answer!", "success");
                } else {
                    incorrectSound.play().catch(e => console.error("Sound play error:", e));
                    showMessage("Incorrect answer -1 coin", "error");
                    currentCoins = currentCoins - 1;
                    updateCoinBalance(currentCoins);
                }
                currentQuestionIndex++;
                loadQuestion();
            });
            optionsContainer.appendChild(button);
        });
    }

    loadQuestion();
    document.getElementById('submit-answer-btn').classList.add('hidden');
}


// Starts a Challenge Mode quiz against an opponent.
// @param {string} opponentId - The User ID of the opponent.
async function startChallenge(opponentId) {
    let currentCoins = parseInt(document.getElementById('coin-balance').textContent);
    // Check for coins first
    if (currentCoins <= 0) {
        const { appId: contactAppId, password: contactPassword } = generateAppIdAndPassword();
        document.getElementById('app-id-display').textContent = contactAppId;
        document.getElementById('password-display').textContent = contactPassword;
        document.getElementById('whatsapp-link').href = `https://wa.me/+237652659429?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
        document.getElementById('telegram-link').href = `https://t.me/SchrDbb?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
        document.getElementById('contact-modal').classList.remove('hidden');
        return;
    }

    // Validate opponent ID
    if (!opponentId) {
        showMessage("Please enter a valid opponent User ID.", "error");
        return;
    }

    // js/main.js

// Firebase instances are now initialized globally in index.html and made available on the window object.
// This script will wait for the 'firebaseAuthReady' event to ensure Firebase is ready.

import { doc, getDoc, onSnapshot, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"; // Only need getAuth for signOut

// Audio for correct and incorrect answers (subtle, professional tones)
const correctSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568.wav'); // Soft chime
const incorrectSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2569/2569.wav'); // Soft error chime

// Dummy notes content for Study Mode (can be moved to Firestore if dynamic notes are needed)
const notes = {
    biology: {
        title: "Biology Basics",
        content: `
            <h3>Cell Structure and Function</h3>
            <p>The cell is the basic structural and functional unit of all known living organisms, and it is the smallest unit of life that can replicate independently. It consists of cytoplasm enclosed within a membrane, which contains many biomolecules such as proteins and nucleic acids.</p>
            <p><strong>Prokaryotic Cells:</strong> These are the simplest cell types, lacking a true nucleus and other membrane-bound organelles. Bacteria and Archaea are examples of prokaryotes. Their genetic material is located in a nucleoid region.</p>
            <p><strong>Eukaryotic Cells:</strong> More complex, eukaryotic cells possess a nucleus enclosed within a nuclear membrane and various membrane-bound organelles like mitochondria, endoplasmic reticulum, and Golgi apparatus. Animals, plants, fungi, and protists are eukaryotes.</p>
            <h3>Genetics and Heredity</h3>
            <p>Genetics is the study of genes, genetic variation, and heredity in organisms. It explores how traits are passed from parents to offspring. The fundamental unit of heredity is the gene, a segment of DNA that codes for a specific protein or functional RNA molecule.</p>
            <p><strong>DNA (Deoxyribonucleic Acid):</strong> The genetic material found in all living organisms, structured as a double helix. It carries the instructions for an organism's development, functioning, growth, and reproduction.</p>
            <p><strong>RNA (Ribonucleic Acid):</strong> Primarily involved in protein synthesis, gene regulation, and can carry genetic information in some viruses. Different types include mRNA, tRNA, and rRNA.</p>
            <p><strong>Mendelian Inheritance:</strong> Basic principles of heredity, including concepts of dominant and recessive alleles, segregation, and independent assortment, first described by Gregor Mendel.</p>
        `
    },
    chemistry: {
        title: "Introduction to Organic Chemistry",
        content: `
            <h3>Hydrocarbons</h3>
            <p>Hydrocarbons are organic compounds that are entirely composed of hydrogen and carbon atoms. They are the principal constituents of petroleum and natural gas. They can be saturated (alkanes) or unsaturated (alkenes and alkynes), depending on the types of bonds between carbon atoms.</p>
            <p><strong>Alkanes:</strong> Saturated hydrocarbons containing only single bonds between carbon atoms (e.g., methane, ethane).</p>
            <p><strong>Alkenes:</strong> Unsaturated hydrocarbons containing at least one carbon-carbon double bond (e.g., ethene, propene).</p>
            <p><strong>Alkynes:</strong> Unsaturated hydrocarbons containing at least one carbon-carbon triple bond (e.g., ethyne, propyne).</p>
            <h3>Functional Groups</h3>
            <p>A functional group is a specific group of atoms within a molecule that is responsible for the characteristic chemical reactions of that molecule. These groups determine how organic compounds will react. Common functional groups include hydroxyl (-OH), carboxyl (-COOH), amino (-NH2), and carbonyl (C=O).</p>
            <p><strong>Alcohols:</strong> Contain a hydroxyl (-OH) group (e.g., ethanol).</p>
            <p><strong>Carboxylic Acids:</strong> Contain a carboxyl (-COOH) group (e.g., acetic acid).</p>
            <p><strong>Amines:</strong> Contain an amino (-NH2) group (e.g., methylamine).</p>
            <p>Understanding functional groups is key to predicting the properties and reactions of organic compounds.</p>
        `
    },
    'internal-medicine': {
        title: 'Internal Medicine',
        content: `
            <h3>Diabetes Mellitus</h3>
            <p>Diabetes is a chronic condition that affects how your body turns food into energy. Most of the food you eat is broken down into sugar (glucose) and released into your bloodstream. When your blood sugar goes up, it signals your pancreas to release insulin. Insulin acts like a key to let blood sugar into your body’s cells for use as energy.</p>
            <p><strong>Type 1 Diabetes:</strong> An autoimmune condition where the body does not produce insulin. Requires daily insulin injections.</p>
            <p><strong>Type 2 Diabetes:</strong> The body doesn't use insulin well and can't keep blood sugar at normal levels. Often managed with lifestyle changes, oral medications, or insulin.</p>
            <p><strong>Gestational Diabetes:</strong> Occurs during pregnancy in women who haven't previously had diabetes. It can lead to health problems for both mother and baby if not managed.</p>
            <h3>Hypertension</h3>
            <p>Hypertension, or high blood pressure, is a condition in which the force of the blood against the artery walls is too high. Over time, uncontrolled high blood pressure increases the risk of heart disease, stroke, and other serious health problems.</p>
            <p><strong>Causes:</strong> Primary (essential) hypertension often develops gradually over many years with no identifiable cause. Secondary hypertension is caused by an underlying condition, such as kidney disease, thyroid problems, or certain medications.</p>
            <p><strong>Symptoms:</strong> Hypertension often has no symptoms, which is why it's sometimes called the "silent killer." Regular blood pressure checks are essential.</p>
            <p><strong>Management:</strong> Lifestyle modifications (diet, exercise, weight management) are crucial. Medications, such as diuretics, ACE inhibitors, and calcium channel blockers, may also be prescribed.</p>
        `
    }
};

// Dummy questions for arcade mode (Challenge Mode uses these)
const dummyQuestions = [
    {
        question: "What is the primary source of energy for Earth's climate system?",
        options: ["The Sun", "Geothermal energy", "Nuclear energy", "Wind energy"],
        correctAnswer: "The Sun"
    },
    {
        question: "Which organ is responsible for insulin production?",
        options: ["Liver", "Pancreas", "Kidney", "Stomach"],
        correctAnswer: "Pancreas"
    },
    {
        question: "What is the chemical symbol for water?",
        options: ["H2O", "CO2", "O2", "H2SO4"],
        correctAnswer: "H2O"
    },
    {
        question: "Which of the following is the largest artery in the human body?",
        options: ["Aorta", "Pulmonary Artery", "Carotid Artery", "Femoral Artery"],
        correctAnswer: "Aorta"
    },
    {
        question: "What is the normal body temperature in Celsius?",
        options: ["37°C", "35°C", "39°C", "40°C"],
        correctAnswer: "37°C"
    },
    {
        question: "The process by which plants make their own food is called?",
        options: ["Photosynthesis", "Respiration", "Transpiration", "Fermentation"],
        correctAnswer: "Photosynthesis"
    },
    {
        question: "Which bone is commonly known as the 'kneecap'?",
        options: ["Patella", "Tibia", "Fibula", "Femur"],
        correctAnswer: "Patella"
    },
    {
        question: "What is the main function of red blood cells?",
        options: ["Carry oxygen", "Fight infection", "Clot blood", "Produce antibodies"],
        correctAnswer: "Carry oxygen"
    }
];

// Displays a temporary message box at the bottom right of the screen.
// This function is provided by index.html as window.showMessage.
// @param {string} message - The text content of the message.
// @param {string} theme - The styling theme ('info', 'success', 'error').
// function showMessage(message, theme = 'info') { ... } // Removed, now using window.showMessage

// All main.js logic now resides within the 'firebaseAuthReady' event listener
// to ensure Firebase is fully initialized and authenticated before execution.
document.addEventListener('firebaseAuthReady', async () => {
    // Check if Firebase instances are available globally after the event
    if (!window.db || !window.auth || !window.userId || !window.appId) {
        console.error("Firebase connection not established. Application features are unavailable.");
        // Update UI to reflect backend issues, not "Demo Mode"
        document.getElementById('countdown-loading').textContent = "Backend Connection Issue";
        document.getElementById('save-profile-btn').disabled = true;
        document.getElementById('save-message').classList.remove('hidden');
        document.getElementById('save-message').textContent = "Profile saving unavailable due to backend issues.";
        document.getElementById('user-id-display').textContent = "User ID: Unavailable";
        document.getElementById('current-user-id').textContent = "Your User ID: Unavailable";
        document.getElementById('opponent-user-id').textContent = "Opponent User ID: Unavailable";
        if (typeof window.showMessage === 'function') {
            window.showMessage("Application features unavailable due to backend connection issues. Please refresh.", "error");
        }
        return; // Stop further execution if Firebase is not ready
    }

    console.log("Firebase Auth Ready in main.js. User ID:", window.userId);

    const db = window.db;
    const auth = window.auth;
    const userId = window.userId;
    const appId = window.appId;

    // References to UI elements
    const profileLink = document.getElementById('profile-link');
    const modesLink = document.getElementById('modes-link');
    const profileSection = document.getElementById('profile-section');
    const modesSection = document.getElementById('modes-section');
    const userIdDisplay = document.getElementById('user-id-display');
    const headerCoinBalance = document.getElementById('header-coin-balance');
    const coinBalanceDisplay = document.getElementById('coin-balance'); // For profile section
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const saveMessage = document.getElementById('save-message');
    const profilePicUpload = document.getElementById('profile-pic-upload');
    const profilePicDisplay = document.getElementById('profile-pic-display');

    // Contact modal elements (for "No Coins Left" notification)
    const contactModal = document.getElementById('contact-modal');
    const closeContactModalBtn = document.getElementById('close-contact-modal');
    const appIdDisplayModal = document.getElementById('app-id-display');
    const passwordDisplayModal = document.getElementById('password-display');
    const whatsappLink = document.getElementById('whatsapp-link');
    const telegramLink = document.getElementById('telegram-link');

    // Profile input fields
    const nameInput = document.getElementById('name');
    const educationalLevelInput = document.getElementById('educational-level');
    const emailInput = document.getElementById('email');
    const whatsappNumberInput = document.getElementById('whatsapp-number');

    // Modes
    const studyModeBtn = document.getElementById('study-mode-btn');
    const arcadeModeBtn = document.getElementById('arcade-mode-btn');
    const studyContent = document.getElementById('study-content');
    const arcadeContent = document.getElementById('arcade-content');

    // Study Mode Category/Topic Links
    const categoryCards = document.querySelectorAll('.category-card');
    const notesDisplay = document.getElementById('notes-display');
    const currentNoteTopic = document.getElementById('current-note-topic');
    const noteContent = document.getElementById('note-content');
    const backToCategoriesBtn = document.getElementById('back-to-categories');

    // Arcade Mode buttons
    const testModeBtn = document.getElementById('test-mode-btn');
    const challengeModeBtn = document.getElementById('challenge-mode-btn');
    const testContent = document.getElementById('test-content');
    const challengeContent = document.getElementById('challenge-content');
    const courseTestBtn = document.getElementById('course-test-btn'); // Will link to quiz.html for a course quiz
    const internationalExamBtn = document.getElementById('international-exam-btn'); // Added for completeness

    // Function to get user profile document reference
    const getUserDocRef = () => doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');

    /**
     * Converts a 4-character App ID (stored as loginAppId in profile) into a password string based on ASCII values.
     * This is the "password" for contacting SchrDbb.
     * @param {string} loginAppId The App ID to convert.
     * @returns {string} The ASCII-based password.
     */
    const getPasswordFromLoginAppId = (loginAppId) => {
        return Array.from(loginAppId).map(char => {
            const ascii = char.charCodeAt(0);
            return String(ascii).padStart(3, '0');
        }).join('');
    };

    // Updates the user's coin balance in Firestore and on the UI.
    // This function can be called by `quiz.js` as well.
    // @param {number} newBalance - The new coin balance.
    async function updateCoinBalance(newBalance) {
        try {
            if (!userId) { // Ensure user is authenticated
                console.error("User not authenticated for coin update.");
                window.showMessage("Authentication error. Cannot update coins.", "error");
                return;
            }
            await updateDoc(getUserDocRef(), { coins: newBalance }); // Update Firestore document
            // UI updates are handled by the onSnapshot listener in fetchUserData
            if (typeof window.showMessage === 'function') {
                window.showMessage(`Coin balance updated: ${newBalance} coins`, "success");
            }
        } catch (e) {
            console.error("Error updating coins:", e);
            if (typeof window.showMessage === 'function') {
                window.showMessage("Failed to update coins.", "error");
            }
        }
    }

    // Awards 1 daily coin if the user hasn't logged in today.
    // @param {object} lastLogin - Firestore Timestamp object for last login.
    async function awardDailyCoin(lastLogin) {
        const now = new Date();
        const lastLoginDate = lastLogin ? lastLogin.toDate() : null;

        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastLoginDay = lastLoginDate ? new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate()) : null;

        if (!userId) { // Ensure user is authenticated
            console.warn("User not authenticated. Cannot award daily coin.");
            return;
        }

        // Award coin if it's a new day since last login
        if (!lastLoginDay || today > lastLoginDay) {
            try {
                const userDoc = await getDoc(getUserDocRef());
                const currentCoins = userDoc.exists() ? userDoc.data().coins || 0 : 0;
                await updateDoc(getUserDocRef(), {
                    coins: currentCoins + 1,
                    lastLogin: now // Update last login to current time
                });
                if (typeof window.showMessage === 'function') {
                    window.showMessage("You received 1 daily coin!", "success");
                }
            } catch (error) {
                console.error("Error awarding daily coin:", error);
                if (typeof window.showMessage === 'function') {
                    window.showMessage("Error awarding daily coin.", "error");
                }
            }
        }
    }

    // Fetches user data from Firestore and updates the UI.
    // Also initializes subscription countdown and awards daily coin if applicable.
    async function fetchUserData() {
        const profileDocRef = getUserDocRef();

        // Listen for real-time updates to the user's profile document
        onSnapshot(profileDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("User data snapshot received:", data);

                // Populate profile fields
                nameInput.value = data.name || '';
                educationalLevelInput.value = data.educationalLevel || '';
                emailInput.value = data.email || '';
                whatsappNumberInput.value = data.whatsappNumber || '';

                // Update coin balance displays
                updateCoinBalanceDisplay(data.coins || 1000); // Use a default if coins field is missing

                // Update profile picture
                if (data.profilePicUrl) profilePicDisplay.src = data.profilePicUrl;

                // Update subscription countdown
                if (data.subscriptionEndDate) {
                    // Ensure subscriptionEndDate is a Firestore Timestamp before converting
                    const endDate = data.subscriptionEndDate.toDate ? data.subscriptionEndDate.toDate() : new Date(data.subscriptionEndDate);
                    updateCountdown(endDate);
                } else {
                    // If subscriptionEndDate is missing, force re-login as it's an invalid state
                    console.error("Subscription data missing for user. Forcing re-login.");
                    if (typeof window.showMessage === 'function') {
                        window.showMessage("Subscription data missing. Redirecting to login to re-establish.", "error");
                    }
                    auth.signOut().then(() => {
                        window.location.href = 'index.html';
                    }).catch(e => {
                        console.error("Error signing out:", e);
                        window.location.href = 'index.html'; // Redirect anyway
                    });
                    return; // Stop further execution
                }

                // Award daily coin if applicable
                if (data.lastLogin) awardDailyCoin(data.lastLogin);

                // Populate contact modal with user details (for "No Coins Left" scenario)
                appIdDisplayModal.textContent = data.loginAppId || 'N/A'; // Use stored loginAppId
                passwordDisplayModal.textContent = data.loginPassword || 'N/A'; // Use stored loginPassword
                const whatsappMessage = encodeURIComponent(`Hi SchrDbb, I have no coins left. My App ID is ${appIdDisplayModal.textContent} and Password is ${passwordDisplayModal.textContent}.`);
                whatsappLink.href = `https://wa.me/?text=${whatsappMessage}`; // Add your number here if known, e.g., wa.me/1234567890
                const telegramMessage = encodeURIComponent(`Hi SchrDbb, I have no coins left. My App ID is ${appIdDisplayModal.textContent} and Password is ${passwordDisplayModal.textContent}.`);
                telegramLink.href = `https://t.me/?text=${telegramMessage}`; // Add your telegram handle here, e.g., t.me/your_telegram_handle

            } else {
                console.log("User profile does not exist. Redirecting to login to create one.");
                // If profile document doesn't exist, it means user hasn't completed login flow.
                // Redirect to index.html to ensure profile creation.
                if (typeof window.showMessage === 'function') {
                    window.showMessage("User profile not found. Redirecting to login to set up.", "error");
                }
                setTimeout(() => window.location.href = 'index.html', 2000);
            }
        }, (error) => {
            console.error("Error listening to user profile document:", error);
            if (typeof window.showMessage === 'function') {
                window.showMessage("Failed to load user data from backend. Redirecting to login.", "error");
            }
            // If there's an error fetching data, assume issue and redirect to login
            setTimeout(() => window.location.href = 'index.html', 2000);
        });
    }

    // Saves the user's profile data to Firestore.
    saveProfileBtn.addEventListener('click', async () => {
        if (!userId) {
            if (typeof window.showMessage === 'function') {
                window.showMessage("Authentication error. Please refresh the page.", "error");
            }
            return;
        }

        const profileDocRef = getUserDocRef();

        // Get current values from input fields
        const name = nameInput.value;
        const educationalLevel = educationalLevelInput.value;
        const email = emailInput.value;
        const whatsappNumber = whatsappNumberInput.value;
        const profilePicUrl = profilePicDisplay.src; // Get current image src

        try {
            // Use setDoc with merge: true to update fields without overwriting the entire document
            await setDoc(profileDocRef, { name, educationalLevel, email, whatsappNumber, profilePicUrl }, { merge: true });
            if (typeof window.showMessage === 'function') {
                window.showMessage("Profile saved successfully!", "success");
            }
        } catch (e) {
            console.error("Error saving profile:", e);
            if (typeof window.showMessage === 'function') {
                window.showMessage("Failed to save profile. Please check your connection.", "error");
            }
        }
    });

    // Handle profile picture upload (client-side only for this demo, requires Firebase Storage for persistence)
    profilePicUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePicDisplay.src = e.target.result;
                // In a real app, you would upload this to Firebase Storage
                // and then save the URL to the user's Firestore document.
                if (typeof window.showMessage === 'function') {
                    window.showMessage('Profile picture updated (local preview only).', 'info');
                }
            };
            reader.readAsDataURL(file);
        }
    });

    // Updates the subscription countdown timer in the header.
    // Also handles subscription expiration by signing out and redirecting to login.
    // @param {Date} endTime - The end date of the subscription.
    let countdownInterval = null; // Declare interval variable in a higher scope

    function updateCountdown(endTime) {
        // Clear any existing interval to prevent multiple timers running
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }

        const countdownLoading = document.getElementById('countdown-loading');
        const countdownDisplay = document.getElementById('countdown-display');
        const countdownDays = document.getElementById('countdown-days');
        const countdownHours = document.getElementById('countdown-hours');
        const countdownMinutes = document.getElementById('countdown-minutes');
        const countdownSeconds = document.getElementById('countdown-seconds');

        if (!countdownDisplay || !countdownLoading) return; // Exit if elements are not found

        // Hide loading text and show countdown numbers
        countdownLoading.classList.add('hidden');
        countdownDisplay.classList.remove('hidden');

        countdownInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = endTime.getTime() - now;

            // If countdown has expired
            if (distance < 0) {
                clearInterval(countdownInterval); // Stop the timer
                document.getElementById('countdown-timer').textContent = "Subscription Expired!";
                if (typeof window.showMessage === 'function') {
                    window.showMessage("Your subscription has expired. Please log in again to renew.", "error");
                }
                // Clear the anonymous user session and redirect to login
                auth.signOut().then(() => {
                    console.log("Firebase user signed out due to subscription expiry.");
                    window.location.href = 'index.html'; // Redirect to login page
                }).catch((error) => {
                    console.error("Error signing out user:", error);
                    window.location.href = 'index.html'; // Redirect anyway if sign out fails
                });
                return;
            }

            // Calculate time remaining
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // Update display with padded numbers
            countdownDays.textContent = String(days).padStart(2, '0');
            countdownHours.textContent = String(hours).padStart(2, '0');
            countdownMinutes.textContent = String(minutes).padStart(2, '0');
            countdownSeconds.textContent = String(seconds).padStart(2, '0');

            // Store the full end time as a data attribute for showMessage on click
            if (!countdownDisplay.dataset.fullDate) {
                countdownDisplay.dataset.fullDate = endTime.getTime().toString();
            }

        }, 1000);
    }

    // Updates the coin balance display elements.
    function updateCoinBalanceDisplay(coins) {
        headerCoinBalance.textContent = coins;
        coinBalanceDisplay.textContent = coins;
    }

    // Hides all page sections and shows the specified one.
    // Also updates navigation link styling to indicate the active page.
    // @param {string} pageId - The ID of the section to show (e.g., 'profile', 'modes').
    function showPage(pageId) {
        document.querySelectorAll('.page-section').forEach(section => section.classList.add('hidden'));
        const targetSection = document.getElementById(pageId + '-section');
        if (targetSection) targetSection.classList.remove('hidden');

        // Update navigation link styles
        document.querySelectorAll('nav a').forEach(link => {
            link.classList.remove('text-golden-yellow', 'font-bold');
            link.classList.add('text-yellow-text');
        });
        const activeLink = document.querySelector(`a[data-page="${pageId}"]`);
        if (activeLink) {
            activeLink.classList.remove('text-yellow-text');
            activeLink.classList.add('text-golden-yellow', 'font-bold');
        }
    }

    // --- Event Listeners and Initial Setup ---

    // Navigation links
    profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('profile');
    });

    modesLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('modes');
    });

    // Close contact modal button
    closeContactModalBtn.addEventListener('click', () => {
        contactModal.classList.add('hidden');
    });

    // Mode Selection (Study vs. Arcade)
    studyModeBtn.addEventListener('click', () => {
        studyModeBtn.classList.remove('bg-brown-dark', 'text-yellow-text');
        studyModeBtn.classList.add('bg-golden-yellow', 'text-brown-dark');
        arcadeModeBtn.classList.remove('bg-golden-yellow', 'text-brown-dark');
        arcadeModeBtn.classList.add('bg-brown-dark', 'text-yellow-text');
        studyContent.classList.remove('hidden');
        arcadeContent.classList.add('hidden');
    });

    arcadeModeBtn.addEventListener('click', async () => {
        const userDoc = await getDoc(getUserDocRef());
        const currentUserCoins = userDoc.exists() ? userDoc.data().coins : 0;

        if (currentUserCoins <= 0) { // If 0 coins, show contact modal and prevent entering Arcade
            contactModal.classList.remove('hidden');
            if (typeof window.showMessage === 'function') {
                window.showMessage('You need coins to access Arcade Mode!', 'error');
            }
            return;
        }

        arcadeModeBtn.classList.remove('bg-brown-dark', 'text-yellow-text');
        arcadeModeBtn.classList.add('bg-golden-yellow', 'text-brown-dark');
        studyModeBtn.classList.remove('bg-golden-yellow', 'text-brown-dark');
        studyModeBtn.classList.add('bg-brown-dark', 'text-yellow-text');
        arcadeContent.classList.remove('hidden');
        studyContent.classList.add('hidden');
    });

    // Default to Study Mode on page load
    studyModeBtn.click(); // Simulate click to set initial state

    // Study Mode Topic Navigation
    categoryCards.forEach(card => {
        card.addEventListener('click', (event) => {
            const target = event.target.closest('li[data-topic]');
            if (target) {
                const topic = target.dataset.topic;
                const pageUrl = target.dataset.pageUrl; // e.g., biology.html
                if (pageUrl) {
                    // Load content directly for study notes for simplicity, not redirect
                    if (notes[topic]) {
                        currentNoteTopic.textContent = notes[topic].title;
                        noteContent.innerHTML = notes[topic].content;
                        notesDisplay.classList.remove('hidden');
                        studyContent.querySelector('.study-categories').classList.add('hidden'); // Hide categories
                    } else {
                        if (typeof window.showMessage === 'function') {
                            window.showMessage(`Study notes for "${topic}" are not yet available.`, 'info');
                        }
                    }
                } else {
                    console.warn(`No page URL defined for topic: ${topic}`);
                    if (typeof window.showMessage === 'function') {
                        window.showMessage(`Study notes for "${topic}" are not yet available.`, 'info');
                    }
                }
            }
        });
    });

    backToCategoriesBtn.addEventListener('click', () => {
        notesDisplay.classList.add('hidden');
        studyContent.querySelector('.study-categories').classList.remove('hidden'); // Show categories again
    });

    // Arcade Mode Sub-selection
    testModeBtn.addEventListener('click', () => {
        testContent.classList.remove('hidden');
        challengeContent.classList.add('hidden');
    });

    challengeModeBtn.addEventListener('click', () => {
        challengeContent.classList.remove('hidden');
        testContent.classList.add('hidden');
    });

    // Handle "Course Test" button to redirect to quiz.html
    courseTestBtn.addEventListener('click', async () => {
        const userDoc = await getDoc(getUserDocRef());
        const currentUserCoins = userDoc.exists() ? userDoc.data().coins : 0;

        if (currentUserCoins <= 0) {
            contactModal.classList.remove('hidden');
            if (typeof window.showMessage === 'function') {
                window.showMessage('You need coins to start a course test!', 'error');
            }
        } else {
            window.location.href = 'quiz.html?type=course&topic=biology'; // Example: biology quiz
        }
    });

    // Handle "International Exam" button to redirect to quiz.html
    internationalExamBtn.addEventListener('click', async () => {
        const userDoc = await getDoc(getUserDocRef());
        const currentUserCoins = userDoc.exists() ? userDoc.data().coins : 0;

        if (currentUserCoins <= 0) {
            contactModal.classList.remove('hidden');
            if (typeof window.showMessage === 'function') {
                window.showMessage('You need coins to start an international exam!', 'error');
            }
        } else {
            window.location.href = 'quiz.html?type=international-exams&topic=usmle'; // Example: USMLE exam
        }
    });

    // Start Challenge button
    document.getElementById('start-challenge-btn').addEventListener('click', async () => {
        const opponentId = document.getElementById('opponent-id-input').value.trim(); // Get opponent ID from input

        const userDoc = await getDoc(getUserDocRef());
        const currentUserCoins = userDoc.exists() ? userDoc.data().coins : 0;

        if (currentUserCoins <= 0) {
            contactModal.classList.remove('hidden');
            if (typeof window.showMessage === 'function') {
                window.showMessage('You need coins to start a challenge!', 'error');
            }
            return;
        }
        if (!opponentId) {
            if (typeof window.showMessage === 'function') {
                window.showMessage("Please enter a valid opponent User ID.", "error");
            }
            return;
        }
        if (opponentId === userId) {
             if (typeof window.showMessage === 'function') {
                window.showMessage("You cannot challenge yourself!", "error");
            }
            return;
        }

        startChallenge(opponentId);
    });

    // Close Contact Modal button
    closeContactModalBtn.addEventListener('click', () => {
        contactModal.classList.add('hidden');
    });

    // Click listener for countdown timer to show full subscription end date
    document.getElementById('countdown-timer').addEventListener('click', () => {
        const countdownDisplay = document.getElementById('countdown-display');
        if (countdownDisplay && countdownDisplay.dataset.fullDate) {
            const endDate = new Date(parseInt(countdownDisplay.dataset.fullDate));
            if (typeof window.showMessage === 'function') {
                window.showMessage(`Subscription ends on: ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString()}`, 'info');
            }
        } else {
            if (typeof window.showMessage === 'function') {
                window.showMessage("Subscription end date not available.", 'info');
            }
        }
    });

    // Display User ID immediately (will be updated by fetchUserData if authenticated)
    userIdDisplay.textContent = `User ID: ${userId || 'Loading...'}`;
    document.getElementById('current-user-id').textContent = `Your User ID: ${userId || 'Loading...'}`;

    // Initial load of user data and UI setup
    fetchUserData(); // This now initiates the onSnapshot listener for profile data

    // Show the 'modes' page by default when the application loads
    showPage('modes');

    // --- Challenge Mode specific functions ---
    // (Moved inside firebaseAuthReady as they depend on db, userId, etc.)

    // Starts a Challenge Mode quiz against an opponent.
    // @param {string} opponentId - The User ID of the opponent.
    async function startChallenge(opponentId) {
        let currentCoins = parseInt(headerCoinBalance.textContent); // Get current coins from header display

        if (currentCoins <= 0) {
            contactModal.classList.remove('hidden');
            if (typeof window.showMessage === 'function') {
                window.showMessage('You need coins to start a challenge!', 'error');
            }
            return;
        }

        // Validate opponent ID
        try {
            const opponentDocRef = doc(db, 'artifacts', appId, 'users', opponentId, 'profile', 'data');
            const opponentDoc = await getDoc(opponentDocRef);
            if (!opponentDoc.exists()) {
                if (typeof window.showMessage === 'function') {
                    window.showMessage("Opponent User ID does not exist.", "error");
                }
                return;
            }
            // Display full opponent ID (as per instructions)
            document.getElementById('opponent-user-id').textContent = `Opponent User ID: ${opponentId}`;
        } catch (e) {
            console.error("Error validating opponent ID:", e);
            if (typeof window.showMessage === 'function') {
                window.showMessage("Failed to validate opponent ID. Ensure it's correct and backend is connected.", "error");
            }
            return;
        }

        // Show challenge content and hide test content
        document.getElementById('challenge-content').classList.remove('hidden');
        document.getElementById('challenge-quiz-content').classList.remove('hidden');
        document.getElementById('test-content').classList.add('hidden');
        // Display full current user ID (as per instructions)
        document.getElementById('current-user-id').textContent = `Your User ID: ${userId}`;

        let currentQuestionIndex = 0;
        let userScore = 0;
        const totalChallengeQuestions = 50;

        // Loads and displays a single challenge question.
        function loadChallengeQuestion() {
            // End of challenge
            if (currentQuestionIndex >= totalChallengeQuestions) {
                const opponentScore = Math.floor(Math.random() * totalChallengeQuestions); // Simulate opponent score
                const result = userScore > opponentScore ? "You won!" : userScore < opponentScore ? "You lost!" : "It's a tie!";
                if (typeof window.showMessage === 'function') {
                    window.showMessage(`Challenge completed! Your score: ${userScore}/${totalChallengeQuestions}, Opponent: ${opponentScore}/${totalChallengeQuestions}. ${result}`, "success");
                }
                document.getElementById('challenge-quiz-content').classList.add('hidden'); // Hide challenge when finished
                return;
            }

            // Use dummy questions in a loop for 50 questions
            const question = dummyQuestions[currentQuestionIndex % dummyQuestions.length];
            document.getElementById('challenge-question').textContent = `Question ${currentQuestionIndex + 1}/${totalChallengeQuestions}: ${question.question}`;
            const optionsContainer = document.getElementById('challenge-options');
            optionsContainer.innerHTML = ''; // Clear previous options

            // Create buttons for each option
            question.options.forEach(option => {
                const button = document.createElement('button');
                button.className = 'py-2 px-4 bg-brown-accent text-yellow-text rounded-lg hover:bg-golden-yellow hover:text-brown-dark transition-all';
                button.textContent = option;
                button.addEventListener('click', async () => { // Made async to await deductCoins
                    if (option === question.correctAnswer) {
                        userScore++;
                        correctSound.play().catch(e => console.error("Sound play error:", e));
                        if (typeof window.showMessage === 'function') {
                            window.showMessage("Correct answer!", "success");
                        }
                    } else {
                        incorrectSound.play().catch(e => console.error("Sound play error:", e));
                        if (typeof window.showMessage === 'function') {
                            window.showMessage("Incorrect answer -1 coin", "error");
                        }
                        await updateCoinBalance(currentCoins - 1); // Deduct coin for incorrect answer
                        currentCoins = parseInt(headerCoinBalance.textContent); // Update local currentCoins after deduction
                    }
                    currentQuestionIndex++;
                    loadChallengeQuestion(); // Load next question
                });
                optionsContainer.appendChild(button);
            });
        }

        loadChallengeQuestion(); // Start the first challenge question
        document.getElementById('submit-challenge-answer-btn').classList.add('hidden'); // This button is not used
    }
});
