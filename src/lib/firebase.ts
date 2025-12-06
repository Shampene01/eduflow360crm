import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Helper to get or initialize Firebase app
function getFirebaseApp() {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

// Lazy initialization - only initialize when accessed on client
function createFirebaseServices() {
  if (typeof window === "undefined") {
    // Return null services for SSR - they won't be used
    return { app: null, auth: null, db: null, storage: null };
  }
  
  const app = getFirebaseApp();
  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  };
}

const services = createFirebaseServices();

export const app = services.app;
export const auth = services.auth;
export const db = services.db;
export const storage = services.storage;

// NSFAS Verification Webhook URL
export const NSFAS_WEBHOOK_URL = process.env.NEXT_PUBLIC_NSFAS_WEBHOOK_URL;

export default app;
