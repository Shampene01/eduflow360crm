/**
 * DATA MIGRATION UTILITY
 * 
 * Migrates data from the legacy flat structure to the new normalized schema.
 * 
 * Migration steps:
 * 1. Read legacy user document
 * 2. Extract and create Address record
 * 3. Create normalized User record (natural person only)
 * 4. Create AccommodationProvider record (if provider)
 * 5. Create ProviderContactPerson records
 * 6. Mark legacy document as migrated
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  User,
  UserRole,
  Address,
  AccommodationProvider,
  ProviderContactPerson,
  COLLECTIONS,
  LegalForm,
  AccountType,
} from "./schema";
import { generateId } from "./db";

// Legacy user interface (current structure)
interface LegacyUser {
  uid: string;
  email: string;
  userType: "student" | "provider" | "admin";
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: string;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  
  // Provider fields to migrate
  providerName?: string;
  providerType?: string;
  yearsInOperation?: number;
  companyRegistrationNumber?: string;
  vatRegistration?: string;
  taxNumber?: string;
  vatNumber?: string;
  bbbeeExpiry?: string;
  bbbeeLevel?: number;
  womenOwnershipPercentage?: number;
  disabilityOwnershipPercentage?: number;
  blackOwnershipPercentage?: number;
  youthOwnershipPercentage?: number;
  streetAddress?: string;
  suburb?: string;
  city?: string;
  province?: string;
  longitude?: string;
  latitude?: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactPosition?: string;
  primaryContactEmail?: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  bankName?: string;
  accountNumber?: string;
  branchCode?: string;
  accountType?: string;
  accountHolder?: string;
  totalProperties?: number;
  totalCapacity?: number;
  accreditationStatus?: string;
  complianceStatus?: string;
  
  // Legacy fields
  companyName?: string;
  companyRegistration?: string;
  nsfasAccredited?: boolean;
  address?: string;
  postalCode?: string;
  
  // Migration tracking
  _migrated?: boolean;
  _migratedAt?: Timestamp;
  _newUserId?: string;
  _newProviderId?: string;
}

export interface MigrationResult {
  success: boolean;
  legacyUserId: string;
  newUserId?: string;
  newProviderId?: string;
  addressId?: string;
  contactIds?: string[];
  error?: string;
}

/**
 * Migrate a single legacy user to the new schema
 */
export async function migrateLegacyUser(legacyUserId: string): Promise<MigrationResult> {
  if (!db) {
    return { success: false, legacyUserId, error: "Database not initialized" };
  }

  try {
    // 1. Get legacy user document
    const legacyDocRef = doc(db, "users", legacyUserId);
    const legacyDoc = await getDoc(legacyDocRef);
    
    if (!legacyDoc.exists()) {
      return { success: false, legacyUserId, error: "Legacy user not found" };
    }
    
    const legacy = legacyDoc.data() as LegacyUser;
    
    // Check if already migrated
    if (legacy._migrated) {
      return { 
        success: true, 
        legacyUserId, 
        newUserId: legacy._newUserId,
        newProviderId: legacy._newProviderId,
        error: "Already migrated" 
      };
    }
    
    const batch = writeBatch(db);
    const result: MigrationResult = { success: true, legacyUserId };
    
    // 2. Create Address if location data exists
    let addressId: string | undefined;
    if (legacy.streetAddress || legacy.city || legacy.province) {
      addressId = generateId();
      const address: Address = {
        addressId,
        street: legacy.streetAddress || legacy.address || "",
        suburb: legacy.suburb,
        townCity: legacy.city || "",
        province: legacy.province || "",
        postalCode: legacy.postalCode,
        country: "South Africa",
        latitude: legacy.latitude ? parseFloat(legacy.latitude) : undefined,
        longitude: legacy.longitude ? parseFloat(legacy.longitude) : undefined,
        createdAt: serverTimestamp() as Timestamp,
      };
      batch.set(doc(db, COLLECTIONS.ADDRESSES, addressId), address);
      result.addressId = addressId;
    }
    
    // 3. Create normalized User (natural person)
    const newUserId = legacy.uid; // Keep same ID for Firebase Auth compatibility
    
    // Parse name from legacy fields
    let firstNames = legacy.firstName || "";
    let surname = legacy.lastName || "";
    
    // If no firstName/lastName, try to parse from primaryContactName
    if (!firstNames && legacy.primaryContactName) {
      const nameParts = legacy.primaryContactName.split(" ");
      firstNames = nameParts.slice(0, -1).join(" ") || nameParts[0] || "";
      surname = nameParts.slice(-1)[0] || "";
    }
    
    const newUser: User = {
      userId: newUserId,
      email: legacy.email,
      phoneNumber: legacy.phone || legacy.primaryContactPhone,
      firstNames,
      surname,
      addressId,
      createdAt: legacy.createdAt || serverTimestamp() as Timestamp,
      lastLoginAt: legacy.lastLoginAt,
      marketingConsent: false,
      role: legacy.userType as UserRole,  // Primary role
      roles: [legacy.userType] as UserRole[],  // Legacy array
      isActive: legacy.status !== "inactive",
      emailVerified: true, // Assume verified if they registered
    };
    
    batch.set(doc(db, COLLECTIONS.USERS, newUserId), newUser);
    result.newUserId = newUserId;
    
    // 4. Create AccommodationProvider if user is a provider
    if (legacy.userType === "provider") {
      const providerId = generateId();
      
      // Map providerType to LegalForm
      const legalFormMap: Record<string, LegalForm> = {
        "Private Company": "Private Company",
        "NGO": "NGO",
        "Trust": "Trust",
        "Sole Proprietor": "Sole Proprietor",
        "Communal Property Association": "Communal Property Association",
      };
      
      const provider: AccommodationProvider = {
        providerId,
        userId: newUserId,
        companyName: legacy.providerName || legacy.companyName || "",
        tradingName: legacy.providerName,
        legalForm: legalFormMap[legacy.providerType || ""] || "Private Company",
        companyRegistrationNumber: legacy.companyRegistrationNumber || legacy.companyRegistration,
        yearsInOperation: legacy.yearsInOperation || undefined,
        taxReferenceNumber: legacy.taxNumber,
        vatRegistered: legacy.vatRegistration === "Yes",
        vatNumber: legacy.vatNumber,
        bankName: legacy.bankName,
        accountType: (legacy.accountType as AccountType) || undefined,
        accountNumber: legacy.accountNumber,
        branchCode: legacy.branchCode,
        accountHolder: legacy.accountHolder,
        bbbeeLevel: legacy.bbbeeLevel || undefined,
        bbbeeCertificateExpiry: legacy.bbbeeExpiry,
        blackOwnershipPercentage: legacy.blackOwnershipPercentage || undefined,
        blackYouthOwnershipPercentage: legacy.youthOwnershipPercentage || undefined,
        blackWomenOwnershipPercentage: legacy.womenOwnershipPercentage || undefined,
        disabledPersonOwnershipPercentage: legacy.disabilityOwnershipPercentage || undefined,
        physicalAddressId: addressId,
        approvalStatus: legacy.accreditationStatus === "Approved" ? "Approved" : "Pending",
        nsfasAccredited: legacy.nsfasAccredited || legacy.accreditationStatus === "Approved",
        createdAt: legacy.createdAt || serverTimestamp() as Timestamp,
      };
      
      batch.set(doc(db, COLLECTIONS.ACCOMMODATION_PROVIDERS, providerId), provider);
      result.newProviderId = providerId;
      
      // 5. Create ProviderContactPerson records
      const contactIds: string[] = [];
      
      // Primary contact
      if (legacy.primaryContactName || legacy.primaryContactEmail || legacy.primaryContactPhone) {
        const primaryContactId = generateId();
        const nameParts = (legacy.primaryContactName || "").split(" ");
        
        const primaryContact: ProviderContactPerson = {
          contactId: primaryContactId,
          providerId,
          firstNames: nameParts.slice(0, -1).join(" ") || nameParts[0] || "",
          surname: nameParts.slice(-1)[0] || "",
          position: legacy.primaryContactPosition,
          phoneNumber: legacy.primaryContactPhone || "",
          email: legacy.primaryContactEmail || legacy.email,
          isPrimary: true,
          isActive: true,
          createdAt: serverTimestamp() as Timestamp,
        };
        
        batch.set(doc(db, COLLECTIONS.PROVIDER_CONTACT_PERSONS, primaryContactId), primaryContact);
        contactIds.push(primaryContactId);
      }
      
      // Secondary contact
      if (legacy.secondaryContactName || legacy.secondaryContactPhone) {
        const secondaryContactId = generateId();
        const nameParts = (legacy.secondaryContactName || "").split(" ");
        
        const secondaryContact: ProviderContactPerson = {
          contactId: secondaryContactId,
          providerId,
          firstNames: nameParts.slice(0, -1).join(" ") || nameParts[0] || "",
          surname: nameParts.slice(-1)[0] || "",
          phoneNumber: legacy.secondaryContactPhone || "",
          email: "",
          isPrimary: false,
          isActive: true,
          createdAt: serverTimestamp() as Timestamp,
        };
        
        batch.set(doc(db, COLLECTIONS.PROVIDER_CONTACT_PERSONS, secondaryContactId), secondaryContact);
        contactIds.push(secondaryContactId);
      }
      
      result.contactIds = contactIds;
    }
    
    // 6. Mark legacy document as migrated (don't delete, keep for reference)
    batch.update(legacyDocRef, {
      _migrated: true,
      _migratedAt: serverTimestamp(),
      _newUserId: newUserId,
      _newProviderId: result.newProviderId || null,
    });
    
    await batch.commit();
    
    return result;
    
  } catch (error) {
    console.error("Migration error:", error);
    return { 
      success: false, 
      legacyUserId, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Migrate all legacy users to the new schema
 */
export async function migrateAllLegacyUsers(): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: MigrationResult[];
}> {
  if (!db) {
    return { total: 0, successful: 0, failed: 0, results: [] };
  }

  // Get all non-migrated users
  const q = query(
    collection(db, "users"),
    where("_migrated", "!=", true)
  );
  
  const snapshot = await getDocs(q);
  const results: MigrationResult[] = [];
  
  for (const docSnap of snapshot.docs) {
    const result = await migrateLegacyUser(docSnap.id);
    results.push(result);
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}

/**
 * Check migration status
 */
export async function getMigrationStatus(): Promise<{
  totalLegacyUsers: number;
  migratedUsers: number;
  pendingUsers: number;
}> {
  if (!db) {
    return { totalLegacyUsers: 0, migratedUsers: 0, pendingUsers: 0 };
  }

  const allUsersSnap = await getDocs(collection(db, "users"));
  const migratedQuery = query(collection(db, "users"), where("_migrated", "==", true));
  const migratedSnap = await getDocs(migratedQuery);
  
  return {
    totalLegacyUsers: allUsersSnap.size,
    migratedUsers: migratedSnap.size,
    pendingUsers: allUsersSnap.size - migratedSnap.size,
  };
}

/**
 * Rollback migration for a specific user (for testing)
 */
export async function rollbackMigration(legacyUserId: string): Promise<boolean> {
  if (!db) return false;

  try {
    const legacyDocRef = doc(db, "users", legacyUserId);
    const legacyDoc = await getDoc(legacyDocRef);
    
    if (!legacyDoc.exists()) return false;
    
    const legacy = legacyDoc.data() as LegacyUser;
    
    if (!legacy._migrated) return true; // Nothing to rollback
    
    const batch = writeBatch(db);
    
    // Delete new records
    if (legacy._newUserId) {
      batch.delete(doc(db, COLLECTIONS.USERS, legacy._newUserId));
    }
    
    if (legacy._newProviderId) {
      batch.delete(doc(db, COLLECTIONS.ACCOMMODATION_PROVIDERS, legacy._newProviderId));
      
      // Delete associated contacts
      const contactsQuery = query(
        collection(db, COLLECTIONS.PROVIDER_CONTACT_PERSONS),
        where("providerId", "==", legacy._newProviderId)
      );
      const contactsSnap = await getDocs(contactsQuery);
      contactsSnap.docs.forEach(d => batch.delete(d.ref));
    }
    
    // Reset migration flags
    batch.update(legacyDocRef, {
      _migrated: false,
      _migratedAt: null,
      _newUserId: null,
      _newProviderId: null,
    });
    
    await batch.commit();
    return true;
    
  } catch (error) {
    console.error("Rollback error:", error);
    return false;
  }
}
