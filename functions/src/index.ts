/**
 * Firebase Cloud Functions – Gen 2 (HTTPS)
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
// HELLO WORLD (UNCHANGED)
// ------------------------------------------------------------------
export const helloWorld = onRequest((req, res) => {
  logger.info("Hello logs!", { structuredData: true });
  res.status(200).send("Hello from Firebase!");
});

// ------------------------------------------------------------------
// SET USER CLAIMS (HTTPS – POWER PLATFORM SAFE)
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
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Missing or invalid Authorization header",
      });
      return;
    }

    const token = authHeader.replace("Bearer ", "");

    // --------------------------------------------------------------
    // DETERMINE AUTH TYPE & VERIFY
    // --------------------------------------------------------------
    let isAuthorized = false;
    let performedBy = "unknown";

    // Try 1: Check if it's a Google Access Token from WIF (Service Account)
    if (token.startsWith("ya29.")) {
      try {
        const response = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`
        );
        
        if (response.ok) {
          const tokenInfo = await response.json();
          
          logger.info("Token info received", { tokenInfo });
          
          // Check if token has cloud-platform scope (WIF service account)
          const hasCloudPlatformScope = tokenInfo.scope?.includes("https://www.googleapis.com/auth/cloud-platform");
          
          if (hasCloudPlatformScope) {
            isAuthorized = true;
            performedBy = tokenInfo.azp || "wif-service-account";
            logger.info("Authorized via WIF token", { azp: tokenInfo.azp });
          }
        } else {
          const errorBody = await response.text();
          logger.warn("Token validation failed", { status: response.status, body: errorBody });
        }
      } catch (wifError) {
        logger.warn("WIF token verification failed", wifError);
      }
    }

    // Try 2: Check if it's a Firebase ID Token (User)
    if (!isAuthorized) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const roleCode = decodedToken.roleCode ?? 0;

        if (roleCode >= 3) {
          isAuthorized = true;
          performedBy = decodedToken.uid;
          logger.info("Authorized via Firebase ID token", { uid: decodedToken.uid, roleCode });
        } else {
          res.status(403).json({
            success: false,
            error: "Permission denied. Admin role required (roleCode >= 3).",
          });
          return;
        }
      } catch (firebaseError) {
        logger.warn("Firebase ID token verification failed", firebaseError);
      }
    }

    // --------------------------------------------------------------
    // FINAL AUTH CHECK
    // --------------------------------------------------------------
    if (!isAuthorized) {
      res.status(401).json({
        success: false,
        error: "Unauthorized. Provide a valid Firebase ID token or WIF service account token.",
      });
      return;
    }

    // --------------------------------------------------------------
    // PAYLOAD VALIDATION
    // --------------------------------------------------------------
    const { uid, platformRole, roleCode: targetRoleCode, providerId } = req.body;

    if (!uid || !platformRole || typeof targetRoleCode !== "number") {
      res.status(400).json({
        success: false,
        error: "Missing required fields: uid, platformRole, roleCode (number)",
      });
      return;
    }

    if (platformRole !== "admin" && platformRole !== "provider") {
      res.status(400).json({
        success: false,
        error: "platformRole must be 'admin' or 'provider'",
      });
      return;
    }

    if (platformRole === "provider" && !providerId) {
      res.status(400).json({
        success: false,
        error: "providerId is required when platformRole is 'provider'",
      });
      return;
    }

    // --------------------------------------------------------------
    // BUILD CLAIMS
    // --------------------------------------------------------------
    const claims: Record<string, any> = {
      platformRole,
      roleCode: targetRoleCode,
    };

    if (providerId) {
      claims.providerId = providerId;
    }

    // --------------------------------------------------------------
    // SET CLAIMS
    // --------------------------------------------------------------
    await admin.auth().setCustomUserClaims(uid, claims);

    logger.info("Custom claims set", {
      targetUid: uid,
      claims,
      performedBy,
    });

    res.status(200).json({
      success: true,
      message: `Claims successfully set for user ${uid}`,
      claims,
    });
  } catch (error: any) {
    logger.error("Error setting custom claims", error);

    res.status(500).json({
      success: false,
      error: "Internal server error while setting claims",
    });
  }
});