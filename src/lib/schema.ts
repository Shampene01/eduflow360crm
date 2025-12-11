/**
 * NORMALIZED DATABASE SCHEMA
 * 
 * This schema implements a fully normalized data model for:
 * - User onboarding (natural persons only)
 * - Accommodation Provider registration + approval workflow
 * - Property creation and configuration
 * - Student assignment to properties/rooms/beds
 * 
 * Collections:
 * - users (natural persons)
 * - addresses (shared address table)
 * - accommodationProviders
 * - providerContactPersons
 * - providerDocuments
 * - properties
 * - roomConfigurations
 * - propertyRooms
 * - propertyBeds
 * - students
 * - studentPropertyAssignments
 */

import { Timestamp } from "firebase/firestore";

// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = "provider" | "student" | "admin" | "manager" | "supervisor" | "registrar" | "administrator";

/**
 * Role Code Reference:
 * - 0: Student
 * - 1: Manager
 * - 2: Provider
 * - 3: Admin
 * - 4: Supervisor
 * - 5: Registrar
 * - 6: Administrator
 */

export type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export type LegalForm = 
  | "Private Company" 
  | "Public Company" 
  | "Close Corporation" 
  | "Sole Proprietor" 
  | "Partnership" 
  | "Trust" 
  | "NGO" 
  | "Communal Property Association";

export type DocumentType = 
  | "ID_COPY" 
  | "PROOF_OF_ADDRESS" 
  | "BANK_LETTER" 
  | "CIPC_COR14_3" 
  | "CIPC_COR39"
  | "TAX_CLEARANCE" 
  | "BBBEE_CERTIFICATE" 
  | "COMPANY_PROFILE"
  | "OTHER";

export type OwnershipType = "Owned" | "Leased";

export type PropertyType = 
  | "Student Residence" 
  | "Apartment Block" 
  | "House" 
  | "Commune" 
  | "Other";

export type RoomType = 
  | "Bachelor" 
  | "Single En-Suite" 
  | "Single Standard" 
  | "Sharing 2 Beds En-Suite" 
  | "Sharing 2 Beds Standard" 
  | "Sharing 3 Beds En-Suite" 
  | "Sharing 3 Beds Standard";

export type BedStatus = "Available" | "Occupied" | "Maintenance" | "Reserved";

export type AssignmentStatus = "Active" | "Future" | "Closed" | "Cancelled";

export type AccountType = "Current" | "Savings" | "Transmission";

// Platform Resource Categories (based on Resources page structure)
export type ResourceCategory = 
  | "Guides & Tutorials"
  | "Templates & Forms"
  | "Policies & Regulations";

export type ResourceSubCategory = 
  // Guides & Tutorials
  | "Onboarding"
  | "Compliance"
  | "Safety"
  | "Billing"
  | "Property Management"
  // Templates & Forms
  | "Legal"
  | "Financial"
  | "Operations"
  // Policies & Regulations
  | "Accreditation"
  | "System";

export type ResourceFileType = "pdf" | "docx" | "xlsx" | "video";

// ============================================================================
// 1. USER TABLE (Natural Person Only)
// ============================================================================

// Address embedded in User document
export interface UserAddress {
  street: string;
  suburb?: string;
  townCity: string;
  province: string;
  postalCode?: string;
  country: string;                   // Default: "South Africa"
  latitude?: number;
  longitude?: number;
}

export interface User {
  userId: string;                    // UUID, PK (same as Firebase Auth UID)
  email: string;
  phoneNumber?: string;
  firstNames: string;
  surname: string;
  idNumber?: string;
  dateOfBirth?: string;              // ISO date string
  gender?: "Male" | "Female" | "Other";
  profilePhotoUrl?: string;
  idDocumentUrl?: string;            // URL to uploaded ID document (PDF)
  address?: UserAddress;             // Embedded address object
  addressId?: string;                // Legacy: FK to Address table
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lastLoginAt?: Timestamp;
  lastLogoutAt?: Timestamp;
  marketingConsent: boolean;
  role: UserRole;                    // Single role string
  roleCode?: number;                 // Numeric role code (0-6)
  roles?: UserRole[];                // Legacy: array of roles (deprecated, use role)

  // System fields
  isActive: boolean;
  emailVerified: boolean;
}

// ============================================================================
// 2. ADDRESS TABLE (Shared - for other entities like providers)
// ============================================================================

export interface Address {
  addressId: string;                 // UUID, PK
  street: string;
  suburb?: string;
  townCity: string;
  province: string;
  postalCode?: string;
  country: string;                   // Default: "South Africa"
  latitude?: number;
  longitude?: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// 3. ACCOMMODATION PROVIDER TABLE
// ============================================================================

export interface AccommodationProvider {
  providerId: string;                // UUID, PK
  userId: string;                    // FK → Users (the natural person who owns/manages)
  
  // Company Information
  companyName: string;
  tradingName?: string;
  legalForm: LegalForm;
  industryClassification?: string;
  companyRegistrationNumber?: string;
  yearsInOperation?: number;
  
  // Tax Information
  taxReferenceNumber?: string;
  vatRegistered: boolean;
  vatNumber?: string;
  
  // Banking Information
  bankName?: string;
  accountType?: AccountType;
  accountNumber?: string;
  branchCode?: string;
  accountHolder?: string;
  
  // B-BBEE Information
  bbbeeLevel?: number;               // 1-8
  bbbeeCertificateExpiry?: string;   // ISO date
  blackOwnershipPercentage?: number;
  blackYouthOwnershipPercentage?: number;
  blackWomenOwnershipPercentage?: number;
  disabledPersonOwnershipPercentage?: number;
  
  // Address
  physicalAddressId?: string;        // FK → Address
  postalAddressId?: string;          // FK → Address (if different)
  
  // Approval Workflow
  approvalStatus: ApprovalStatus;
  approvalTimestamp?: Timestamp;
  approvedBy?: string;               // Admin userId
  rejectionReason?: string;
  
  // Accreditation
  nsfasAccredited: boolean;
  nsfasAccreditedSince?: string;
  accreditationExpiry?: string;
  
  // CRM Sync
  dataverseId?: string;              // Dataverse account ID (returned from Power Automate)
  
  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// 4. PROVIDER CONTACT PERSONS TABLE
// ============================================================================

export interface ProviderContactPerson {
  contactId: string;                 // UUID, PK
  providerId: string;                // FK → AccommodationProvider
  
  firstNames: string;
  surname: string;
  position?: string;
  phoneNumber: string;
  email: string;
  idNumber?: string;
  
  isPrimary: boolean;                // Primary contact flag
  isActive: boolean;
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// 5. PROVIDER DOCUMENTS TABLE
// ============================================================================

export interface ProviderDocument {
  documentId: string;                // UUID, PK
  providerId: string;                // FK → AccommodationProvider
  
  documentType: DocumentType;
  documentName: string;              // Original filename
  fileUrl: string;                   // Storage URL
  fileSize?: number;                 // Bytes
  mimeType?: string;
  
  uploadedAt: Timestamp;
  uploadedBy: string;                // userId
  
  // Verification
  verified: boolean;
  verifiedAt?: Timestamp;
  verifiedBy?: string;               // Admin userId
  verificationNotes?: string;
  
  // Expiry tracking
  expiryDate?: string;               // ISO date
  isExpired?: boolean;
}

// ============================================================================
// 6. PROPERTY TABLE
// ============================================================================

export interface Property {
  propertyId: string;                // UUID, PK
  providerId: string;                // FK → AccommodationProvider
  
  name: string;
  ownershipType: OwnershipType;
  propertyType: PropertyType;
  institution?: string;              // Nearby university/college
  description?: string;
  
  // Address
  addressId: string;                 // FK → Address

  // Property Manager
  managerName?: string;              // Property manager full name
  managerId?: string;                // Property manager ID number
  managerEmail?: string;             // Property manager email
  managerPhone?: string;             // Property manager phone number

  // Media
  coverImageUrl?: string;

  // Capacity (calculated from rooms/beds)
  totalRooms?: number;
  totalBeds?: number;
  availableBeds?: number;

  // Pricing
  pricePerBedPerMonth?: number;
  
  // Status
  status: "Draft" | "Pending" | "Active" | "Inactive" | "Suspended";
  nsfasApproved: boolean;
  
  // Amenities
  amenities?: string[];
  
  // CRM Sync
  dataverseId?: string;              // Dataverse property ID (returned from Power Automate)
  
  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// 7. ROOM CONFIGURATION TABLE
// ============================================================================

export interface RoomConfiguration {
  configId: string;                  // UUID, PK
  providerId: string;                // FK → Provider (needed for Firestore rules)
  propertyId: string;                // FK → Property

  // Room type counts
  bachelor: number;
  singleEnSuite: number;
  singleStandard: number;
  sharing2Beds_EnSuite: number;
  sharing2Beds_Standard: number;
  sharing3Beds_EnSuite: number;
  sharing3Beds_Standard: number;

  // Bed prices per month (in ZAR)
  bachelorPrice: number;
  singleEnSuitePrice: number;
  singleStandardPrice: number;
  sharing2Beds_EnSuitePrice: number;
  sharing2Beds_StandardPrice: number;
  sharing3Beds_EnSuitePrice: number;
  sharing3Beds_StandardPrice: number;
  
  // Calculated totals
  totalRooms: number;
  totalBeds: number;
  potentialRevenue: number;          // Total monthly revenue if fully occupied
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// 8. PROPERTY ROOMS TABLE
// ============================================================================

export interface PropertyRoom {
  roomId: string;                    // UUID, PK
  propertyId: string;                // FK → Property
  
  roomType: RoomType;
  roomNumber: string;                // e.g., "101", "A1"
  floor?: number;
  numberOfBeds: number;
  
  // Amenities specific to room
  hasEnSuite: boolean;
  amenities?: string[];
  
  // Status
  status: "Available" | "Full" | "Maintenance" | "Inactive";
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// 8b. PROPERTY BEDS TABLE
// ============================================================================

export interface PropertyBed {
  bedId: string;                     // UUID, PK
  roomId: string;                    // FK → PropertyRoom
  propertyId: string;                // FK → Property (denormalized for queries)
  
  bedLabel: string;                  // e.g., "A", "B", "1", "2"
  status: BedStatus;
  
  // Current occupant (denormalized for quick lookup)
  currentStudentId?: string;
  currentAssignmentId?: string;
  
  pricePerMonth?: number;            // Override property-level pricing
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// 9. STUDENT TABLE
// ============================================================================

export interface Student {
  studentId: string;                 // UUID, PK
  userId?: string;                   // FK → Users (optional, if student has account)
  
  // Personal Information
  idNumber: string;
  firstNames: string;
  surname: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other";
  
  // Academic Information
  institution?: string;
  studentNumber?: string;
  program?: string;
  yearOfStudy?: number;
  
  // NSFAS Information
  nsfasNumber?: string;
  funded: boolean;
  fundedAmount?: number;
  fundingYear?: number;
  
  // Next of Kin Information
  nextOfKinName?: string;
  nextOfKinRelationship?: string;
  nextOfKinPhone?: string;
  nextOfKinEmail?: string;
  nextOfKinAddress?: string;
  
  // Address
  homeAddressId?: string;            // FK → Address
  
  // Status
  status: "Pending" | "Verified" | "Active" | "Inactive" | "Graduated";
  
  // CRM Sync
  dataverseId?: string;              // Dataverse student ID (returned from Power Automate)
  
  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// 10. STUDENT PROPERTY ASSIGNMENT TABLE
// ============================================================================

export interface StudentPropertyAssignment {
  assignmentId: string;              // UUID, PK
  studentId: string;                 // FK → Student
  propertyId: string;                // FK → Property
  roomId?: string;                   // FK → PropertyRoom (optional)
  bedId?: string;                    // FK → PropertyBed (optional)
  
  // Assignment Period
  startDate: string;                 // ISO date
  endDate?: string;                  // ISO date
  
  // Status
  status: AssignmentStatus;
  
  // Financial
  monthlyRate?: number;
  
  // Audit
  createdBy: string;                 // userId who created assignment
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  closedAt?: Timestamp;
  closedBy?: string;
  closureReason?: string;
}

// ============================================================================
// PROPERTY DOCUMENTS TABLE (for property-specific documents)
// ============================================================================

export interface PropertyDocument {
  documentId: string;                // UUID, PK
  propertyId: string;                // FK → Property
  
  documentType: "LEASE_AGREEMENT" | "COMPLIANCE_CERTIFICATE" | "FLOOR_PLAN" | "OTHER";
  documentName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  
  uploadedAt: Timestamp;
  uploadedBy: string;
  
  verified: boolean;
  verifiedAt?: Timestamp;
  verifiedBy?: string;
}

// ============================================================================
// PROPERTY IMAGES TABLE
// ============================================================================

export interface PropertyImage {
  imageId: string;                   // UUID, PK
  propertyId: string;                // FK → Property
  
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  sortOrder: number;
  isCover: boolean;
  
  uploadedAt: Timestamp;
  uploadedBy: string;
}

// ============================================================================
// 11. PLATFORM RESOURCES TABLE
// ============================================================================

export interface PlatformResource {
  resourceId: string;                // UUID, PK
  
  // Resource Information
  title: string;
  description: string;
  category: ResourceCategory;
  subCategory: ResourceSubCategory;
  fileType: ResourceFileType;
  
  // File Information
  fileUrl: string;                   // Storage URL
  fileName: string;                  // Original filename
  fileSize: number;                  // Bytes
  mimeType: string;
  
  // Metadata
  predefinedResourceId?: string;     // Links to predefined resource (e.g., "guide-1", "template-1")
  duration?: string;                 // e.g., "15 min read", "8 min" for videos
  effectiveDate?: string;            // ISO date for policies
  isNew?: boolean;                   // Flag for new resources
  isUpdated?: boolean;               // Flag for updated resources
  downloadCount: number;             // Track downloads
  
  // Upload Information
  uploadedBy: string;                // userId
  uploadedByEmail: string;           // Email of uploader
  uploadedAt: Timestamp;
  updatedAt?: Timestamp;
  
  // Status
  isActive: boolean;
}

// ============================================================================
// HELPER TYPES FOR API RESPONSES
// ============================================================================

// Provider with all related data
export interface ProviderWithDetails extends AccommodationProvider {
  user?: User;
  physicalAddress?: Address;
  postalAddress?: Address;
  contacts?: ProviderContactPerson[];
  documents?: ProviderDocument[];
  properties?: Property[];
}

// Property with all related data
export interface PropertyWithDetails extends Property {
  address?: Address;
  provider?: AccommodationProvider;
  roomConfiguration?: RoomConfiguration;
  rooms?: PropertyRoom[];
  images?: PropertyImage[];
  documents?: PropertyDocument[];
}

// Student with assignment details
export interface StudentWithAssignment extends Student {
  currentAssignment?: StudentPropertyAssignment;
  property?: Property;
  room?: PropertyRoom;
  bed?: PropertyBed;
}

// ============================================================================
// COLLECTION NAMES (for Firestore)
// ============================================================================

export const COLLECTIONS = {
  // Top-level collections
  USERS: "users",
  ADDRESSES: "addresses",
  ACCOMMODATION_PROVIDERS: "accommodationProviders",
  PROVIDER_CONTACT_PERSONS: "providerContactPersons",
  PROVIDER_DOCUMENTS: "providerDocuments",
  STUDENTS: "students",
  STUDENT_PROPERTY_ASSIGNMENTS: "studentPropertyAssignments",
  
  // Subcollections under providers/{providerId}/
  // Use SUBCOLLECTIONS helper functions below
  PROPERTIES: "properties",  // providers/{providerId}/properties
  
  // Subcollections under properties (nested under provider)
  // providers/{providerId}/properties/{propertyId}/rooms
  // providers/{providerId}/properties/{propertyId}/beds
  // providers/{providerId}/properties/{propertyId}/images
  // providers/{providerId}/properties/{propertyId}/documents
  PROPERTY_ROOMS: "rooms",
  PROPERTY_BEDS: "beds",
  PROPERTY_DOCUMENTS: "documents",
  PROPERTY_IMAGES: "images",
  ROOM_CONFIGURATIONS: "roomConfigurations",  // Can stay top-level or move to property subcollection
  
  // Legacy
  INVOICES: "invoices",
  TICKETS: "tickets",
  
  // Platform Resources
  PLATFORM_RESOURCES: "platformResources",
} as const;

// ============================================================================
// SUBCOLLECTION PATH HELPERS
// ============================================================================

/**
 * Get the path to a provider's properties subcollection
 */
export function getPropertiesPath(providerId: string): string {
  return `${COLLECTIONS.ACCOMMODATION_PROVIDERS}/${providerId}/${COLLECTIONS.PROPERTIES}`;
}

/**
 * Get the path to a specific property document
 */
export function getPropertyPath(providerId: string, propertyId: string): string {
  return `${COLLECTIONS.ACCOMMODATION_PROVIDERS}/${providerId}/${COLLECTIONS.PROPERTIES}/${propertyId}`;
}

/**
 * Get the path to a property's rooms subcollection
 */
export function getPropertyRoomsPath(providerId: string, propertyId: string): string {
  return `${getPropertyPath(providerId, propertyId)}/${COLLECTIONS.PROPERTY_ROOMS}`;
}

/**
 * Get the path to a property's beds subcollection
 */
export function getPropertyBedsPath(providerId: string, propertyId: string): string {
  return `${getPropertyPath(providerId, propertyId)}/${COLLECTIONS.PROPERTY_BEDS}`;
}

/**
 * Get the path to a property's images subcollection
 */
export function getPropertyImagesPath(providerId: string, propertyId: string): string {
  return `${getPropertyPath(providerId, propertyId)}/${COLLECTIONS.PROPERTY_IMAGES}`;
}

/**
 * Get the path to a property's documents subcollection
 */
export function getPropertyDocumentsPath(providerId: string, propertyId: string): string {
  return `${getPropertyPath(providerId, propertyId)}/${COLLECTIONS.PROPERTY_DOCUMENTS}`;
}

/**
 * Get the path to a property's room configuration subcollection
 * Note: Each property has exactly one room configuration document
 */
export function getRoomConfigurationPath(providerId: string, propertyId: string): string {
  return `${getPropertyPath(providerId, propertyId)}/${COLLECTIONS.ROOM_CONFIGURATIONS}`;
}

// ============================================================================
// LEGACY TYPE MAPPING (for backward compatibility during migration)
// ============================================================================

export interface LegacyUser {
  uid: string;
  email: string;
  userType: "student" | "provider" | "admin";
  // ... all the old fields
  providerName?: string;
  primaryContactName?: string;
  // etc.
}
