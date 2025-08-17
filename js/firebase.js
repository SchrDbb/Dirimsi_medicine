import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration (replace with your Firebase Console values)
const firebaseConfig = {
   apiKey: "AIzaSyBHoy1s93WHXfcTksT8xWy-pyaNeMR1FDA",
  authDomain: "dirimsiapp.firebaseapp.com",
  projectId: "dirimsiapp",
  storageBucket: "dirimsiapp.firebasestorage.app",
  messagingSenderId: "323422718070",
  appId: "1:323422718070:web:3f9baff1674a5780f63757",
  measurementId: "G-0VNR9GYGGK"
};

// Initialize Firebase
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Connect to Firebase Emulators for local development
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        console.log('Connecting to Firebase Emulators for local development');
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, 'localhost', 8080);
    }
} catch (error) {
    console.error('Firebase initialization failed:', error);
    throw new Error('Failed to initialize Firebase. Check your configuration and ensure a valid firebaseConfig object.');
}

export { app, auth, db };