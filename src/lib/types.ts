import { Timestamp } from "firebase/firestore";

export type UserType = "student" | "provider" | "admin";
export type UserRole = "student" | "provider" | "admin";

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
  
  // Address reference (new schema)
  addressId?: string;
  
  // Roles and status
  userType?: UserType;               // Legacy: single type
  roles?: UserRole[];                // New schema: multiple roles
  status?: string;
  applicationStatus?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  marketingConsent?: boolean;
  
  // Timestamps
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  
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
  address?: string;
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
