import { NextRequest, NextResponse } from "next/server";

const NSFAS_WEBHOOK_URL = "https://2009c4ecf752ec149f8257b7de138b.5c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/815f2361435b414ab0f565260398d275/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=BMrYgldVID2UaJbYHRO2CvgADy7-elokoa5Lc54rdPk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idNumber } = body;

    if (!idNumber || idNumber.length !== 13) {
      return NextResponse.json(
        { error: "Invalid ID number. Must be 13 digits." },
        { status: 400 }
      );
    }

    // Call Power Automate webhook
    const response = await fetch(NSFAS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idNumber }),
    });

    if (!response.ok) {
      console.error("NSFAS webhook error:", response.status, response.statusText);
      return NextResponse.json(
        { error: `NSFAS verification failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log("NSFAS API response:", JSON.stringify(data));
    
    // Return the response from Power Automate
    // Expected format when funded: 
    // { idNumber, funded: true, accomodationCosts, studentName, surname, email, phoneNumber, dateOfBirth, gender, dataverseId }
    // When not funded: { funded: false, accomodationCosts: "0" }
    
    // Handle funded as boolean or string
    const isFunded = data.funded === true || data.funded === "true";
    
    return NextResponse.json({
      idNumber: data.idNumber || idNumber,
      funded: isFunded,
      accommodationCosts: isFunded ? parseFloat(data.accomodationCosts) || 0 : 0,
      // Personal info fields
      studentName: data.studentName || "",
      surname: data.surname || "",
      email: data.email || "",
      phoneNumber: data.phoneNumber || "",
      dateOfBirth: data.dateOfBirth || "",
      gender: data.gender || "",
      dataverseId: data.dataverseId || "",
      // Academic info fields
      institution: data.institution || "",
      fieldOfStudy: data.fieldOfStudy || "",
      levelOfStudy: data.levelOfStudy || "",
      studentNumber: data.studentNumber || "",
    });
  } catch (error) {
    console.error("NSFAS verification error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to verify NSFAS status";
    return NextResponse.json(
      { error: errorMessage, funded: false, accommodationCosts: 0 },
      { status: 500 }
    );
  }
}
