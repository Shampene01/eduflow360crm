# EduFlow360 CRM — Role-Based Access Control (RBAC) System

> **Version:** 1.0.0  
> **Last Updated:** December 2024  
> **Classification:** Internal Technical Documentation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Layer 1: Platform Hierarchy (Custom Claims)](#3-layer-1-platform-hierarchy-custom-claims)
4. [Layer 2: Provider-Scoped RBAC](#4-layer-2-provider-scoped-rbac)
5. [Permission Catalogue](#5-permission-catalogue)
6. [Role-Permission Matrix](#6-role-permission-matrix)
7. [Firestore Data Model](#7-firestore-data-model)
8. [Authorization Flow](#8-authorization-flow)
9. [Security Rules Implementation](#9-security-rules-implementation)
10. [Operational Workflows](#10-operational-workflows)
11. [Security Considerations](#11-security-considerations)
12. [Frontend Integration](#12-frontend-integration)
13. [Future Considerations](#13-future-considerations)

---

## 1. Executive Summary

EduFlow360 implements a **two-layer Role-Based Access Control (RBAC)** architecture designed for multi-tenant student accommodation management.

### Key Characteristics

- **Layer 1:** Platform-level hierarchy via Firebase Custom Claims (embedded in ID tokens)
- **Layer 2:** Provider-scoped permissions via Firestore-based role definitions
- **Tenant Model:** Each accommodation provider operates as an isolated tenant identified by `providerId`
- **Role Catalogue:** Predefined roles controlled by platform administrators; providers assign from catalogue

### Design Goals

| Goal | Implementation |
|------|----------------|
| Performance | Platform hierarchy in tokens (no DB read required) |
| Scalability | Single role definition document serves all tenants |
| Security | Provider isolation enforced at token + database level |
| Simplicity | Flat RBAC model without custom role creation |
| Autonomy | Provider owners manage their own staff assignments |

---

## 2. Architecture Overview

### 2.1 Two-Layer Model

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: Custom Claims (Firebase Auth Token)                   │
│  ─────────────────────────────────────────────────────────────  │
│  Purpose: Platform access hierarchy                             │
│  Set by: Platform Administrator (superAdmin)                    │
│  Stored in: Firebase Authentication ID Token                    │
│                                                                 │
│  roleCode: 4 (superAdmin) → Full platform control               │
│  roleCode: 3 (admin)      → Platform administration             │
│  roleCode: 2 (provider)   → Provider owner (FULL provider access│
│  roleCode: 1 (providerStaff) → Staff (requires Layer 2)         │
│  roleCode: 0 (none)       → No access                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: Provider-Scoped RBAC (Firestore)                      │
│  ─────────────────────────────────────────────────────────────  │
│  Purpose: Granular permissions within provider scope            │
│  Set by: Provider Owner (roleCode 2)                            │
│  Stored in: /providers/{providerId}/staff/{uid}                 │
│                                                                 │
│  providerRole: "property_manager" | "intake_officer" | ...      │
│  Permissions: Derived from /system/rbac at runtime              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Design Principles

1. **Token-Based Platform Authorization**  
   Platform hierarchy embedded in Firebase ID tokens for performant access checks without database reads.

2. **Centralized Role Definitions**  
   All provider role permissions defined in a single `/system/rbac` document controlled by platform administrators.

3. **Provider Autonomy**  
   Provider owners assign roles to their staff from a predefined catalogue without platform administrator intervention.

4. **Single Source of Truth**  
   Updating a role definition immediately affects all staff members with that role—no migration required.

5. **Scope Isolation**  
   Staff can only access data within their assigned `providerId`, enforced at both application and database security rule levels.

---

## 3. Layer 1: Platform Hierarchy (Custom Claims)

### 3.1 Role Code Definitions

| Code | Role | Description | Scope |
|------|------|-------------|-------|
| `4` | `superAdmin` | Platform owner with full system access | Entire platform |
| `3` | `admin` | Platform administrator | Entire platform |
| `2` | `provider` | Accommodation provider owner/director | Own provider (full access) |
| `1` | `providerStaff` | Provider staff member | Own provider (role-based) |
| `0` | `none` | No claims set (default state) | No access |

### 3.2 Custom Claims Structure

```typescript
// Firebase ID Token Custom Claims
interface CustomClaims {
  roleCode: 0 | 1 | 2 | 3 | 4;
  providerId?: string;  // Required for roleCode 1 and 2
  email: string;
}
```

**Example Token Claims:**

```json
{
  "roleCode": 1,
  "providerId": "provider_abc123",
  "email": "staff@provider.co.za"
}
```

### 3.3 TypeScript Role Map

```typescript
const ROLE_MAP: Record<string, number> = {
  superAdmin: 4,    // Platform owner
  admin: 3,         // Platform administrators
  provider: 2,      // Accommodation provider owner/director
  providerStaff: 1, // Provider's staff
  none: 0,          // No claims set (default)
};
```

### 3.4 Provider Owner (roleCode 2) Privileges

Users with `roleCode: 2` have **implicit full access** to all resources within their `providerId` scope:

- ✅ Bypass Layer 2 permission checks entirely
- ✅ Access all modules without restriction
- ✅ Manage staff roles and invitations
- ✅ Configure provider settings
- ❌ Cannot access other providers' data
- ❌ Cannot modify platform-level settings

**Important:** Provider owners do NOT require a `providerRole` assignment.

---

## 4. Layer 2: Provider-Scoped RBAC

### 4.1 Provider Roles

Provider staff (`roleCode: 1`) are assigned one of the following predefined roles:

| Role | Label | Description |
|------|-------|-------------|
| `property_manager` | Property Manager | Manages properties, rooms, and maintenance. Cannot access financials or staff management. |
| `intake_officer` | Intake Officer | Manages student applications, placements, and documents. Read-only access to properties. |
| `finance_viewer` | Finance Viewer | View-only access to financial data, payments, and funding allocations. |
| `support_staff` | Support Staff | Limited access for front-desk and support personnel. Basic viewing and maintenance logging. |

### 4.2 Role Assignment

Roles are assigned by the provider owner through the staff management interface:

```
Provider Owner UI
       │
       ▼
┌─────────────────────────────┐
│  Assign Role: [▼]           │
│  ├── Property Manager       │
│  ├── Intake Officer         │
│  ├── Finance Viewer         │
│  └── Support Staff          │
└─────────────────────────────┘
```

No custom role creation. No permission toggles. Simple selection from the catalogue.

---

## 5. Permission Catalogue

### 5.1 Permission Naming Convention

```
{module}.{action}
```

**Actions:**
- `view` — Read access
- `create` — Create new records
- `edit` — Modify existing records
- `delete` — Remove records
- `manage` — Full CRUD operations
- `upload` — Upload files
- `record` — Record transactions

### 5.2 Complete Permission List

#### Properties Module

| Permission | Label | Description |
|------------|-------|-------------|
| `properties.view` | View Properties | View property listings and details |
| `properties.edit` | Edit Properties | Add and modify property information |
| `rooms.view` | View Rooms | View room and bed listings |
| `rooms.manage` | Manage Rooms | Add, edit, and configure rooms and beds |

#### Students Module

| Permission | Label | Description |
|------------|-------|-------------|
| `students.view` | View Students | View student records and profiles |
| `students.create` | Create Students | Register new student records |
| `students.edit` | Edit Students | Modify existing student records |
| `students.delete` | Delete Students | Remove student records from the system |

#### Documents Module

| Permission | Label | Description |
|------------|-------|-------------|
| `documents.view` | View Documents | View uploaded student documents |
| `documents.upload` | Upload Documents | Upload new documents to student records |
| `documents.manage` | Manage Documents | Edit, replace, and delete documents |

#### Placements Module

| Permission | Label | Description |
|------------|-------|-------------|
| `placements.view` | View Placements | View room assignments and placement history |
| `placements.manage` | Manage Placements | Assign, transfer, and end student placements |

#### Funding Module

| Permission | Label | Description |
|------------|-------|-------------|
| `funding.view` | View Funding | View NSFAS and bursary allocations |
| `funding.edit` | Edit Funding | Modify funding records and allocations |

#### Payments Module

| Permission | Label | Description |
|------------|-------|-------------|
| `payments.view` | View Payments | View payment status and transaction history |
| `payments.record` | Record Payments | Record and reconcile payments |

#### Maintenance Module

| Permission | Label | Description |
|------------|-------|-------------|
| `maintenance.view` | View Maintenance | View maintenance requests and history |
| `maintenance.create` | Create Maintenance | Log new maintenance requests |
| `maintenance.manage` | Manage Maintenance | Assign, update status, and close requests |

#### Staff Module

| Permission | Label | Description |
|------------|-------|-------------|
| `staff.view` | View Staff | View provider staff list |
| `staff.manage` | Manage Staff | Invite, edit roles, and deactivate staff |

#### Reports Module

| Permission | Label | Description |
|------------|-------|-------------|
| `reports.students` | Student Reports | Generate student-related reports |
| `reports.financial` | Financial Reports | Generate financial and payment reports |
| `reports.occupancy` | Occupancy Reports | Generate occupancy and capacity reports |

---

## 6. Role-Permission Matrix

| Permission | Property Manager | Intake Officer | Finance Viewer | Support Staff |
|------------|:----------------:|:--------------:|:--------------:|:-------------:|
| **Properties** |
| `properties.view` | ✓ | ✓ | — | ✓ |
| `properties.edit` | ✓ | — | — | — |
| `rooms.view` | ✓ | ✓ | — | ✓ |
| `rooms.manage` | ✓ | — | — | — |
| **Students** |
| `students.view` | ✓ | ✓ | ✓ | ✓ |
| `students.create` | — | ✓ | — | — |
| `students.edit` | — | ✓ | — | — |
| `students.delete` | — | — | — | — |
| **Documents** |
| `documents.view` | — | ✓ | — | — |
| `documents.upload` | — | ✓ | — | — |
| `documents.manage` | — | ✓ | — | — |
| **Placements** |
| `placements.view` | ✓ | ✓ | ✓ | ✓ |
| `placements.manage` | ✓ | ✓ | — | — |
| **Funding** |
| `funding.view` | — | ✓ | ✓ | — |
| `funding.edit` | — | — | — | — |
| **Payments** |
| `payments.view` | — | — | ✓ | — |
| `payments.record` | — | — | — | — |
| **Maintenance** |
| `maintenance.view` | ✓ | — | — | ✓ |
| `maintenance.create` | ✓ | — | — | ✓ |
| `maintenance.manage` | ✓ | — | — | — |
| **Staff** |
| `staff.view` | — | — | — | — |
| `staff.manage` | — | — | — | — |
| **Reports** |
| `reports.students` | — | ✓ | — | — |
| `reports.financial` | — | — | ✓ | — |
| `reports.occupancy` | ✓ | — | ✓ | — |

> **Note:** Provider owners (`roleCode: 2`) have implicit access to ALL permissions and are not shown in this matrix.

---

## 7. Firestore Data Model

### 7.1 System RBAC Document

**Path:** `/system/rbac`

**Purpose:** Single source of truth for all role definitions and permissions.

**Access:** Read by all authenticated users (`roleCode >= 1`), write only by `superAdmin` (`roleCode >= 4`).

```typescript
interface SystemRBAC {
  version: string;
  updatedAt: Timestamp | null;
  updatedBy: string | null;
  
  providerRoles: {
    [roleKey: string]: {
      label: string;
      description: string;
      permissions: string[];
      sortOrder: number;
    };
  };
  
  permissions: {
    [permissionKey: string]: {
      label: string;
      description: string;
      module: string;
    };
  };
  
  modules: {
    [moduleKey: string]: {
      label: string;
      description: string;
      icon: string;
      sortOrder: number;
    };
  };
  
  platformRoles: {
    [roleCode: string]: {
      code: string;
      label: string;
      description: string;
      scope: "platform" | "provider" | "none";
      implicitPermissions?: "all";
      requiresProviderRole?: boolean;
    };
  };
}
```

### 7.2 Staff Assignment Document

**Path:** `/providers/{providerId}/staff/{staffUid}`

**Purpose:** Assigns a provider role to a staff member.

**Access:** Read by provider staff, write by provider owner.

```typescript
interface StaffDocument {
  userId: string;           // Firebase Auth UID
  email: string;
  displayName: string;
  providerRole: string;     // Key from providerRoles (e.g., "intake_officer")
  status: "active" | "inactive";
  createdAt: Timestamp;
  createdBy: string;        // UID of provider owner who invited
  updatedAt?: Timestamp;
  updatedBy?: string;
}
```

### 7.3 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Permissions NOT stored per-user | Prevents duplication; instant propagation of permission changes |
| Role definitions read-only to providers | Ensures consistent permission semantics across all tenants |
| Staff nested under `/providers/{id}/` | Structural enforcement of provider isolation |
| `providerRole` is a string reference | Allows role definition updates without migrating user documents |

---

## 8. Authorization Flow

### 8.1 Request Processing Sequence

```
User Request
     │
     ▼
┌─────────────────────────────────┐
│ 1. Token Validation             │
│    Firebase Auth verifies token │
│    Extract: roleCode, providerId│
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ 2. Platform Admin Check         │
│    roleCode >= 3?               │
│    YES → ALLOW (full access)    │
└───────────────┬─────────────────┘
                │ NO
                ▼
┌─────────────────────────────────┐
│ 3. Provider Scope Check         │
│    resource.providerId ==       │
│    token.providerId?            │
│    NO → DENY                    │
└───────────────┬─────────────────┘
                │ YES
                ▼
┌─────────────────────────────────┐
│ 4. Provider Owner Check         │
│    roleCode == 2?               │
│    YES → ALLOW (full provider)  │
└───────────────┬─────────────────┘
                │ NO (roleCode == 1)
                ▼
┌─────────────────────────────────┐
│ 5. Staff Role Lookup            │
│    Fetch: /providers/{id}/      │
│           staff/{uid}           │
│    Get: providerRole            │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ 6. Permission Resolution        │
│    Fetch: /system/rbac          │
│    Get: providerRoles[role]     │
│          .permissions[]         │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ 7. Access Decision              │
│    required permission IN       │
│    role.permissions?            │
│    YES → ALLOW                  │
│    NO  → DENY                   │
└─────────────────────────────────┘
```

### 8.2 Decision Summary

| User Type | Authorization Path |
|-----------|-------------------|
| `superAdmin` (4) | Token check → Allow all |
| `admin` (3) | Token check → Allow all |
| `provider` (2) | Token check → Provider scope check → Allow within scope |
| `providerStaff` (1) | Token check → Provider scope check → Role lookup → Permission check |
| `none` (0) | Token check → Deny |

---

## 9. Security Rules Implementation

### 9.1 Helper Functions

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ══════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ══════════════════════════════════════════════════════════
    
    // Get roleCode from Custom Claims
    function getRoleCode() {
      return request.auth.token.roleCode;
    }
    
    // Get providerId from Custom Claims
    function getProviderId() {
      return request.auth.token.providerId;
    }
    
    // Check if user is platform admin (roleCode >= 3)
    function isPlatformAdmin() {
      return getRoleCode() >= 3;
    }
    
    // Check if user is provider owner for specific provider
    function isProviderOwner(providerId) {
      return getRoleCode() == 2 && getProviderId() == providerId;
    }
    
    // Check if user is staff member for specific provider
    function isProviderStaff(providerId) {
      return getRoleCode() == 1 && getProviderId() == providerId;
    }
    
    // Get staff document for current user
    function getStaffDoc(providerId) {
      return get(/databases/$(database)/documents/providers/$(providerId)/staff/$(request.auth.uid)).data;
    }
    
    // Get providerRole from staff document
    function getProviderRole(providerId) {
      return getStaffDoc(providerId).providerRole;
    }
    
    // Get permissions array for a role
    function getRolePermissions(providerRole) {
      return get(/databases/$(database)/documents/system/rbac).data.providerRoles[providerRole].permissions;
    }
    
    // Check if staff member has specific permission
    function staffHasPermission(providerId, permission) {
      let role = getProviderRole(providerId);
      let permissions = getRolePermissions(role);
      return permission in permissions;
    }
    
    // Main access control function
    function canAccess(providerId, permission) {
      // Platform admins: full access
      return isPlatformAdmin()
        // Provider owner: full access to their provider
        || isProviderOwner(providerId)
        // Provider staff: check specific permission
        || (isProviderStaff(providerId) && staffHasPermission(providerId, permission));
    }
```

### 9.2 Collection Rules

```javascript
    // ══════════════════════════════════════════════════════════
    // SYSTEM COLLECTION
    // ══════════════════════════════════════════════════════════
    
    match /system/{document} {
      // All authenticated staff can read role definitions
      allow read: if getRoleCode() >= 1;
      // Only superAdmin can modify
      allow write: if getRoleCode() >= 4;
    }
    
    // ══════════════════════════════════════════════════════════
    // PROVIDER-SCOPED COLLECTIONS
    // ══════════════════════════════════════════════════════════
    
    match /providers/{providerId} {
      
      // Provider document
      allow read: if canAccess(providerId, 'provider.view');
      allow write: if isProviderOwner(providerId) || isPlatformAdmin();
      
      // Staff management
      match /staff/{staffId} {
        // Staff can read their own document
        allow read: if canAccess(providerId, 'staff.view') 
                    || request.auth.uid == staffId;
        // Only provider owner can manage staff
        allow write: if isProviderOwner(providerId) || isPlatformAdmin();
      }
      
      // Properties
      match /properties/{propertyId} {
        allow read: if canAccess(providerId, 'properties.view');
        allow create, update: if canAccess(providerId, 'properties.edit');
        allow delete: if isProviderOwner(providerId) || isPlatformAdmin();
      }
      
      // Students
      match /students/{studentId} {
        allow read: if canAccess(providerId, 'students.view');
        allow create: if canAccess(providerId, 'students.create');
        allow update: if canAccess(providerId, 'students.edit');
        allow delete: if canAccess(providerId, 'students.delete');
      }
      
      // Documents
      match /documents/{docId} {
        allow read: if canAccess(providerId, 'documents.view');
        allow create: if canAccess(providerId, 'documents.upload');
        allow update, delete: if canAccess(providerId, 'documents.manage');
      }
      
      // Placements
      match /placements/{placementId} {
        allow read: if canAccess(providerId, 'placements.view');
        allow write: if canAccess(providerId, 'placements.manage');
      }
      
      // Funding
      match /funding/{fundingId} {
        allow read: if canAccess(providerId, 'funding.view');
        allow write: if canAccess(providerId, 'funding.edit');
      }
      
      // Payments
      match /payments/{paymentId} {
        allow read: if canAccess(providerId, 'payments.view');
        allow write: if canAccess(providerId, 'payments.record');
      }
      
      // Maintenance
      match /maintenance/{requestId} {
        allow read: if canAccess(providerId, 'maintenance.view');
        allow create: if canAccess(providerId, 'maintenance.create');
        allow update, delete: if canAccess(providerId, 'maintenance.manage');
      }
    }
  }
}
```

---

## 10. Operational Workflows

### 10.1 Provider Approval (Platform Admin)

```
Platform Admin Actions:
1. Review provider application
2. Create provider document in /providers/{providerId}
3. Set Custom Claims on provider owner's Firebase Auth account:
   - roleCode: 2
   - providerId: "{providerId}"
4. Provider owner now has full access to their scope
```

**Cloud Function Example:**

```typescript
import * as admin from 'firebase-admin';

export async function approveProvider(
  providerUserId: string,
  providerId: string
): Promise<void> {
  await admin.auth().setCustomUserClaims(providerUserId, {
    roleCode: 2,
    providerId: providerId,
    email: (await admin.auth().getUser(providerUserId)).email
  });
}
```

### 10.2 Staff Invitation (Provider Owner)

```
Provider Owner Actions:
1. Enter staff email address
2. Select role from dropdown (Property Manager, Intake Officer, etc.)
3. Submit invitation

System Actions:
1. Cloud Function creates/updates Firebase Auth user
2. Set Custom Claims: { roleCode: 1, providerId: "{providerId}" }
3. Create staff document in /providers/{providerId}/staff/{uid}
4. Send invitation email to staff member

Staff Member Actions:
1. Receive email invitation
2. Set password (if new user)
3. Login and access role-based features
```

**Cloud Function Example:**

```typescript
export async function inviteStaff(
  providerId: string,
  email: string,
  providerRole: string,
  invitedBy: string
): Promise<string> {
  // Create or get user
  let user: admin.auth.UserRecord;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch {
    user = await admin.auth().createUser({ email });
  }
  
  // Set Custom Claims
  await admin.auth().setCustomUserClaims(user.uid, {
    roleCode: 1,
    providerId: providerId,
    email: email
  });
  
  // Create staff document
  await admin.firestore()
    .doc(`providers/${providerId}/staff/${user.uid}`)
    .set({
      userId: user.uid,
      email: email,
      displayName: '',
      providerRole: providerRole,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: invitedBy
    });
  
  // Send invitation email
  await sendInvitationEmail(email, providerId);
  
  return user.uid;
}
```

### 10.3 Role Modification (Provider Owner)

```
Provider Owner Actions:
1. Navigate to Staff Management
2. Select staff member
3. Choose new role from dropdown
4. Save changes

System Actions:
1. Update providerRole field in staff document
2. Change takes effect immediately (no token refresh needed)
```

**Why No Token Refresh?**

Permissions are resolved from Firestore at runtime, not embedded in the token. The token only contains `roleCode: 1` and `providerId`. The specific permissions are derived from:

```
Token.providerId → Staff Document.providerRole → /system/rbac.providerRoles[role].permissions
```

### 10.4 Staff Deactivation (Provider Owner)

```
Provider Owner Actions:
1. Navigate to Staff Management
2. Select staff member
3. Click "Deactivate"

System Actions:
1. Set staff document status to "inactive"
2. Security rules check status before granting access
3. Optionally: Request platform admin to disable Firebase Auth account
```

**Enhanced Security Rule:**

```javascript
function isActiveStaff(providerId) {
  return getStaffDoc(providerId).status == 'active';
}

function canAccess(providerId, permission) {
  return isPlatformAdmin()
    || isProviderOwner(providerId)
    || (isProviderStaff(providerId) 
        && isActiveStaff(providerId)  // Added check
        && staffHasPermission(providerId, permission));
}
```

### 10.5 Permission Updates (Platform Admin)

```
Platform Admin Actions:
1. Modify /system/rbac document
2. Update permissions array for affected role(s)
3. Save changes

Effect:
- All staff members with affected roles immediately receive updated permissions
- No user-level updates required
- No token refresh required
```

---

## 11. Security Considerations

### 11.1 Defense in Depth

| Layer | Protection |
|-------|------------|
| **Token-Level** | Custom Claims cannot be modified by clients. Only Admin SDK (server-side) can set `roleCode` and `providerId`. |
| **Database-Level** | Firestore Security Rules enforce provider isolation and permission checks before any read/write operation. |
| **Application-Level** | UI components hide unauthorized features (convenience only—not security). |
| **Audit Trail** | Staff documents include `createdBy`, `updatedBy`, and timestamps for accountability. |

### 11.2 Provider Isolation

Cross-provider data access is prevented through multiple mechanisms:

1. **Token Binding:** `providerId` in Custom Claims is set only by platform administrators
2. **Structural Isolation:** All provider-scoped collections nested under `/providers/{providerId}/`
3. **Rule Enforcement:** Security rules explicitly match `request.auth.token.providerId` against document path

```javascript
// This ALWAYS fails for cross-provider access
function canAccess(providerId, permission) {
  // If token.providerId != providerId, these all return false:
  return isPlatformAdmin()                    // roleCode < 3
    || isProviderOwner(providerId)           // providerId mismatch
    || (isProviderStaff(providerId) && ...)  // providerId mismatch
}
```

### 11.3 Role Definition Protection

| Protection | Implementation |
|------------|----------------|
| Write-protected | `/system/rbac` requires `roleCode >= 4` for writes |
| No escalation | Provider owners cannot add permissions to roles |
| No custom roles | Providers select from predefined catalogue only |
| Consistent semantics | All tenants have identical role definitions |

### 11.4 Common Attack Vectors (Mitigated)

| Attack | Mitigation |
|--------|------------|
| Token tampering | Firebase Auth verifies token signature |
| Privilege escalation | Custom Claims set server-side only |
| Cross-tenant access | `providerId` enforced in all security rules |
| Role manipulation | `/system/rbac` write-protected |
| Inactive user access | Staff `status` checked in security rules |

---

## 12. Frontend Integration

### 12.1 Permission Check Hook

```typescript
// hooks/usePermission.ts
import { useAuth } from './useAuth';
import { useFirestore } from './useFirestore';

export function usePermission(permission: string): boolean {
  const { user, claims } = useAuth();
  const { data: rbac } = useFirestore('system/rbac');
  const { data: staffDoc } = useFirestore(
    `providers/${claims?.providerId}/staff/${user?.uid}`
  );
  
  // Platform admin: all permissions
  if (claims?.roleCode >= 3) return true;
  
  // Provider owner: all permissions within scope
  if (claims?.roleCode === 2) return true;
  
  // Provider staff: check specific permission
  if (claims?.roleCode === 1 && staffDoc && rbac) {
    const role = staffDoc.providerRole;
    const permissions = rbac.providerRoles[role]?.permissions || [];
    return permissions.includes(permission);
  }
  
  return false;
}
```

### 12.2 Permission Guard Component

```tsx
// components/PermissionGuard.tsx
interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ 
  permission, 
  children, 
  fallback = null 
}: PermissionGuardProps) {
  const hasPermission = usePermission(permission);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

// Usage
<PermissionGuard permission="students.create">
  <Button onClick={handleAddStudent}>Add Student</Button>
</PermissionGuard>
```

### 12.3 Navigation Filtering

```typescript
// config/navigation.ts
interface NavItem {
  label: string;
  path: string;
  permission: string;
  icon: string;
}

const navigation: NavItem[] = [
  { label: 'Properties', path: '/properties', permission: 'properties.view', icon: 'building' },
  { label: 'Students', path: '/students', permission: 'students.view', icon: 'users' },
  { label: 'Documents', path: '/documents', permission: 'documents.view', icon: 'file-text' },
  { label: 'Placements', path: '/placements', permission: 'placements.view', icon: 'home' },
  { label: 'Funding', path: '/funding', permission: 'funding.view', icon: 'wallet' },
  { label: 'Payments', path: '/payments', permission: 'payments.view', icon: 'credit-card' },
  { label: 'Maintenance', path: '/maintenance', permission: 'maintenance.view', icon: 'tool' },
  { label: 'Staff', path: '/staff', permission: 'staff.view', icon: 'user-cog' },
  { label: 'Reports', path: '/reports', permission: 'reports.students', icon: 'bar-chart' },
];

// Filter based on permissions
function useNavigationItems(): NavItem[] {
  return navigation.filter(item => usePermission(item.permission));
}
```

### 12.4 Role Selection Dropdown

```tsx
// components/RoleSelect.tsx
export function RoleSelect({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (role: string) => void;
}) {
  const { data: rbac } = useFirestore('system/rbac');
  
  const roles = Object.entries(rbac?.providerRoles || {})
    .map(([key, role]) => ({
      value: key,
      label: role.label,
      description: role.description,
      sortOrder: role.sortOrder
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Select a role...</option>
      {roles.map(role => (
        <option key={role.value} value={role.value}>
          {role.label}
        </option>
      ))}
    </select>
  );
}
```

---

## 13. Future Considerations

The current flat RBAC model is designed for simplicity and maintainability. The following enhancements may be considered as the platform scales:

| Enhancement | Description | Trigger |
|-------------|-------------|---------|
| **Custom Provider Roles** | Allow enterprise providers to create custom roles by selecting from the permission catalogue | Premium tier requirement |
| **Property-Level Assignments** | Restrict staff access to specific properties within a provider | Large multi-property providers |
| **Time-Based Access** | Temporary role assignments with automatic expiration | Seasonal staff management |
| **Audit Logging** | Comprehensive logging of permission checks and role changes | Compliance requirements |
| **Role Inheritance** | Hierarchical roles where higher roles inherit lower role permissions | Complex organizational structures |

**Principle:** These enhancements should only be implemented when clear business requirements emerge. Avoid scope creep.

---

## Appendix A: Quick Reference

### Role Codes

```typescript
const ROLE_MAP = {
  superAdmin: 4,
  admin: 3,
  provider: 2,
  providerStaff: 1,
  none: 0,
};
```

### Document Paths

| Document | Path |
|----------|------|
| RBAC Configuration | `/system/rbac` |
| Staff Assignment | `/providers/{providerId}/staff/{staffUid}` |
| Provider | `/providers/{providerId}` |

### Custom Claims Structure

```json
{
  "roleCode": 1,
  "providerId": "provider_abc123",
  "email": "user@example.com"
}
```

### Provider Roles

| Key | Label |
|-----|-------|
| `property_manager` | Property Manager |
| `intake_officer` | Intake Officer |
| `finance_viewer` | Finance Viewer |
| `support_staff` | Support Staff |

---

## Appendix B: Checklist

### Implementation Checklist

- [ ] Create `/system/rbac` document with role definitions
- [ ] Implement Custom Claims setting in Cloud Functions
- [ ] Deploy Firestore Security Rules
- [ ] Build staff invitation flow
- [ ] Implement frontend permission hooks
- [ ] Add permission guards to UI components
- [ ] Filter navigation based on permissions
- [ ] Test cross-provider isolation
- [ ] Test role-based access for each role
- [ ] Document provider owner onboarding process

### Security Checklist

- [ ] Custom Claims only set via Admin SDK
- [ ] Security rules deployed and tested
- [ ] Provider isolation verified
- [ ] Staff status check implemented
- [ ] `/system/rbac` write-protected
- [ ] Audit fields on staff documents
- [ ] Error handling for missing permissions

---

*End of Document*
