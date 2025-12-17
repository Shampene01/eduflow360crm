import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc, query, where, getDocs, Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, CUSTOM_CLAIM_ROLES, type CustomClaimRole, type StaffInvitation } from "@/lib/schema";
import crypto from "crypto";

// Invitation expiry: 7 days
const INVITATION_EXPIRY_DAYS = 7;

/**
 * Role hierarchy for permission checks
 * Higher number = more permissions
 */
const ROLE_HIERARCHY: Record<number, number> = {
  0: 0,  // none
  1: 1,  // providerStaff
  2: 2,  // provider
  3: 3,  // admin
  4: 4,  // superAdmin
};

/**
 * Roles that a given role can invite
 */
function canInviteRole(inviterRoleCode: number, targetRoleCode: number): boolean {
  // Can only invite roles lower than your own
  return ROLE_HIERARCHY[inviterRoleCode] > ROLE_HIERARCHY[targetRoleCode];
}

/**
 * POST /api/staff/invite
 * Create a new staff invitation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      assignedRole, 
      providerId, 
      invitedBy, 
      invitedByName, 
      invitedByEmail,
      inviterRoleCode,
      providerName,
    } = body;

    // Validate required fields
    if (!email || !assignedRole || !providerId || !invitedBy) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: email, assignedRole, providerId, invitedBy" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate role
    if (!(assignedRole in CUSTOM_CLAIM_ROLES)) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Must be one of: ${Object.keys(CUSTOM_CLAIM_ROLES).join(", ")}` },
        { status: 400 }
      );
    }

    const assignedRoleCode = CUSTOM_CLAIM_ROLES[assignedRole as CustomClaimRole];

    // Check permission: inviter must have higher role than the role being assigned
    if (typeof inviterRoleCode === "number" && !canInviteRole(inviterRoleCode, assignedRoleCode)) {
      return NextResponse.json(
        { success: false, error: "You cannot invite someone with an equal or higher role than yours" },
        { status: 403 }
      );
    }

    // Minimum role to invite: provider (roleCode 2)
    if (typeof inviterRoleCode === "number" && inviterRoleCode < CUSTOM_CLAIM_ROLES.provider) {
      return NextResponse.json(
        { success: false, error: "You must be a Provider or higher to invite staff" },
        { status: 403 }
      );
    }

    // Check if there's already a pending invitation for this email
    const existingQuery = query(
      collection(db, COLLECTIONS.STAFF_INVITATIONS),
      where("email", "==", email.toLowerCase()),
      where("status", "==", "pending"),
      where("providerId", "==", providerId)
    );
    const existingSnap = await getDocs(existingQuery);
    
    if (!existingSnap.empty) {
      return NextResponse.json(
        { success: false, error: "A pending invitation already exists for this email" },
        { status: 409 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    // Calculate expiry date
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    );

    // Create invitation document
    const invitation: Omit<StaffInvitation, "invitationId"> = {
      email: email.toLowerCase(),
      assignedRole: assignedRole as CustomClaimRole,
      assignedRoleCode,
      providerId,
      providerName: providerName || undefined,
      token,
      expiresAt,
      status: "pending",
      invitedBy,
      invitedByName: invitedByName || undefined,
      invitedByEmail: invitedByEmail || undefined,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.STAFF_INVITATIONS), invitation);

    // Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/accept-invite/${token}`;

    return NextResponse.json({
      success: true,
      invitationId: docRef.id,
      inviteUrl,
      expiresAt: expiresAt.toDate().toISOString(),
    });

  } catch (error) {
    console.error("Error creating staff invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/staff/invite
 * List invitations for a provider
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { success: false, error: "providerId is required" },
        { status: 400 }
      );
    }

    const invitationsQuery = query(
      collection(db, COLLECTIONS.STAFF_INVITATIONS),
      where("providerId", "==", providerId)
    );
    const snapshot = await getDocs(invitationsQuery);

    const invitations = snapshot.docs.map((doc) => ({
      invitationId: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString() || null,
      acceptedAt: doc.data().acceptedAt?.toDate?.()?.toISOString() || null,
      revokedAt: doc.data().revokedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      invitations,
    });

  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
