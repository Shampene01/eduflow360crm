/**
 * CRM SYNC UTILITY
 * 
 * Handles syncing user data to Power Automate Flow for D365 CRM integration.
 * This module provides functions to sync user data to the CRM via webhooks.
 */

import { DATAVERSE_USER_SYNC_URL } from "./firebase";
import { User } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface CRMSyncPayload {
  firebaseUserId: string;
  firstNames: string;
  surname: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  idNumber: string;
  gender: number;
  country: string;
  province: string;
  townCity: string;
  suburb: string;
  street: string;
  postalCode: string;
  role: string;
  marketingConsent: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
  profilePhotoUrl: string;
}

export interface CRMSyncResult {
  success: boolean;
  message: string;
  crmRecordId?: string;
  error?: string;
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Sync user data to Power Automate Flow for D365 CRM
 * 
 * @param user - User data to sync
 * @returns Promise<CRMSyncResult>
 */
export async function syncUserToCRM(
  user: Partial<User> & { userId: string; email: string; firstNames: string; surname: string }
): Promise<CRMSyncResult> {
  // Check if webhook URL is configured
  if (!DATAVERSE_USER_SYNC_URL) {
    return {
      success: false,
      message: "CRM sync not configured",
      error: "DATAVERSE_USER_SYNC_URL environment variable not set",
    };
  }

  try {
    // Helper to convert gender string to integer (0 = Male, 1 = Female)
    const getGenderCode = (gender: string | undefined): number => {
      if (!gender) return 0;
      const g = gender.toLowerCase();
      if (g === "female" || g === "f") return 1;
      return 0; // Male or default
    };

    // Prepare payload for Power Automate (flattened structure matching profile sync)
    const payload: CRMSyncPayload = {
      firebaseUserId: String(user.userId || ""),
      firstNames: String(user.firstNames || ""),
      surname: String(user.surname || ""),
      email: String(user.email || ""),
      phoneNumber: String(user.phoneNumber || ""),
      dateOfBirth: String(user.dateOfBirth || ""),
      idNumber: String(user.idNumber || ""),
      gender: getGenderCode(user.gender),
      country: String(user.address?.country || "South Africa"),
      province: String(user.address?.province || ""),
      townCity: String(user.address?.townCity || ""),
      suburb: String(user.address?.suburb || ""),
      street: String(user.address?.street || ""),
      postalCode: String(user.address?.postalCode || ""),
      role: String(user.role || "provider"),
      marketingConsent: Boolean(user.marketingConsent === true),
      isActive: Boolean(user.isActive !== false),
      createdAt: user.createdAt ? formatTimestamp(user.createdAt) : new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      profilePhotoUrl: String(user.profilePhotoUrl || ""),
    };

    // Send to Power Automate webhook
    const response = await fetch(DATAVERSE_USER_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `CRM sync failed: ${response.statusText}`,
        error: errorText,
      };
    }

    // Try to parse response (Power Automate may return JSON with CRM record ID)
    let responseData: any = {};
    try {
      responseData = await response.json();
    } catch {
      // Response might not be JSON
      responseData = { message: "Sync completed" };
    }

    return {
      success: true,
      message: "User synced to CRM successfully",
      crmRecordId: responseData.crmRecordId || responseData.id,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to sync to CRM",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync user data to CRM in background (non-blocking)
 * Use this for registration flow where we don't want to block the user
 */
export function syncUserToCRMBackground(
  user: Partial<User> & { userId: string; email: string; firstNames: string; surname: string }
): void {
  // Fire and forget - don't await
  syncUserToCRM(user).catch(() => {});
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format Firestore Timestamp or Date to ISO string
 */
function formatTimestamp(timestamp: any): string {
  if (!timestamp) return new Date().toISOString();
  
  // Firestore Timestamp
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }
  
  // Already a Date
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // Already a string
  if (typeof timestamp === "string") {
    return timestamp;
  }
  
  // Firestore Timestamp with seconds
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  
  return new Date().toISOString();
}
