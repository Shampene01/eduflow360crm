/**
 * ROLE CODES
 * 
 * Numeric role codes for user roles in the system.
 * These codes are used for API communication and database storage.
 * 
 * Role Code Mapping:
 * - 0: Student
 * - 1: Manager
 * - 2: Provider
 * - 3: Admin
 * - 4: Supervisor
 * - 5: Registrar
 * - 6: Administrator
 */

// ============================================================================
// ROLE CODE ENUM
// ============================================================================

export enum RoleCode {
  STUDENT = 0,
  MANAGER = 1,
  PROVIDER = 2,
  ADMIN = 3,
  SUPERVISOR = 4,
  REGISTRAR = 5,
  ADMINISTRATOR = 6,
}

// ============================================================================
// ROLE NAME TYPE
// ============================================================================

export type RoleName = 
  | "student" 
  | "manager" 
  | "provider" 
  | "admin" 
  | "supervisor" 
  | "registrar" 
  | "administrator";

// ============================================================================
// ROLE CODE MAPPINGS
// ============================================================================

/**
 * Map from role code (number) to role name (string)
 */
export const ROLE_CODE_TO_NAME: Record<RoleCode, RoleName> = {
  [RoleCode.STUDENT]: "student",
  [RoleCode.MANAGER]: "manager",
  [RoleCode.PROVIDER]: "provider",
  [RoleCode.ADMIN]: "admin",
  [RoleCode.SUPERVISOR]: "supervisor",
  [RoleCode.REGISTRAR]: "registrar",
  [RoleCode.ADMINISTRATOR]: "administrator",
};

/**
 * Map from role name (string) to role code (number)
 */
export const ROLE_NAME_TO_CODE: Record<RoleName, RoleCode> = {
  student: RoleCode.STUDENT,
  manager: RoleCode.MANAGER,
  provider: RoleCode.PROVIDER,
  admin: RoleCode.ADMIN,
  supervisor: RoleCode.SUPERVISOR,
  registrar: RoleCode.REGISTRAR,
  administrator: RoleCode.ADMINISTRATOR,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert a role code (number) to role name (string)
 * @param code - The numeric role code
 * @returns The role name string, or undefined if invalid code
 */
export function getRoleNameFromCode(code: number): RoleName | undefined {
  return ROLE_CODE_TO_NAME[code as RoleCode];
}

/**
 * Convert a role name (string) to role code (number)
 * @param name - The role name string
 * @returns The numeric role code, or undefined if invalid name
 */
export function getRoleCodeFromName(name: string): RoleCode | undefined {
  const normalizedName = name.toLowerCase() as RoleName;
  return ROLE_NAME_TO_CODE[normalizedName];
}

/**
 * Check if a given number is a valid role code
 * @param code - The number to check
 * @returns True if the code is a valid role code
 */
export function isValidRoleCode(code: number): code is RoleCode {
  return Object.values(RoleCode).includes(code);
}

/**
 * Check if a given string is a valid role name
 * @param name - The string to check
 * @returns True if the name is a valid role name
 */
export function isValidRoleName(name: string): name is RoleName {
  return Object.keys(ROLE_NAME_TO_CODE).includes(name.toLowerCase());
}

/**
 * Get all role codes as an array
 * @returns Array of all role codes
 */
export function getAllRoleCodes(): RoleCode[] {
  return [
    RoleCode.STUDENT,
    RoleCode.MANAGER,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.SUPERVISOR,
    RoleCode.REGISTRAR,
    RoleCode.ADMINISTRATOR,
  ];
}

/**
 * Get all role names as an array
 * @returns Array of all role names
 */
export function getAllRoleNames(): RoleName[] {
  return [
    "student",
    "manager",
    "provider",
    "admin",
    "supervisor",
    "registrar",
    "administrator",
  ];
}

// ============================================================================
// ROLE DISPLAY LABELS
// ============================================================================

/**
 * Human-readable labels for each role
 */
export const ROLE_LABELS: Record<RoleCode, string> = {
  [RoleCode.STUDENT]: "Student",
  [RoleCode.MANAGER]: "Manager",
  [RoleCode.PROVIDER]: "Provider",
  [RoleCode.ADMIN]: "Admin",
  [RoleCode.SUPERVISOR]: "Supervisor",
  [RoleCode.REGISTRAR]: "Registrar",
  [RoleCode.ADMINISTRATOR]: "Administrator",
};

/**
 * Get the display label for a role code
 * @param code - The numeric role code
 * @returns The human-readable label
 */
export function getRoleLabel(code: RoleCode): string {
  return ROLE_LABELS[code] || "Unknown";
}

// ============================================================================
// ROLE PERMISSIONS (for reference)
// ============================================================================

/**
 * Role hierarchy levels (higher = more permissions)
 */
export const ROLE_HIERARCHY: Record<RoleCode, number> = {
  [RoleCode.STUDENT]: 0,
  [RoleCode.MANAGER]: 1,
  [RoleCode.PROVIDER]: 2,
  [RoleCode.SUPERVISOR]: 3,
  [RoleCode.REGISTRAR]: 4,
  [RoleCode.ADMINISTRATOR]: 5,
  [RoleCode.ADMIN]: 6, // Highest level
};

/**
 * Check if a role has higher or equal permissions than another
 * @param roleCode - The role to check
 * @param requiredRole - The minimum required role
 * @returns True if roleCode has sufficient permissions
 */
export function hasPermission(roleCode: RoleCode, requiredRole: RoleCode): boolean {
  return ROLE_HIERARCHY[roleCode] >= ROLE_HIERARCHY[requiredRole];
}
