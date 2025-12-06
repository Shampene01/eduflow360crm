"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: ("student" | "provider" | "admin")[];
  redirectTo?: string;
}

// Helper to get user's effective type (supports both legacy and new schema)
function getUserType(user: { userType?: string; roles?: string[] } | null): string | undefined {
  if (!user) return undefined;
  // New schema: check roles array
  if (user.roles && user.roles.length > 0) {
    if (user.roles.includes("provider")) return "provider";
    if (user.roles.includes("admin")) return "admin";
    if (user.roles.includes("student")) return "student";
  }
  // Legacy: use userType
  return user.userType;
}

export function ProtectedRoute({
  children,
  allowedUserTypes,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, loading, firebaseUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        router.push(redirectTo);
        return;
      }

      const effectiveUserType = getUserType(user);
      
      if (allowedUserTypes && effectiveUserType && !allowedUserTypes.includes(effectiveUserType as "student" | "provider" | "admin")) {
        // Redirect to appropriate dashboard based on user type
        if (effectiveUserType === "provider") {
          router.push("/provider-dashboard");
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [loading, firebaseUser, user, allowedUserTypes, router, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return null;
  }

  const effectiveUserType = getUserType(user);
  if (allowedUserTypes && effectiveUserType && !allowedUserTypes.includes(effectiveUserType as "student" | "provider" | "admin")) {
    return null;
  }

  return <>{children}</>;
}
