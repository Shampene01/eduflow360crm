import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC7Nx-6udztHABL9AEAakSGrasx-57pvIM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tym-crm.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tym-crm",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tym-crm.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "610696585724",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:610696585724:web:2f6207816ed230a3a71279",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-6B6QHD0JH7"
};

// Initialize Firebase only if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// NSFAS Verification Webhook URL
export const NSFAS_WEBHOOK_URL = process.env.NEXT_PUBLIC_NSFAS_WEBHOOK_URL || "https://hook.eu2.make.com/2aw7nn8cxooxuwwndkcckq3ytxzib6u8";

export default app;
