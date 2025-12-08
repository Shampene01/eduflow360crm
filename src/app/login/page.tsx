"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn, resetPassword, getAuthErrorMessage } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const { user, loading: authLoading, profileLoading, isFullyLoaded, firebaseUser } = useAuth();

  // Combined loading state
  const isLoading = authLoading || profileLoading;

  // Redirect if already logged in AND profile is fully loaded
  useEffect(() => {
    console.log("🟣 Login Page: Redirect check", {
      isFullyLoaded,
      hasUser: !!user,
      hasFirebaseUser: !!firebaseUser,
      authLoading,
      profileLoading,
      userType: user?.userType,
      emailVerified: firebaseUser?.emailVerified,
      userId: user?.userId || user?.uid,
      userEmail: user?.email,
      userFirstNames: user?.firstNames || user?.firstName
    });

    if (isFullyLoaded && user && firebaseUser) {
      console.log("🟣 Login Page: All conditions met, checking email verification");
      // Check email verification first
      if (!firebaseUser.emailVerified) {
        console.log("🟣 Login Page: Email not verified, redirecting to verify-email");
        router.push("/verify-email");
        return;
      }

      if (user.userType === "provider") {
        console.log("🟣 Login Page: Redirecting to provider-dashboard");
        router.push("/provider-dashboard");
      } else {
        console.log("🟣 Login Page: Redirecting to dashboard");
        router.push("/dashboard");
      }
    }
  }, [user, isFullyLoaded, firebaseUser, router, authLoading, profileLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      console.log("🟣 Login Page: Starting sign in");
      const userData = await signIn(email, password);
      console.log("🟣 Login Page: Sign in completed", { hasUserData: !!userData });

      // Check if email is verified
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        console.log("🟣 Login Page: Email not verified");
        setSuccess("Login successful! Please verify your email.");
        setLoading(false);
        setTimeout(() => {
          router.push("/verify-email");
        }, 1000);
        return;
      }

      console.log("🟣 Login Page: Email verified, setting success message");
      setSuccess("Login successful! Redirecting...");

      // Note: Keep loading=true while waiting for AuthContext to update and trigger redirect
      // The redirect happens via useEffect when isFullyLoaded becomes true
    } catch (err: any) {
      console.error("🟣 Login Page: Login error:", err);
      setError(getAuthErrorMessage(err.code));
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    try {
      await resetPassword(email);
      setSuccess("Password reset email sent! Check your inbox.");
      setError("");
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] p-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-8 py-12 relative overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-6 flex items-center justify-center">
              <Image
                src="/logo-white.webp"
                alt="EduFlow360"
                width={160}
                height={50}
                className="h-12 w-auto"
                priority
              />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-300 text-sm">Sign in to access your Financial Aid Portal</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-500 bg-green-50 text-green-700">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                className="bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-900 font-semibold py-6 shadow-lg shadow-amber-500/30"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm">
              Don&apos;t have an account?
              <Link
                href="/register"
                className="text-amber-600 hover:text-amber-700 font-semibold ml-1"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
