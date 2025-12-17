import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, CUSTOM_CLAIM_ROLE_LABELS } from "@/lib/schema";

/**
 * POST /api/staff/accept
 * Accept an invitation and complete staff registration
 * 
 * This endpoint is called after the user has created their Firebase Auth account.
 * It updates the invitation status and creates/updates the user profile in Firestore.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      token, 
      userId,           // Firebase Auth UID
      email,
      firstNames,
      surname,
      phoneNumber,
      idNumber,
    } = body;

    // Validate required fields
    if (!token || !userId || !email || !firstNames || !surname) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: token, userId, email, firstNames, surname" },
        { status: 400 }
      );
    }

    // Find invitation by token
    const invitationsQuery = query(
      collection(db, COLLECTIONS.STAFF_INVITATIONS),
      where("token", "==", token)
    );
    const snapshot = await getDocs(invitationsQuery);

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    const invitationDoc = snapshot.docs[0];
    const invitation = invitationDoc.data();

    // Validate invitation status
    if (invitation.status === "accepted") {
      return NextResponse.json(
        { success: false, error: "This invitation has already been accepted" },
        { status: 410 }
      );
    }

    if (invitation.status === "revoked") {
      return NextResponse.json(
        { success: false, error: "This invitation has been revoked" },
        { status: 410 }
      );
    }

    // Check expiry
    const expiresAt = invitation.expiresAt?.toDate?.();
    if (expiresAt && expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "This invitation has expired" },
        { status: 410 }
      );
    }

    // Verify email matches invitation
    if (email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Email does not match invitation" },
        { status: 403 }
      );
    }

    // Create user profile in Firestore
    const userProfile = {
      uid: userId,
      userId: userId,
      email: email.toLowerCase(),
      firstNames,
      surname,
      phoneNumber: phoneNumber || null,
      idNumber: idNumber || null,
      role: invitation.assignedRole,
      roleCode: invitation.assignedRoleCode,
      providerId: invitation.providerId,  // Associate with provider
      providerName: invitation.providerName || null,
      isActive: true,
      emailVerified: false,  // Will be updated when email is verified
      createdAt: Timestamp.now(),
      invitedBy: invitation.invitedBy,
      invitationId: invitationDoc.id,
    };

    await setDoc(doc(db, COLLECTIONS.USERS, userId), userProfile);

    // Update invitation status
    await updateDoc(doc(db, COLLECTIONS.STAFF_INVITATIONS, invitationDoc.id), {
      status: "accepted",
      acceptedAt: Timestamp.now(),
      acceptedByUserId: userId,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      user: {
        userId,
        email: email.toLowerCase(),
        role: invitation.assignedRole,
        roleCode: invitation.assignedRoleCode,
        roleLabel: CUSTOM_CLAIM_ROLE_LABELS[invitation.assignedRoleCode],
        providerId: invitation.providerId,
        providerName: invitation.providerName,
      },
      // Return data needed to set custom claims
      claimsData: {
        uid: userId,
        platformRole: invitation.assignedRole,
        roleCode: invitation.assignedRoleCode,
        providerId: invitation.providerId,
      },
    });

  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
