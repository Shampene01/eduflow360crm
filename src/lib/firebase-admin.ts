import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App;
let adminDb: Firestore;
let adminAuth: Auth;

function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    // Check for service account credentials
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        app = initializeApp({
          credential: cert(serviceAccount),
        });
      } catch (error) {
        console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:", error);
        // Fall back to default credentials (for local development with gcloud auth)
        app = initializeApp();
      }
    } else {
      // Use default credentials (Application Default Credentials)
      // This works with `gcloud auth application-default login` locally
      // or with service accounts in Cloud Run/Cloud Functions
      app = initializeApp();
    }
  } else {
    app = getApps()[0];
  }

  adminDb = getFirestore(app);
  adminAuth = getAuth(app);

  return { app, adminDb, adminAuth };
}

// Initialize on module load
const initialized = initializeFirebaseAdmin();
adminDb = initialized.adminDb;
adminAuth = initialized.adminAuth;

export { adminDb, adminAuth };
