"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification, reload } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Loader2, CheckCircle, RefreshCw, LogOut } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { firebaseUser, signOut } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Check if already verified on mount
  useEffect(() => {
    if (firebaseUser?.emailVerified) {
      router.push("/dashboard");
    }
  }, [firebaseUser?.emailVerified, router]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendVerification = async () => {
    if (!firebaseUser || !auth.currentUser) {
      setError("No user logged in");
      return;
    }

    setSending(true);
    setError("");
    setSent(false);

    try {
      await sendEmailVerification(auth.currentUser);
      setSent(true);
      setCountdown(60); // 60 second cooldown before resend
    } catch (err: any) {
      console.error("Error sending verification email:", err);
      if (err.code === "auth/too-many-requests") {
        setError("Too many requests. Please wait a few minutes before trying again.");
      } else {
        setError(err.message || "Failed to send verification email");
      }
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!auth.currentUser) return;

    setChecking(true);
    setError("");

    try {
      await reload(auth.currentUser);
      
      if (auth.currentUser.emailVerified) {
        router.push("/dashboard");
      } else {
        setError("Email not yet verified. Please check your inbox and click the verification link.");
      }
    } catch (err: any) {
      console.error("Error checking verification:", err);
      setError(err.message || "Failed to check verification status");
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // If no user, redirect to login
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-4" />
            <p className="text-gray-500">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We need to verify your email address before you can access the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Display */}
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-500 mb-1">Verification email will be sent to:</p>
            <p className="font-semibold text-gray-900">{firebaseUser.email}</p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {sent && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Verification email sent! Please check your inbox and spam folder.
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="space-y-3 text-sm text-gray-600">
            <p className="font-medium text-gray-900">Instructions:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Click "Send Verification Email" below</li>
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>Return here and click "I've Verified My Email"</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSendVerification}
              disabled={sending || countdown > 0}
              className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                <>
                  Resend in {countdown}s
                </>
              ) : sent ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Verification Email
                </>
              )}
            </Button>

            <Button
              onClick={handleCheckVerification}
              disabled={checking}
              variant="outline"
              className="w-full"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I've Verified My Email
                </>
              )}
            </Button>
          </div>

          {/* Sign Out Option */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out and use a different account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
