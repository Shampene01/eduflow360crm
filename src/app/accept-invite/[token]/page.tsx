"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, Mail, User, Phone, CreditCard, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getAuthErrorMessage } from "@/lib/auth";

interface InvitationDetails {
  invitationId: string;
  email: string;
  assignedRole: string;
  assignedRoleCode: number;
  assignedRoleLabel: string;
  providerId: string;
  providerName: string;
  invitedByName: string;
  invitedByEmail?: string;
  expiresAt: string | null;
}

interface FormData {
  password: string;
  confirmPassword: string;
  firstNames: string;
  surname: string;
  phoneNumber: string;
  idNumber: string;
}

const initialFormData: FormData = {
  password: "",
  confirmPassword: "",
  firstNames: "",
  surname: "",
  phoneNumber: "",
  idNumber: "",
};

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const response = await fetch(`/api/staff/invite/${token}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setInvalidReason(data.error || "Invalid invitation");
          setLoading(false);
          return;
        }

        setInvitation(data.invitation);
      } catch (err) {
        console.error("Error validating token:", err);
        setInvalidReason("Failed to validate invitation. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      validateToken();
    }
  }, [token]);

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    setError("");

    if (!formData.firstNames || !formData.surname) {
      setError("Please enter your first name(s) and surname.");
      return false;
    }

    if (!formData.password || !formData.confirmPassword) {
      setError("Please enter and confirm your password.");
      return false;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !invitation) return;

    setSubmitting(true);
    setError("");

    try {
      // 1. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        invitation.email,
        formData.password
      );
      const userId = userCredential.user.uid;

      // 2. Accept invitation and create user profile
      const acceptResponse = await fetch("/api/staff/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          userId,
          email: invitation.email,
          firstNames: formData.firstNames,
          surname: formData.surname,
          phoneNumber: formData.phoneNumber || undefined,
          idNumber: formData.idNumber || undefined,
        }),
      });

      const acceptData = await acceptResponse.json();

      if (!acceptResponse.ok || !acceptData.success) {
        throw new Error(acceptData.error || "Failed to accept invitation");
      }

      // 3. Set custom claims via Firebase Function
      try {
        const idToken = await userCredential.user.getIdToken();
        const claimsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL}/setUserClaims`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`,
            },
            body: JSON.stringify(acceptData.claimsData),
          }
        );

        if (!claimsResponse.ok) {
          console.warn("Failed to set custom claims immediately, will be set on next login");
        }
      } catch (claimsError) {
        console.warn("Could not set custom claims:", claimsError);
      }

      // 4. Send email verification
      try {
        await sendEmailVerification(userCredential.user);
      } catch (verifyError) {
        console.warn("Could not send verification email:", verifyError);
      }

      setSuccess(true);

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);

    } catch (err: unknown) {
      console.error("Registration error:", err);
      const firebaseError = err as { code?: string; message?: string };
      setError(getAuthErrorMessage(firebaseError.code || "") || firebaseError.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid invitation
  if (invalidReason) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Invalid Invitation
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{invalidReason}</p>
            <Link href="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Account Created Successfully!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              Welcome to {invitation?.providerName || "the team"}!
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Join {invitation?.providerName}</CardTitle>
          <CardDescription>
            You&apos;ve been invited by {invitation?.invitedByName} to join as a{" "}
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {invitation?.assignedRoleLabel}
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Invitation Details */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">Email:</span>
              <span className="font-medium text-gray-900 dark:text-white">{invitation?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">Organization:</span>
              <span className="font-medium text-gray-900 dark:text-white">{invitation?.providerName}</span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstNames">First Name(s) *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="firstNames"
                    placeholder="John"
                    value={formData.firstNames}
                    onChange={(e) => updateFormData("firstNames", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Surname *</Label>
                <Input
                  id="surname"
                  placeholder="Doe"
                  value={formData.surname}
                  onChange={(e) => updateFormData("surname", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="071 234 5678"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData("phoneNumber", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* ID Number */}
            <div className="space-y-2">
              <Label htmlFor="idNumber">SA ID Number</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="idNumber"
                  placeholder="9001015009087"
                  value={formData.idNumber}
                  onChange={(e) => updateFormData("idNumber", e.target.value)}
                  className="pl-10"
                  maxLength={13}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account & Join"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
