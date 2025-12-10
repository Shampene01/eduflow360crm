import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase, Database } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

// Check if Realtime Database URL is explicitly configured
const hasRealtimeDbUrl = !!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  // Only include databaseURL if explicitly configured
  ...(hasRealtimeDbUrl && { databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL }),
};

// Initialize Firebase (only once)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase services
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Firestore with persistence for better performance
let firestoreDb: ReturnType<typeof getFirestore>;
if (typeof window !== "undefined") {
  // Client-side: use persistent cache with multi-tab support
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (e) {
    // Firestore already initialized, just get the instance
    firestoreDb = getFirestore(app);
  }
} else {
  // Server-side: just use regular Firestore
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;

// Realtime Database for presence - only initialize if URL is configured
let rtdbInstance: Database | null = null;
if (hasRealtimeDbUrl) {
  try {
    rtdbInstance = getDatabase(app);
  } catch (error) {
    console.warn("Realtime Database not available:", error);
  }
}
export const rtdb = rtdbInstance;

// Initialize Analytics (only in browser and if supported)
let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  });
}
export const analytics = analyticsInstance;

// Dataverse Sync Webhooks (Power Automate)
export const DATAVERSE_USER_SYNC_URL = process.env.NEXT_PUBLIC_DATAVERSE_USER_SYNC_URL;
export const DATAVERSE_PROVIDER_SYNC_URL = process.env.NEXT_PUBLIC_DATAVERSE_PROVIDER_SYNC_URL;
export const DATAVERSE_PROPERTY_SYNC_URL = process.env.NEXT_PUBLIC_DATAVERSE_PROPERTY_SYNC_URL;
export const DATAVERSE_STUDENT_SYNC_URL = process.env.NEXT_PUBLIC_DATAVERSE_STUDENT_SYNC_URL;
export const DATAVERSE_SYNC_URL = process.env.NEXT_PUBLIC_DATAVERSE_SYNC_URL;

// Legacy (backward compatibility)
export const NSFAS_WEBHOOK_URL = process.env.NEXT_PUBLIC_NSFAS_WEBHOOK_URL;

export default app;
