import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";

/**
 * POST /api/staff/onboard
 * Create a pending user record for staff onboarding
 * 
 * This creates a document in the "pendingUsers" collection which Power Automate
 * will pick up to create the actual Firebase Auth user and sync back.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstNames,
      surname,
      email,
      phoneNumber,
      idNumber,
      dateOfBirth,
      gender,
      role,
      isActive,
      marketingConsent,
      // Address fields
      street,
      suburb,
      townCity,
      province,
      postalCode,
      country,
      // Provider association
      providerId,
      providerName,
      createdBy,
      createdByName,
    } = body;

    // Validate required fields
    if (!firstNames || !surname || !email || !providerId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: firstNames, surname, email, providerId" },
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

    // Check if user already exists in users collection
    const existingUserQuery = query(
      collection(db, COLLECTIONS.USERS),
      where("email", "==", email.toLowerCase())
    );
    const existingUserSnap = await getDocs(existingUserQuery);

    if (!existingUserSnap.empty) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Check if already pending
    const pendingQuery = query(
      collection(db, "pendingUsers"),
      where("email", "==", email.toLowerCase()),
      where("status", "==", "pending")
    );
    const pendingSnap = await getDocs(pendingQuery);

    if (!pendingSnap.empty) {
      return NextResponse.json(
        { success: false, error: "A pending user registration already exists for this email" },
        { status: 409 }
      );
    }

    // Determine roleCode based on role
    const roleCodeMap: Record<string, number> = {
      providerStaff: 1,
      manager: 1,
      receptionist: 1,
      maintenance: 1,
      provider: 2,
    };
    const roleCode = roleCodeMap[role] || 1;

    // Build address object
    const address = {
      street: street || "",
      suburb: suburb || "",
      townCity: townCity || "",
      province: province || "",
      postalCode: postalCode || "",
      country: country || "South Africa",
    };

    // Create pending user document
    // This format matches what Power Automate expects
    const now = new Date().toISOString();
    const pendingUser = {
      // Personal Info
      firstNames,
      surname,
      email: email.toLowerCase(),
      phoneNumber: phoneNumber || "",
      idNumber: idNumber || "",
      dateOfBirth: dateOfBirth || "",
      gender: gender || "",
      
      // Role & Status
      role,
      roleCode,
      isActive: isActive !== false,
      emailVerified: false,
      marketingConsent: marketingConsent || false,
      
      // Provider Association
      providerId,
      providerName: providerName || "",
      
      // Address
      address,
      addressId: "",
      
      // Empty fields for Firebase Auth sync
      userId: "", // Will be filled by Power Automate after Auth user creation
      profilePhotoUrl: "",
      idDocumentUrl: "",
      
      // Status tracking
      status: "pending", // pending | processing | completed | failed
      errorMessage: "",
      
      // Audit
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: createdBy || "",
      createdByName: createdByName || "",
      
      // Timestamps for Power Automate (ISO format)
      createdAtISO: now,
      updatedAtISO: now,
    };

    // Add to pendingUsers collection
    const docRef = await addDoc(collection(db, "pendingUsers"), pendingUser);

    return NextResponse.json({
      success: true,
      pendingUserId: docRef.id,
      message: "Staff user registration submitted. Account will be created shortly.",
    });

  } catch (error: any) {
    console.error("Error creating pending user:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create pending user" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/staff/onboard
 * List pending users for a provider
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

    const pendingQuery = query(
      collection(db, "pendingUsers"),
      where("providerId", "==", providerId)
    );
    const snapshot = await getDocs(pendingQuery);

    const pendingUsers = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAtISO || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAtISO || null,
      };
    });

    // Sort by createdAt descending
    pendingUsers.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      pendingUsers,
    });

  } catch (error: any) {
    console.error("Error fetching pending users:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch pending users" },
      { status: 500 }
    );
  }
}
