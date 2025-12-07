"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: ("student" | "provider" | "admin")[];
  redirectTo?: string;
  requireEmailVerification?: boolean;
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
  requireEmailVerification = true,
}: ProtectedRouteProps) {
  const { user, loading, profileLoading, firebaseUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Combined loading state: wait for both auth AND profile to be ready
  const isLoading = loading || profileLoading;

  useEffect(() => {
    if (!isLoading) {
      // Not logged in - redirect to login
      if (!firebaseUser) {
        router.push(redirectTo);
        return;
      }

      // Check email verification (skip for verify-email page itself)
      if (requireEmailVerification && !firebaseUser.emailVerified && pathname !== "/verify-email") {
        router.push("/verify-email");
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
  }, [isLoading, firebaseUser, user, allowedUserTypes, router, redirectTo, requireEmailVerification, pathname]);

  // Show loading while auth state OR profile is loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!firebaseUser) {
    return null;
  }

  // Email not verified (and verification is required)
  if (requireEmailVerification && !firebaseUser.emailVerified && pathname !== "/verify-email") {
    return null;
  }

  const effectiveUserType = getUserType(user);
  if (allowedUserTypes && effectiveUserType && !allowedUserTypes.includes(effectiveUserType as "student" | "provider" | "admin")) {
    return null;
  }

  return <>{children}</>;
}
