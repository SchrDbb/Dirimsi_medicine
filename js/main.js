import { auth, db } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

// Audio for correct and incorrect answers
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

// Dummy questions for arcade mode
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

// Generates a 4-character alphanumeric App ID and its ASCII sum password
function generateAppIdAndPassword() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let localAppId = '';
  for (let i = 0; i < 4; i++) {
    localAppId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  const password = localAppId.split('').map(char => char.charCodeAt(0)).reduce((sum, val) => sum + val, 0).toString();
  return { appId: localAppId, password };
}

// Displays a temporary message box
function showMessage(message, theme = 'info') {
  const box = document.getElementById('message-box');
  const text = document.getElementById('message-text');
  if (!box || !text) {
    console.error('showMessage: Message box or text element not found.');
    return;
  }

  let bgColor, textColor;
  if (theme === 'success') {
    bgColor = 'bg-golden-yellow';
    textColor = 'text-brown-dark';
  } else if (theme === 'error') {
    bgColor = 'bg-dark-red';
    textColor = 'text-yellow-highlight';
  } else {
    bgColor = 'bg-brown-accent';
    textColor = 'text-yellow-text';
  }

  box.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-xl transition-transform transform duration-300 z-50 ${bgColor} ${textColor}`;
  text.textContent = message;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 3000);
}

// Updates the subscription countdown timer
function updateCountdown(endTime) {
  const countdownDisplay = document.getElementById('countdown-display');
  const countdownLoading = document.getElementById('countdown-loading');
  if (!countdownDisplay || !countdownLoading) {
    console.error('updateCountdown: Countdown elements not found.');
    return;
  }

  countdownLoading.classList.add('hidden');
  countdownDisplay.classList.remove('hidden');

  const countdownInterval = setInterval(() => {
    const now = new Date().getTime();
    const distance = endTime - now;

    if (distance < 0) {
      clearInterval(countdownInterval);
      document.getElementById('countdown-timer').textContent = "Subscription Expired!";
      showMessage("Your subscription has expired. Please log in again to renew.", "error");
      setTimeout(() => {
        localStorage.removeItem('subscriptionEndDate');
        localStorage.removeItem('currentAppId');
        window.location.href = 'index.html';
      }, 3000);
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('countdown-days').textContent = days.toString().padStart(2, '0');
    document.getElementById('countdown-hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('countdown-minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('countdown-seconds').textContent = seconds.toString().padStart(2, '0');
  }, 1000);
}

// Updates the user's coin balance
async function updateCoinBalance(newBalance) {
  const coinBalance = document.getElementById('coin-balance');
  const headerCoinBalance = document.getElementById('header-coin-balance');
  if (!coinBalance || !headerCoinBalance) {
    console.error('updateCoinBalance: Coin balance elements not found.');
    return;
  }

  try {
    const user = auth.currentUser;
    if (user) {
      const profileDocRef = doc(db, 'users', user.uid);
      await updateDoc(profileDocRef, { coins: newBalance });
      coinBalance.textContent = newBalance;
      headerCoinBalance.textContent = newBalance;
      showMessage(`Coin balance updated: ${newBalance} coins`, "success");
    } else {
      showMessage("Cannot update coins: No user authenticated.", "error");
    }
  } catch (e) {
    console.error("Error updating coins:", e);
    showMessage("Failed to update coins.", "error");
  }
}

// Awards 1 daily coin if the user hasn't logged in today
async function awardDailyCoin(lastLogin) {
  const user = auth.currentUser;
  if (!user) {
    console.error('awardDailyCoin: No user authenticated.');
    return;
  }

  const now = new Date();
  const lastLoginDate = lastLogin ? lastLogin.toDate() : null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastLoginDay = lastLoginDate ? new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate()) : null;

  if (!lastLoginDay || today > lastLoginDay) {
    const currentCoins = parseInt(document.getElementById('coin-balance').textContent) || 1000;
    const profileDocRef = doc(db, 'users', user.uid);
    await updateDoc(profileDocRef, {
      coins: currentCoins + 1,
      lastLogin: now
    });
    document.getElementById('coin-balance').textContent = currentCoins + 1;
    document.getElementById('header-coin-balance').textContent = currentCoins + 1;
    showMessage("You received 1 daily coin!", "success");
  }
}

// Fetches user data from Firestore
async function fetchUserData() {
  const user = auth.currentUser;
  if (!user) {
    console.log('fetchUserData: No user authenticated, redirecting to index.html');
    const storedEndDate = localStorage.getItem('subscriptionEndDate');
    if (storedEndDate) updateCountdown(new Date(parseInt(storedEndDate)));
    else document.getElementById('countdown-loading').textContent = "No subscription found.";
    window.location.href = 'index.html';
    return;
  }

  const profileDocRef = doc(db, 'users', user.uid);
  onSnapshot(profileDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('name').value = data.name || '';
      document.getElementById('educational-level').value = data.educationalLevel || '';
      document.getElementById('email').value = data.email || '';
      document.getElementById('whatsapp-number').value = data.whatsappNumber || '';
      if (data.profilePicUrl) document.getElementById('profile-pic-display').src = data.profilePicUrl;
      document.getElementById('coin-balance').textContent = data.coins || 1000;
      document.getElementById('header-coin-balance').textContent = data.coins || 1000;
      if (data.subscriptionEndDate) {
        const endDate = data.subscriptionEndDate.toDate();
        updateCountdown(endDate);
        document.getElementById('countdown-display').dataset.fullDate = endDate.getTime();
      }
      if (data.lastLogin) awardDailyCoin(data.lastLogin);
    } else {
      const initialData = {
        name: '',
        educationalLevel: '',
        email: '',
        whatsappNumber: '',
        profilePicUrl: 'https://placehold.co/150x150/42322a/d4c2a5?text=Profile',
        subscriptionEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
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

// Saves the user's profile data
async function saveProfile() {
  const user = auth.currentUser;
  if (!user) {
    showMessage("Cannot save profile: No user authenticated.", "error");
    return;
  }

  const profileDocRef = doc(db, 'users', user.uid);
  const name = document.getElementById('name').value;
  const educationalLevel = document.getElementById('educational-level').value;
  const email = document.getElementById('email').value;
  const whatsappNumber = document.getElementById('whatsapp-number').value;
  const profilePicUrl = document.getElementById('profile-pic-display').src;

  try {
    await setDoc(profileDocRef, { name, educationalLevel, email, whatsappNumber, profilePicUrl }, { merge: true });
    showMessage("Profile saved successfully!", "success");
  } catch (e) {
    console.error("Error saving profile:", e);
    showMessage("Failed to save profile.", "error");
  }
}

// Shows the specified page section
function showPage(pageId) {
  const sections = document.querySelectorAll('.page-section');
  if (!sections.length) {
    console.error('showPage: No page sections found.');
    return;
  }

  sections.forEach(section => section.classList.add('hidden'));
  const targetSection = document.getElementById(pageId + '-section');
  if (targetSection) targetSection.classList.remove('hidden');

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

// Starts the Test Quiz in Arcade Mode
function startQuiz(type, topicOrExam) {
  let currentCoins = parseInt(document.getElementById('coin-balance').textContent);
  if (currentCoins <= 0) {
    const { appId: contactAppId, password: contactPassword } = generateAppIdAndPassword();
    document.getElementById('app-id-display').textContent = contactAppId;
    document.getElementById('password-display').textContent = contactPassword;
    document.getElementById('whatsapp-link').href = `https://wa.me/+237652659429?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
    document.getElementById('telegram-link').href = `https://t.me/SchrDbb?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
    document.getElementById('contact-modal').classList.remove('hidden');
    return;
  }

  let quizTitle = '';
  if (type === 'course') {
    quizTitle = `Course Test: ${topicOrExam.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`;
  } else if (type === 'international') {
    quizTitle = `International Exam: ${topicOrExam.toUpperCase()}`;
  }

  document.getElementById('test-quiz-title').textContent = quizTitle;
  document.getElementById('test-quiz-content').classList.remove('hidden');

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
    if (!optionsContainer) {
      console.error('loadQuestion: Quiz options container not found.');
      return;
    }
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
  const submitAnswerBtn = document.getElementById('submit-answer-btn');
  if (submitAnswerBtn) submitAnswerBtn.classList.add('hidden');
}

// Starts a Challenge Mode quiz
async function startChallenge(opponentId) {
  let currentCoins = parseInt(document.getElementById('coin-balance').textContent);
  if (currentCoins <= 0) {
    const { appId: contactAppId, password: contactPassword } = generateAppIdAndPassword();
    document.getElementById('app-id-display').textContent = contactAppId;
    document.getElementById('password-display').textContent = contactPassword;
    document.getElementById('whatsapp-link').href = `https://wa.me/+237652659429?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
    document.getElementById('telegram-link').href = `https://t.me/SchrDbb?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
    document.getElementById('contact-modal').classList.remove('hidden');
    return;
  }

  if (!opponentId) {
    showMessage("Please enter a valid opponent User ID.", "error");
    return;
  }

  try {
    const opponentDocRef = doc(db, 'users', opponentId);
    const opponentDoc = await getDoc(opponentDocRef);
    if (!opponentDoc.exists()) {
      showMessage("Opponent User ID does not exist.", "error");
      return;
    }
    document.getElementById('opponent-user-id').textContent = `Opponent User ID: ${opponentId}`;
  } catch (e) {
    console.error("Error validating opponent ID:", e);
    showMessage("Failed to validate opponent ID. Ensure it's correct and Firebase is connected.", "error");
    return;
  }

  document.getElementById('challenge-content').classList.remove('hidden');
  document.getElementById('challenge-quiz-content').classList.remove('hidden');
  document.getElementById('test-content').classList.add('hidden');
  document.getElementById('current-user-id').textContent = `Your User ID: ${auth.currentUser?.uid || 'Not logged in'}`;

  let currentQuestionIndex = 0;
  let userScore = 0;
  const totalChallengeQuestions = 50;

  function loadChallengeQuestion() {
    if (currentQuestionIndex >= totalChallengeQuestions) {
      const opponentScore = Math.floor(Math.random() * totalChallengeQuestions);
      const result = userScore > opponentScore ? "You won!" : userScore < opponentScore ? "You lost!" : "It's a tie!";
      showMessage(`Challenge completed! Your score: ${userScore}/${totalChallengeQuestions}, Opponent: ${opponentScore}/${totalChallengeQuestions}. ${result}`, "success");
      document.getElementById('challenge-quiz-content').classList.add('hidden');
      return;
    }

    const question = dummyQuestions[currentQuestionIndex % dummyQuestions.length];
    document.getElementById('challenge-question').textContent = `Question ${currentQuestionIndex + 1}/${totalChallengeQuestions}: ${question.question}`;
    const optionsContainer = document.getElementById('challenge-options');
    if (!optionsContainer) {
      console.error('loadChallengeQuestion: Challenge options container not found.');
      return;
    }
    optionsContainer.innerHTML = '';

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
          currentCoins = currentCoins - 1;
          updateCoinBalance(currentCoins);
        }
        currentQuestionIndex++;
        loadChallengeQuestion();
      });
      optionsContainer.appendChild(button);
    });
  }

  loadChallengeQuestion();
  const submitChallengeAnswerBtn = document.getElementById('submit-challenge-answer-btn');
  if (submitChallengeAnswerBtn) submitChallengeAnswerBtn.classList.add('hidden');
}

// Initializes the app
async function init() {
  const countdownLoading = document.getElementById('countdown-loading');
  const saveProfileBtn = document.getElementById('save-profile-btn');
  const saveMessage = document.getElementById('save-message');

  const user = auth.currentUser;
  if (!user) {
    console.log('init: No user authenticated, redirecting to index.html');
    window.location.href = 'index.html';
    return;
  }

  if (countdownLoading) countdownLoading.textContent = 'Connecting...';
  if (saveProfileBtn) saveProfileBtn.disabled = false;
  if (saveMessage) saveMessage.classList.add('hidden');

  document.getElementById('profile-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('profile');
  });

  document.getElementById('modes-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('modes');
  });

  document.getElementById('profile-pic-upload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        document.getElementById('profile-pic-display').src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('save-profile-btn')?.addEventListener('click', saveProfile);

  document.querySelectorAll('.study-categories li').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const topic = e.target.dataset.topic;
      const pageUrl = e.target.dataset.pageUrl;

      if (pageUrl) {
        window.location.href = pageUrl;
      } else {
        const noteData = notes[topic];
        if (noteData) {
          document.getElementById('notes-display').classList.remove('hidden');
          document.getElementById('study-content').querySelector('.study-categories').classList.add('hidden');
          document.getElementById('current-note-topic').textContent = noteData.title;
          document.getElementById('note-content').innerHTML = noteData.content;
        } else {
          showMessage(`No notes available for ${e.target.textContent}.`, 'info');
        }
      }
    });
  });

  document.getElementById('back-to-categories')?.addEventListener('click', () => {
    document.getElementById('notes-display').classList.add('hidden');
    document.getElementById('study-content').querySelector('.study-categories').classList.remove('hidden');
  });

  document.getElementById('study-mode-btn')?.addEventListener('click', () => {
    document.getElementById('study-content').classList.remove('hidden');
    document.getElementById('arcade-content').classList.add('hidden');
    document.getElementById('study-mode-btn').classList.remove('bg-brown-dark', 'text-yellow-text');
    document.getElementById('study-mode-btn').classList.add('bg-golden-yellow', 'text-brown-dark');
    document.getElementById('arcade-mode-btn').classList.remove('bg-golden-yellow', 'text-brown-dark');
    document.getElementById('arcade-mode-btn').classList.add('bg-brown-dark', 'text-yellow-text');
  });

  document.getElementById('arcade-mode-btn')?.addEventListener('click', () => {
    const currentCoins = parseInt(document.getElementById('coin-balance').textContent);
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
      document.getElementById('arcade-mode-btn').classList.remove('bg-brown-dark', 'text-yellow-text');
      document.getElementById('arcade-mode-btn').classList.add('bg-golden-yellow', 'text-brown-dark');
      document.getElementById('study-mode-btn').classList.remove('bg-golden-yellow', 'text-brown-dark');
      document.getElementById('study-mode-btn').classList.add('bg-brown-dark', 'text-yellow-text');
    }
  });

  document.getElementById('test-mode-btn')?.addEventListener('click', () => {
    document.getElementById('test-content').classList.remove('hidden');
    document.getElementById('challenge-content').classList.add('hidden');
  });

  document.getElementById('challenge-mode-btn')?.addEventListener('click', () => {
    document.getElementById('test-content').classList.add('hidden');
    document.getElementById('challenge-content').classList.remove('hidden');
  });

  document.getElementById('course-test-btn')?.addEventListener('click', () => {
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

  document.getElementById('international-exam-btn')?.addEventListener('click', () => {
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

  document.getElementById('start-challenge-btn')?.addEventListener('click', () => {
    const opponentId = document.getElementById('opponent-id').value;
    startChallenge(opponentId);
  });

  document.getElementById('close-contact-modal')?.addEventListener('click', () => {
    document.getElementById('contact-modal').classList.add('hidden');
  });

  document.getElementById('countdown-timer')?.addEventListener('click', () => {
    const subscriptionEndDateElement = document.getElementById('countdown-display');
    if (subscriptionEndDateElement && subscriptionEndDateElement.dataset.fullDate) {
      const endDate = new Date(parseInt(subscriptionEndDateElement.dataset.fullDate));
      showMessage(`Subscription ends on: ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString()}`, 'info');
    } else {
      const storedEndDate = localStorage.getItem('subscriptionEndDate');
      if (storedEndDate) {
        const endDate = new Date(parseInt(storedEndDate));
        showMessage(`Subscription ends on: ${endDate.toLocaleDateString()}`, 'info');
      } else {
        showMessage("No active subscription found.", 'info');
      }
    }
  });

  fetchUserData();
  showPage('modes');
}

// Run init when DOM is loaded
window.addEventListener('DOMContentLoaded', init);