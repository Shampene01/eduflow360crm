/**
 * USERS API ROUTE
 * 
 * Handles user operations with numeric role codes.
 * 
 * POST /api/users - Create or update user with role code (integer)
 * GET /api/users - Get user(s) with role code in response
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  RoleCode, 
  getRoleNameFromCode, 
  getRoleCodeFromName,
  isValidRoleCode,
  ROLE_CODE_TO_NAME,
} from "@/lib/roleCodes";

// ============================================================================
// TYPES
// ============================================================================

interface UserRequestBody {
  userId?: string;
  email: string;
  firstNames: string;
  surname: string;
  roleCode: number;  // Integer role code (0, 1, 2, 3, etc.)
  phoneNumber?: string;
  idNumber?: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other";
  address?: {
    street: string;
    suburb?: string;
    townCity: string;
    province: string;
    postalCode?: string;
    country?: string;
  };
  marketingConsent?: boolean;
}

interface UserResponse {
  success: boolean;
  data?: {
    userId: string;
    email: string;
    firstNames: string;
    surname: string;
    roleCode: number;      // Integer role code
    roleName: string;      // String role name for display
    phoneNumber?: string;
    idNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: object;
    isActive: boolean;
    emailVerified: boolean;
    createdAt?: string;
  };
  error?: string;
}

// ============================================================================
// POST - Create/Update User with Role Code
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<UserResponse>> {
  try {
    const body: UserRequestBody = await request.json();

    // Validate required fields
    if (!body.email || !body.firstNames || !body.surname) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: email, firstNames, surname" 
        },
        { status: 400 }
      );
    }

    // Validate role code is a valid integer
    if (typeof body.roleCode !== "number" || !Number.isInteger(body.roleCode)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "roleCode must be an integer (0=Student, 1=Manager, 2=Provider, 3=Admin, 4=Supervisor, 5=Registrar, 6=Administrator)" 
        },
        { status: 400 }
      );
    }

    // Validate role code is within valid range
    if (!isValidRoleCode(body.roleCode)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid roleCode: ${body.roleCode}. Valid codes: 0=Student, 1=Manager, 2=Provider, 3=Admin, 4=Supervisor, 5=Registrar, 6=Administrator` 
        },
        { status: 400 }
      );
    }

    // Convert role code to role name for storage
    const roleName = getRoleNameFromCode(body.roleCode);
    if (!roleName) {
      return NextResponse.json(
        { success: false, error: "Failed to resolve role name from code" },
        { status: 500 }
      );
    }

    // Here you would typically save to Firestore
    // For now, we return the processed data
    const userData = {
      userId: body.userId || `user_${Date.now()}`,
      email: body.email,
      firstNames: body.firstNames,
      surname: body.surname,
      roleCode: body.roleCode,           // Store as integer
      roleName: roleName,                 // Also store string for queries
      phoneNumber: body.phoneNumber,
      idNumber: body.idNumber,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      address: body.address ? {
        ...body.address,
        country: body.address.country || "South Africa",
      } : undefined,
      isActive: true,
      emailVerified: false,
      createdAt: new Date().toISOString(),
    };

    // TODO: Save to Firestore
    // await createUser(userData.userId, {
    //   ...userData,
    //   role: roleName,
    // });

    return NextResponse.json(
      { 
        success: true, 
        data: userData 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("POST /api/users error:", error);
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
// GET - Get User(s) with Role Code
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const roleCode = searchParams.get("roleCode");

    // If roleCode filter provided, validate it
    if (roleCode !== null) {
      const code = parseInt(roleCode, 10);
      if (isNaN(code) || !isValidRoleCode(code)) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid roleCode: ${roleCode}. Valid codes: 0=Student, 1=Manager, 2=Provider, 3=Admin, 4=Supervisor, 5=Registrar, 6=Administrator` 
          },
          { status: 400 }
        );
      }
    }

    // TODO: Fetch from Firestore based on filters
    // For now, return role code reference
    return NextResponse.json({
      success: true,
      roleCodes: {
        0: "Student",
        1: "Manager",
        2: "Provider",
        3: "Admin",
        4: "Supervisor",
        5: "Registrar",
        6: "Administrator",
      },
      message: "Use roleCode parameter to filter users by role",
    });

  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}
