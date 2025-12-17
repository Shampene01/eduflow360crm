import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { User } from "./types";
import { initPresence, cleanupPresence } from "./presence";

export async function signIn(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Fetch user profile first (critical path)
    let userProfile = await getUserProfile(firebaseUser.uid);
    if (!userProfile) {
      // User exists in Firebase Auth but not in Firestore
      // This can happen when users are created via backend (e.g., Power Automate)
      // Auto-create a basic profile so they can log in
      console.log("Creating Firestore profile for backend-created user:", firebaseUser.uid);
      
      const newProfile: User = {
        uid: firebaseUser.uid,
        userId: firebaseUser.uid,
        email: firebaseUser.email || email,
        emailVerified: firebaseUser.emailVerified,
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
        isActive: true,
        crmSynced: false,
        // Default role - can be updated by admin later
        role: "provider",
        roleCode: 2,
      };

      const userRef = doc(db, "users", firebaseUser.uid);
      await setDoc(userRef, newProfile);
      userProfile = newProfile;
    }

    // Update last login time and init presence in background (non-blocking)
    const userRef = doc(db, "users", firebaseUser.uid);
    setDoc(userRef, { lastLoginAt: Timestamp.now() }, { merge: true }).catch(() => {});
    
    // Initialize presence tracking in background
    initPresence(firebaseUser.uid);

    return userProfile;
  } catch (error: any) {
    throw error;
  }
}

export async function signUp(
  email: string,
  password: string,
  userData: Partial<User>
): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Create user profile in Firestore
    const userProfile: User = {
      uid: firebaseUser.uid,
      userId: firebaseUser.uid,
      email: firebaseUser.email!,
      emailVerified: firebaseUser.emailVerified,
      ...userData,
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
      isActive: true,
      crmSynced: false,
    };

    const userRef = doc(db, "users", firebaseUser.uid);
    await setDoc(userRef, userProfile);

    return userProfile;
  } catch (error: any) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      // Update last logout time in Firestore
      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(
        userRef,
        {
          lastLogoutAt: Timestamp.now(),
        },
        { merge: true }
      );

      // Cleanup presence (set offline in Realtime DB)
      await cleanupPresence(currentUser.uid);
    }

    await firebaseSignOut(auth);
  } catch (error: any) {
    throw error;
  }
}

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw error;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return null;
  }

  return getUserProfile(firebaseUser.uid);
}

export async function getUserProfile(uid: string): Promise<User | null> {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as User;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Invalid email or password. Please check your credentials and try again.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/too-many-requests":
      return "Too many failed login attempts. Please try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/operation-not-allowed":
      return "Email/password login is not enabled. Please contact support.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/profile-not-found":
      return "Your account exists but profile setup is incomplete. Please contact support.";
    default:
      return "An error occurred. Please try again.";
  }
}
