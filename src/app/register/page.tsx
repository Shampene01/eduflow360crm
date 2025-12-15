"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2, User, Mail, Phone, Calendar, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUser, createAddress, updateUser } from "@/lib/db";
import { getAuthErrorMessage } from "@/lib/auth";
import { syncUserToCRMBackground } from "@/lib/crmSync";
import { validateSAIdNumber, type SAIdValidationResult } from "@/lib/utils/saIdNumber";
import type { UserRole } from "@/lib/types";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstNames: string;
  surname: string;
  phoneNumber: string;
  idNumber: string;
  dateOfBirth: string;
  gender: string;
  street: string;
  suburb: string;
  townCity: string;
  province: string;
  postalCode: string;
  marketingConsent: boolean;
  agreeTerms: boolean;
}

const initialFormData: FormData = {
  email: "",
  password: "",
  confirmPassword: "",
  firstNames: "",
  surname: "",
  phoneNumber: "",
  idNumber: "",
  dateOfBirth: "",
  gender: "",
  street: "",
  suburb: "",
  townCity: "",
  province: "",
  postalCode: "",
  marketingConsent: false,
  agreeTerms: false,
};

const provinces = [
  "Western Cape", "Eastern Cape", "Northern Cape",
  "Gauteng", "KwaZulu-Natal", "Free State",
  "North West", "Mpumalanga", "Limpopo"
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [idValidation, setIdValidation] = useState<SAIdValidationResult | null>(null);
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle ID number change with auto-extraction of DOB and gender
  const handleIdNumberChange = (idNumber: string) => {
    updateFormData("idNumber", idNumber);
    
    // Only validate if we have 13 digits
    const cleanId = idNumber.replace(/[\s-]/g, "");
    if (cleanId.length === 13) {
      const result = validateSAIdNumber(idNumber);
      setIdValidation(result);
      
      // Auto-fill DOB and gender if valid
      if (result.isValid && result.dateOfBirth && result.gender) {
        setFormData((prev) => ({
          ...prev,
          idNumber,
          dateOfBirth: result.dateOfBirth || prev.dateOfBirth,
          gender: result.gender || prev.gender,
        }));
      }
    } else if (cleanId.length > 0) {
      // Clear validation if incomplete
      setIdValidation(null);
    } else {
      setIdValidation(null);
    }
  };

  const validateStep = (stepNum: number): boolean => {
    setError("");
    switch (stepNum) {
      case 1:
        if (!formData.firstNames || !formData.surname) {
          setError("Please enter your first name(s) and surname.");
          return false;
        }
        if (!formData.email) {
          setError("Please enter your email address.");
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError("Please enter a valid email address.");
          return false;
        }
        if (!formData.phoneNumber) {
          setError("Please enter your phone number.");
          return false;
        }
        if (!formData.idNumber) {
          setError("Please enter your SA ID Number.");
          return false;
        }
        if (!idValidation?.isValid) {
          setError(idValidation?.error || "Please enter a valid 13-digit SA ID Number.");
          return false;
        }
        return true;
      case 2:
        if (!formData.street || !formData.townCity || !formData.province) {
          setError("Please fill in your address details.");
          return false;
        }
        return true;
      case 3:
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
        if (!formData.agreeTerms) {
          setError("You must agree to the terms and conditions.");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) setStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    if (!auth) {
      setError("Authentication not initialized. Please try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const userId = userCredential.user.uid;

      // 2. Prepare address object if provided
      let address = undefined;
      if (formData.street && formData.townCity && formData.province) {
        address = {
          street: formData.street,
          suburb: formData.suburb || undefined,
          townCity: formData.townCity,
          province: formData.province,
          postalCode: formData.postalCode || undefined,
          country: "South Africa",
        };
      }

      // 3. Create user record in Firestore with embedded address
      await createUser(userId, {
        email: formData.email,
        phoneNumber: formData.phoneNumber || undefined,
        firstNames: formData.firstNames,
        surname: formData.surname,
        idNumber: formData.idNumber || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender as "Male" | "Female" | "Other" | undefined,
        address: address,                // Embedded address object
        marketingConsent: formData.marketingConsent,
        role: "provider" as const,       // Default role for new registrations
        isActive: true,
        emailVerified: false,
      });

      // 4. Sync user to CRM via Power Automate (background, non-blocking)
      syncUserToCRMBackground({
        userId,
        email: formData.email,
        firstNames: formData.firstNames,
        surname: formData.surname,
        phoneNumber: formData.phoneNumber || undefined,
        idNumber: formData.idNumber || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender as "Male" | "Female" | "Other" | undefined,
        address: address,
        role: "provider",
        isActive: true,
        marketingConsent: formData.marketingConsent,
      });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const firebaseError = err as { code?: string };
      setError(getAuthErrorMessage(firebaseError.code || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-t-xl px-8 py-8 relative overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="relative z-10 text-center">
            <Image src="/logo-white.webp" alt="EduFlow360" width={160} height={50} className="h-10 w-auto mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white">Create Your Account</h1>
            <p className="text-gray-400 text-sm mt-1">Join EduFlow360 to manage student accommodation</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white border-x border-gray-200 px-6 py-4">
          <div className="flex items-center justify-center gap-4">
            {[
              { num: 1, label: "Personal Info", icon: User },
              { num: 2, label: "Address", icon: Mail },
              { num: 3, label: "Security", icon: CreditCard },
            ].map((s, index) => (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-1 transition-all ${
                    step > s.num ? "bg-green-500 text-white" : step === s.num ? "bg-amber-500 text-gray-900" : "bg-gray-100 text-gray-400"
                  }`}>
                    {step > s.num ? "✓" : s.num}
                  </div>
                  <span className={`text-xs font-medium ${step === s.num ? "text-amber-600" : "text-gray-400"}`}>{s.label}</span>
                </div>
                {index < 2 && <div className={`w-12 h-0.5 mx-2 ${step > s.num ? "bg-green-500" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-b-xl shadow-lg border border-t-0 border-gray-200 p-8">
          {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name(s) *</Label>
                  <Input
                    value={formData.firstNames}
                    onChange={(e) => updateFormData("firstNames", e.target.value)}
                    placeholder="John"
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Surname *</Label>
                  <Input
                    value={formData.surname}
                    onChange={(e) => updateFormData("surname", e.target.value)}
                    placeholder="Smith"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  placeholder="john@example.com"
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData("phoneNumber", e.target.value)}
                  placeholder="0821234567"
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label>SA ID Number *</Label>
                <Input
                  value={formData.idNumber}
                  onChange={(e) => handleIdNumberChange(e.target.value)}
                  placeholder="Enter your 13-digit SA ID Number"
                  maxLength={13}
                  className={`bg-gray-50 ${idValidation ? (idValidation.isValid ? "border-green-500 focus:ring-green-500" : "border-red-500 focus:ring-red-500") : ""}`}
                />
                {idValidation && (
                  <p className={`text-xs ${idValidation.isValid ? "text-green-600" : "text-red-600"}`}>
                    {idValidation.isValid 
                      ? "✓ Valid SA ID - Date of birth and gender auto-filled" 
                      : `✗ ${idValidation.error}`}
                  </p>
                )}
                <p className="text-xs text-gray-500">Date of birth and gender will be auto-filled from your ID</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth <span className="text-gray-400 text-xs">(from ID)</span></Label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender <span className="text-gray-400 text-xs">(from ID)</span></Label>
                  <Input
                    value={formData.gender || ""}
                    disabled
                    placeholder="Auto-filled from ID"
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Street Address *</Label>
                <Input
                  value={formData.street}
                  onChange={(e) => updateFormData("street", e.target.value)}
                  placeholder="123 Main Street"
                  className="bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Suburb</Label>
                  <Input
                    value={formData.suburb}
                    onChange={(e) => updateFormData("suburb", e.target.value)}
                    placeholder="Suburb"
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City/Town *</Label>
                  <Input
                    value={formData.townCity}
                    onChange={(e) => updateFormData("townCity", e.target.value)}
                    placeholder="Cape Town"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Province *</Label>
                  <Select value={formData.province} onValueChange={(v) => updateFormData("province", v)}>
                    <SelectTrigger className="bg-gray-50">
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input
                    value={formData.postalCode}
                    onChange={(e) => updateFormData("postalCode", e.target.value)}
                    placeholder="7530"
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Security */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => updateFormData("password", e.target.value)}
                    placeholder="Create a strong password"
                    className="bg-gray-50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label>Confirm Password *</Label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                  placeholder="Confirm your password"
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.marketingConsent}
                    onChange={(e) => updateFormData("marketingConsent", e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-600">
                    I agree to receive marketing communications from EduFlow360
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={(e) => updateFormData("agreeTerms", e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-600">
                    I agree to the{" "}
                    <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-amber-600 font-medium hover:underline">Terms of Service</Link>
                    {" "}and{" "}
                    <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-600 font-medium hover:underline">Privacy Policy</Link> *
                  </span>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>What&apos;s next?</strong> After registration, you can apply to become an Accommodation Provider from your dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-8 mt-6 border-t border-gray-200">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={prevStep}>
                Back
              </Button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <Button type="button" onClick={nextStep} className="bg-gray-900 hover:bg-gray-800 text-white">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-amber-600 hover:text-amber-700 font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
