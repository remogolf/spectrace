// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// Replace these placeholders with your actual Firebase config values
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCseRRmi07Ob42-jer2cvArEXXxiX_n2kk",
    authDomain: "test-47b6f.firebaseapp.com",
    projectId: "test-47b6f",
    storageBucket: "test-47b6f.firebasestorage.app",
    messagingSenderId: "7830316192",
    appId: "1:7830316192:web:499f38a46e4e833b0e95c5",
    measurementId: "G-H49TWWHXYX"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };