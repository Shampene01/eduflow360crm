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
    
    // Return the response from Power Automate
    // Expected format: { idNumber, funded, accomodationCosts }
    return NextResponse.json({
      idNumber: data.idNumber,
      funded: data.funded === true,
      accommodationCosts: data.funded ? parseFloat(data.accomodationCosts) || 0 : 0,
    });
  } catch (error) {
    console.error("NSFAS verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify NSFAS status" },
      { status: 500 }
    );
  }
}
