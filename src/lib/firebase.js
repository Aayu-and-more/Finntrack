import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 👇 YOUR FIREBASE PROJECT CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyB1FkQCkglPzQLjcR4lN-vB7ILkYvr5rus",
    authDomain: "finntrack-359e0.firebaseapp.com",
    projectId: "finntrack-359e0",
    storageBucket: "finntrack-359e0.firebasestorage.app",
    messagingSenderId: "817337207547",
    appId: "1:817337207547:web:7097ffe63e92113f8a3e5e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
