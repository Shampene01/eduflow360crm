import { NextRequest, NextResponse } from "next/server";

// Power Automate webhook URL for staff onboarding
const POWER_AUTOMATE_WEBHOOK_URL = process.env.POWER_AUTOMATE_STAFF_WEBHOOK_URL;

/**
 * POST /api/staff/onboard
 * Send staff onboarding data directly to Power Automate webhook
 * Power Automate will handle creating the Firebase Auth user and Firestore profile
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

    // Check webhook is configured
    if (!POWER_AUTOMATE_WEBHOOK_URL) {
      console.error("POWER_AUTOMATE_STAFF_WEBHOOK_URL not configured");
      return NextResponse.json(
        { success: false, error: "Staff onboarding service not configured" },
        { status: 500 }
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

    const now = new Date().toISOString();

    // Format payload for Power Automate (Firestore REST API format)
    const powerAutomatePayload = {
      fields: {
        firstNames: { stringValue: firstNames },
        surname: { stringValue: surname },
        email: { stringValue: email.toLowerCase() },
        phoneNumber: { stringValue: phoneNumber || "" },
        idNumber: { stringValue: idNumber || "" },
        dateOfBirth: { stringValue: dateOfBirth || "" },
        gender: { stringValue: gender || "" },
        role: { stringValue: role },
        roleCode: { integerValue: roleCode },
        isActive: { booleanValue: isActive !== false },
        emailVerified: { booleanValue: false },
        marketingConsent: { booleanValue: marketingConsent || false },
        providerId: { stringValue: providerId },
        providerName: { stringValue: providerName || "" },
        userId: { stringValue: "" }, // Will be filled by Power Automate
        profilePhotoUrl: { stringValue: "" },
        idDocumentUrl: { stringValue: "" },
        addressId: { stringValue: "" },
        address: {
          mapValue: {
            fields: {
              street: { stringValue: street || "" },
              suburb: { stringValue: suburb || "" },
              townCity: { stringValue: townCity || "" },
              province: { stringValue: province || "" },
              postalCode: { stringValue: postalCode || "" },
              country: { stringValue: country || "South Africa" },
            },
          },
        },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
        lastLoginAt: { timestampValue: now },
        lastLogoutAt: { timestampValue: now },
        createdBy: { stringValue: createdBy || "" },
        createdByName: { stringValue: createdByName || "" },
      },
    };

    // Send to Power Automate webhook
    const webhookResponse = await fetch(POWER_AUTOMATE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(powerAutomatePayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("Power Automate webhook failed:", webhookResponse.status, errorText);
      return NextResponse.json(
        { success: false, error: "Failed to submit staff registration" },
        { status: 500 }
      );
    }

    console.log("Power Automate webhook triggered successfully for:", email);

    return NextResponse.json({
      success: true,
      message: "Staff user registration submitted. Account will be created shortly.",
    });

  } catch (error: any) {
    console.error("Error submitting staff onboarding:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to submit staff registration" },
      { status: 500 }
    );
  }
}
