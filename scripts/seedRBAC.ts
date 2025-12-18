/**
 * RBAC Seed Script
 * 
 * This script initializes the /system/rbac document in Firestore
 * with all role definitions and permissions.
 * 
 * Run with: npx ts-node scripts/seedRBAC.ts
 * Or import and call seedRBAC() from a Cloud Function
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp({
    credential: cert("./serviceAccountKey.json"),
  });
}

const db = getFirestore();

/**
 * Complete RBAC configuration matching EduFlow360-RBAC-System.md
 */
const RBAC_CONFIG = {
  version: "1.0.0",
  updatedAt: FieldValue.serverTimestamp(),
  updatedBy: "system",

  // =========================================================================
  // PLATFORM ROLES (Layer 1 - Custom Claims)
  // =========================================================================
  platformRoles: {
    "4": {
      code: 4,
      label: "Super Admin",
      description: "Platform owner with full system access",
      scope: "platform",
      implicitPermissions: "all",
    },
    "3": {
      code: 3,
      label: "Admin",
      description: "Platform administrator",
      scope: "platform",
      implicitPermissions: "all",
    },
    "2": {
      code: 2,
      label: "Provider",
      description: "Accommodation provider owner/director",
      scope: "provider",
      implicitPermissions: "all",
    },
    "1": {
      code: 1,
      label: "Provider Staff",
      description: "Provider staff member with role-based access",
      scope: "provider",
      requiresProviderRole: true,
    },
    "0": {
      code: 0,
      label: "None",
      description: "No claims set (default state)",
      scope: "none",
    },
  },

  // =========================================================================
  // PROVIDER ROLES (Layer 2 - Firestore)
  // =========================================================================
  providerRoles: {
    property_manager: {
      label: "Property Manager",
      description: "Manages properties, rooms, and maintenance. Cannot access financials or staff management.",
      sortOrder: 1,
      permissions: [
        "provider.view",
        "properties.view",
        "properties.edit",
        "rooms.view",
        "rooms.manage",
        "students.view",
        "placements.view",
        "placements.manage",
        "maintenance.view",
        "maintenance.create",
        "maintenance.manage",
        "reports.occupancy",
      ],
    },
    intake_officer: {
      label: "Intake Officer",
      description: "Manages student applications, placements, and documents. Read-only access to properties.",
      sortOrder: 2,
      permissions: [
        "provider.view",
        "properties.view",
        "rooms.view",
        "students.view",
        "students.create",
        "students.edit",
        "documents.view",
        "documents.upload",
        "documents.manage",
        "placements.view",
        "placements.manage",
        "funding.view",
        "reports.students",
      ],
    },
    finance_viewer: {
      label: "Finance Viewer",
      description: "View-only access to financial data, payments, and funding allocations.",
      sortOrder: 3,
      permissions: [
        "provider.view",
        "students.view",
        "placements.view",
        "funding.view",
        "payments.view",
        "reports.financial",
        "reports.occupancy",
      ],
    },
    support_staff: {
      label: "Support Staff",
      description: "Limited access for front-desk and support personnel. Basic viewing and maintenance logging.",
      sortOrder: 4,
      permissions: [
        "provider.view",
        "properties.view",
        "rooms.view",
        "students.view",
        "placements.view",
        "maintenance.view",
        "maintenance.create",
      ],
    },
  },

  // =========================================================================
  // MODULES
  // =========================================================================
  modules: {
    provider: {
      label: "Provider",
      description: "Provider information and settings",
      icon: "building-2",
      sortOrder: 0,
    },
    properties: {
      label: "Properties",
      description: "Property management and configuration",
      icon: "home",
      sortOrder: 1,
    },
    rooms: {
      label: "Rooms & Beds",
      description: "Room and bed configuration",
      icon: "bed-double",
      sortOrder: 2,
    },
    students: {
      label: "Students",
      description: "Student records and profiles",
      icon: "users",
      sortOrder: 3,
    },
    documents: {
      label: "Documents",
      description: "Document management",
      icon: "file-text",
      sortOrder: 4,
    },
    placements: {
      label: "Placements",
      description: "Room assignments and placement history",
      icon: "map-pin",
      sortOrder: 5,
    },
    funding: {
      label: "Funding",
      description: "NSFAS and bursary allocations",
      icon: "wallet",
      sortOrder: 6,
    },
    payments: {
      label: "Payments",
      description: "Payment tracking and reconciliation",
      icon: "credit-card",
      sortOrder: 7,
    },
    maintenance: {
      label: "Maintenance",
      description: "Maintenance requests and tracking",
      icon: "wrench",
      sortOrder: 8,
    },
    staff: {
      label: "Staff",
      description: "Staff management",
      icon: "user-cog",
      sortOrder: 9,
    },
    reports: {
      label: "Reports",
      description: "Analytics and reporting",
      icon: "bar-chart-3",
      sortOrder: 10,
    },
  },

  // =========================================================================
  // PERMISSIONS
  // =========================================================================
  permissions: {
    // Provider
    "provider.view": {
      label: "View Provider",
      description: "View provider information and dashboard",
      module: "provider",
    },
    "provider.edit": {
      label: "Edit Provider",
      description: "Modify provider settings and information",
      module: "provider",
    },
    // Properties
    "properties.view": {
      label: "View Properties",
      description: "View property listings and details",
      module: "properties",
    },
    "properties.edit": {
      label: "Edit Properties",
      description: "Add and modify property information",
      module: "properties",
    },
    // Rooms
    "rooms.view": {
      label: "View Rooms",
      description: "View room and bed listings",
      module: "rooms",
    },
    "rooms.manage": {
      label: "Manage Rooms",
      description: "Add, edit, and configure rooms and beds",
      module: "rooms",
    },
    // Students
    "students.view": {
      label: "View Students",
      description: "View student records and profiles",
      module: "students",
    },
    "students.create": {
      label: "Create Students",
      description: "Register new student records",
      module: "students",
    },
    "students.edit": {
      label: "Edit Students",
      description: "Modify existing student records",
      module: "students",
    },
    "students.delete": {
      label: "Delete Students",
      description: "Remove student records from the system",
      module: "students",
    },
    // Documents
    "documents.view": {
      label: "View Documents",
      description: "View uploaded student documents",
      module: "documents",
    },
    "documents.upload": {
      label: "Upload Documents",
      description: "Upload new documents to student records",
      module: "documents",
    },
    "documents.manage": {
      label: "Manage Documents",
      description: "Edit, replace, and delete documents",
      module: "documents",
    },
    // Placements
    "placements.view": {
      label: "View Placements",
      description: "View room assignments and placement history",
      module: "placements",
    },
    "placements.manage": {
      label: "Manage Placements",
      description: "Assign, transfer, and end student placements",
      module: "placements",
    },
    // Funding
    "funding.view": {
      label: "View Funding",
      description: "View NSFAS and bursary allocations",
      module: "funding",
    },
    "funding.edit": {
      label: "Edit Funding",
      description: "Modify funding records and allocations",
      module: "funding",
    },
    // Payments
    "payments.view": {
      label: "View Payments",
      description: "View payment status and transaction history",
      module: "payments",
    },
    "payments.record": {
      label: "Record Payments",
      description: "Record and reconcile payments",
      module: "payments",
    },
    // Maintenance
    "maintenance.view": {
      label: "View Maintenance",
      description: "View maintenance requests and history",
      module: "maintenance",
    },
    "maintenance.create": {
      label: "Create Maintenance",
      description: "Log new maintenance requests",
      module: "maintenance",
    },
    "maintenance.manage": {
      label: "Manage Maintenance",
      description: "Assign, update status, and close requests",
      module: "maintenance",
    },
    // Staff
    "staff.view": {
      label: "View Staff",
      description: "View provider staff list",
      module: "staff",
    },
    "staff.manage": {
      label: "Manage Staff",
      description: "Invite, edit roles, and deactivate staff",
      module: "staff",
    },
    // Reports
    "reports.students": {
      label: "Student Reports",
      description: "Generate student-related reports",
      module: "reports",
    },
    "reports.financial": {
      label: "Financial Reports",
      description: "Generate financial and payment reports",
      module: "reports",
    },
    "reports.occupancy": {
      label: "Occupancy Reports",
      description: "Generate occupancy and capacity reports",
      module: "reports",
    },
  },
};

/**
 * Seed the RBAC configuration to Firestore
 */
export async function seedRBAC(): Promise<void> {
  console.log("🔐 Seeding RBAC configuration...");

  try {
    await db.doc("system/rbac").set(RBAC_CONFIG);
    console.log("✅ RBAC configuration seeded successfully!");
    console.log(`   Version: ${RBAC_CONFIG.version}`);
    console.log(`   Provider Roles: ${Object.keys(RBAC_CONFIG.providerRoles).length}`);
    console.log(`   Permissions: ${Object.keys(RBAC_CONFIG.permissions).length}`);
    console.log(`   Modules: ${Object.keys(RBAC_CONFIG.modules).length}`);
  } catch (error) {
    console.error("❌ Failed to seed RBAC configuration:", error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedRBAC()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
