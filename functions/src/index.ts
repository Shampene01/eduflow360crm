/**
 * Firebase Cloud Functions – Gen 2 (HTTPS)
 * EduFlow360 – Identity & Access Control
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// ------------------------------------------------------------------
// INIT
// ------------------------------------------------------------------
admin.initializeApp();

setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

// ------------------------------------------------------------------
// ROLE DEFINITIONS (SINGLE SOURCE OF TRUTH)
// ------------------------------------------------------------------
const ROLE_MAP: Record<string, number> = {
  superAdmin: 4,    // Platform owner
  admin: 3,         // Platform administrators
  provider: 2,      // Accommodation provider owner
  providerStaff: 1, // Provider's staff (registers students, manages bookings)
  none: 0,          // No claims set (default)
};

const ALLOWED_PLATFORM_ROLES = Object.keys(ROLE_MAP);

// Roles that require a providerId
const PROVIDER_ROLES = ["provider", "providerStaff"];

// ------------------------------------------------------------------
// HELLO WORLD
// ------------------------------------------------------------------
export const helloWorld = onRequest((req, res) => {
  logger.info("Hello logs!", { structuredData: true });
  res.status(200).send("Hello from Firebase!");
});

// ------------------------------------------------------------------
// SET USER CLAIMS (POWER PLATFORM + ADMIN SAFE)
// ------------------------------------------------------------------
export const setUserClaims = onRequest(async (req, res) => {
  try {
    // --------------------------------------------------------------
    // METHOD CHECK
    // --------------------------------------------------------------
    if (req.method !== "POST") {
      res.status(405).json({
        success: false,
        error: "Method not allowed. Use POST.",
      });
      return;
    }

    // --------------------------------------------------------------
    // AUTH HEADER CHECK
    // --------------------------------------------------------------
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Missing or invalid Authorization header",
      });
      return;
    }

    const token = authHeader.replace("Bearer ", "");

    // --------------------------------------------------------------
    // AUTHORIZE CALLER
    // --------------------------------------------------------------
    let isAuthorized = false;
    let performedBy = "unknown";
    let callerRoleCode = 0;

    /**
     * OPTION 1: WIF / Service Account (Power Platform)
     */
    if (token.startsWith("ya29.")) {
      try {
        const response = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`
        );

        if (response.ok) {
          const tokenInfo = await response.json();
          const hasCloudScope =
            tokenInfo.scope?.includes(
              "https://www.googleapis.com/auth/cloud-platform"
            );

          if (hasCloudScope) {
            isAuthorized = true;
            performedBy = tokenInfo.azp || "wif-service-account";
            callerRoleCode = 99; // system-level authority
            logger.info("Authorized via WIF", { performedBy });
          }
        }
      } catch (err) {
        logger.warn("WIF token verification failed", err);
      }
    }

    /**
     * OPTION 2: Firebase ID Token (Admin / SuperAdmin user)
     */
    if (!isAuthorized) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        callerRoleCode = decoded.roleCode ?? 0;

        if (callerRoleCode >= ROLE_MAP.admin) {
          isAuthorized = true;
          performedBy = decoded.uid;
          logger.info("Authorized via Firebase ID token", {
            uid: decoded.uid,
            roleCode: callerRoleCode,
          });
        } else {
          res.status(403).json({
            success: false,
            error: "Permission denied. Admin or higher required.",
          });
          return;
        }
      } catch (err) {
        logger.warn("Firebase ID token verification failed", err);
      }
    }

    if (!isAuthorized) {
      res.status(401).json({
        success: false,
        error: "Unauthorized request",
      });
      return;
    }

    // --------------------------------------------------------------
    // PAYLOAD VALIDATION
    // --------------------------------------------------------------
    const { uid, platformRole, roleCode, providerId } = req.body;

    if (!uid || !platformRole || typeof roleCode !== "number") {
      res.status(400).json({
        success: false,
        error: "uid, platformRole and numeric roleCode are required",
      });
      return;
    }

    if (!ALLOWED_PLATFORM_ROLES.includes(platformRole)) {
      res.status(400).json({
        success: false,
        error: `platformRole must be one of: ${ALLOWED_PLATFORM_ROLES.join(
          ", "
        )}`,
      });
      return;
    }

    // --------------------------------------------------------------
    // ROLE ↔ ROLECODE CONSISTENCY CHECK
    // --------------------------------------------------------------
    if (ROLE_MAP[platformRole] !== roleCode) {
      res.status(400).json({
        success: false,
        error: "roleCode does not match platformRole",
      });
      return;
    }

    // --------------------------------------------------------------
    // PROVIDER-SPECIFIC VALIDATION
    // --------------------------------------------------------------
    const requiresProviderId = PROVIDER_ROLES.includes(platformRole);
    
    if (requiresProviderId && !providerId) {
      res.status(400).json({
        success: false,
        error: `providerId is required for ${platformRole} role`,
      });
      return;
    }

    if (!requiresProviderId && providerId) {
      res.status(400).json({
        success: false,
        error: "providerId must NOT be set for admin roles",
      });
      return;
    }

    // --------------------------------------------------------------
    // BUILD CLAIMS
    // --------------------------------------------------------------
    const claims: Record<string, any> = {
      platformRole,
      roleCode,
    };

    if (providerId) {
      claims.providerId = providerId;
    }

    // --------------------------------------------------------------
    // SET CLAIMS
    // --------------------------------------------------------------
    await admin.auth().setCustomUserClaims(uid, claims);

    logger.info("Custom claims set successfully", {
      targetUid: uid,
      claims,
      performedBy,
    });

    res.status(200).json({
      success: true,
      message: `Claims set for user ${uid}`,
      claims,
    });
  } catch (error) {
    logger.error("Error setting user claims", error);

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// ------------------------------------------------------------------
// GET USER CLAIMS (DEBUG / ADMIN TOOL)
// ------------------------------------------------------------------
export const getUserClaims = onRequest(async (req, res) => {
  try {
    if (!["GET", "POST"].includes(req.method)) {
      res.status(405).json({
        success: false,
        error: "Method not allowed",
      });
      return;
    }

    const uid =
      req.method === "GET"
        ? (req.query.uid as string)
        : req.body.uid;

    if (!uid) {
      res.status(400).json({
        success: false,
        error: "uid is required",
      });
      return;
    }

    const user = await admin.auth().getUser(uid);

    res.status(200).json({
      success: true,
      uid,
      email: user.email,
      customClaims: user.customClaims || {},
    });
  } catch (error: any) {
    logger.error("Error retrieving user claims", error);

    if (error.code === "auth/user-not-found") {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// ------------------------------------------------------------------
// BACKFILL PAYMENT SUMMARIES (One-time HTTP endpoint)
// Run once to populate providerSummaries from existing payments
// ------------------------------------------------------------------
export const backfillPaymentSummaries = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
    return;
  }

  const db = admin.firestore();
  
  try {
    logger.info("Starting payment summaries backfill...");

    // Get all payments
    const paymentsSnapshot = await db.collection("payments").get();
    logger.info(`Found ${paymentsSnapshot.size} total payments`);

    // Group payments by provider
    const paymentsByProvider: Record<string, FirebaseFirestore.QueryDocumentSnapshot[]> = {};

    paymentsSnapshot.forEach((doc) => {
      const data = doc.data();
      const providerId = data.providerId;
      if (providerId) {
        if (!paymentsByProvider[providerId]) {
          paymentsByProvider[providerId] = [];
        }
        paymentsByProvider[providerId].push(doc);
      }
    });

    const providerIds = Object.keys(paymentsByProvider);
    logger.info(`Found ${providerIds.length} providers with payments`);

    const results: Record<string, { totalPayments: number; totalAmount: number }> = {};

    // Process each provider
    for (const providerId of providerIds) {
      const payments = paymentsByProvider[providerId];

      // Calculate summary
      const summary: Record<string, unknown> = {
        providerId,
        totalPayments: 0,
        totalAmount: 0,
        byMonth: {} as Record<string, { count: number; amount: number }>,
        bySource: {
          NSFAS: { count: 0, amount: 0 },
          Manual: { count: 0, amount: 0 },
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      let totalPayments = 0;
      let totalAmount = 0;

      for (const doc of payments) {
        const payment = doc.data();

        // Only count Posted payments
        if (payment.status !== "Posted") {
          continue;
        }

        const amount = payment.disbursedAmount || 0;
        const source = payment.source as string;
        const paymentPeriod = payment.paymentPeriod;

        totalPayments += 1;
        totalAmount += amount;

        // Update by source
        if (source === "NSFAS" || source === "Manual") {
          const bySource = summary.bySource as Record<string, { count: number; amount: number }>;
          bySource[source].count += 1;
          bySource[source].amount += amount;
        }

        // Update by month
        if (paymentPeriod) {
          const yearMonth = paymentPeriod.slice(0, 7);
          const byMonth = summary.byMonth as Record<string, { count: number; amount: number }>;
          if (!byMonth[yearMonth]) {
            byMonth[yearMonth] = { count: 0, amount: 0 };
          }
          byMonth[yearMonth].count += 1;
          byMonth[yearMonth].amount += amount;
        }
      }

      summary.totalPayments = totalPayments;
      summary.totalAmount = totalAmount;

      // Write summary to Firestore
      await db.collection("providerSummaries").doc(providerId).set(summary);

      results[providerId] = { totalPayments, totalAmount };
    }

    logger.info("Backfill complete!", { providerCount: providerIds.length });

    res.status(200).json({
      success: true,
      message: "Backfill complete",
      providersProcessed: providerIds.length,
      results,
    });
  } catch (error) {
    logger.error("Error during backfill", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during backfill",
    });
  }
});

// ------------------------------------------------------------------
// PAYMENT SUMMARY AGGREGATION (Firestore Trigger)
// Maintains denormalized summary documents for efficient dashboard reads
// ------------------------------------------------------------------
export const updatePaymentSummary = onDocumentWritten(
  "payments/{paymentId}",
  async (event) => {
    const db = admin.firestore();
    
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    
    // Determine the providerId from before or after data
    const providerId = afterData?.providerId || beforeData?.providerId;
    if (!providerId) {
      logger.warn("No providerId found in payment document");
      return;
    }
    
    // Calculate delta for amount and count
    let amountDelta = 0;
    let countDelta = 0;
    
    const beforeAmount = beforeData?.disbursedAmount || 0;
    const afterAmount = afterData?.disbursedAmount || 0;
    const beforeStatus = beforeData?.status;
    const afterStatus = afterData?.status;
    
    // Only count "Posted" payments in the summary
    const wasPosted = beforeStatus === "Posted";
    const isPosted = afterStatus === "Posted";
    
    if (!beforeData && afterData) {
      // Document created
      if (isPosted) {
        amountDelta = afterAmount;
        countDelta = 1;
      }
    } else if (beforeData && !afterData) {
      // Document deleted
      if (wasPosted) {
        amountDelta = -beforeAmount;
        countDelta = -1;
      }
    } else if (beforeData && afterData) {
      // Document updated
      if (wasPosted && !isPosted) {
        // Status changed from Posted to something else
        amountDelta = -beforeAmount;
        countDelta = -1;
      } else if (!wasPosted && isPosted) {
        // Status changed to Posted
        amountDelta = afterAmount;
        countDelta = 1;
      } else if (wasPosted && isPosted) {
        // Still Posted, but amount might have changed
        amountDelta = afterAmount - beforeAmount;
      }
    }
    
    // Skip if no changes to Posted payments
    if (amountDelta === 0 && countDelta === 0) {
      return;
    }
    
    // Get payment period for monthly breakdown
    const paymentPeriod = afterData?.paymentPeriod || beforeData?.paymentPeriod;
    const yearMonth = paymentPeriod ? paymentPeriod.slice(0, 7) : null;
    
    // Get source for source breakdown
    const source = afterData?.source || beforeData?.source;
    
    // Update the summary document
    const summaryRef = db.collection("providerSummaries").doc(providerId);
    
    try {
      await db.runTransaction(async (transaction) => {
        const summaryDoc = await transaction.get(summaryRef);
        
        if (!summaryDoc.exists) {
          // Create new summary document
          const newSummary: Record<string, unknown> = {
            providerId,
            totalPayments: Math.max(0, countDelta),
            totalAmount: Math.max(0, amountDelta),
            byMonth: {} as Record<string, { count: number; amount: number }>,
            bySource: {
              NSFAS: { count: 0, amount: 0 },
              Manual: { count: 0, amount: 0 },
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          
          if (yearMonth) {
            (newSummary.byMonth as Record<string, { count: number; amount: number }>)[yearMonth] = {
              count: Math.max(0, countDelta),
              amount: Math.max(0, amountDelta),
            };
          }
          
          if (source && (source === "NSFAS" || source === "Manual")) {
            (newSummary.bySource as Record<string, { count: number; amount: number }>)[source] = {
              count: Math.max(0, countDelta),
              amount: Math.max(0, amountDelta),
            };
          }
          
          transaction.set(summaryRef, newSummary);
        } else {
          // Update existing summary
          const updates: Record<string, unknown> = {
            totalPayments: admin.firestore.FieldValue.increment(countDelta),
            totalAmount: admin.firestore.FieldValue.increment(amountDelta),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          
          if (yearMonth) {
            updates[`byMonth.${yearMonth}.count`] = admin.firestore.FieldValue.increment(countDelta);
            updates[`byMonth.${yearMonth}.amount`] = admin.firestore.FieldValue.increment(amountDelta);
          }
          
          if (source && (source === "NSFAS" || source === "Manual")) {
            updates[`bySource.${source}.count`] = admin.firestore.FieldValue.increment(countDelta);
            updates[`bySource.${source}.amount`] = admin.firestore.FieldValue.increment(amountDelta);
          }
          
          transaction.update(summaryRef, updates);
        }
      });
      
      logger.info(`Updated payment summary for provider ${providerId}`, {
        amountDelta,
        countDelta,
        yearMonth,
        source,
      });
    } catch (error) {
      logger.error("Error updating payment summary", error);
    }
  }
);
