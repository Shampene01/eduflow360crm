/**
 * USER ROLE API ROUTE
 * 
 * Handles role assignment and updates using numeric role codes.
 * 
 * POST /api/users/role - Assign or update user role with integer code
 * GET /api/users/role - Get role codes reference
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  RoleCode, 
  getRoleNameFromCode, 
  isValidRoleCode,
  ROLE_LABELS,
  getAllRoleCodes,
} from "@/lib/roleCodes";

// ============================================================================
// TYPES
// ============================================================================

interface RoleAssignmentRequest {
  userId: string;
  roleCode: number;  // Integer: 0, 1, 2, 3, 4, 5, 6
}

interface RoleAssignmentResponse {
  success: boolean;
  data?: {
    userId: string;
    roleCode: number;
    roleName: string;
    roleLabel: string;
    updatedAt: string;
  };
  error?: string;
}

// ============================================================================
// POST - Assign Role to User
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<RoleAssignmentResponse>> {
  try {
    const body: RoleAssignmentRequest = await request.json();

    // Validate userId
    if (!body.userId || typeof body.userId !== "string") {
      return NextResponse.json(
        { 
          success: false, 
          error: "userId is required and must be a string" 
        },
        { status: 400 }
      );
    }

    // Validate roleCode is provided and is an integer
    if (typeof body.roleCode !== "number" || !Number.isInteger(body.roleCode)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "roleCode must be an integer. Valid codes: 0=Student, 1=Manager, 2=Provider, 3=Admin, 4=Supervisor, 5=Registrar, 6=Administrator" 
        },
        { status: 400 }
      );
    }

    // Validate roleCode is within valid range
    if (!isValidRoleCode(body.roleCode)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid roleCode: ${body.roleCode}. Must be 0-6.` 
        },
        { status: 400 }
      );
    }

    // Get role name from code
    const roleName = getRoleNameFromCode(body.roleCode);
    const roleLabel = ROLE_LABELS[body.roleCode as RoleCode];

    if (!roleName) {
      return NextResponse.json(
        { success: false, error: "Failed to resolve role from code" },
        { status: 500 }
      );
    }

    // TODO: Update user role in Firestore
    // await updateUser(body.userId, { 
    //   role: roleName,
    //   roleCode: body.roleCode,
    // });

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: body.userId,
          roleCode: body.roleCode,
          roleName: roleName,
          roleLabel: roleLabel,
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("POST /api/users/role error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Get Role Codes Reference
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const roleCodes = getAllRoleCodes().map((code) => ({
      code: code,
      name: getRoleNameFromCode(code),
      label: ROLE_LABELS[code],
    }));

    return NextResponse.json({
      success: true,
      data: {
        roleCodes: roleCodes,
        reference: {
          0: { name: "student", label: "Student" },
          1: { name: "manager", label: "Manager" },
          2: { name: "provider", label: "Provider" },
          3: { name: "admin", label: "Admin" },
          4: { name: "supervisor", label: "Supervisor" },
          5: { name: "registrar", label: "Registrar" },
          6: { name: "administrator", label: "Administrator" },
        },
      },
    });

  } catch (error) {
    console.error("GET /api/users/role error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}
