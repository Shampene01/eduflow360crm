/**
 * PRESENCE TRACKING
 * 
 * Uses Firebase Realtime Database for real-time online/offline status.
 * This is more efficient than Firestore for presence because:
 * - Built-in `.info/connected` listener
 * - `onDisconnect()` handlers run server-side even if browser closes
 * - Minimal reads - only triggers on state change
 */

import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbServerTimestamp, off } from "firebase/database";
import { rtdb } from "./firebase";

export interface UserPresence {
  online: boolean;
  lastSeen: number | object;  // Timestamp
}

let presenceUnsubscribe: (() => void) | null = null;
let presenceInitialized = false;

/**
 * Check if the Realtime Database is available for presence tracking.
 */
export function isPresenceAvailable(): boolean {
  return rtdb !== null && rtdb !== undefined;
}

/**
 * Initialize presence tracking for a user.
 * Call this after successful login.
 */
export function initPresence(uid: string): void {
  if (typeof window === "undefined") return;  // Server-side guard
  if (presenceInitialized) return;  // Already initialized
  if (!isPresenceAvailable()) return;  // Realtime Database not configured
  
  try {
    const userStatusRef = ref(rtdb!, `/status/${uid}`);
    const connectedRef = ref(rtdb!, ".info/connected");

    const handleConnection = (snapshot: any) => {
      if (snapshot.val() === false) {
        return;
      }

      // When connected, set up onDisconnect handler first
      onDisconnect(userStatusRef).set({
        online: false,
        lastSeen: rtdbServerTimestamp()
      }).then(() => {
        // Then set user as online
        set(userStatusRef, {
          online: true,
          lastSeen: rtdbServerTimestamp()
        });
      }).catch((error) => {
        // Silently fail - Realtime Database might not be set up
        if (process.env.NODE_ENV === 'development') {
          console.warn("Presence tracking unavailable:", error.message);
        }
      });
    };

    onValue(connectedRef, handleConnection, (error) => {
      // Silently fail on connection errors
      if (process.env.NODE_ENV === 'development') {
        console.warn("Presence connection error:", error.message);
      }
    });

    presenceInitialized = true;

    // Store cleanup function
    presenceUnsubscribe = () => {
      off(connectedRef, "value", handleConnection);
      presenceInitialized = false;
    };
  } catch (error) {
    // Silently fail if Realtime Database is not configured
    if (process.env.NODE_ENV === 'development') {
      console.warn("Presence tracking not available");
    }
  }
}

/**
 * Set user as offline and clean up presence listeners.
 * Call this before logout.
 */
export async function cleanupPresence(uid: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isPresenceAvailable()) return;

  try {
    const userStatusRef = ref(rtdb!, `/status/${uid}`);
    
    // Set offline status
    await set(userStatusRef, {
      online: false,
      lastSeen: rtdbServerTimestamp()
    });

    // Clean up listener
    if (presenceUnsubscribe) {
      presenceUnsubscribe();
      presenceUnsubscribe = null;
    }
    presenceInitialized = false;
  } catch (error) {
    console.error("Error cleaning up presence:", error);
  }
}

/**
 * Subscribe to a user's presence status.
 * Returns an unsubscribe function.
 */
export function subscribeToPresence(
  uid: string, 
  callback: (presence: UserPresence | null) => void
): () => void {
  if (!isPresenceAvailable()) {
    callback(null);
    return () => {};
  }

  try {
    const userStatusRef = ref(rtdb!, `/status/${uid}`);
    
    const handleValue = (snapshot: any) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as UserPresence);
      } else {
        // No presence data yet - assume online if we're checking our own status
        callback(null);
      }
    };

    const handleError = (error: any) => {
      // Silently fail and return null presence
      if (process.env.NODE_ENV === 'development') {
        console.warn("Presence subscription error:", error.message);
      }
      callback(null);
    };

    onValue(userStatusRef, handleValue, handleError);

    return () => {
      off(userStatusRef, "value", handleValue);
    };
  } catch (error) {
    // Return a no-op unsubscribe if subscription fails
    callback(null);
    return () => {};
  }
}

/**
 * Get presence status for multiple users.
 * Useful for displaying online status in user lists.
 */
export function subscribeToMultiplePresence(
  uids: string[],
  callback: (presenceMap: Record<string, UserPresence | null>) => void
): () => void {
  const presenceMap: Record<string, UserPresence | null> = {};
  const unsubscribes: (() => void)[] = [];

  uids.forEach((uid) => {
    const unsub = subscribeToPresence(uid, (presence) => {
      presenceMap[uid] = presence;
      callback({ ...presenceMap });
    });
    unsubscribes.push(unsub);
  });

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}
