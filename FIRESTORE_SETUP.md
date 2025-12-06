# Firestore Setup Guide

## Why Users Are Created But Data Isn't Saved

If you see users in **Firebase Authentication** but no data in **Firestore Database**, this is caused by **Firestore Security Rules** blocking writes.

### Quick Fix (5 minutes)

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com](https://console.firebase.google.com)
   - Select your project

2. **Navigate to Firestore Database**
   - Click on "Firestore Database" in the left sideba
   - Click on the "Rules" tab

3. **Update the Rules**
   - Replace the existing rules with:

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         // Allow authenticated users to create their profile
         allow create: if request.auth != null && request.auth.uid == userId;
         // Users can read/write their own data
         allow read, update, delete: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

4. **Publish the Rules**
   - Click the "Publish" button
   - Wait for confirmation message

5. **Test Registration**
   - Try registering a new user
   - Check Firestore Database → Data tab
   - You should now see the user document with all fields

## Understanding the Rules

### Current Rule Explanation

```javascript
match /users/{userId} {
  // Allow authenticated users to create their profile
  allow create: if request.auth != null && request.auth.uid == userId;

  // Users can read/write their own data
  allow read, update, delete: if request.auth != null && request.auth.uid == userId;
}
```

**What this means:**
- `request.auth != null` - User must be logged in
- `request.auth.uid == userId` - User can only access their own document
- This prevents users from seeing or modifying other users' data

## Verifying the Fix

### 1. Check Browser Console
Open Developer Tools (F12) and look for:
- ✅ "User data saved successfully to Firestore"
- ❌ "Missing or insufficient permissions" (means rules still blocking)

### 2. Check Firestore Database
Go to Firebase Console → Firestore Database → Data:
- You should see: `users` collection → user documents with all fields

### 3. Test Data Structure

**For Students:**
```javascript
users/{uid}
{
  userType: "student",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "0821234567",
  idNumber: "0000000000000",
  country: "ZA",
  studentId: "2024001234",
  institution: "University of Cape Town",
  program: "Undergraduate",
  yearOfStudy: "1",
  interests: ["on-campus", "shared"],
  status: "active",
  applicationStatus: "pending",
  crmSynced: false,
  crmContactId: null,
  createdAt: [timestamp],
  lastSyncedAt: null
}
```

**For Providers:**
```javascript
users/{uid}
{
  userType: "provider",
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@property.com",
  phone: "0821234567",
  idNumber: "0000000000000",
  country: "ZA",
  businessName: "Campus Residences Ltd",
  businessRegNumber: "2024/123456/07",
  businessType: "Student Residence",
  propertyAddress: "123 Main St, Cape Town",
  totalUnits: "50",
  priceRange: "R2000-R3500",
  services: ["wifi", "security", "meals"],
  status: "active",
  verificationStatus: "pending",
  listingStatus: "pending_approval",
  crmSynced: false,
  crmContactId: null,
  createdAt: [timestamp],
  lastSyncedAt: null
}
```

## Common Errors

### Error: "Missing or insufficient permissions"
**Cause**: Firestore rules are blocking the write operation
**Solution**: Update Firestore rules as shown above

### Error: "Cannot read property 'set' of undefined"
**Cause**: Firestore not properly initialized
**Solution**: Check that firebase-config.js is loaded correctly

### Error: "auth/operation-not-allowed"
**Cause**: Email/Password authentication not enabled
**Solution**: Go to Firebase Console → Authentication → Sign-in method → Enable Email/Password

## Production Recommendations

For production, you might want to add additional validation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow create: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.data.email == request.auth.token.email;

      allow read, update, delete: if request.auth != null
                                  && request.auth.uid == userId;
    }
  }
}
```

This ensures that the email in the document matches the authenticated user's email.

## Need Help?

1. Open browser console (F12) to see error messages
2. Check Firebase Console → Firestore Database → Rules
3. Verify rules are published (look for green checkmark)
4. Test with a new user registration
5. Check Firestore Database → Data tab for the new document
