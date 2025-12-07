import { Timestamp } from "firebase/firestore";
import { RoleCode, RoleName } from "./roleCodes";

export type UserType = "student" | "provider" | "admin";
export type UserRole = "student" | "provider" | "admin" | "manager" | "supervisor" | "registrar" | "administrator" | string;

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
export type { RoleCode, RoleName };

// Address embedded in User document
export interface UserAddress {
  street: string;
  suburb?: string;
  townCity: string;
  province: string;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface User {
  // Primary identifiers (support both old and new schema)
  uid: string;                       // Legacy: Firebase Auth UID
  userId?: string;                   // New schema: same as uid
  email: string;

  // Personal info (support both naming conventions)
  firstName?: string;                // Legacy
  lastName?: string;                 // Legacy
  firstNames?: string;               // New schema
  surname?: string;                  // New schema
  phone?: string;                    // Legacy
  phoneNumber?: string;              // New schema
  idNumber?: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other";
  profilePhotoUrl?: string;
  idDocumentUrl?: string;            // URL to uploaded ID document (PDF)

  // Address (new schema - embedded object)
  address?: UserAddress;

  // Legacy address reference (deprecated)
  addressId?: string;
  
  // Roles and status
  userType?: UserType;               // Legacy: single type
  role?: UserRole;                   // New schema: single role (string)
  roleCode?: number;                 // New schema: numeric role code (0-6)
  roles?: UserRole[];                // Deprecated: use role instead
  status?: string;
  applicationStatus?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  marketingConsent?: boolean;
  
  // Timestamps
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastLoginAt?: Timestamp;
  lastLogoutAt?: Timestamp;
  
  // CRM sync
  crmSynced?: boolean;
  
  // Legacy provider fields (kept for backward compatibility)
  providerName?: string;
  providerType?: string;
  yearsInOperation?: number | null;
  companyRegistrationNumber?: string;
  vatRegistration?: string;
  taxNumber?: string;
  vatNumber?: string;
  bbbeeExpiry?: string;
  bbbeeLevel?: number | null;
  womenOwnershipPercentage?: number | null;
  disabilityOwnershipPercentage?: number | null;
  blackOwnershipPercentage?: number | null;
  youthOwnershipPercentage?: number | null;
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
  nsfasAccreditedSince?: string;
  accreditationExpiry?: string;
  companyName?: string;
  companyRegistration?: string;
  nsfasAccredited?: boolean;
  legacyAddress?: string;            // Legacy: string address (use address object instead)
  postalCode?: string;
  
  // Student-specific fields
  studentId?: string;
  institution?: string;
  program?: string;
  yearOfStudy?: string;
}

export interface Property {
  id: string;
  providerId: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  description?: string;
  totalRooms: number;
  availableRooms: number;
  pricePerMonth: number;
  amenities: string[];
  images: string[];
  nsfasApproved: boolean;
  status: "active" | "inactive" | "pending";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Student {
  id: string;
  userId: string;
  propertyId?: string;
  roomNumber?: string;
  leaseStartDate?: Timestamp;
  leaseEndDate?: Timestamp;
  nsfasVerified: boolean;
  nsfasNumber?: string;
  status: "pending" | "approved" | "allocated" | "inactive";
  documents?: StudentDocument[];
}

export interface StudentDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Timestamp;
}

export interface Invoice {
  id: string;
  providerId: string;
  propertyId: string;
  studentId?: string;
  month: string;
  year: number;
  amount: number;
  status: "draft" | "submitted" | "approved" | "paid" | "rejected";
  submittedAt?: Timestamp;
  approvedAt?: Timestamp;
  paidAt?: Timestamp;
  notes?: string;
}

export interface Ticket {
  id: string;
  userId: string;
  userType: UserType;
  subject: string;
  description: string;
  category: "technical" | "billing" | "property" | "student" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  resolvedAt?: Timestamp;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  userId: string;
  message: string;
  createdAt: Timestamp;
  isStaff: boolean;
}

export interface DashboardStats {
  totalProperties: number;
  totalStudents: number;
  occupancyRate: number;
  pendingInvoices: number;
  openTickets: number;
  monthlyRevenue: number;
}
