"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { 
  SystemRBAC, 
  StaffDocument, 
  PermissionKey, 
  ProviderRoleKey 
} from "@/lib/schema";

interface RBACState {
  rbac: SystemRBAC | null;
  staffDoc: StaffDocument | null;
  isLoading: boolean;
  error: Error | null;
}

interface RBACHook extends RBACState {
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  hasAllPermissions: (permissions: PermissionKey[]) => boolean;
  getProviderRole: () => ProviderRoleKey | null;
  getProviderRoleLabel: () => string | null;
  isProviderOwner: boolean;
  isPlatformAdmin: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook for accessing RBAC configuration and checking permissions
 * 
 * Usage:
 * const { hasPermission, isLoading } = useRBAC();
 * if (hasPermission("students.create")) { ... }
 */
export function useRBAC(): RBACHook {
  const { user } = useAuth();
  const [state, setState] = useState<RBACState>({
    rbac: null,
    staffDoc: null,
    isLoading: true,
    error: null,
  });

  // Extract claims from user
  const roleCode = (user as any)?.roleCode ?? 0;
  const providerId = (user as any)?.providerId;
  const userId = user?.userId || user?.uid;

  // Derived states
  const isPlatformAdmin = roleCode >= 3;
  const isProviderOwner = roleCode === 2;
  const isProviderStaff = roleCode === 1;

  // Fetch RBAC config and staff document
  const fetchData = useCallback(async () => {
    if (!db) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Always fetch RBAC config
      const rbacDoc = await getDoc(doc(db, "system", "rbac"));
      const rbacData = rbacDoc.exists() ? (rbacDoc.data() as SystemRBAC) : null;

      // Fetch staff document if user is providerStaff
      let staffData: StaffDocument | null = null;
      if (isProviderStaff && providerId && userId) {
        const staffDocRef = doc(db, `accommodationProviders/${providerId}/staff/${userId}`);
        const staffDocSnap = await getDoc(staffDocRef);
        if (staffDocSnap.exists()) {
          staffData = staffDocSnap.data() as StaffDocument;
        }
      }

      setState({
        rbac: rbacData,
        staffDoc: staffData,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching RBAC data:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }));
    }
  }, [isProviderStaff, providerId, userId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to RBAC changes (real-time updates)
  useEffect(() => {
    if (!db) return;

    const unsubscribe = onSnapshot(
      doc(db, "system", "rbac"),
      (docSnap) => {
        if (docSnap.exists()) {
          setState(prev => ({
            ...prev,
            rbac: docSnap.data() as SystemRBAC,
          }));
        }
      },
      (error) => {
        console.error("Error subscribing to RBAC updates:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  /**
   * Check if the current user has a specific permission
   */
  const hasPermission = useCallback(
    (permission: PermissionKey): boolean => {
      // Platform admins have all permissions
      if (isPlatformAdmin) return true;

      // Provider owners have all permissions within their scope
      if (isProviderOwner) return true;

      // Provider staff must check their role's permissions
      if (isProviderStaff && state.staffDoc && state.rbac) {
        // Check if staff is active
        if (state.staffDoc.status !== "active") return false;

        const role = state.staffDoc.providerRole;
        const roleDefinition = state.rbac.providerRoles[role];
        
        if (roleDefinition?.permissions) {
          return roleDefinition.permissions.includes(permission);
        }
      }

      return false;
    },
    [isPlatformAdmin, isProviderOwner, isProviderStaff, state.staffDoc, state.rbac]
  );

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (permissions: PermissionKey[]): boolean => {
      return permissions.some(p => hasPermission(p));
    },
    [hasPermission]
  );

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permissions: PermissionKey[]): boolean => {
      return permissions.every(p => hasPermission(p));
    },
    [hasPermission]
  );

  /**
   * Get the current user's provider role key
   */
  const getProviderRole = useCallback((): ProviderRoleKey | null => {
    if (isProviderStaff && state.staffDoc) {
      return state.staffDoc.providerRole;
    }
    return null;
  }, [isProviderStaff, state.staffDoc]);

  /**
   * Get the current user's provider role label
   */
  const getProviderRoleLabel = useCallback((): string | null => {
    if (isProviderOwner) return "Provider Owner";
    if (isPlatformAdmin) return roleCode === 4 ? "Super Admin" : "Admin";
    
    if (isProviderStaff && state.staffDoc && state.rbac) {
      const role = state.staffDoc.providerRole;
      return state.rbac.providerRoles[role]?.label || null;
    }
    return null;
  }, [isProviderOwner, isPlatformAdmin, isProviderStaff, roleCode, state.staffDoc, state.rbac]);

  return {
    ...state,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getProviderRole,
    getProviderRoleLabel,
    isProviderOwner,
    isPlatformAdmin,
    refresh: fetchData,
  };
}

/**
 * Simple hook for checking a single permission
 * 
 * Usage:
 * const canCreateStudents = usePermission("students.create");
 */
export function usePermission(permission: PermissionKey): boolean {
  const { hasPermission, isLoading } = useRBAC();
  
  // Return false while loading to prevent flash of unauthorized content
  if (isLoading) return false;
  
  return hasPermission(permission);
}

/**
 * Hook for checking multiple permissions
 * 
 * Usage:
 * const { canView, canEdit, canDelete } = usePermissions({
 *   canView: "students.view",
 *   canEdit: "students.edit",
 *   canDelete: "students.delete",
 * });
 */
export function usePermissions<T extends Record<string, PermissionKey>>(
  permissionMap: T
): Record<keyof T, boolean> & { isLoading: boolean } {
  const { hasPermission, isLoading } = useRBAC();

  const result = Object.entries(permissionMap).reduce(
    (acc, [key, permission]) => {
      acc[key as keyof T] = isLoading ? false : hasPermission(permission);
      return acc;
    },
    {} as Record<keyof T, boolean>
  );

  return { ...result, isLoading };
}
