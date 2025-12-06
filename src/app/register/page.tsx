"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, Building2, CheckCircle, 
  Upload, X, FileText, MapPin, Users, CreditCard, FolderOpen, Lock
} from "lucide-react";
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
import { signUp, getAuthErrorMessage } from "@/lib/auth";

const TOTAL_STEPS = 8;

const provinces = [
  "Western Cape", "Eastern Cape", "Northern Cape", 
  "Gauteng", "KwaZulu-Natal", "Free State", 
  "North West", "Mpumalanga", "Limpopo"
];

const providerTypes = [
  "Private Company", "NGO", "Trust", "Sole Proprietor", "Communal Property Association"
];

const accountTypes = ["Current", "Savings", "Transmission"];

const steps = [
  { num: 1, label: "Profile", icon: Building2 },
  { num: 2, label: "Tax", icon: FileText },
  { num: 3, label: "Location", icon: MapPin },
  { num: 4, label: "Contacts", icon: Users },
  { num: 5, label: "Bank", icon: CreditCard },
  { num: 6, label: "Capacity", icon: Building2 },
  { num: 7, label: "Documents", icon: FolderOpen },
  { num: 8, label: "Security", icon: Lock },
];

interface FormData {
  providerName: string;
  providerType: string;
  yearsInOperation: string;
  companyRegistrationNumber: string;
  vatRegistration: string;
  taxNumber: string;
  vatNumber: string;
  bbbeeExpiry: string;
  womenOwnershipPercentage: string;
  disabilityOwnershipPercentage: string;
  blackOwnershipPercentage: string;
  youthOwnershipPercentage: string;
  bbbeeLevel: string;
  streetAddress: string;
  suburb: string;
  city: string;
  province: string;
  longitude: string;
  latitude: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactPosition: string;
  primaryContactEmail: string;
  secondaryContactName: string;
  secondaryContactPhone: string;
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
  accountHolder: string;
  totalProperties: string;
  totalCapacity: string;
  idDocument: File | null;
  cipcCertificate: File | null;
  proofOfAddress: File | null;
  proofOfBanking: File | null;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

const initialFormData: FormData = {
  providerName: "",
  providerType: "",
  yearsInOperation: "",
  companyRegistrationNumber: "",
  vatRegistration: "",
  taxNumber: "",
  vatNumber: "",
  bbbeeExpiry: "",
  womenOwnershipPercentage: "",
  disabilityOwnershipPercentage: "",
  blackOwnershipPercentage: "",
  youthOwnershipPercentage: "",
  bbbeeLevel: "",
  streetAddress: "",
  suburb: "",
  city: "",
  province: "",
  longitude: "",
  latitude: "",
  primaryContactName: "",
  primaryContactPhone: "",
  primaryContactPosition: "",
  primaryContactEmail: "",
  secondaryContactName: "",
  secondaryContactPhone: "",
  bankName: "",
  accountNumber: "",
  branchCode: "",
  accountType: "",
  accountHolder: "",
  totalProperties: "",
  totalCapacity: "",
  idDocument: null,
  cipcCertificate: null,
  proofOfAddress: null,
  proofOfBanking: null,
  password: "",
  confirmPassword: "",
  agreeTerms: false,
};

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const updateFormData = (field: keyof FormData, value: string | boolean | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (stepNum: number): boolean => {
    setError("");
    switch (stepNum) {
      case 1:
        if (!formData.providerName || !formData.providerType) {
          setError("Please fill in Provider Name and Provider Type.");
          return false;
        }
        return true;
      case 2:
        if (!formData.companyRegistrationNumber || !formData.vatRegistration) {
          setError("Please fill in Company Registration Number and VAT Registration status.");
          return false;
        }
        return true;
      case 3:
        if (!formData.streetAddress || !formData.suburb || !formData.city || !formData.province) {
          setError("Please fill in all required address fields.");
          return false;
        }
        return true;
      case 4:
        if (!formData.primaryContactName || !formData.primaryContactPhone || !formData.primaryContactEmail) {
          setError("Please fill in primary contact details.");
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryContactEmail)) {
          setError("Please enter a valid email address.");
          return false;
        }
        return true;
      case 5:
        return true;
      case 6:
        if (!formData.totalCapacity) {
          setError("Please enter total capacity.");
          return false;
        }
        return true;
      case 7:
        if (!formData.idDocument || !formData.cipcCertificate || !formData.proofOfAddress || !formData.proofOfBanking) {
          setError("Please upload all required documents.");
          return false;
        }
        return true;
      case 8:
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
    if (validateStep(step)) setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(TOTAL_STEPS)) return;
    setLoading(true);
    setError("");

    try {
      await signUp(formData.primaryContactEmail, formData.password, {
        userType: "provider",
        providerName: formData.providerName,
        providerType: formData.providerType,
        yearsInOperation: formData.yearsInOperation ? parseInt(formData.yearsInOperation) : null,
        companyRegistrationNumber: formData.companyRegistrationNumber,
        vatRegistration: formData.vatRegistration,
        taxNumber: formData.taxNumber,
        vatNumber: formData.vatNumber,
        bbbeeExpiry: formData.bbbeeExpiry,
        bbbeeLevel: formData.bbbeeLevel ? parseInt(formData.bbbeeLevel) : null,
        womenOwnershipPercentage: formData.womenOwnershipPercentage ? parseFloat(formData.womenOwnershipPercentage) : null,
        disabilityOwnershipPercentage: formData.disabilityOwnershipPercentage ? parseFloat(formData.disabilityOwnershipPercentage) : null,
        blackOwnershipPercentage: formData.blackOwnershipPercentage ? parseFloat(formData.blackOwnershipPercentage) : null,
        youthOwnershipPercentage: formData.youthOwnershipPercentage ? parseFloat(formData.youthOwnershipPercentage) : null,
        streetAddress: formData.streetAddress,
        suburb: formData.suburb,
        city: formData.city,
        province: formData.province,
        longitude: formData.longitude,
        latitude: formData.latitude,
        primaryContactName: formData.primaryContactName,
        primaryContactPhone: formData.primaryContactPhone,
        primaryContactPosition: formData.primaryContactPosition,
        primaryContactEmail: formData.primaryContactEmail,
        secondaryContactName: formData.secondaryContactName,
        secondaryContactPhone: formData.secondaryContactPhone,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        branchCode: formData.branchCode,
        accountType: formData.accountType,
        accountHolder: formData.accountHolder,
        totalProperties: formData.totalProperties ? parseInt(formData.totalProperties) : 0,
        totalCapacity: formData.totalCapacity ? parseInt(formData.totalCapacity) : 0,
        status: "pending",
        accreditationStatus: "Pending",
        complianceStatus: "Pending",
      });
      router.push("/provider-dashboard");
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const firebaseError = err as { code?: string };
      setError(getAuthErrorMessage(firebaseError.code || ""));
    } finally {
      setLoading(false);
    }
  };

  const FileUploadField = ({ label, field, required = false }: { label: string; field: keyof FormData; required?: boolean }) => {
    const file = formData[field] as File | null;
    return (
      <div className="space-y-2">
        <Label>{label} {required && "*"}</Label>
        <div 
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${file ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-amber-500"}`}
          onClick={() => fileInputRefs.current[field]?.click()}
        >
          <input
            type="file"
            ref={(el) => { fileInputRefs.current[field] = el; }}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => updateFormData(field, e.target.files?.[0] || null)}
          />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle size={20} />
              <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); updateFormData(field, null); }} className="ml-2 text-red-500 hover:text-red-700">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="text-gray-500">
              <Upload className="mx-auto mb-2" size={24} />
              <p className="text-sm">Click to upload</p>
              <p className="text-xs text-gray-400">PDF, JPG, PNG</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-t-xl px-8 py-8 relative overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <Image src="/logo-white.webp" alt="EduFlow360" width={160} height={50} className="h-10 w-auto" />
            <div className="h-8 w-px bg-gray-700" />
            <div>
              <h1 className="text-xl font-semibold text-white">Provider Registration</h1>
              <p className="text-gray-400 text-sm">NSFAS Accommodation Provider Application</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white border-x border-gray-200 px-4 py-4 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[600px]">
            {steps.map((s, index) => (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold mb-1 transition-all ${step > s.num ? "bg-green-500 text-white" : step === s.num ? "bg-amber-500 text-gray-900" : "bg-gray-100 text-gray-400"}`}>
                    {step > s.num ? <CheckCircle size={16} /> : <s.icon size={16} />}
                  </div>
                  <span className={`text-[10px] font-medium ${step === s.num ? "text-amber-600" : "text-gray-400"}`}>{s.label}</span>
                </div>
                {index < steps.length - 1 && <div className={`w-6 h-0.5 mx-1 ${step > s.num ? "bg-green-500" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-b-xl shadow-lg border border-t-0 border-gray-200 p-8">
          {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

          {/* Step 1: Provider Profile */}
          {step === 1 && (
            <div className="space-y-6">
              <div><h3 className="text-lg font-semibold text-gray-900">Provider Profile</h3><p className="text-sm text-gray-500">Capture basic provider information</p></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider Name *</Label>
                  <Input value={formData.providerName} onChange={(e) => updateFormData("providerName", e.target.value)} placeholder="Enter provider/company name" className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label>Provider Type *</Label>
                  <Select value={formData.providerType} onValueChange={(v) => updateFormData("providerType", v)}>
                    <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{providerTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Years in Operation</Label>
                <Input type="number" value={formData.yearsInOperation} onChange={(e) => updateFormData("yearsInOperation", e.target.value)} placeholder="e.g., 5" className="bg-gray-50 max-w-[200px]" />
              </div>
            </div>
          )}

          {/* Step 2: Registration & Tax */}
          {step === 2 && (
            <div className="space-y-6">
              <div><h3 className="text-lg font-semibold text-gray-900">Registration & Tax Details</h3><p className="text-sm text-gray-500">Company registration and tax compliance</p></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Registration Number *</Label>
                  <Input value={formData.companyRegistrationNumber} onChange={(e) => updateFormData("companyRegistrationNumber", e.target.value)} placeholder="e.g., 2024/123456/07" className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label>VAT Registered *</Label>
                  <Select value={formData.vatRegistration} onValueChange={(v) => updateFormData("vatRegistration", v)}>
                    <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Tax Number</Label><Input value={formData.taxNumber} onChange={(e) => updateFormData("taxNumber", e.target.value)} placeholder="Tax reference" className="bg-gray-50" /></div>
                <div className="space-y-2"><Label>VAT Number</Label><Input value={formData.vatNumber} onChange={(e) => updateFormData("vatNumber", e.target.value)} placeholder="VAT number" className="bg-gray-50" /></div>
              </div>
              <div className="border-t pt-4"><h4 className="font-medium text-gray-900 mb-4">B-BBEE Information</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>B-BBEE Level</Label><Input type="number" min="1" max="8" value={formData.bbbeeLevel} onChange={(e) => updateFormData("bbbeeLevel", e.target.value)} placeholder="1-8" className="bg-gray-50" /></div>
                  <div className="space-y-2"><Label>Certificate Expiry</Label><Input type="date" value={formData.bbbeeExpiry} onChange={(e) => updateFormData("bbbeeExpiry", e.target.value)} className="bg-gray-50" /></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="space-y-2"><Label>Black %</Label><Input type="number" min="0" max="100" value={formData.blackOwnershipPercentage} onChange={(e) => updateFormData("blackOwnershipPercentage", e.target.value)} className="bg-gray-50" /></div>
                  <div className="space-y-2"><Label>Women %</Label><Input type="number" min="0" max="100" value={formData.womenOwnershipPercentage} onChange={(e) => updateFormData("womenOwnershipPercentage", e.target.value)} className="bg-gray-50" /></div>
                  <div className="space-y-2"><Label>Youth %</Label><Input type="number" min="0" max="100" value={formData.youthOwnershipPercentage} onChange={(e) => updateFormData("youthOwnershipPercentage", e.target.value)} className="bg-gray-50" /></div>
                  <div className="space-y-2"><Label>Disability %</Label><Input type="number" min="0" max="100" value={formData.disabilityOwnershipPercentage} onChange={(e) => updateFormData("disabilityOwnershipPercentage", e.target.value)} className="bg-gray-50" /></div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="space-y-6">
              <div><h3 className="text-lg font-semibold text-gray-900">Location Information</h3><p className="text-sm text-gray-500">Physical address of the provider</p></div>
              <div className="space-y-2"><Label>Street Address *</Label><Input value={formData.streetAddress} onChange={(e) => updateFormData("streetAddress", e.target.value)} placeholder="e.g., 8 Proton Street" className="bg-gray-50" /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Suburb *</Label><Input value={formData.suburb} onChange={(e) => updateFormData("suburb", e.target.value)} placeholder="e.g., Belhar" className="bg-gray-50" /></div>
                <div className="space-y-2"><Label>City *</Label><Input value={formData.city} onChange={(e) => updateFormData("city", e.target.value)} placeholder="e.g., Cape Town" className="bg-gray-50" /></div>
              </div>
              <div className="space-y-2">
                <Label>Province *</Label>
                <Select value={formData.province} onValueChange={(v) => updateFormData("province", v)}>
                  <SelectTrigger className="bg-gray-50 max-w-[300px]"><SelectValue placeholder="Select province" /></SelectTrigger>
                  <SelectContent>{provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Latitude</Label><Input value={formData.latitude} onChange={(e) => updateFormData("latitude", e.target.value)} placeholder="-33.939711" className="bg-gray-50" /></div>
                <div className="space-y-2"><Label>Longitude</Label><Input value={formData.longitude} onChange={(e) => updateFormData("longitude", e.target.value)} placeholder="18.637489" className="bg-gray-50" /></div>
              </div>
            </div>
          )}

          {/* Step 4: Contacts */}
          {step === 4 && (
            <div className="space-y-6">
              <div><h3 className="text-lg font-semibold text-gray-900">Contact Persons</h3><p className="text-sm text-gray-500">Primary and secondary contact details</p></div>
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-4">Primary Contact *</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Full Name *</Label><Input value={formData.primaryContactName} onChange={(e) => updateFormData("primaryContactName", e.target.value)} placeholder="John Smith" className="bg-white" /></div>
                  <div className="space-y-2"><Label>Position</Label><Input value={formData.primaryContactPosition} onChange={(e) => updateFormData("primaryContactPosition", e.target.value)} placeholder="Director" className="bg-white" /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2"><Label>Phone *</Label><Input type="tel" value={formData.primaryContactPhone} onChange={(e) => updateFormData("primaryContactPhone", e.target.value)} placeholder="0608272624" className="bg-white" /></div>
                  <div className="space-y-2"><Label>Email *</Label><Input type="email" value={formData.primaryContactEmail} onChange={(e) => updateFormData("primaryContactEmail", e.target.value)} placeholder="john@company.co.za" className="bg-white" /></div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4">Secondary Contact (Optional)</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Full Name</Label><Input value={formData.secondaryContactName} onChange={(e) => updateFormData("secondaryContactName", e.target.value)} className="bg-gray-50" /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={formData.secondaryContactPhone} onChange={(e) => updateFormData("secondaryContactPhone", e.target.value)} className="bg-gray-50" /></div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Bank Details */}
          {step === 5 && (
            <div className="space-y-6">
              <div><h3 className="text-lg font-semibold text-gray-900">Bank Details</h3><p className="text-sm text-gray-500">Banking information for payments (optional)</p></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Bank Name</Label><Input value={formData.bankName} onChange={(e) => updateFormData("bankName", e.target.value)} placeholder="Standard Bank" className="bg-gray-50" /></div>
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select value={formData.accountType} onValueChange={(v) => updateFormData("accountType", v)}>
                    <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{accountTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Account Number</Label><Input value={formData.accountNumber} onChange={(e) => updateFormData("accountNumber", e.target.value)} className="bg-gray-50" /></div>
                <div className="space-y-2"><Label>Branch Code</Label><Input value={formData.branchCode} onChange={(e) => updateFormData("branchCode", e.target.value)} placeholder="051001" className="bg-gray-50" /></div>
              </div>
              <div className="space-y-2"><Label>Account Holder</Label><Input value={formData.accountHolder} onChange={(e) => updateFormData("accountHolder", e.target.value)} placeholder="Name on account" className="bg-gray-50" /></div>
            </div>
          )}

          {/* Step 6: Capacity */}
          {step === 6 && (
            <div className="space-y-6">
              <div><h3 className="text-lg font-semibold text-gray-900">Property Capacity</h3><p className="text-sm text-gray-500">Number of properties and student capacity</p></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Total Properties</Label><Input type="number" min="0" value={formData.totalProperties} onChange={(e) => updateFormData("totalProperties", e.target.value)} placeholder="Number of properties" className="bg-gray-50" /></div>
                <div className="space-y-2"><Label>Total Student Capacity *</Label><Input type="number" min="1" value={formData.totalCapacity} onChange={(e) => updateFormData("totalCapacity", e.target.value)} placeholder="Total beds available" className="bg-gray-50" /></div>
              </div>
            </div>
          )}

          {/* Step 7: Documents */}
          {step === 7 && (
            <div className="space-y-6">
              <div><h3 className="text-lg font-semibold text-gray-900">Document Upload</h3><p className="text-sm text-gray-500">Upload required compliance documents</p></div>
              <div className="grid md:grid-cols-2 gap-6">
                <FileUploadField label="ID Document" field="idDocument" required />
                <FileUploadField label="CIPC Certificate" field="cipcCertificate" required />
                <FileUploadField label="Proof of Address" field="proofOfAddress" required />
                <FileUploadField label="Proof of Banking" field="proofOfBanking" required />
              </div>
            </div>
          )}

          {/* Step 8: Security */}
          {step === 8 && (
            <div className="space-y-6">
              <div><h3 className="text-lg font-semibold text-gray-900">Create Account Password</h3><p className="text-sm text-gray-500">Set up your login credentials</p></div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4"><p className="text-sm text-amber-800"><strong>Login Email:</strong> {formData.primaryContactEmail || "Not set"}</p></div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => updateFormData("password", e.target.value)} placeholder="Create a strong password" className="bg-gray-50 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Minimum 6 characters</p>
              </div>
              <div className="space-y-2"><Label>Confirm Password *</Label><Input type="password" value={formData.confirmPassword} onChange={(e) => updateFormData("confirmPassword", e.target.value)} placeholder="Confirm password" className="bg-gray-50" /></div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.agreeTerms} onChange={(e) => updateFormData("agreeTerms", e.target.checked)} className="w-5 h-5 mt-0.5 rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                <span className="text-sm text-gray-600">I agree to the <Link href="/terms" className="text-amber-600 font-medium hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-amber-600 font-medium hover:underline">Privacy Policy</Link></span>
              </label>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-8 mt-8 border-t border-gray-200">
            {step > 1 ? <Button type="button" variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button> : <div />}
            {step < TOTAL_STEPS ? (
              <Button type="button" onClick={nextStep} className="bg-gray-900 hover:bg-gray-800 text-white">Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : <>Create Account<ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm">Already have an account? <Link href="/login" className="text-amber-600 hover:text-amber-700 font-semibold">Sign In</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}
