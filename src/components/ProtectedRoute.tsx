"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProviderByUserId, getProviderById } from "@/lib/db";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: ("student" | "provider" | "admin")[];
  redirectTo?: string;
  requireEmailVerification?: boolean;
}

// Helper to get user's effective type (supports both legacy and new schema)
function getUserType(user: { userType?: string; roles?: string[]; role?: string; providerId?: string } | null): string | undefined {
  if (!user) return undefined;
  
  // Check single role field first (new schema)
  if (user.role) {
    // Provider staff and manager roles should be treated as provider-type users
    if (user.role === "providerStaff" || user.role === "manager") return "provider";
    if (user.role === "provider") return "provider";
    if (user.role === "admin") return "admin";
    if (user.role === "student") return "student";
  }
  
  // Check roles array (legacy)
  if (user.roles && user.roles.length > 0) {
    if (user.roles.includes("provider") || user.roles.includes("providerStaff") || user.roles.includes("manager")) return "provider";
    if (user.roles.includes("admin")) return "admin";
    if (user.roles.includes("student")) return "student";
  }
  
  // If user has providerId, they're associated with a provider
  if (user.providerId) return "provider";
  
  // Legacy: use userType
  return user.userType;
}

export function ProtectedRoute({
  children,
  allowedUserTypes,
  redirectTo = "/login",
  requireEmailVerification = true,
}: ProtectedRouteProps) {
  const { user, loading, profileLoading, profileError, isFullyLoaded, firebaseUser, refreshUser, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [retrying, setRetrying] = useState(false);
  
  // Track if we've already checked access for the current user/path combination
  const lastCheckedRef = useRef<string | null>(null);

  // Combined loading state: wait for both auth AND profile to be ready
  // Use isFullyLoaded to ensure user profile is available before rendering children
  const isLoading = loading || profileLoading;

  useEffect(() => {
    let isMounted = true;
    
    const checkAccessAndRedirect = async () => {
      if (!isLoading && isMounted) {
        // Create a unique key for this check to prevent repeated checks
        const userId = user?.userId || (user as any)?.uid || "";
        const checkKey = `${userId}-${pathname}-${firebaseUser?.uid || ""}`;
        
        // Skip if we've already checked this combination
        if (lastCheckedRef.current === checkKey) {
          return;
        }
        
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

        // Mark this combination as checked BEFORE the async call
        lastCheckedRef.current = checkKey;

        // Check if user has an approved accommodation provider linked
        let isApprovedProvider = false;
        if (user) {
          try {
            // First check if user is staff with providerId
            if ((user as any).providerId) {
              const provider = await getProviderById((user as any).providerId);
              if (!isMounted) return;
              isApprovedProvider = provider?.approvalStatus === "Approved";
            } else {
              // Check if user is a provider owner
              const provider = await getProviderByUserId(user.userId || (user as any).uid);
              if (!isMounted) return;
              isApprovedProvider = provider?.approvalStatus === "Approved";
            }
          } catch (err) {
            console.error("Error checking provider status:", err);
          }
        }

        if (!isMounted) return; // Prevent redirects after unmount

        const effectiveUserType = getUserType(user);
        
        // Determine if user should be treated as provider
        const shouldBeProvider = isApprovedProvider || effectiveUserType === "provider";
        
        if (allowedUserTypes && effectiveUserType) {
          // If user is an approved provider but trying to access non-provider pages
          if (shouldBeProvider && !allowedUserTypes.includes("provider")) {
            router.push("/provider-dashboard");
            return;
          }
          
          // Standard type check
          if (!allowedUserTypes.includes(effectiveUserType as "student" | "provider" | "admin")) {
            if (shouldBeProvider) {
              router.push("/provider-dashboard");
            } else {
              router.push("/dashboard");
            }
          }
        }
      }
    };

    checkAccessAndRedirect();
    
    return () => {
      isMounted = false;
    };
  }, [isLoading, firebaseUser, user, allowedUserTypes, router, redirectTo, requireEmailVerification, pathname]);

  const handleRetry = async () => {
    setRetrying(true);
    await refreshUser();
    setRetrying(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Show loading while auth state OR profile is loading
  // This prevents flash of empty content
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Additional safety: if we're past loading but user is still null (shouldn't happen normally)
  // This catches edge cases where the state updates are out of sync
  if (firebaseUser && !user && !profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading your profile...</p>
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

  // Profile error or user not loaded - show error state with retry option
  if (profileError || (!user && firebaseUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Unable to Load Profile
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {profileError || "We couldn't load your user profile. Please try again."}
          </p>
          <div className="flex gap-3 mt-2">
            <Button 
              onClick={handleRetry} 
              disabled={retrying}
              className="bg-amber-500 hover:bg-amber-600 text-gray-900"
            >
              {retrying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="dark:border-gray-600 dark:text-gray-300"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const effectiveUserType = getUserType(user);
  if (allowedUserTypes && effectiveUserType && !allowedUserTypes.includes(effectiveUserType as "student" | "provider" | "admin")) {
    return null;
  }

  return <>{children}</>;
}
