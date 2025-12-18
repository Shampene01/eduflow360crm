"use client";

import { ReactNode } from "react";
import { useRBAC } from "@/hooks/useRBAC";
import type { PermissionKey } from "@/lib/schema";
import { Loader2, ShieldX } from "lucide-react";

interface PermissionGuardProps {
  /** Required permission to view children */
  permission: PermissionKey;
  /** Content to render if user has permission */
  children: ReactNode;
  /** Optional fallback content if user lacks permission (default: null) */
  fallback?: ReactNode;
  /** Show loading spinner while checking permissions (default: false) */
  showLoading?: boolean;
  /** Show access denied message instead of hiding (default: false) */
  showDenied?: boolean;
}

/**
 * Guards content based on user permissions
 * 
 * @example
 * // Hide button if no permission
 * <PermissionGuard permission="students.create">
 *   <Button>Add Student</Button>
 * </PermissionGuard>
 * 
 * @example
 * // Show custom fallback
 * <PermissionGuard 
 *   permission="payments.record" 
 *   fallback={<p>Contact your manager to record payments</p>}
 * >
 *   <PaymentForm />
 * </PermissionGuard>
 * 
 * @example
 * // Show access denied message
 * <PermissionGuard permission="staff.manage" showDenied>
 *   <StaffManagement />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
  showLoading = false,
  showDenied = false,
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = useRBAC();

  // Show loading state if requested
  if (isLoading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  // Don't render anything while loading (prevents flash)
  if (isLoading) {
    return null;
  }

  // Check permission
  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  // Show access denied message if requested
  if (showDenied) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          Access Denied
        </h3>
        <p className="text-slate-500 max-w-md">
          You don't have permission to access this feature. 
          Contact your provider administrator if you need access.
        </p>
      </div>
    );
  }

  // Return fallback (default: null)
  return <>{fallback}</>;
}

interface MultiPermissionGuardProps {
  /** Required permissions - user must have ALL */
  permissions?: PermissionKey[];
  /** Alternative permissions - user must have ANY */
  anyOf?: PermissionKey[];
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
  showDenied?: boolean;
}

/**
 * Guards content based on multiple permissions
 * 
 * @example
 * // Require ALL permissions
 * <MultiPermissionGuard permissions={["students.view", "students.edit"]}>
 *   <EditStudentForm />
 * </MultiPermissionGuard>
 * 
 * @example
 * // Require ANY permission
 * <MultiPermissionGuard anyOf={["reports.students", "reports.financial"]}>
 *   <ReportsSection />
 * </MultiPermissionGuard>
 */
export function MultiPermissionGuard({
  permissions,
  anyOf,
  children,
  fallback = null,
  showLoading = false,
  showDenied = false,
}: MultiPermissionGuardProps) {
  const { hasAllPermissions, hasAnyPermission, isLoading } = useRBAC();

  if (isLoading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isLoading) {
    return null;
  }

  let hasAccess = false;

  if (permissions && permissions.length > 0) {
    hasAccess = hasAllPermissions(permissions);
  } else if (anyOf && anyOf.length > 0) {
    hasAccess = hasAnyPermission(anyOf);
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (showDenied) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          Access Denied
        </h3>
        <p className="text-slate-500 max-w-md">
          You don't have the required permissions to access this feature.
        </p>
      </div>
    );
  }

  return <>{fallback}</>;
}

/**
 * Higher-order component for permission-based access control
 * 
 * @example
 * const ProtectedComponent = withPermission(MyComponent, "staff.manage");
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: PermissionKey,
  FallbackComponent?: React.ComponentType
) {
  return function PermissionProtectedComponent(props: P) {
    const { hasPermission, isLoading } = useRBAC();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      );
    }

    if (!hasPermission(permission)) {
      return FallbackComponent ? <FallbackComponent /> : null;
    }

    return <Component {...props} />;
  };
}
