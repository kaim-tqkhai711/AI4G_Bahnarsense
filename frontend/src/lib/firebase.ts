import { initializeApp } from "firebase/app";
import {
    getAuth, GoogleAuthProvider, FacebookAuthProvider,
    signInWithPopup, signOut, fetchSignInMethodsForEmail,
    createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Replace with your app's Firebase project configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-domain.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-project-id",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock-bucket.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:12345:web:12345"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.setCustomParameters({
    auth_type: 'reauthenticate'
});

export {
    signInWithPopup,
    signOut,
    fetchSignInMethodsForEmail,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
};
