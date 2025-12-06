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

      if (allowedUserTypes && user && !allowedUserTypes.includes(user.userType)) {
        // Redirect to appropriate dashboard based on user type
        if (user.userType === "provider") {
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

  if (allowedUserTypes && user && !allowedUserTypes.includes(user.userType)) {
    return null;
  }

  return <>{children}</>;
}
