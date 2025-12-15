/**
 * Firebase Cloud Functions – Gen 2 (HTTPS)
 * EduFlow360 – Identity & Access Control
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
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
