import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Firebase variables, initialized from the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app = null;
let auth = null;
let db = null;
let userId = null;
let profileDocRef = null;
let userIsAuthenticated = false;
let isFirebaseInitialized = false;

// Audio for correct and incorrect answers (subtle, professional tones)
const correctSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568.wav'); // Soft chime
const incorrectSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2569/2569.wav'); // Soft error chime

// --- USMLE Quiz Questions ---
const questions = [
    { question: "A 45-year-old male presents with sudden onset severe chest pain radiating to his left arm. ECG shows ST elevation in leads II, III, aVF. What is the most likely diagnosis?", options: ["Pericarditis", "Myocardial Infarction", "Aortic Dissection", "Pneumothorax"], correctAnswer: "Myocardial Infarction" },
    { question: "Which of the following neurotransmitters is primarily involved in the 'fight or flight' response?", options: ["Acetylcholine", "Dopamine", "Serotonin", "Norepinephrine"], correctAnswer: "Norepinephrine" },
    { question: "A patient develops generalized muscle weakness and fatigue after starting a new medication. Labs show hypokalemia. Which class of diuretics is most likely responsible?", options: ["Loop diuretics", "Thiazide diuretics", "Potassium-sparing diuretics", "Osmotic diuretics"], correctAnswer: "Loop diuretics" },
    { question: "What is the characteristic histological finding in Crohn's disease?", options: ["Crypt abscesses", "Non-caseating granulomas", "Goblet cell depletion", "Villous atrophy"], correctAnswer: "Non-caseating granulomas" },
    { question: "What is the initial management for anaphylaxis?", options: ["Oral antihistamines", "Intravenous corticosteroids", "Subcutaneous epinephrine", "Inhaled bronchodilators"], correctAnswer: "Subcutaneous epinephrine" },
    { question: "A 25-year-old female presents with recurrent episodes of muscle weakness that worsens with exercise and improves with rest. She also has ptosis. Which condition is suspected?", options: ["Lambert-Eaton Syndrome", "Guillain-Barré Syndrome", "Multiple Sclerosis", "Myasthenia Gravis"], correctAnswer: "Myasthenia Gravis" },
    { question: "Which cranial nerve is responsible for taste sensation from the anterior two-thirds of the tongue?", options: ["Glossopharyngeal (CN IX)", "Vagus (CN X)", "Facial (CN VII)", "Trigeminal (CN V)"], correctAnswer: "Facial (CN VII)" },
    { question: "A patient with chronic kidney disease presents with bone pain and elevated PTH levels. What is the most likely diagnosis?", options: ["Osteoporosis", "Osteomalacia", "Renal Osteodystrophy", "Paget's Disease"], correctAnswer: "Renal Osteodystrophy" },
    { question: "Which enzyme is deficient in Phenylketonuria (PKU)?", options: ["Tyrosinase", "Homogentisate oxidase", "Phenylalanine hydroxylase", "Hexosaminidase A"], correctAnswer: "Phenylalanine hydroxylase" },
    { question: "What is the most common cause of community-acquired pneumonia in adults?", options: ["Mycoplasma pneumoniae", "Chlamydophila pneumoniae", "Streptococcus pneumoniae", "Haemophilus influenzae"], correctAnswer: "Streptococcus pneumoniae" }
];

// Quiz state variables
let currentQuestionIndex = 0;
let userScore = 0;
let currentCoins = 0; // Tracks user's coins, updated from Firebase

// Generates a 4-character alphanumeric App ID and its ASCII sum password.
function generateAppIdAndPassword() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let localAppId = '';
    for (let i = 0; i < 4; i++) {
        localAppId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const password = localAppId.split('').map(char => char.charCodeAt(0)).reduce((sum, val) => sum + val, 0).toString();
    return { appId: localAppId, password: password };
}

// Displays a temporary message box at the bottom right of the screen.
function showMessage(message, theme = 'info') {
    const box = document.getElementById('message-box');
    const text = document.getElementById('message-text');
    if (!box || !text) return;

    box.classList.remove('info', 'success', 'error'); // Clear previous themes
    box.classList.add('message-box', theme); // Add 'message-box' and current theme
    text.textContent = message;
    box.classList.add('show');

    setTimeout(() => box.classList.remove('show'), 3000);
}

// Updates the user's coin balance in Firestore and on the UI.
async function updateCoinBalance(newBalance) {
    if (!isFirebaseInitialized || !userIsAuthenticated || !profileDocRef) {
        showMessage("Cannot update coins in Demo Mode.", "info");
        return;
    }

    try {
        await updateDoc(profileDocRef, { coins: newBalance });
        document.getElementById('quiz-coin-balance').textContent = newBalance;
        showMessage(`Coin balance updated: ${newBalance} coins`, "success");
    } catch (e) {
        console.error("Error updating coins:", e);
        showMessage("Failed to update coins.", "error");
    }
}

// Fetches user data (specifically coin balance) from Firestore for the quiz page.
async function fetchQuizUserData() {
    if (!profileDocRef || !userIsAuthenticated) {
        // Fallback for demo mode or unauthenticated state
        document.getElementById('quiz-coin-balance').textContent = "Demo";
        return;
    }

    onSnapshot(profileDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentCoins = data.coins || 1000;
            document.getElementById('quiz-coin-balance').textContent = currentCoins;
        } else {
            console.warn("User profile document not found. Using default coins (1000).");
            currentCoins = 1000;
            document.getElementById('quiz-coin-balance').textContent = currentCoins;
        }
    }, (error) => {
        console.error("Error listening to user profile:", error);
        showMessage("Failed to load user coin data.", "error");
        currentCoins = 1000; // Fallback
        document.getElementById('quiz-coin-balance').textContent = currentCoins;
    });
}

// Loads and displays the current question.
function loadQuestion() {
    // Hide the "Next Question" button when loading a new question
    document.getElementById('next-question-btn').classList.add('hidden');

    if (currentQuestionIndex >= questions.length) {
        showMessage(`Quiz completed! Your score: ${userScore}/${questions.length}`, "success");
        // Optionally redirect back to main.html or show a summary screen
        setTimeout(() => {
            window.location.href = 'main.html'; // Go back to main page after quiz
        }, 3000);
        return;
    }

    const question = questions[currentQuestionIndex];
    document.getElementById('question-number').textContent = `Question ${currentQuestionIndex + 1}/${questions.length}`;
    document.getElementById('quiz-question-text').textContent = question.question;

    const optionsContainer = document.getElementById('quiz-options-container');
    optionsContainer.innerHTML = ''; // Clear previous options

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'quiz-option py-3 px-4 bg-brown-accent text-yellow-text rounded-lg shadow-sm hover:bg-golden-yellow hover:text-brown-dark transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-golden-yellow focus:ring-offset-2 focus:ring-offset-brown-dark';
        button.textContent = option;
        button.dataset.index = index; // Store index to identify option

        button.addEventListener('click', () => handleAnswer(button, option, question.correctAnswer));
        optionsContainer.appendChild(button);
    });
}

// Handles user's answer selection.
function handleAnswer(selectedButton, selectedOption, correctAnswer) {
    // Disable all options after one is selected to prevent multiple clicks
    document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.classList.add('disabled');
        btn.style.pointerEvents = 'none'; // Further prevent clicks
    });

    if (selectedOption === correctAnswer) {
        userScore++;
        selectedButton.classList.remove('bg-brown-accent', 'hover:bg-golden-yellow', 'text-yellow-text');
        selectedButton.classList.add('correct'); // Highlight correct answer
        correctSound.play().catch(e => console.error("Sound play error:", e));
        showMessage("Correct!", "success");
    } else {
        selectedButton.classList.remove('bg-brown-accent', 'hover:bg-golden-yellow', 'text-yellow-text');
        selectedButton.classList.add('incorrect'); // Highlight incorrect answer
        incorrectSound.play().catch(e => console.error("Sound play error:", e));
        showMessage("Incorrect! -1 coin", "error");
        
        // Deduct coin and update Firebase
        if (currentCoins > 0) {
            currentCoins--;
            updateCoinBalance(currentCoins);
        } else {
            // Show contact modal if coins hit zero
            const { appId: contactAppId, password: contactPassword } = generateAppIdAndPassword();
            document.getElementById('app-id-display').textContent = contactAppId;
            document.getElementById('password-display').textContent = contactPassword;
            document.getElementById('whatsapp-link').href = `https://wa.me/+237652659429?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
            document.getElementById('telegram-link').href = `https://t.me/SchrDbb?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
            document.getElementById('contact-modal').classList.remove('hidden');
        }

        // Highlight the correct answer even if the user chose incorrectly
        document.querySelectorAll('.quiz-option').forEach(btn => {
            if (btn.textContent === correctAnswer) {
                btn.classList.add('correct');
            }
        });
    }

    // Show "Next Question" button after an answer is selected
    document.getElementById('next-question-btn').classList.remove('hidden');
    document.getElementById('next-question-btn').addEventListener('click', () => {
        currentQuestionIndex++;
        loadQuestion(); // Load the next question
    }, { once: true }); // Ensure this listener only fires once
}


// Initializes the quiz page: authenticates, fetches user data, and starts the quiz.
async function initQuizPage() {
    // Initialize Firebase
    if (typeof __firebase_config !== 'undefined' && Object.keys(firebaseConfig).length > 0) {
        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            isFirebaseInitialized = true;

            // Authenticate using custom token if available, otherwise sign in anonymously
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }

            onAuthStateChanged(auth, user => {
                if (user) {
                    userId = user.uid;
                    userIsAuthenticated = true;
                    profileDocRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
                    fetchQuizUserData(); // Fetch coin balance
                } else {
                    userIsAuthenticated = false;
                    userId = null;
                    profileDocRef = null;
                    showMessage("Authentication failed. Running in Demo Mode.", "error");
                    document.getElementById('quiz-coin-balance').textContent = "Demo";
                }
            });

        } catch (e) {
            console.error("Firebase initialization or authentication error:", e);
            showMessage("Failed to connect to Firebase. Running in Demo Mode.", "error");
            isFirebaseInitialized = false;
            document.getElementById('quiz-coin-balance').textContent = "Demo";
        }
    } else {
        console.warn("Firebase config missing. Running quiz in Demo Mode (no coin persistence).");
        showMessage("Firebase config not found. Coins will not be saved.", "info");
        isFirebaseInitialized = false;
        document.getElementById('quiz-coin-balance').textContent = "Demo";
    }

    loadQuestion(); // Start the first question for this specific quiz
}

// Run initialization when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', initQuizPage);
