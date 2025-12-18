/**
 * Script to trigger claims sync for existing staff members
 * Run with: npx ts-node scripts/sync-staff-claims.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin with service account
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('Error loading service account. Make sure serviceAccountKey.json exists in project root.');
  console.error('You can download it from Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

const db = admin.firestore();

async function syncStaffClaims() {
  console.log('Finding staff members with providerId...\n');

  // Query users with providerId (staff members)
  const staffQuery = await db.collection('users')
    .where('providerId', '!=', '')
    .get();

  if (staffQuery.empty) {
    console.log('No staff members found with providerId.');
    return;
  }

  console.log(`Found ${staffQuery.size} staff member(s). Triggering claims sync...\n`);

  for (const doc of staffQuery.docs) {
    const userData = doc.data();
    const userId = doc.id;
    
    console.log(`Processing: ${userData.firstNames} ${userData.surname} (${userData.email})`);
    console.log(`  Role: ${userData.role}, RoleCode: ${userData.roleCode}`);
    console.log(`  ProviderId: ${userData.providerId}`);

    // Update the document to trigger the syncUserClaims function
    // We just touch updatedAt which is a harmless field
    await db.collection('users').doc(userId).update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`  ✓ Triggered claims sync for ${userId}\n`);
  }

  console.log('Done! Claims will be synced by the Cloud Function.');
  console.log('Staff members may need to log out and back in for claims to take effect.');
}

syncStaffClaims()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
