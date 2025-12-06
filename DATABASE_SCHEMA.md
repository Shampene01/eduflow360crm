# EduFlow360 CRM - Normalized Database Schema

## Overview

This document describes the normalized database architecture for the EduFlow360 CRM system. The schema supports:

- User onboarding (natural persons only)
- Accommodation Provider registration + approval workflow
- Property creation and configuration
- Student assignment to properties/rooms/beds

## Collections

### 1. `users` (Natural Persons Only)

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string (PK) | UUID, same as Firebase Auth UID |
| `email` | string | User's email address |
| `phoneNumber` | string? | Phone number |
| `firstNames` | string | First name(s) |
| `surname` | string | Surname/last name |
| `idNumber` | string? | SA ID number |
| `dateOfBirth` | string? | ISO date |
| `gender` | enum? | Male, Female, Other |
| `profilePhotoUrl` | string? | Profile photo URL |
| `addressId` | string? | FK → addresses |
| `createdAt` | Timestamp | Account creation time |
| `lastLoginAt` | Timestamp? | Last login time |
| `marketingConsent` | boolean | Marketing opt-in |
| `roles` | string[] | ["provider", "student", "admin"] |
| `isActive` | boolean | Account active status |
| `emailVerified` | boolean | Email verified status |

### 2. `addresses` (Shared)

| Field | Type | Description |
|-------|------|-------------|
| `addressId` | string (PK) | UUID |
| `street` | string | Street address |
| `suburb` | string? | Suburb |
| `townCity` | string | Town/City |
| `province` | string | Province |
| `postalCode` | string? | Postal code |
| `country` | string | Default: "South Africa" |
| `latitude` | number? | GPS latitude |
| `longitude` | number? | GPS longitude |

### 3. `accommodationProviders`

| Field | Type | Description |
|-------|------|-------------|
| `providerId` | string (PK) | UUID |
| `userId` | string (FK) | → users |
| `companyName` | string | Registered company name |
| `tradingName` | string? | Trading as name |
| `legalForm` | enum | Private Company, NGO, Trust, etc. |
| `industryClassification` | string? | Industry code |
| `companyRegistrationNumber` | string? | CIPC registration |
| `yearsInOperation` | number? | Years in business |
| `taxReferenceNumber` | string? | SARS tax reference |
| `vatRegistered` | boolean | VAT registered status |
| `vatNumber` | string? | VAT number |
| `bankName` | string? | Bank name |
| `accountType` | enum? | Current, Savings, Transmission |
| `accountNumber` | string? | Bank account number |
| `branchCode` | string? | Branch code |
| `accountHolder` | string? | Account holder name |
| `bbbeeLevel` | number? | B-BBEE level (1-8) |
| `bbbeeCertificateExpiry` | string? | Certificate expiry date |
| `blackOwnershipPercentage` | number? | Black ownership % |
| `blackYouthOwnershipPercentage` | number? | Black youth ownership % |
| `blackWomenOwnershipPercentage` | number? | Black women ownership % |
| `disabledPersonOwnershipPercentage` | number? | Disabled person ownership % |
| `physicalAddressId` | string? | FK → addresses |
| `postalAddressId` | string? | FK → addresses |
| `approvalStatus` | enum | Pending, Approved, Rejected |
| `approvalTimestamp` | Timestamp? | When approved/rejected |
| `approvedBy` | string? | Admin userId |
| `rejectionReason` | string? | Reason if rejected |
| `nsfasAccredited` | boolean | NSFAS accreditation status |
| `nsfasAccreditedSince` | string? | Accreditation start date |
| `accreditationExpiry` | string? | Accreditation expiry |
| `metadata` | object? | Additional JSON data |

### 4. `providerContactPersons`

| Field | Type | Description |
|-------|------|-------------|
| `contactId` | string (PK) | UUID |
| `providerId` | string (FK) | → accommodationProviders |
| `firstNames` | string | First name(s) |
| `surname` | string | Surname |
| `position` | string? | Job title |
| `phoneNumber` | string | Phone number |
| `email` | string | Email address |
| `idNumber` | string? | SA ID number |
| `isPrimary` | boolean | Primary contact flag |
| `isActive` | boolean | Active status |

### 5. `providerDocuments`

| Field | Type | Description |
|-------|------|-------------|
| `documentId` | string (PK) | UUID |
| `providerId` | string (FK) | → accommodationProviders |
| `documentType` | enum | ID_COPY, PROOF_OF_ADDRESS, BANK_LETTER, CIPC_COR14_3, etc. |
| `documentName` | string | Original filename |
| `fileUrl` | string | Storage URL |
| `fileSize` | number? | File size in bytes |
| `mimeType` | string? | MIME type |
| `uploadedAt` | Timestamp | Upload timestamp |
| `uploadedBy` | string | userId who uploaded |
| `verified` | boolean | Verification status |
| `verifiedAt` | Timestamp? | Verification timestamp |
| `verifiedBy` | string? | Admin userId |
| `verificationNotes` | string? | Notes |
| `expiryDate` | string? | Document expiry date |

### 6. `properties`

| Field | Type | Description |
|-------|------|-------------|
| `propertyId` | string (PK) | UUID |
| `providerId` | string (FK) | → accommodationProviders |
| `name` | string | Property name |
| `ownershipType` | enum | Owned, Leased |
| `propertyType` | enum | Student Residence, Apartment Block, House, etc. |
| `institution` | string? | Nearby university/college |
| `description` | string? | Property description |
| `addressId` | string (FK) | → addresses |
| `coverImageUrl` | string? | Cover image URL |
| `totalBeds` | number? | Total bed count |
| `availableBeds` | number? | Available beds |
| `pricePerBedPerMonth` | number? | Monthly rate |
| `status` | enum | Draft, Pending, Active, Inactive, Suspended |
| `nsfasApproved` | boolean | NSFAS approval status |
| `amenities` | string[]? | List of amenities |
| `metadata` | object? | Additional JSON data |

### 7. `roomConfigurations`

| Field | Type | Description |
|-------|------|-------------|
| `configId` | string (PK) | UUID |
| `propertyId` | string (FK) | → properties |
| `bachelor` | number | Bachelor unit count |
| `singleEnSuite` | number | Single en-suite count |
| `singleStandard` | number | Single standard count |
| `sharing2Beds_EnSuite` | number | 2-bed en-suite count |
| `sharing2Beds_Standard` | number | 2-bed standard count |
| `sharing3Beds_EnSuite` | number | 3-bed en-suite count |
| `sharing3Beds_Standard` | number | 3-bed standard count |
| `totalRooms` | number | Calculated total rooms |
| `totalBeds` | number | Calculated total beds |

### 8. `propertyRooms`

| Field | Type | Description |
|-------|------|-------------|
| `roomId` | string (PK) | UUID |
| `propertyId` | string (FK) | → properties |
| `roomType` | enum | Bachelor, Single En-Suite, etc. |
| `roomNumber` | string | Room identifier (e.g., "101") |
| `floor` | number? | Floor number |
| `numberOfBeds` | number | Beds in room |
| `hasEnSuite` | boolean | Has en-suite bathroom |
| `amenities` | string[]? | Room-specific amenities |
| `status` | enum | Available, Full, Maintenance, Inactive |

### 9. `propertyBeds`

| Field | Type | Description |
|-------|------|-------------|
| `bedId` | string (PK) | UUID |
| `roomId` | string (FK) | → propertyRooms |
| `propertyId` | string (FK) | → properties (denormalized) |
| `bedLabel` | string | Bed identifier (e.g., "A", "B") |
| `status` | enum | Available, Occupied, Maintenance, Reserved |
| `currentStudentId` | string? | Current occupant |
| `currentAssignmentId` | string? | Current assignment |
| `pricePerMonth` | number? | Override pricing |

### 10. `students`

| Field | Type | Description |
|-------|------|-------------|
| `studentId` | string (PK) | UUID |
| `userId` | string? (FK) | → users (if has account) |
| `idNumber` | string | SA ID number |
| `firstNames` | string | First name(s) |
| `surname` | string | Surname |
| `email` | string? | Email address |
| `phoneNumber` | string? | Phone number |
| `dateOfBirth` | string? | Date of birth |
| `gender` | enum? | Male, Female, Other |
| `institution` | string? | University/college |
| `studentNumber` | string? | Student number |
| `program` | string? | Study program |
| `yearOfStudy` | number? | Year of study |
| `nsfasNumber` | string? | NSFAS reference |
| `funded` | boolean | NSFAS funded status |
| `fundedAmount` | number? | Funding amount |
| `fundingYear` | number? | Funding year |
| `homeAddressId` | string? | FK → addresses |
| `status` | enum | Pending, Verified, Active, Inactive, Graduated |
| `metadata` | object? | Additional JSON data |

### 11. `studentPropertyAssignments`

| Field | Type | Description |
|-------|------|-------------|
| `assignmentId` | string (PK) | UUID |
| `studentId` | string (FK) | → students |
| `propertyId` | string (FK) | → properties |
| `roomId` | string? (FK) | → propertyRooms |
| `bedId` | string? (FK) | → propertyBeds |
| `startDate` | string | Assignment start date |
| `endDate` | string? | Assignment end date |
| `status` | enum | Active, Future, Closed, Cancelled |
| `monthlyRate` | number? | Monthly rate |
| `createdBy` | string | userId who created |
| `closedAt` | Timestamp? | When closed |
| `closedBy` | string? | userId who closed |
| `closureReason` | string? | Reason for closure |

## Entity Relationships

```
users (1) ──────────────────────────────┐
    │                                   │
    │ (1:1)                             │
    ▼                                   │
accommodationProviders (1) ─────────────┤
    │                                   │
    ├── (1:N) providerContactPersons    │
    │                                   │
    ├── (1:N) providerDocuments         │
    │                                   │
    └── (1:N) properties (1) ───────────┤
                │                       │
                ├── (1:1) roomConfigurations
                │                       │
                ├── (1:N) propertyRooms (1)
                │         │             │
                │         └── (1:N) propertyBeds
                │                       │
                └── (1:N) studentPropertyAssignments
                          │             │
                          │             │
students (N) ─────────────┘             │
    │                                   │
    └───────────────────────────────────┘
                    │
                    ▼
              addresses (shared)
```

## Migration

Use the migration utility in `src/lib/migration.ts`:

```typescript
import { migrateLegacyUser, migrateAllLegacyUsers, getMigrationStatus } from '@/lib/migration';

// Check status
const status = await getMigrationStatus();
console.log(`${status.pendingUsers} users pending migration`);

// Migrate single user
const result = await migrateLegacyUser('user-id');

// Migrate all users
const results = await migrateAllLegacyUsers();
console.log(`Migrated ${results.successful}/${results.total} users`);
```

## API Endpoints (Recommended)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/register` | POST | Register new user |
| `/api/provider/apply` | POST | Submit provider application |
| `/api/provider/documents` | POST | Upload provider documents |
| `/api/provider/contacts` | POST/PUT | Manage contact persons |
| `/api/properties` | POST | Create property |
| `/api/properties/:id/rooms` | POST | Add rooms to property |
| `/api/properties/:id/beds` | POST | Add beds to rooms |
| `/api/students` | POST | Create student record |
| `/api/students/assign` | POST | Assign student to property/bed |

## Files

- `src/lib/schema.ts` - TypeScript interfaces and types
- `src/lib/db.ts` - Database service functions
- `src/lib/migration.ts` - Migration utilities
- `firestore.rules` - Firestore security rules
