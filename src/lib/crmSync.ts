/**
 * CRM SYNC UTILITY
 * 
 * Handles syncing user data to Power Automate Flow for D365 CRM integration.
 * This module provides functions to sync user data to the CRM via webhooks.
 */

import { DATAVERSE_USER_SYNC_URL } from "./firebase";
import { User } from "./types";
import { getRoleCodeFromName, RoleCode } from "./roleCodes";

// ============================================================================
// TYPES
// ============================================================================

export interface CRMSyncPayload {
  userId: string;
  email: string;
  firstNames: string;
  surname: string;
  roleCode: number;
  phoneNumber?: string;
  idNumber?: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other";
  address?: {
    street: string;
    suburb?: string;
    townCity: string;
    province: string;
    postalCode?: string;
    country?: string;
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  syncSource: "registration" | "profile_update" | "manual_sync";
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
 * @param syncSource - Source of the sync (registration, profile_update, manual_sync)
 * @returns Promise<CRMSyncResult>
 */
export async function syncUserToCRM(
  user: Partial<User> & { userId: string; email: string; firstNames: string; surname: string },
  syncSource: CRMSyncPayload["syncSource"] = "manual_sync"
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

    // Convert role name to role code (default to PROVIDER if not found)
    const roleCode = getRoleCodeFromName(user.role || "provider") ?? RoleCode.PROVIDER;

    // Prepare payload for Power Automate
    const payload: CRMSyncPayload = {
      userId: user.userId,
      email: user.email,
      firstNames: user.firstNames,
      surname: user.surname,
      roleCode: roleCode,
      phoneNumber: user.phoneNumber,
      idNumber: user.idNumber,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: user.address,
      isActive: user.isActive ?? true,
      createdAt: user.createdAt ? formatTimestamp(user.createdAt) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncSource: syncSource,
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
  user: Partial<User> & { userId: string; email: string; firstNames: string; surname: string },
  syncSource: CRMSyncPayload["syncSource"] = "registration"
): void {
  // Fire and forget - don't await
  syncUserToCRM(user, syncSource).catch(() => {});
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
