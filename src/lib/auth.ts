import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { User, UserType } from "./types";

export async function signIn(email: string, password: string): Promise<User> {
  if (!auth || !db) throw new Error("Firebase not initialized");
  
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Update last login timestamp
  await updateDoc(doc(db, "users", user.uid), {
    lastLoginAt: serverTimestamp(),
  });

  // Get user profile
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) {
    throw new Error("User profile not found");
  }

  return { uid: user.uid, ...userDoc.data() } as User;
}

export async function signUp(
  email: string,
  password: string,
  userData: Partial<User>
): Promise<User> {
  if (!auth || !db) throw new Error("Firebase not initialized");
  
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const newUser: Partial<User> = {
    uid: user.uid,
    email: user.email || email,
    ...userData,
    createdAt: serverTimestamp() as any,
    lastLoginAt: serverTimestamp() as any,
  };

  await setDoc(doc(db, "users", user.uid), newUser);

  return { uid: user.uid, ...newUser } as User;
}

export async function signOut(): Promise<void> {
  if (!auth) throw new Error("Firebase not initialized");
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  if (!auth) throw new Error("Firebase not initialized");
  await sendPasswordResetEmail(auth, email);
}

export async function getCurrentUser(): Promise<User | null> {
  if (!auth || !db) return null;
  
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
  if (!userDoc.exists()) return null;

  return { uid: firebaseUser.uid, ...userDoc.data() } as User;
}

export async function getUserProfile(uid: string): Promise<User | null> {
  if (!db) return null;
  
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) return null;
  return { uid, ...userDoc.data() } as User;
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  if (!auth) {
    // Return a no-op unsubscribe function if auth is not initialized
    return () => {};
  }
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
    default:
      return "An error occurred. Please try again.";
  }
}
