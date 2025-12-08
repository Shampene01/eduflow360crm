"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/lib/types";
import { onAuthChange, signOut as authSignOut } from "@/lib/auth";
import { initPresence } from "@/lib/presence";

interface AuthContextType {
  firebaseUser: any | null;
  user: User | null;
  loading: boolean;
  profileLoading: boolean;  // True while fetching user profile from Firestore
  profileError: string | null;  // Error message if profile fetch fails
  isFullyLoaded: boolean;  // True only when auth AND profile are successfully loaded
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);           // Auth state loading
  const [profileLoading, setProfileLoading] = useState(true);  // Profile fetch loading - start true to prevent flash
  const [profileError, setProfileError] = useState<string | null>(null);

  // Computed: fully loaded only when we have both firebase user AND user profile with critical fields
  // IMPORTANT: We check for critical fields to prevent race condition where user object exists but is not fully populated
  const isFullyLoaded = !loading &&
    !profileLoading &&
    !!firebaseUser &&
    !!user &&
    !!(user.userId || user.uid) &&
    !!user.email &&
    !!(user.firstNames || user.firstName);

  // Log state changes
  useEffect(() => {
    console.log("🔵 AuthContext State:", {
      loading,
      profileLoading,
      hasFirebaseUser: !!firebaseUser,
      hasUser: !!user,
      isFullyLoaded,
      userEmail: user?.email,
      userId: user?.userId || user?.uid,
      firstNames: user?.firstNames || user?.firstName,
      criticalFieldsCheck: {
        hasUserId: !!(user?.userId || user?.uid),
        hasEmail: !!user?.email,
        hasFirstNames: !!(user?.firstNames || user?.firstName)
      }
    });
  }, [loading, profileLoading, firebaseUser, user, isFullyLoaded]);

  const refreshUser = async () => {
    if (firebaseUser) {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const { getUserProfile } = await import("@/lib/auth");
        const userProfile = await getUserProfile(firebaseUser.uid);
        if (userProfile) {
          setUser(userProfile);
        } else {
          setProfileError("User profile not found");
        }
      } catch (error) {
        console.error("Error refreshing user:", error);
        setProfileError("Failed to load user profile");
      } finally {
        setProfileLoading(false);
      }
    }
  };

  const signOut = async () => {
    try {
      await authSignOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
    setUser(null);
    setFirebaseUser(null);
    setProfileError(null);
  };

  useEffect(() => {
    console.log("🔵 AuthContext: Initializing auth listener");
    const unsubscribe = onAuthChange(async (fbUser) => {
      console.log("🔵 AuthContext: Auth state changed", {
        hasFirebaseUser: !!fbUser,
        uid: fbUser?.uid
      });
      setFirebaseUser(fbUser);
      setProfileError(null);

      if (fbUser) {
        // Start fetching user profile from Firestore
        console.log("🔵 AuthContext: Starting to fetch user profile for", fbUser.uid);
        setProfileLoading(true);
        try {
          const { getUserProfile } = await import("@/lib/auth");
          console.log("🔵 AuthContext: Calling getUserProfile");
          const userProfile = await getUserProfile(fbUser.uid);
          console.log("🔵 AuthContext: User profile fetched", {
            hasProfile: !!userProfile,
            firstNames: userProfile?.firstNames,
            email: userProfile?.email,
            hasAddress: !!userProfile?.address,
            allKeys: userProfile ? Object.keys(userProfile) : [],
            rawUserProfile: userProfile
          });

          if (userProfile) {
            setUser(userProfile);
            console.log("🟢 AuthContext: User profile set successfully");
            // Initialize presence tracking (for page refresh/session restore)
            initPresence(fbUser.uid);
          } else {
            // Profile doesn't exist yet - might be a new user
            console.warn("🟡 AuthContext: User profile not found in Firestore");
            setUser(null);
            setProfileError("Profile not found. Please complete registration.");
          }
        } catch (error) {
          console.error("🔴 AuthContext: Error loading user profile:", error);
          setUser(null);
          setProfileError("Failed to load user profile. Please try again.");
        } finally {
          console.log("🔵 AuthContext: Setting profileLoading to false");
          setProfileLoading(false);
        }
      } else {
        console.log("🔵 AuthContext: No Firebase user, clearing user state");
        setUser(null);
        setProfileLoading(false);
      }

      console.log("🔵 AuthContext: Setting loading to false");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        profileLoading,
        profileError,
        isFullyLoaded,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
