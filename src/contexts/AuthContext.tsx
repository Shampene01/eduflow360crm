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
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);           // Auth state loading
  const [profileLoading, setProfileLoading] = useState(false);  // Profile fetch loading

  const refreshUser = async () => {
    if (firebaseUser) {
      try {
        const userRef = await import("@/lib/auth").then(m => m.getUserProfile(firebaseUser.uid));
        setUser(userRef);
      } catch (error) {
        console.error("Error refreshing user:", error);
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
  };

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Start fetching user profile from Firestore
        setProfileLoading(true);
        try {
          const { getUserProfile } = await import("@/lib/auth");
          const userProfile = await getUserProfile(fbUser.uid);
          setUser(userProfile);
          
          // Initialize presence tracking (for page refresh/session restore)
          initPresence(fbUser.uid);
        } catch (error) {
          console.error("Error loading user profile:", error);
          setUser(null);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setUser(null);
        setProfileLoading(false);
      }

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
