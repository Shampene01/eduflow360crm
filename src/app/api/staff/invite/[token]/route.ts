import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, CUSTOM_CLAIM_ROLE_LABELS } from "@/lib/schema";

/**
 * GET /api/staff/invite/[token]
 * Validate an invitation token and return invitation details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
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

    // Check if already accepted
    if (invitation.status === "accepted") {
      return NextResponse.json(
        { success: false, error: "This invitation has already been accepted" },
        { status: 410 }
      );
    }

    // Check if revoked
    if (invitation.status === "revoked") {
      return NextResponse.json(
        { success: false, error: "This invitation has been revoked" },
        { status: 410 }
      );
    }

    // Check if expired
    const expiresAt = invitation.expiresAt?.toDate?.();
    if (expiresAt && expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "This invitation has expired" },
        { status: 410 }
      );
    }

    // Return invitation details (without sensitive token)
    return NextResponse.json({
      success: true,
      invitation: {
        invitationId: invitationDoc.id,
        email: invitation.email,
        assignedRole: invitation.assignedRole,
        assignedRoleCode: invitation.assignedRoleCode,
        assignedRoleLabel: CUSTOM_CLAIM_ROLE_LABELS[invitation.assignedRoleCode] || "Unknown",
        providerId: invitation.providerId,
        providerName: invitation.providerName || "Unknown Provider",
        invitedByName: invitation.invitedByName || "Unknown",
        invitedByEmail: invitation.invitedByEmail,
        expiresAt: expiresAt?.toISOString() || null,
        createdAt: invitation.createdAt?.toDate?.()?.toISOString() || null,
      },
    });

  } catch (error) {
    console.error("Error validating invitation token:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate invitation" },
      { status: 500 }
    );
  }
}
