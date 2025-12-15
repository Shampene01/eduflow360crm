/**
 * CRM SYNC UTILITY
 * 
 * Handles syncing user data to Power Automate Flow for D365 CRM integration.
 * This module provides functions to sync user data to the CRM via webhooks.
 */

import { 
  DATAVERSE_USER_SYNC_URL, 
  DATAVERSE_PROVIDER_SYNC_URL, 
  DATAVERSE_PROPERTY_SYNC_URL,
  DATAVERSE_STUDENT_SYNC_URL,
  db 
} from "./firebase";
import { User } from "./types";
import { 
  AccommodationProvider, 
  Address, 
  ProviderContactPerson,
  ProviderDocument,
  Property,
  PropertyDocument,
  PropertyImage,
  RoomConfiguration,
  Student,
  StudentPropertyAssignment,
} from "./schema";
import { doc, updateDoc } from "firebase/firestore";
import { providerDisplayId } from "./utils/maskId";

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
  dataverseId?: string;
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

    // Parse response - Power Automate returns { message: "OK", dataverseId: "..." }
    let responseData: { message?: string; dataverseId?: string } = {};
    try {
      responseData = await response.json();
    } catch {
      // Response might not be JSON
      responseData = { message: "Sync completed" };
    }

    // Save dataverseId to Firestore if returned
    const dataverseId = responseData.dataverseId;
    if (dataverseId && user.userId) {
      try {
        const userRef = doc(db, "users", user.userId);
        await updateDoc(userRef, { dataverseId });
        console.log("Saved dataverseId to Firestore:", dataverseId);
      } catch (updateError) {
        console.error("Failed to save dataverseId to Firestore:", updateError);
      }
    }

    return {
      success: true,
      message: "User synced to CRM successfully",
      dataverseId: dataverseId,
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

// ============================================================================
// ACCOMMODATION PROVIDER SYNC
// ============================================================================

/**
 * Payload for syncing accommodation provider to Dataverse
 * Links provider to the user's existing Dataverse contact record
 * 
 * Required fields: userDataverseId, firebaseUserId, firebaseProviderId, companyName
 * All other fields are nullable
 */
export interface ProviderSyncPayload {
  // Required fields
  userDataverseId: string;             // The Dataverse Contact ID of the logged-in user (links provider to user)
  firebaseUserId: string;              // Firebase Auth UID of the user
  firebaseProviderId: string;          // Firebase providerId from accommodationProviders collection
  providerId: string;                  // Shortened providerId from accommodationProviders collection
  companyName: string;
  
  // Company Information (nullable)
  tradingName: string | null;
  legalForm: string | null;
  providerType: number | null;           // Mapped: 0=Private Company, 1=Public Company, 3=Trust, 4=Sole Proprietor, 5=Non Profit Company
  industryClassification: string | null;
  companyRegistrationNumber: string | null;
  yearsInOperation: number | null;
  
  // Campus & Contact Info (nullable)
  preferredInstitution: string | null;
  preferredCampus: string | null;
  officeTelephone: string | null;
  website: string | null;
  customerServiceEmail: string | null;
  
  // Tax Information (nullable)
  taxReferenceNumber: string | null;
  vatRegistered: number | null;        // 0=No, 1=Yes (Dataverse requires integer)
  vatNumber: string | null;
  
  // Banking Information (nullable)
  bankName: string | null;
  accountType: string | null;
  accountNumber: string | null;
  branchCode: string | null;
  accountHolder: string | null;
  
  // B-BBEE Information (nullable)
  bbbeeLevel: number | null;
  bbbeeCertificateExpiry: string | null;
  blackOwnershipPercentage: number | null;
  blackYouthOwnershipPercentage: number | null;
  blackWomenOwnershipPercentage: number | null;
  disabledPersonOwnershipPercentage: number | null;
  
  // Physical Address (nullable)
  physicalStreet: string | null;
  physicalSuburb: string | null;
  physicalTownCity: string | null;
  physicalProvince: string | null;
  physicalPostalCode: string | null;
  physicalCountry: string | null;
  physicalLatitude: number | null;
  physicalLongitude: number | null;
  
  // Primary Contact (nullable)
  primaryContactFirstNames: string | null;
  primaryContactSurname: string | null;
  primaryContactPosition: string | null;
  primaryContactPhone: string | null;
  primaryContactEmail: string | null;
  primaryContactIdNumber: string | null;
  
  // Secondary Contact (nullable)
  secondaryContactFirstNames: string | null;
  secondaryContactSurname: string | null;
  secondaryContactPosition: string | null;
  secondaryContactPhone: string | null;
  secondaryContactEmail: string | null;
  secondaryContactIdNumber: string | null;
  
  // Status (nullable)
  approvalStatus: string | null;
  nsfasAccredited: boolean | null;
  nsfasAccreditedSince: string | null;
  accreditationExpiry: string | null;
  
  // Timestamps (nullable)
  createdAt: string | null;
  
  // Documents (URLs to uploaded files - nullable)
  documentIdCopy: string | null;
  documentCipcCertificate: string | null;
  documentBankLetter: string | null;
  documentProofOfAddress: string | null;
  documentTaxClearance: string | null;
  documentBbbeeCertificate: string | null;
  documentCompanyProfile: string | null;
}

export interface ProviderSyncResult {
  success: boolean;
  message: string;
  providerDataverseId?: string;      // Dataverse ID for the provider/account record
  error?: string;
}

/**
 * Maps legal form string to Dataverse provider type numeric value
 * Private Company = 0, Public Company = 1, Trust = 3, Sole Proprietor = 4, Non Profit Company = 5
 */
function mapLegalFormToProviderType(legalForm: string | undefined | null): number | null {
  if (!legalForm) return null;
  
  const normalizedForm = legalForm.toLowerCase().trim();
  
  if (normalizedForm.includes("public") && normalizedForm.includes("company")) {
    return 1;
  }
  if (normalizedForm.includes("trust")) {
    return 3;
  }
  if (normalizedForm.includes("sole") || normalizedForm.includes("proprietor")) {
    return 4;
  }
  if (normalizedForm.includes("non profit") || normalizedForm.includes("nonprofit") || normalizedForm.includes("npo") || normalizedForm.includes("npc")) {
    return 5;
  }
  // Default to Private Company (includes Pty Ltd, CC, etc.)
  return 0;
}

/**
 * Helper to find document URL by type from documents array
 */
function getDocumentUrl(documents: ProviderDocument[], type: string): string {
  const doc = documents.find(d => d.documentType === type);
  return doc?.fileUrl || "";
}

/**
 * Sync accommodation provider data to Power Automate Flow for D365 CRM
 * 
 * @param provider - AccommodationProvider data
 * @param userDataverseId - The Dataverse ID of the logged-in user (contact record)
 * @param physicalAddress - Physical address of the provider
 * @param primaryContact - Primary contact person
 * @param secondaryContact - Optional secondary contact person
 * @param documents - Provider documents array
 * @returns Promise<ProviderSyncResult>
 */
export async function syncProviderToCRM(
  provider: AccommodationProvider,
  userDataverseId: string,
  physicalAddress?: Address | null,
  primaryContact?: ProviderContactPerson | null,
  secondaryContact?: ProviderContactPerson | null,
  documents?: ProviderDocument[]
): Promise<ProviderSyncResult> {
  // Check if webhook URL is configured
  if (!DATAVERSE_PROVIDER_SYNC_URL) {
    return {
      success: false,
      message: "Provider CRM sync not configured",
      error: "DATAVERSE_PROVIDER_SYNC_URL environment variable not set",
    };
  }

  // Validate userDataverseId
  if (!userDataverseId) {
    return {
      success: false,
      message: "User Dataverse ID required",
      error: "The logged-in user must have a Dataverse ID to link the provider",
    };
  }

  try {
    // Helper to return null for empty/undefined values
    const toNullableString = (val: string | undefined | null): string | null => val || null;
    const toNullableNumber = (val: number | undefined | null): number | null => val ?? null;
    const toNullableDocUrl = (docs: ProviderDocument[], type: string): string | null => {
      const url = getDocumentUrl(docs, type);
      return url || null;
    };

    // Prepare payload for Power Automate
    const payload: ProviderSyncPayload = {
      // Required fields
      userDataverseId: String(userDataverseId),
      firebaseUserId: String(provider.userId || ""),
      firebaseProviderId: String(provider.providerId || ""),
      providerId: providerDisplayId(provider.providerId),
      companyName: String(provider.companyName || ""),
      
      // Company Information (nullable)
      tradingName: toNullableString(provider.tradingName),
      legalForm: toNullableString(provider.legalForm),
      providerType: mapLegalFormToProviderType(provider.legalForm),
      industryClassification: toNullableString(provider.industryClassification),
      companyRegistrationNumber: toNullableString(provider.companyRegistrationNumber),
      yearsInOperation: toNullableNumber(provider.yearsInOperation),
      
      // Campus & Contact Info (nullable)
      preferredInstitution: toNullableString((provider as any).preferredInstitution),
      preferredCampus: toNullableString((provider as any).preferredCampus),
      officeTelephone: toNullableString((provider as any).officeTelephone),
      website: toNullableString((provider as any).website),
      customerServiceEmail: toNullableString((provider as any).customerServiceEmail),
      
      // Tax Information (nullable)
      taxReferenceNumber: toNullableString(provider.taxReferenceNumber),
      vatRegistered: provider.vatRegistered === true ? 1 : (provider.vatRegistered === false ? 0 : null),
      vatNumber: toNullableString(provider.vatNumber),
      
      // Banking Information (nullable)
      bankName: toNullableString(provider.bankName),
      accountType: toNullableString(provider.accountType),
      accountNumber: toNullableString(provider.accountNumber),
      branchCode: toNullableString(provider.branchCode),
      accountHolder: toNullableString(provider.accountHolder),
      
      // B-BBEE Information (nullable)
      bbbeeLevel: toNullableNumber(provider.bbbeeLevel),
      bbbeeCertificateExpiry: toNullableString(provider.bbbeeCertificateExpiry),
      blackOwnershipPercentage: toNullableNumber(provider.blackOwnershipPercentage),
      blackYouthOwnershipPercentage: toNullableNumber(provider.blackYouthOwnershipPercentage),
      blackWomenOwnershipPercentage: toNullableNumber(provider.blackWomenOwnershipPercentage),
      disabledPersonOwnershipPercentage: toNullableNumber(provider.disabledPersonOwnershipPercentage),
      
      // Physical Address (nullable)
      physicalStreet: toNullableString(physicalAddress?.street),
      physicalSuburb: toNullableString(physicalAddress?.suburb),
      physicalTownCity: toNullableString(physicalAddress?.townCity),
      physicalProvince: toNullableString(physicalAddress?.province),
      physicalPostalCode: toNullableString(physicalAddress?.postalCode),
      physicalCountry: toNullableString(physicalAddress?.country),
      physicalLatitude: physicalAddress?.latitude ?? null,
      physicalLongitude: physicalAddress?.longitude ?? null,
      
      // Primary Contact (nullable)
      primaryContactFirstNames: toNullableString(primaryContact?.firstNames),
      primaryContactSurname: toNullableString(primaryContact?.surname),
      primaryContactPosition: toNullableString(primaryContact?.position),
      primaryContactPhone: toNullableString(primaryContact?.phoneNumber),
      primaryContactEmail: toNullableString(primaryContact?.email),
      primaryContactIdNumber: toNullableString(primaryContact?.idNumber),
      
      // Secondary Contact (nullable)
      secondaryContactFirstNames: toNullableString(secondaryContact?.firstNames),
      secondaryContactSurname: toNullableString(secondaryContact?.surname),
      secondaryContactPosition: toNullableString(secondaryContact?.position),
      secondaryContactPhone: toNullableString(secondaryContact?.phoneNumber),
      secondaryContactEmail: toNullableString(secondaryContact?.email),
      secondaryContactIdNumber: toNullableString(secondaryContact?.idNumber),
      
      // Status (nullable)
      approvalStatus: toNullableString(provider.approvalStatus),
      nsfasAccredited: provider.nsfasAccredited ?? null,
      nsfasAccreditedSince: toNullableString(provider.nsfasAccreditedSince),
      accreditationExpiry: toNullableString(provider.accreditationExpiry),
      
      // Timestamps (nullable)
      createdAt: provider.createdAt ? formatTimestamp(provider.createdAt) : null,
      
      // Documents (nullable)
      documentIdCopy: toNullableDocUrl(documents || [], "ID_COPY"),
      documentCipcCertificate: toNullableDocUrl(documents || [], "CIPC_COR14_3"),
      documentBankLetter: toNullableDocUrl(documents || [], "BANK_LETTER"),
      documentProofOfAddress: toNullableDocUrl(documents || [], "PROOF_OF_ADDRESS"),
      documentTaxClearance: toNullableDocUrl(documents || [], "TAX_CLEARANCE"),
      documentBbbeeCertificate: toNullableDocUrl(documents || [], "BBBEE_CERTIFICATE"),
      documentCompanyProfile: toNullableDocUrl(documents || [], "COMPANY_PROFILE"),
    };

    // Send to Power Automate webhook
    const response = await fetch(DATAVERSE_PROVIDER_SYNC_URL, {
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
        message: `Provider CRM sync failed: ${response.statusText}`,
        error: errorText,
      };
    }

    // Parse response - Power Automate returns { message: "OK", dataverseId: "..." }
    let responseData: { message?: string; dataverseId?: string; providerDataverseId?: string } = {};
    try {
      responseData = await response.json();
    } catch {
      // Response might not be JSON
      responseData = { message: "Sync completed" };
    }

    // Save dataverseId to Firestore if returned (handle both field names)
    const providerDataverseId = responseData.dataverseId || responseData.providerDataverseId;
    if (providerDataverseId && provider.providerId) {
      try {
        const providerRef = doc(db, "accommodationProviders", provider.providerId);
        await updateDoc(providerRef, { dataverseId: providerDataverseId });
        console.log("Saved providerDataverseId to Firestore:", providerDataverseId);
      } catch (updateError) {
        console.error("Failed to save providerDataverseId to Firestore:", updateError);
      }
    }

    return {
      success: true,
      message: "Provider synced to CRM successfully",
      providerDataverseId: providerDataverseId,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to sync provider to CRM",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync provider data to CRM in background (non-blocking)
 * Use this for provider application flow where we don't want to block the user
 */
export function syncProviderToCRMBackground(
  provider: AccommodationProvider,
  userDataverseId: string,
  physicalAddress?: Address | null,
  primaryContact?: ProviderContactPerson | null,
  secondaryContact?: ProviderContactPerson | null,
  documents?: ProviderDocument[]
): void {
  // Fire and forget - don't await
  syncProviderToCRM(provider, userDataverseId, physicalAddress, primaryContact, secondaryContact, documents)
    .then((result) => {
      if (result.success) {
        console.log("Provider synced to CRM:", result.providerDataverseId);
      } else {
        console.warn("Provider CRM sync failed:", result.error);
      }
    })
    .catch((err) => {
      console.error("Provider CRM sync error:", err);
    });
}

// ============================================================================
// PROPERTY SYNC
// ============================================================================

/**
 * Property Manager nested object for Dataverse sync
 */
export interface PropertyManagerPayload {
  name: string | null;
  idNumber: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Room Configuration nested object for Dataverse sync
 */
export interface RoomConfigurationPayload {
  // Room type counts
  bachelor: number;
  singleEnSuite: number;
  singleStandard: number;
  sharing2BedsEnSuite: number;
  sharing2BedsStandard: number;
  sharing3BedsEnSuite: number;
  sharing3BedsStandard: number;
  
  // Bed prices per month (in ZAR)
  bachelorPrice: number;
  singleEnSuitePrice: number;
  singleStandardPrice: number;
  sharing2BedsEnSuitePrice: number;
  sharing2BedsStandardPrice: number;
  sharing3BedsEnSuitePrice: number;
  sharing3BedsStandardPrice: number;
  
  // Calculated totals
  totalRooms: number;
  totalBeds: number;
  potentialRevenue: number;
}

/**
 * Payload for syncing property to Dataverse
 * Links property to the provider's Dataverse account record
 */
export interface PropertySyncPayload {
  // Link to existing Dataverse records
  providerDataverseId: string;       // The provider's Dataverse Account ID
  userDataverseId: string;           // The user's Dataverse Contact ID (who created the property)
  firebaseProviderId: string;        // Firebase providerId
  firebasePropertyId: string;        // Firebase propertyId
  
  // Property Information
  name: string;
  ownershipType: string;
  propertyType: string;
  institution: string;
  description: string;
  
  // Address (flattened)
  street: string;
  suburb: string;
  townCity: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  
  // Capacity
  totalBeds: number;
  availableBeds: number;
  
  // Pricing
  pricePerBedPerMonth: number;
  
  // Status
  status: string;
  nsfasApproved: boolean;
  
  // Property Manager (nested object)
  propertyManager: PropertyManagerPayload;
  
  // Room Configuration (nested object)
  roomConfiguration: RoomConfigurationPayload;
  
  // Amenities (comma-separated)
  amenities: string;
  
  // Image URLs (individual fields for simplicity)
  coverImageUrl: string | null;
  bedroomImageUrl: string | null;
  bathroomImageUrl: string | null;
  kitchenImageUrl: string | null;
  commonAreaImageUrl: string | null;
  exteriorImageUrl: string | null;
  
  // Document URLs (individual fields for each document type)
  documentTitleDeed: string | null;
  documentLeaseAgreement: string | null;
  documentComplianceCertificate: string | null;
  documentFireCertificate: string | null;
  documentInspectionReport: string | null;
  documentFloorPlan: string | null;
  documentZoningCertificate: string | null;
  documentElectricalCertificate: string | null;
  documentGasCertificate: string | null;
  documentOther: string | null;
  
  // Timestamps
  createdAt: string;
}

export interface PropertySyncResult {
  success: boolean;
  message: string;
  propertyDataverseId?: string;      // Dataverse ID for the property record
  error?: string;
}

/**
 * Helper to find property document URL by type from documents array
 */
function getPropertyDocumentUrl(documents: PropertyDocument[], type: string): string | null {
  const doc = documents.find(d => d.documentType === type);
  return doc?.fileUrl || null;
}

/**
 * Sync property data to Power Automate Flow for D365 CRM
 * 
 * @param property - Property data
 * @param providerDataverseId - The Dataverse ID of the accommodation provider (account record)
 * @param userDataverseId - The Dataverse ID of the user who created the property
 * @param address - Property address
 * @param documents - Property documents array
 * @param images - Property images array
 * @param roomConfig - Room configuration for the property
 * @returns Promise<PropertySyncResult>
 */
export async function syncPropertyToCRM(
  property: Property,
  providerDataverseId: string,
  userDataverseId: string,
  address?: Address | null,
  documents?: PropertyDocument[],
  images?: PropertyImage[],
  roomConfig?: RoomConfiguration | null
): Promise<PropertySyncResult> {
  // Check if webhook URL is configured
  if (!DATAVERSE_PROPERTY_SYNC_URL) {
    return {
      success: false,
      message: "Property CRM sync not configured",
      error: "DATAVERSE_PROPERTY_SYNC_URL environment variable not set",
    };
  }

  // Validate providerDataverseId
  if (!providerDataverseId) {
    return {
      success: false,
      message: "Provider Dataverse ID required",
      error: "The accommodation provider must have a Dataverse ID to link the property",
    };
  }

  try {
    // Helper to get first image URL by category (preferred) or caption fallback
    const getImageByCategory = (imgs: PropertyImage[], category: string): string | null => {
      // First try to find by category field
      const imgByCategory = imgs.find(i => i.category === category);
      if (imgByCategory?.imageUrl) return imgByCategory.imageUrl;
      // Fallback to caption matching
      const imgByCaption = imgs.find(i => i.caption?.toLowerCase().includes(category.toLowerCase()));
      return imgByCaption?.imageUrl || null;
    };

    // Prepare payload for Power Automate
    const payload: PropertySyncPayload = {
      // Link to Dataverse records
      providerDataverseId: String(providerDataverseId),
      userDataverseId: String(userDataverseId || ""),
      firebaseProviderId: String(property.providerId || ""),
      firebasePropertyId: String(property.propertyId || ""),
      
      // Property Information
      name: String(property.name || ""),
      ownershipType: String(property.ownershipType || ""),
      propertyType: String(property.propertyType || ""),
      institution: String(property.institution || ""),
      description: String(property.description || ""),
      
      // Address
      street: String(address?.street || ""),
      suburb: String(address?.suburb || ""),
      townCity: String(address?.townCity || ""),
      province: String(address?.province || ""),
      postalCode: String(address?.postalCode || ""),
      country: String(address?.country || "South Africa"),
      latitude: address?.latitude ?? null,
      longitude: address?.longitude ?? null,
      
      // Capacity
      totalBeds: Number(property.totalBeds || 0),
      availableBeds: Number(property.availableBeds || 0),
      
      // Pricing
      pricePerBedPerMonth: Number(property.pricePerBedPerMonth || 0),
      
      // Status
      status: String(property.status || "Draft"),
      nsfasApproved: Boolean(property.nsfasApproved === true),
      
      // Property Manager (nested object)
      propertyManager: {
        name: property.managerName || null,
        idNumber: property.managerId || null,
        email: property.managerEmail || null,
        phone: property.managerPhone || null,
      },
      
      // Room Configuration (nested object)
      roomConfiguration: {
        bachelor: roomConfig?.bachelor || 0,
        singleEnSuite: roomConfig?.singleEnSuite || 0,
        singleStandard: roomConfig?.singleStandard || 0,
        sharing2BedsEnSuite: roomConfig?.sharing2Beds_EnSuite || 0,
        sharing2BedsStandard: roomConfig?.sharing2Beds_Standard || 0,
        sharing3BedsEnSuite: roomConfig?.sharing3Beds_EnSuite || 0,
        sharing3BedsStandard: roomConfig?.sharing3Beds_Standard || 0,
        bachelorPrice: roomConfig?.bachelorPrice || 0,
        singleEnSuitePrice: roomConfig?.singleEnSuitePrice || 0,
        singleStandardPrice: roomConfig?.singleStandardPrice || 0,
        sharing2BedsEnSuitePrice: roomConfig?.sharing2Beds_EnSuitePrice || 0,
        sharing2BedsStandardPrice: roomConfig?.sharing2Beds_StandardPrice || 0,
        sharing3BedsEnSuitePrice: roomConfig?.sharing3Beds_EnSuitePrice || 0,
        sharing3BedsStandardPrice: roomConfig?.sharing3Beds_StandardPrice || 0,
        totalRooms: roomConfig?.totalRooms || 0,
        totalBeds: roomConfig?.totalBeds || 0,
        potentialRevenue: roomConfig?.potentialRevenue || 0,
      },
      
      // Amenities (convert array to comma-separated string)
      amenities: Array.isArray(property.amenities) ? property.amenities.join(", ") : "",
      
      // Image URLs (individual fields - use category field for matching)
      coverImageUrl: property.coverImageUrl || (images && images.length > 0 ? images.find(i => i.isCover)?.imageUrl : null) || null,
      bedroomImageUrl: getImageByCategory(images || [], "bedroom") || null,
      bathroomImageUrl: getImageByCategory(images || [], "bathroom") || null,
      kitchenImageUrl: getImageByCategory(images || [], "kitchen") || null,
      commonAreaImageUrl: getImageByCategory(images || [], "common") || null,
      exteriorImageUrl: getImageByCategory(images || [], "exterior") || null,
      
      // Document URLs (individual fields for each document type)
      documentTitleDeed: getPropertyDocumentUrl(documents || [], "TITLE_DEED"),
      documentLeaseAgreement: getPropertyDocumentUrl(documents || [], "LEASE_AGREEMENT"),
      documentComplianceCertificate: getPropertyDocumentUrl(documents || [], "COMPLIANCE_CERTIFICATE"),
      documentFireCertificate: getPropertyDocumentUrl(documents || [], "FIRE_CERTIFICATE"),
      documentInspectionReport: getPropertyDocumentUrl(documents || [], "INSPECTION_REPORT"),
      documentFloorPlan: getPropertyDocumentUrl(documents || [], "FLOOR_PLAN"),
      documentZoningCertificate: getPropertyDocumentUrl(documents || [], "ZONING_CERTIFICATE"),
      documentElectricalCertificate: getPropertyDocumentUrl(documents || [], "ELECTRICAL_CERTIFICATE"),
      documentGasCertificate: getPropertyDocumentUrl(documents || [], "GAS_CERTIFICATE"),
      documentOther: getPropertyDocumentUrl(documents || [], "OTHER"),
      
      // Timestamps
      createdAt: property.createdAt ? formatTimestamp(property.createdAt) : new Date().toISOString(),
    };

    // Send to Power Automate webhook
    const response = await fetch(DATAVERSE_PROPERTY_SYNC_URL, {
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
        message: `Property CRM sync failed: ${response.statusText}`,
        error: errorText,
      };
    }

    // Parse response - Power Automate returns { message: "OK", propertyDataverseId: "..." }
    let responseData: { message?: string; propertyDataverseId?: string } = {};
    try {
      responseData = await response.json();
    } catch {
      responseData = { message: "Sync completed" };
    }

    // Save propertyDataverseId to Firestore if returned
    const propertyDataverseId = responseData.propertyDataverseId;
    if (propertyDataverseId && property.propertyId && property.providerId) {
      try {
        // Properties are stored in subcollection: accommodationProviders/{providerId}/properties/{propertyId}
        const propertyRef = doc(db, "accommodationProviders", property.providerId, "properties", property.propertyId);
        await updateDoc(propertyRef, { dataverseId: propertyDataverseId });
        console.log("Saved propertyDataverseId to Firestore:", propertyDataverseId);
      } catch (updateError) {
        console.error("Failed to save propertyDataverseId to Firestore:", updateError);
      }
    }

    return {
      success: true,
      message: "Property synced to CRM successfully",
      propertyDataverseId: propertyDataverseId,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to sync property to CRM",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync property data to CRM in background (non-blocking)
 */
export function syncPropertyToCRMBackground(
  property: Property,
  providerDataverseId: string,
  userDataverseId: string,
  address?: Address | null,
  documents?: PropertyDocument[],
  images?: PropertyImage[],
  roomConfig?: RoomConfiguration | null
): void {
  syncPropertyToCRM(property, providerDataverseId, userDataverseId, address, documents, images, roomConfig)
    .then((result) => {
      if (result.success) {
        console.log("Property synced to CRM:", result.propertyDataverseId);
      } else {
        console.warn("Property CRM sync failed:", result.error);
      }
    })
    .catch((err) => {
      console.error("Property CRM sync error:", err);
    });
}

// ============================================================================
// STUDENT SYNC
// ============================================================================

/**
 * Payload for syncing student to Dataverse
 * Links student to property and provider
 */
export interface StudentSyncPayload {
  // Link to existing Dataverse records
  propertyDataverseId: string;       // The property's Dataverse ID where student is assigned
  providerDataverseId: string;       // The provider's Dataverse Account ID
  userDataverseId: string;           // The user's Dataverse Contact ID (who assigned the student)
  firebaseStudentId: string;         // Firebase studentId
  firebasePropertyId: string;        // Firebase propertyId
  firebaseProviderId: string;        // Firebase providerId
  
  // Personal Information
  idNumber: string;
  firstNames: string;
  surname: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: number;                    // 0 = Male, 1 = Female
  
  // Academic Information
  institution: string;
  studentNumber: string;
  program: string;
  yearOfStudy: number;
  
  // NSFAS Information
  nsfasNumber: string;
  funded: boolean;
  nsfasFunded: boolean;              // Explicit indicator for NSFAS vs non-NSFAS routing
  nsfasDataverseId: string;          // Dataverse ID from NSFAS lookup
  fundedAmount: number;
  fundingYear: number;
  
  // Assignment Information
  assignmentId: string;
  roomId: string;
  bedId: string;
  startDate: string;
  endDate: string;
  monthlyRate: number;
  assignmentStatus: string;
  
  // Status
  studentStatus: string;
  
  // Timestamps
  createdAt: string;
}

export interface StudentSyncResult {
  success: boolean;
  message: string;
  studentDataverseId?: string;       // Dataverse ID for the student record
  error?: string;
}

/**
 * Sync student data to Power Automate Flow for D365 CRM
 * 
 * @param student - Student data
 * @param assignment - Student property assignment data
 * @param propertyDataverseId - The Dataverse ID of the property
 * @param providerDataverseId - The Dataverse ID of the accommodation provider
 * @param userDataverseId - The Dataverse ID of the user who assigned the student
 * @param firebaseProviderId - Firebase provider ID
 * @returns Promise<StudentSyncResult>
 */
export async function syncStudentToCRM(
  student: Student,
  assignment: StudentPropertyAssignment | null,
  propertyDataverseId: string,
  providerDataverseId: string,
  userDataverseId: string,
  firebaseProviderId: string
): Promise<StudentSyncResult> {
  // Check if webhook URL is configured
  if (!DATAVERSE_STUDENT_SYNC_URL) {
    return {
      success: false,
      message: "Student CRM sync not configured",
      error: "DATAVERSE_STUDENT_SYNC_URL environment variable not set",
    };
  }

  // Validate propertyDataverseId
  if (!propertyDataverseId) {
    return {
      success: false,
      message: "Property Dataverse ID required",
      error: "The property must have a Dataverse ID to link the student",
    };
  }

  try {
    // Helper to convert gender string to integer (0 = Male, 1 = Female)
    const getGenderCode = (gender: string | undefined): number => {
      if (!gender) return 0;
      const g = gender.toLowerCase();
      if (g === "female" || g === "f") return 1;
      return 0;
    };

    // Prepare payload for Power Automate
    const payload: StudentSyncPayload = {
      // Link to Dataverse records
      propertyDataverseId: String(propertyDataverseId),
      providerDataverseId: String(providerDataverseId || ""),
      userDataverseId: String(userDataverseId || ""),
      firebaseStudentId: String(student.studentId || ""),
      firebasePropertyId: String(assignment?.propertyId || ""),
      firebaseProviderId: String(firebaseProviderId || ""),
      
      // Personal Information
      idNumber: String(student.idNumber || ""),
      firstNames: String(student.firstNames || ""),
      surname: String(student.surname || ""),
      email: String(student.email || ""),
      phoneNumber: String(student.phoneNumber || ""),
      dateOfBirth: String(student.dateOfBirth || ""),
      gender: getGenderCode(student.gender),
      
      // Academic Information
      institution: String(student.institution || ""),
      studentNumber: String(student.studentNumber || ""),
      program: String(student.program || ""),
      yearOfStudy: Number(student.yearOfStudy || 0),
      
      // NSFAS Information
      nsfasNumber: String(student.nsfasNumber || ""),
      funded: Boolean(student.funded === true),
      nsfasFunded: Boolean(student.nsfasFunded === true || student.funded === true),
      nsfasDataverseId: String(student.nsfasDataverseId || ""),
      fundedAmount: Number(student.fundedAmount || 0),
      fundingYear: Number(student.fundingYear || 0),
      
      // Assignment Information
      assignmentId: String(assignment?.assignmentId || ""),
      roomId: String(assignment?.roomId || ""),
      bedId: String(assignment?.bedId || ""),
      startDate: String(assignment?.startDate || ""),
      endDate: String(assignment?.endDate || ""),
      monthlyRate: Number(assignment?.monthlyRate || 0),
      assignmentStatus: String(assignment?.status || ""),
      
      // Status
      studentStatus: String(student.status || "Pending"),
      
      // Timestamps
      createdAt: student.createdAt ? formatTimestamp(student.createdAt) : new Date().toISOString(),
    };

    // Send to Power Automate webhook
    const response = await fetch(DATAVERSE_STUDENT_SYNC_URL, {
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
        message: `Student CRM sync failed: ${response.statusText}`,
        error: errorText,
      };
    }

    // Parse response - Power Automate returns { message: "OK", studentDataverseId: "..." }
    let responseData: { message?: string; studentDataverseId?: string } = {};
    try {
      responseData = await response.json();
    } catch {
      responseData = { message: "Sync completed" };
    }

    // Save studentDataverseId to Firestore if returned
    const studentDataverseId = responseData.studentDataverseId;
    if (studentDataverseId && student.studentId) {
      try {
        const studentRef = doc(db, "students", student.studentId);
        await updateDoc(studentRef, { dataverseId: studentDataverseId });
        console.log("Saved studentDataverseId to Firestore:", studentDataverseId);
      } catch (updateError) {
        console.error("Failed to save studentDataverseId to Firestore:", updateError);
      }
    }

    return {
      success: true,
      message: "Student synced to CRM successfully",
      studentDataverseId: studentDataverseId,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to sync student to CRM",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync student data to CRM in background (non-blocking)
 */
export function syncStudentToCRMBackground(
  student: Student,
  assignment: StudentPropertyAssignment | null,
  propertyDataverseId: string,
  providerDataverseId: string,
  userDataverseId: string,
  firebaseProviderId: string
): void {
  syncStudentToCRM(student, assignment, propertyDataverseId, providerDataverseId, userDataverseId, firebaseProviderId)
    .then((result) => {
      if (result.success) {
        console.log("Student synced to CRM:", result.studentDataverseId);
      } else {
        console.warn("Student CRM sync failed:", result.error);
      }
    })
    .catch((err) => {
      console.error("Student CRM sync error:", err);
    });
}
