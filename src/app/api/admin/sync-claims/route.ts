import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * POST /api/admin/sync-claims
 * Triggers a claims sync for a user by updating their document
 * This will trigger the syncUserClaims Cloud Function
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    // Update the user document to trigger the Cloud Function
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: `Claims sync triggered for user ${userId}. User may need to log out and back in.`,
    });
  } catch (error: any) {
    console.error("Error triggering claims sync:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to trigger claims sync" },
      { status: 500 }
    );
  }
}
