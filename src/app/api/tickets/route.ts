import { NextRequest, NextResponse } from "next/server";

const TICKETS_WEBHOOK_URL = process.env.DATAVERSE_TICKETS_WEBHOOK_URL || "";

export interface TicketPayload {
  ticketId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  submittedBy: string;
  submittedByEmail: string;
  submittedByName: string;
  providerId?: string;
  providerName?: string;
  referenceType?: string;
  referenceId?: string;
  referenceName?: string;
  attachmentUrls?: string[];
  createdAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TicketPayload = await request.json();

    // Validate required fields
    if (!body.ticketId || !body.subject || !body.description) {
      return NextResponse.json(
        { error: "Missing required fields: ticketId, subject, description" },
        { status: 400 }
      );
    }

    console.log("Submitting ticket to Dataverse:", body.ticketId);

    // Check if webhook URL is configured
    if (!TICKETS_WEBHOOK_URL) {
      console.warn("DATAVERSE_TICKETS_WEBHOOK_URL not configured - skipping Dataverse sync");
      return NextResponse.json({
        success: true,
        ticketId: body.ticketId,
        dataverseId: "",
        message: "Ticket created locally (Dataverse sync not configured)",
      });
    }

    // Call Power Automate webhook
    const response = await fetch(TICKETS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticketId: body.ticketId,
        subject: body.subject,
        description: body.description,
        category: body.category,
        priority: body.priority,
        status: body.status,
        submittedBy: body.submittedBy,
        submittedByEmail: body.submittedByEmail,
        submittedByName: body.submittedByName,
        providerId: body.providerId || "",
        providerName: body.providerName || "",
        referenceType: body.referenceType || "",
        referenceId: body.referenceId || "",
        referenceName: body.referenceName || "",
        attachmentUrls: body.attachmentUrls?.join(";") || "",
        createdAt: body.createdAt,
      }),
    });

    if (!response.ok) {
      console.error("Ticket webhook error:", response.status, response.statusText);
      return NextResponse.json(
        { error: `Failed to submit ticket to Dataverse: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Ticket Dataverse response:", JSON.stringify(data));

    // Return the dataverseId from the response
    return NextResponse.json({
      success: true,
      ticketId: body.ticketId,
      dataverseId: data.dataverseId || data.id || "",
      message: "Ticket submitted successfully",
    });
  } catch (error) {
    console.error("Ticket submission error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to submit ticket";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
