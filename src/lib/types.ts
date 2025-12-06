import { Timestamp } from "firebase/firestore";

export type UserType = "student" | "provider" | "admin";

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userType: UserType;
  studentId?: string;
  institution?: string;
  program?: string;
  yearOfStudy?: string;
  status?: string;
  applicationStatus?: string;
  crmSynced?: boolean;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  // Provider-specific fields
  companyName?: string;
  companyRegistration?: string;
  nsfasAccredited?: boolean;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
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
