"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ArrowLeft, Loader2, Building2, CheckCircle,
  Upload, X, FileText, MapPin, Users, CreditCard, FolderOpen, Shield
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
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  createProvider,
  createAddress,
  createProviderContact,
  createProviderDocument,
  getProviderByUserId,
} from "@/lib/db";
import { syncProviderToCRMBackground } from "@/lib/crmSync";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { LegalForm, AccountType, DocumentType } from "@/lib/schema";

const TOTAL_STEPS = 6;

const provinces = [
  "Western Cape", "Eastern Cape", "Northern Cape",
  "Gauteng", "KwaZulu-Natal", "Free State",
  "North West", "Mpumalanga", "Limpopo"
];

const legalForms: LegalForm[] = [
  "Private Company", "Public Company", "Close Corporation",
  "Sole Proprietor", "Partnership", "Trust", "NGO", "Communal Property Association"
];

const accountTypes: AccountType[] = ["Current", "Savings", "Transmission"];

const steps = [
  { num: 1, label: "Company", icon: Building2 },
  { num: 2, label: "Tax & B-BBEE", icon: FileText },
  { num: 3, label: "Location", icon: MapPin },
  { num: 4, label: "Contacts", icon: Users },
  { num: 5, label: "Banking", icon: CreditCard },
  { num: 6, label: "Documents", icon: FolderOpen },
];

interface FormData {
  // Company Info
  companyName: string;
  tradingName: string;
  legalForm: string;
  companyRegistrationNumber: string;
  yearsInOperation: string;
  // Tax & B-BBEE
  taxReferenceNumber: string;
  vatRegistered: string;
  vatNumber: string;
  bbbeeLevel: string;
  bbbeeCertificateExpiry: string;
  blackOwnershipPercentage: string;
  blackYouthOwnershipPercentage: string;
  blackWomenOwnershipPercentage: string;
  disabledPersonOwnershipPercentage: string;
  // Address
  street: string;
  suburb: string;
  townCity: string;
  province: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  // Primary Contact
  primaryFirstNames: string;
  primarySurname: string;
  primaryPosition: string;
  primaryPhone: string;
  primaryEmail: string;
  primaryIdNumber: string;
  // Secondary Contact
  secondaryFirstNames: string;
  secondarySurname: string;
  secondaryPhone: string;
  secondaryEmail: string;
  // Banking
  bankName: string;
  accountType: string;
  accountNumber: string;
  branchCode: string;
  accountHolder: string;
  // Documents
  idDocument: File | null;
  cipcCertificate: File | null;
  proofOfAddress: File | null;
  bankLetter: File | null;
  bbbeeCertificate: File | null;
}

const initialFormData: FormData = {
  companyName: "",
  tradingName: "",
  legalForm: "",
  companyRegistrationNumber: "",
  yearsInOperation: "",
  taxReferenceNumber: "",
  vatRegistered: "",
  vatNumber: "",
  bbbeeLevel: "",
  bbbeeCertificateExpiry: "",
  blackOwnershipPercentage: "",
  blackYouthOwnershipPercentage: "",
  blackWomenOwnershipPercentage: "",
  disabledPersonOwnershipPercentage: "",
  street: "",
  suburb: "",
  townCity: "",
  province: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  primaryFirstNames: "",
  primarySurname: "",
  primaryPosition: "",
  primaryPhone: "",
  primaryEmail: "",
  primaryIdNumber: "",
  secondaryFirstNames: "",
  secondarySurname: "",
  secondaryPhone: "",
  secondaryEmail: "",
  bankName: "",
  accountType: "",
  accountNumber: "",
  branchCode: "",
  accountHolder: "",
  idDocument: null,
  cipcCertificate: null,
  proofOfAddress: null,
  bankLetter: null,
  bbbeeCertificate: null,
};

function ProviderApplicationContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [existingProvider, setExistingProvider] = useState<boolean>(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Check if user already has a provider application
  useEffect(() => {
    const checkExistingProvider = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid) return;
      try {
        const provider = await getProviderByUserId(uid);
        if (provider) {
          setExistingProvider(true);
        }
      } catch (err) {
        console.error("Error checking provider status:", err);
      } finally {
        setCheckingStatus(false);
      }
    };
    checkExistingProvider();
  }, [user?.userId, user?.uid]);

  // Pre-fill contact info from user profile
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        primaryFirstNames: user.firstNames || user.firstName || "",
        primarySurname: user.surname || user.lastName || "",
        primaryEmail: user.email || "",
        primaryPhone: user.phoneNumber || user.phone || "",
        primaryIdNumber: user.idNumber || "",
      }));
    }
  }, [user]);

  const updateFormData = (field: keyof FormData, value: string | boolean | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (stepNum: number): boolean => {
    setError("");
    switch (stepNum) {
      case 1:
        if (!formData.companyName || !formData.legalForm) {
          setError("Please enter company name and legal form.");
          return false;
        }
        return true;
      case 2:
        return true; // Tax info is optional
      case 3:
        if (!formData.street || !formData.townCity || !formData.province) {
          setError("Please fill in the required address fields.");
          return false;
        }
        return true;
      case 4:
        if (!formData.primaryFirstNames || !formData.primarySurname || !formData.primaryPhone || !formData.primaryEmail) {
          setError("Please fill in primary contact details.");
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryEmail)) {
          setError("Please enter a valid email address.");
          return false;
        }
        return true;
      case 5:
        return true; // Banking is optional
      case 6:
        if (!formData.idDocument || !formData.cipcCertificate) {
          setError("Please upload ID Document and CIPC Certificate.");
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

  const uploadFile = async (file: File, path: string): Promise<string> => {
    if (!storage) throw new Error("Storage not initialized");
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(TOTAL_STEPS)) return;
    const uid = user?.userId || user?.uid;
    if (!uid) {
      setError("You must be logged in to submit an application.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Create address (latitude/longitude will be auto-populated by Google Maps API)
      const address = await createAddress({
        street: formData.street,
        suburb: formData.suburb || undefined,
        townCity: formData.townCity,
        province: formData.province,
        postalCode: formData.postalCode || undefined,
        country: "South Africa",
      });

      // 2. Create provider (only include fields with values to avoid Firestore undefined errors)
      const providerData: any = {
        userId: uid,
        companyName: formData.companyName,
        legalForm: formData.legalForm as LegalForm,
        vatRegistered: formData.vatRegistered === "Yes",
        physicalAddressId: address.addressId,
        nsfasAccredited: false,
      };

      // Add optional fields only if they have values
      if (formData.tradingName) providerData.tradingName = formData.tradingName;
      if (formData.companyRegistrationNumber) providerData.companyRegistrationNumber = formData.companyRegistrationNumber;
      if (formData.yearsInOperation) providerData.yearsInOperation = parseInt(formData.yearsInOperation);
      if (formData.taxReferenceNumber) providerData.taxReferenceNumber = formData.taxReferenceNumber;
      if (formData.vatNumber && formData.vatRegistered === "Yes") providerData.vatNumber = formData.vatNumber;

      // B-BBEE fields
      if (formData.bbbeeLevel) providerData.bbbeeLevel = parseInt(formData.bbbeeLevel);
      if (formData.bbbeeCertificateExpiry) providerData.bbbeeCertificateExpiry = formData.bbbeeCertificateExpiry;
      if (formData.blackOwnershipPercentage) providerData.blackOwnershipPercentage = parseFloat(formData.blackOwnershipPercentage);
      if (formData.blackYouthOwnershipPercentage) providerData.blackYouthOwnershipPercentage = parseFloat(formData.blackYouthOwnershipPercentage);
      if (formData.blackWomenOwnershipPercentage) providerData.blackWomenOwnershipPercentage = parseFloat(formData.blackWomenOwnershipPercentage);
      if (formData.disabledPersonOwnershipPercentage) providerData.disabledPersonOwnershipPercentage = parseFloat(formData.disabledPersonOwnershipPercentage);

      // Banking fields
      if (formData.bankName) providerData.bankName = formData.bankName;
      if (formData.accountType) providerData.accountType = formData.accountType as AccountType;
      if (formData.accountNumber) providerData.accountNumber = formData.accountNumber;
      if (formData.branchCode) providerData.branchCode = formData.branchCode;
      if (formData.accountHolder) providerData.accountHolder = formData.accountHolder;

      const provider = await createProvider(providerData);

      // 3. Create primary contact (only include optional fields with values)
      const primaryContactData: any = {
        providerId: provider.providerId,
        firstNames: formData.primaryFirstNames,
        surname: formData.primarySurname,
        phoneNumber: formData.primaryPhone,
        email: formData.primaryEmail,
        isPrimary: true,
        isActive: true,
      };
      if (formData.primaryPosition) primaryContactData.position = formData.primaryPosition;
      if (formData.primaryIdNumber) primaryContactData.idNumber = formData.primaryIdNumber;

      await createProviderContact(primaryContactData);

      // 4. Create secondary contact if provided
      if (formData.secondaryFirstNames && formData.secondaryPhone) {
        await createProviderContact({
          providerId: provider.providerId,
          firstNames: formData.secondaryFirstNames,
          surname: formData.secondarySurname || "",
          phoneNumber: formData.secondaryPhone,
          email: formData.secondaryEmail || "",
          isPrimary: false,
          isActive: true,
        });
      }

      // 5. Upload documents
      const documentUploads: { file: File; type: DocumentType; name: string }[] = [];
      
      if (formData.idDocument) {
        documentUploads.push({ file: formData.idDocument, type: "ID_COPY", name: "ID Document" });
      }
      if (formData.cipcCertificate) {
        documentUploads.push({ file: formData.cipcCertificate, type: "CIPC_COR14_3", name: "CIPC Certificate" });
      }
      if (formData.proofOfAddress) {
        documentUploads.push({ file: formData.proofOfAddress, type: "PROOF_OF_ADDRESS", name: "Proof of Address" });
      }
      if (formData.bankLetter) {
        documentUploads.push({ file: formData.bankLetter, type: "BANK_LETTER", name: "Bank Confirmation Letter" });
      }
      if (formData.bbbeeCertificate) {
        documentUploads.push({ file: formData.bbbeeCertificate, type: "BBBEE_CERTIFICATE", name: "B-BBEE Certificate" });
      }

      for (const doc of documentUploads) {
        const path = `provider-documents/${uid}/${doc.type}_${Date.now()}`;
        const fileUrl = await uploadFile(doc.file, path);
        
        await createProviderDocument({
          providerId: provider.providerId,
          documentType: doc.type,
          documentName: doc.file.name,
          fileUrl,
          fileSize: doc.file.size,
          mimeType: doc.file.type,
          uploadedBy: uid,
        });
      }

      // Note: User role update is handled by admin during provider approval
      // The provider status is tracked via the accommodationProviders collection

      // 6. Sync provider to Dataverse CRM (background, non-blocking)
      // The user's dataverseId links the provider to their Dataverse contact record
      const userDataverseId = user?.dataverseId;
      if (userDataverseId) {
        // Prepare primary contact data for CRM sync
        const primaryContactForSync = {
          contactId: "",
          providerId: provider.providerId,
          firstNames: formData.primaryFirstNames,
          surname: formData.primarySurname,
          position: formData.primaryPosition || undefined,
          phoneNumber: formData.primaryPhone,
          email: formData.primaryEmail,
          idNumber: formData.primaryIdNumber || undefined,
          isPrimary: true,
          isActive: true,
          createdAt: provider.createdAt,
        };

        // Prepare secondary contact if provided
        const secondaryContactForSync = formData.secondaryFirstNames && formData.secondaryPhone ? {
          contactId: "",
          providerId: provider.providerId,
          firstNames: formData.secondaryFirstNames,
          surname: formData.secondarySurname || "",
          phoneNumber: formData.secondaryPhone,
          email: formData.secondaryEmail || "",
          isPrimary: false,
          isActive: true,
          createdAt: provider.createdAt,
        } : null;

        syncProviderToCRMBackground(
          provider,
          userDataverseId,
          address,
          primaryContactForSync,
          secondaryContactForSync
        );
      } else {
        console.warn("User does not have a Dataverse ID - provider will not be synced to CRM");
      }

      // Redirect to provider dashboard
      router.push("/provider-dashboard");
    } catch (err) {
      console.error("Application error:", err);
      setError(err instanceof Error ? err.message : "Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const FileUploadField = ({ label, field, required = false }: { label: string; field: keyof FormData; required?: boolean }) => {
    const file = formData[field] as File | null;
    return (
      <div className="space-y-2">
        <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            file ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-amber-500"
          }`}
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
              <span className="text-sm font-medium truncate max-w-[180px]">{file.name}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); updateFormData(field, null); }}
                className="ml-2 text-red-500 hover:text-red-700"
              >
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

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8 ml-0 lg:ml-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </main>
        </div>
      </div>
    );
  }

  if (existingProvider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8 ml-0 lg:ml-64">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    Application Already Submitted
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    You have already submitted a provider application. Your application is being reviewed.
                  </p>
                  <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                    <Link href="/provider-dashboard">Go to Dashboard</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 ml-0 lg:ml-64">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Provider Application</h1>
              <p className="text-gray-500">Apply to become an NSFAS Accommodation Provider</p>
            </div>

            {/* Progress Bar */}
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between overflow-x-auto">
                  {steps.map((s, index) => (
                    <div key={s.num} className="flex items-center">
                      <div className="flex flex-col items-center min-w-[60px]">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-1 transition-all ${
                          step > s.num ? "bg-green-500 text-white" : step === s.num ? "bg-amber-500 text-gray-900" : "bg-gray-100 text-gray-400"
                        }`}>
                          {step > s.num ? <CheckCircle size={18} /> : <s.icon size={18} />}
                        </div>
                        <span className={`text-xs font-medium ${step === s.num ? "text-amber-600" : "text-gray-400"}`}>
                          {s.label}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`w-8 h-0.5 mx-1 ${step > s.num ? "bg-green-500" : "bg-gray-200"}`} />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Form */}
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit}>
                  {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

                  {/* Step 1: Company Information */}
                  {step === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
                        <p className="text-sm text-gray-500">Basic details about your organization</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Registered Company Name *</Label>
                          <Input value={formData.companyName} onChange={(e) => updateFormData("companyName", e.target.value)} placeholder="ABC Properties (Pty) Ltd" className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                          <Label>Trading Name</Label>
                          <Input value={formData.tradingName} onChange={(e) => updateFormData("tradingName", e.target.value)} placeholder="ABC Student Housing" className="bg-gray-50" />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Legal Form *</Label>
                          <Select value={formData.legalForm} onValueChange={(v) => updateFormData("legalForm", v)}>
                            <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Select legal form" /></SelectTrigger>
                            <SelectContent>{legalForms.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>CIPC Registration Number</Label>
                          <Input value={formData.companyRegistrationNumber} onChange={(e) => updateFormData("companyRegistrationNumber", e.target.value)} placeholder="2024/123456/07" className="bg-gray-50" />
                        </div>
                      </div>
                      <div className="space-y-2 max-w-[200px]">
                        <Label>Years in Operation</Label>
                        <Input type="number" min="0" value={formData.yearsInOperation} onChange={(e) => updateFormData("yearsInOperation", e.target.value)} placeholder="5" className="bg-gray-50" />
                      </div>
                    </div>
                  )}

                  {/* Step 2: Tax & B-BBEE */}
                  {step === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Tax & B-BBEE Information</h3>
                        <p className="text-sm text-gray-500">Tax compliance and transformation details</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tax Reference Number</Label>
                          <Input value={formData.taxReferenceNumber} onChange={(e) => updateFormData("taxReferenceNumber", e.target.value)} placeholder="SARS tax reference" className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                          <Label>VAT Registered</Label>
                          <Select value={formData.vatRegistered} onValueChange={(v) => updateFormData("vatRegistered", v)}>
                            <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {formData.vatRegistered === "Yes" && (
                        <div className="space-y-2 max-w-[300px]">
                          <Label>VAT Number</Label>
                          <Input value={formData.vatNumber} onChange={(e) => updateFormData("vatNumber", e.target.value)} placeholder="VAT number" className="bg-gray-50" />
                        </div>
                      )}
                      <div className="border-t pt-4">
                        <h4 className="font-medium text-gray-900 mb-4">B-BBEE Information</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>B-BBEE Level</Label>
                            <Input type="number" min="1" max="8" value={formData.bbbeeLevel} onChange={(e) => updateFormData("bbbeeLevel", e.target.value)} placeholder="1-8" className="bg-gray-50" />
                          </div>
                          <div className="space-y-2">
                            <Label>Certificate Expiry Date</Label>
                            <Input type="date" value={formData.bbbeeCertificateExpiry} onChange={(e) => updateFormData("bbbeeCertificateExpiry", e.target.value)} className="bg-gray-50" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label>Black %</Label>
                            <Input type="number" min="0" max="100" value={formData.blackOwnershipPercentage} onChange={(e) => updateFormData("blackOwnershipPercentage", e.target.value)} className="bg-gray-50" />
                          </div>
                          <div className="space-y-2">
                            <Label>Women %</Label>
                            <Input type="number" min="0" max="100" value={formData.blackWomenOwnershipPercentage} onChange={(e) => updateFormData("blackWomenOwnershipPercentage", e.target.value)} className="bg-gray-50" />
                          </div>
                          <div className="space-y-2">
                            <Label>Youth %</Label>
                            <Input type="number" min="0" max="100" value={formData.blackYouthOwnershipPercentage} onChange={(e) => updateFormData("blackYouthOwnershipPercentage", e.target.value)} className="bg-gray-50" />
                          </div>
                          <div className="space-y-2">
                            <Label>Disabled %</Label>
                            <Input type="number" min="0" max="100" value={formData.disabledPersonOwnershipPercentage} onChange={(e) => updateFormData("disabledPersonOwnershipPercentage", e.target.value)} className="bg-gray-50" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Location */}
                  {step === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Business Address</h3>
                        <p className="text-sm text-gray-500">Physical address of your business</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Street Address *</Label>
                        <Input value={formData.street} onChange={(e) => updateFormData("street", e.target.value)} placeholder="123 Main Street" className="bg-gray-50" />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Suburb</Label>
                          <Input value={formData.suburb} onChange={(e) => updateFormData("suburb", e.target.value)} placeholder="Suburb" className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                          <Label>City/Town *</Label>
                          <Input value={formData.townCity} onChange={(e) => updateFormData("townCity", e.target.value)} placeholder="Cape Town" className="bg-gray-50" />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Province *</Label>
                          <Select value={formData.province} onValueChange={(v) => updateFormData("province", v)}>
                            <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Select province" /></SelectTrigger>
                            <SelectContent>{provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Postal Code</Label>
                          <Input value={formData.postalCode} onChange={(e) => updateFormData("postalCode", e.target.value)} placeholder="7530" className="bg-gray-50" />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Latitude</Label>
                          <Input value={formData.latitude} onChange={(e) => updateFormData("latitude", e.target.value)} placeholder="-33.9249" className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                          <Label>Longitude</Label>
                          <Input value={formData.longitude} onChange={(e) => updateFormData("longitude", e.target.value)} placeholder="18.4241" className="bg-gray-50" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Contacts */}
                  {step === 4 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Contact Persons</h3>
                        <p className="text-sm text-gray-500">Primary and secondary contact details</p>
                      </div>
                      <div className="border rounded-lg p-4 bg-amber-50">
                        <h4 className="font-medium text-gray-900 mb-2">Primary Contact *</h4>
                        <p className="text-xs text-gray-600 mb-4">Auto-filled from your profile (read-only)</p>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>First Name(s) *</Label>
                            <Input value={formData.primaryFirstNames} readOnly disabled className="bg-gray-100 cursor-not-allowed" />
                          </div>
                          <div className="space-y-2">
                            <Label>Surname *</Label>
                            <Input value={formData.primarySurname} readOnly disabled className="bg-gray-100 cursor-not-allowed" />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label>Position</Label>
                            <Input value={formData.primaryPosition} onChange={(e) => updateFormData("primaryPosition", e.target.value)} placeholder="Director" className="bg-white" />
                          </div>
                          <div className="space-y-2">
                            <Label>ID Number</Label>
                            <Input value={formData.primaryIdNumber} readOnly disabled className="bg-gray-100 cursor-not-allowed" />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label>Phone *</Label>
                            <Input type="tel" value={formData.primaryPhone} readOnly disabled className="bg-gray-100 cursor-not-allowed" />
                          </div>
                          <div className="space-y-2">
                            <Label>Email *</Label>
                            <Input type="email" value={formData.primaryEmail} readOnly disabled className="bg-gray-100 cursor-not-allowed" />
                          </div>
                        </div>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-4">Secondary Contact (Optional)</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>First Name(s)</Label>
                            <Input value={formData.secondaryFirstNames} onChange={(e) => updateFormData("secondaryFirstNames", e.target.value)} className="bg-gray-50" />
                          </div>
                          <div className="space-y-2">
                            <Label>Surname</Label>
                            <Input value={formData.secondarySurname} onChange={(e) => updateFormData("secondarySurname", e.target.value)} className="bg-gray-50" />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input type="tel" value={formData.secondaryPhone} onChange={(e) => updateFormData("secondaryPhone", e.target.value)} className="bg-gray-50" />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" value={formData.secondaryEmail} onChange={(e) => updateFormData("secondaryEmail", e.target.value)} className="bg-gray-50" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Banking */}
                  {step === 5 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Banking Details</h3>
                        <p className="text-sm text-gray-500">Bank account for NSFAS payments</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Bank Name</Label>
                          <Input value={formData.bankName} onChange={(e) => updateFormData("bankName", e.target.value)} placeholder="Standard Bank" className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Type</Label>
                          <Select value={formData.accountType} onValueChange={(v) => updateFormData("accountType", v)}>
                            <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>{accountTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Account Number</Label>
                          <Input value={formData.accountNumber} onChange={(e) => updateFormData("accountNumber", e.target.value)} className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                          <Label>Branch Code</Label>
                          <Input value={formData.branchCode} onChange={(e) => updateFormData("branchCode", e.target.value)} placeholder="051001" className="bg-gray-50" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Account Holder Name</Label>
                        <Input value={formData.accountHolder} onChange={(e) => updateFormData("accountHolder", e.target.value)} placeholder="Name as it appears on account" className="bg-gray-50" />
                      </div>
                    </div>
                  )}

                  {/* Step 6: Documents */}
                  {step === 6 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Document Upload</h3>
                        <p className="text-sm text-gray-500">Upload required compliance documents</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <FileUploadField label="ID Document (Director/Owner)" field="idDocument" required />
                        <FileUploadField label="CIPC Certificate (COR14.3)" field="cipcCertificate" required />
                        <FileUploadField label="Proof of Business Address" field="proofOfAddress" />
                        <FileUploadField label="Bank Confirmation Letter" field="bankLetter" />
                        <FileUploadField label="B-BBEE Certificate" field="bbbeeCertificate" />
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">Application Review</p>
                            <p className="text-sm text-blue-700 mt-1">
                              Your application will be reviewed by our team. You will be notified once your application has been approved.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between pt-8 mt-8 border-t border-gray-200">
                    {step > 1 ? (
                      <Button type="button" variant="outline" onClick={prevStep}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" asChild>
                        <Link href="/dashboard">Cancel</Link>
                      </Button>
                    )}
                    {step < TOTAL_STEPS ? (
                      <Button type="button" onClick={nextStep} className="bg-gray-900 hover:bg-gray-800 text-white">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                        {loading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                        ) : (
                          <>Submit Application <ArrowRight className="ml-2 h-4 w-4" /></>
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ProviderApplicationPage() {
  return (
    <ProtectedRoute>
      <ProviderApplicationContent />
    </ProtectedRoute>
  );
}
