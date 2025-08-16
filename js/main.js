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

    // Attempt to retrieve opponent's profile (for validation, not necessarily for data display)
    try {
        const opponentDocRef = doc(db, 'artifacts', appId, 'users', opponentId, 'profile', 'data');
        const opponentDoc = await getDoc(opponentDocRef);
        if (!opponentDoc.exists()) {
            showMessage("Opponent User ID does not exist.", "error");
            return;
        }
        // Display full opponent ID (as per instructions)
        document.getElementById('opponent-user-id').textContent = `Opponent User ID: ${opponentId}`;
    } catch (e) {
        console.error("Error validating opponent ID:", e);
        showMessage("Failed to validate opponent ID. Ensure it's correct and Firebase is connected.", "error");
        return;
    }

    // Show challenge content and hide test content
    document.getElementById('challenge-content').classList.remove('hidden');
    document.getElementById('challenge-quiz-content').classList.remove('hidden');
    document.getElementById('test-content').classList.add('hidden');
    // Display full current user ID (as per instructions)
    document.getElementById('current-user-id').textContent = `Your User ID: ${userId || 'Not logged in'}`;

    let currentQuestionIndex = 0;
    let userScore = 0;
    const totalChallengeQuestions = 50;

    // Loads and displays a single challenge question.
    function loadChallengeQuestion() {
        // End of challenge
        if (currentQuestionIndex >= totalChallengeQuestions) {
            const opponentScore = Math.floor(Math.random() * totalChallengeQuestions); // Simulate opponent score
            const result = userScore > opponentScore ? "You won!" : userScore < opponentScore ? "You lost!" : "It's a tie!";
            showMessage(`Challenge completed! Your score: ${userScore}/${totalChallengeQuestions}, Opponent: ${opponentScore}/${totalChallengeQuestions}. ${result}`, "success");
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
            button.addEventListener('click', () => {
                if (option === question.correctAnswer) {
                    userScore++;
                    correctSound.play().catch(e => console.error("Sound play error:", e));
                    showMessage("Correct answer!", "success");
                } else {
                    incorrectSound.play().catch(e => console.error("Sound play error:", e));
                    showMessage("Incorrect answer -1 coin", "error");
                    currentCoins = currentCoins - 1; // Deduct coin for incorrect answer
                    updateCoinBalance(currentCoins); // Update balance in UI and Firestore
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

// Initializes the Firebase app and sets up authentication listeners.
async function init() {
    const countdownLoading = document.getElementById('countdown-loading');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const saveMessage = document.getElementById('save-message');

    // Check if Firebase configuration is provided
    if (typeof __firebase_config !== 'undefined' && Object.keys(firebaseConfig).length > 0) {
        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            isFirebaseInitialized = true;

            // Enable profile saving and hide demo message if Firebase is active
            if (saveProfileBtn) saveProfileBtn.disabled = false;
            if (saveMessage) saveMessage.classList.add('hidden');
            if (countdownLoading) countdownLoading.textContent = "Connecting...";

            // Authenticate using custom token if available, otherwise sign in anonymously
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }

        } catch (e) {
            console.error("Firebase initialization or authentication error:", e);
            showMessage("Failed to connect to Firebase. Running in Demo Mode.", "error");
            isFirebaseInitialized = false;
            // Disable Firebase-dependent features and show demo mode messages
            if (countdownLoading) countdownLoading.textContent = "Demo Mode";
            if (saveProfileBtn) saveProfileBtn.disabled = true;
            if (saveMessage) saveMessage.classList.remove('hidden');
            document.getElementById('user-id-display').textContent = "User ID: Demo";
            document.getElementById('current-user-id').textContent = "Your User ID: Demo";
            document.getElementById('opponent-user-id').textContent = "Opponent User ID: None";
        }
    } else {
        // Fallback to Demo Mode if Firebase config is missing
        console.error("Firebase config missing. Running in Demo Mode.");
        showMessage("Firebase config not found. Running in Demo Mode.", "info");
        isFirebaseInitialized = false;
        if (countdownLoading) countdownLoading.textContent = "Demo Mode";
        if (saveProfileBtn) saveProfileBtn.disabled = true;
        if (saveMessage) saveMessage.classList.remove('hidden');
        document.getElementById('user-id-display').textContent = "User ID: Demo";
        document.getElementById('current-user-id').textContent = "Your User ID: Demo";
        document.getElementById('opponent-user-id').textContent = "Opponent User ID: None";
    }

    // Set up Firebase Auth state listener only if Firebase was successfully initialized
    if (isFirebaseInitialized) {
        onAuthStateChanged(auth, user => {
            if (user) {
                userId = user.uid; // Set the authenticated user's ID
                userIsAuthenticated = true;
                // Define the document reference for the user's profile data
                profileDocRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
                // Display full user ID
                document.getElementById('user-id-display').textContent = `User ID: ${userId}`;
                document.getElementById('current-user-id').textContent = `Your User ID: ${userId}`;
                fetchUserData(); // Fetch user data once authenticated
            } else {
                // If user is not authenticated, reset state
                userIsAuthenticated = false;
                userId = null;
                profileDocRef = null;
                document.getElementById('user-id-display').textContent = "User ID: Not logged in";
                document.getElementById('current-user-id').textContent = "Your User ID: Not logged in";
                document.getElementById('opponent-user-id').textContent = "Opponent User ID: None";
                showMessage("Authentication failed. Please refresh the page.", "error");
            }
        });
    }

    // --- Event Listeners ---

    // Navigation links (Profile, Modes)
    document.getElementById('profile-link').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('profile');
    });

    document.getElementById('modes-link').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('modes');
    });

    // Profile picture upload functionality
    document.getElementById('profile-pic-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('profile-pic-display').src = event.target.result;
            };
            reader.readAsDataURL(file);
            if (!isFirebaseInitialized) showMessage("Profile picture will not be saved in Demo Mode.", "info");
        }
    });

    // Save Profile button
    document.getElementById('save-profile-btn').addEventListener('click', saveProfile);

    // Study topics click listeners within categories
    document.querySelectorAll('.study-categories li').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling to parent category card
            const topic = e.target.dataset.topic;
            const pageUrl = e.target.dataset.pageUrl;

            if (pageUrl) {
                // If a page URL is defined, navigate to it (e.g., biology.html)
                window.location.href = pageUrl;
            } else {
                // If no page URL, try to load content from the 'notes' object
                const noteData = notes[topic];
                if (noteData) {
                    document.getElementById('notes-display').classList.remove('hidden');
                    // Hide categories and show notes
                    document.getElementById('study-content').querySelector('.study-categories').classList.add('hidden');
                    document.getElementById('current-note-topic').textContent = noteData.title;
                    document.getElementById('note-content').innerHTML = noteData.content;
                } else {
                    showMessage(`No notes available for ${e.target.textContent}.`, 'info');
                }
            }
        });
    });

    // Back to Categories button in Study Mode
    document.getElementById('back-to-categories').addEventListener('click', () => {
        document.getElementById('notes-display').classList.add('hidden');
        document.getElementById('study-content').querySelector('.study-categories').classList.remove('hidden');
    });

    // Mode buttons (Study Mode, Arcade Mode)
    document.getElementById('study-mode-btn').addEventListener('click', () => {
        document.getElementById('study-content').classList.remove('hidden');
        document.getElementById('arcade-content').classList.add('hidden');
        // Update button styles
        document.getElementById('study-mode-btn').classList.remove('bg-brown-dark', 'text-yellow-text');
        document.getElementById('study-mode-btn').classList.add('bg-golden-yellow', 'text-brown-dark');
        document.getElementById('arcade-mode-btn').classList.remove('bg-golden-yellow', 'text-brown-dark');
        document.getElementById('arcade-mode-btn').classList.add('bg-brown-dark', 'text-yellow-text');
    });

    document.getElementById('arcade-mode-btn').addEventListener('click', () => {
        const currentCoins = parseInt(document.getElementById('coin-balance').textContent);
        // If coins are zero, show the contact modal instead of entering Arcade Mode
        if (currentCoins <= 0) {
            const { appId: contactAppId, password: contactPassword } = generateAppIdAndPassword();
            document.getElementById('app-id-display').textContent = contactAppId;
            document.getElementById('password-display').textContent = contactPassword;
            document.getElementById('whatsapp-link').href = `https://wa.me/+237652659429?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
            document.getElementById('telegram-link').href = `https://t.me/SchrDbb?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
            document.getElementById('contact-modal').classList.remove('hidden');
        } else {
            document.getElementById('study-content').classList.add('hidden');
            document.getElementById('arcade-content').classList.remove('hidden');
            // Update button styles
            document.getElementById('arcade-mode-btn').classList.remove('bg-brown-dark', 'text-yellow-text');
            document.getElementById('arcade-mode-btn').classList.add('bg-golden-yellow', 'text-brown-dark');
            document.getElementById('study-mode-btn').classList.remove('bg-golden-yellow', 'text-brown-dark');
            document.getElementById('study-mode-btn').classList.add('bg-brown-dark', 'text-yellow-text');
        }
    });

    // Arcade Mode sub-buttons (Test, Challenge)
    document.getElementById('test-mode-btn').addEventListener('click', () => {
        document.getElementById('test-content').classList.remove('hidden');
        document.getElementById('challenge-content').classList.add('hidden');
    });

    document.getElementById('challenge-mode-btn').addEventListener('click', () => {
        document.getElementById('test-content').classList.add('hidden');
        document.getElementById('challenge-content').classList.remove('hidden');
    });

    // Test mode options
    // MODIFIED: Redirect to new selection pages
    document.getElementById('course-test-btn').addEventListener('click', () => {
        // First, check coin balance before navigating to selection page
        const currentCoins = parseInt(document.getElementById('coin-balance').textContent);
        if (currentCoins <= 0) {
            const { appId: contactAppId, password: contactPassword } = generateAppIdAndPassword();
            document.getElementById('app-id-display').textContent = contactAppId;
            document.getElementById('password-display').textContent = contactPassword;
            document.getElementById('whatsapp-link').href = `https://wa.me/+237652659429?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
            document.getElementById('telegram-link').href = `https://t.me/SchrDbb?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
            document.getElementById('contact-modal').classList.remove('hidden');
        } else {
            window.location.href = 'course_test_selection.html';
        }
    });

    document.getElementById('international-exam-btn').addEventListener('click', () => {
        // First, check coin balance before navigating to selection page
        const currentCoins = parseInt(document.getElementById('coin-balance').textContent);
        if (currentCoins <= 0) {
            const { appId: contactAppId, password: contactPassword } = generateAppIdAndPassword();
            document.getElementById('app-id-display').textContent = contactAppId;
            document.getElementById('password-display').textContent = contactPassword;
            document.getElementById('whatsapp-link').href = `https://wa.me/+237652659429?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
            document.getElementById('telegram-link').href = `https://t.me/SchrDbb?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
            document.getElementById('contact-modal').classList.remove('hidden');
        } else {
            window.location.href = 'international_exam_selection.html';
        }
    });

    // Start Challenge button
    document.getElementById('start-challenge-btn').addEventListener('click', () => {
        const opponentId = document.getElementById('opponent-id').value;
        startChallenge(opponentId);
    });

    // Close Contact Modal button
    document.getElementById('close-contact-modal').addEventListener('click', () => {
        document.getElementById('contact-modal').classList.add('hidden');
    });

    // Click listener for countdown timer to show full subscription end date
    document.getElementById('countdown-timer').addEventListener('click', () => {
        // Retrieve subscription end date from Firestore data (preferred) or localStorage (fallback)
        // This assumes fetchUserData has already run and populated data.subscriptionEndDate
        // For precise display, you might store the actual Firestore timestamp or Date object in a global variable after fetchUserData runs.
        const subscriptionEndDateElement = document.getElementById('countdown-display');
        if (subscriptionEndDateElement && subscriptionEndDateElement.dataset.fullDate) {
             const endDate = new Date(parseInt(subscriptionEndDateElement.dataset.fullDate));
             showMessage(`Subscription ends on: ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString()}`, 'info');
        } else {
            // Fallback for demo mode or if date not fully available via data attribute
            const storedEndDate = localStorage.getItem('subscriptionEndDate');
            if (storedEndDate) {
                const endDate = new Date(parseInt(storedEndDate));
                showMessage(`Subscription ends on: ${endDate.toLocaleDateString()}`, 'info');
            } else {
                showMessage("No active subscription found.", 'info');
            }
        }
    });

    // Show the 'modes' page by default when the application loads
    showPage('modes');
}

// Ensure the init function runs once the DOM is fully loaded.
window.addEventListener('DOMContentLoaded', init);
