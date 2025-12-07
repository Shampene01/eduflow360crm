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

/**
 * Initialize presence tracking for a user.
 * Call this after successful login.
 */
export function initPresence(uid: string): void {
  if (typeof window === "undefined") return;  // Server-side guard
  
  const userStatusRef = ref(rtdb, `/status/${uid}`);
  const connectedRef = ref(rtdb, ".info/connected");

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
      console.error("Error setting up presence:", error);
    });
  };

  onValue(connectedRef, handleConnection);

  // Store cleanup function
  presenceUnsubscribe = () => {
    off(connectedRef, "value", handleConnection);
  };
}

/**
 * Set user as offline and clean up presence listeners.
 * Call this before logout.
 */
export async function cleanupPresence(uid: string): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const userStatusRef = ref(rtdb, `/status/${uid}`);
    
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
  const userStatusRef = ref(rtdb, `/status/${uid}`);
  
  const handleValue = (snapshot: any) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as UserPresence);
    } else {
      callback(null);
    }
  };

  onValue(userStatusRef, handleValue);

  return () => {
    off(userStatusRef, "value", handleValue);
  };
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
