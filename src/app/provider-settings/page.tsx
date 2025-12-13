"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  FileText, 
  MapPin, 
  Globe, 
  Lock, 
  Save, 
  Loader2,
  ArrowLeft,
  CreditCard,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getProviderByUserId, getAddressById, updateProvider, updateAddress } from "@/lib/db";
import { AccommodationProvider, Address } from "@/lib/schema";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import Link from "next/link";
import Image from "next/image";

const provinces = [
  "Western Cape", "Eastern Cape", "Northern Cape",
  "Gauteng", "KwaZulu-Natal", "Free State",
  "North West", "Mpumalanga", "Limpopo"
];

function ProviderSettingsContent() {
  const { user, isFullyLoaded } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<AccommodationProvider | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [error, setError] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Editable form state
  const [formData, setFormData] = useState({
    // Trading name (editable)
    tradingName: "",
    // VAT info (editable)
    vatRegistered: "",
    vatNumber: "",
    // B-BBEE info (editable)
    bbbeeLevel: "",
    bbbeeCertificateExpiry: "",
    blackOwnershipPercentage: "",
    blackYouthOwnershipPercentage: "",
    blackWomenOwnershipPercentage: "",
    disabledPersonOwnershipPercentage: "",
    // Campus & Contact (editable)
    preferredInstitution: "",
    preferredCampus: "",
    officeTelephone: "",
    website: "",
    customerServiceEmail: "",
    // Address (editable)
    street: "",
    suburb: "",
    townCity: "",
    province: "",
    postalCode: "",
  });

  useEffect(() => {
    const loadProviderData = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid) return;

      try {
        const providerData = await getProviderByUserId(uid);
        if (!providerData) {
          router.push("/provider-dashboard");
          return;
        }

        setProvider(providerData);

        // Load address
        if (providerData.physicalAddressId) {
          const addressData = await getAddressById(providerData.physicalAddressId);
          setAddress(addressData);
        }

        // Set logo URL if exists
        if (providerData.companyLogoUrl) {
          setLogoUrl(providerData.companyLogoUrl);
        }

        // Populate form with existing data
        setFormData({
          tradingName: providerData.tradingName || "",
          vatRegistered: providerData.vatRegistered ? "Yes" : "No",
          vatNumber: providerData.vatNumber || "",
          bbbeeLevel: providerData.bbbeeLevel?.toString() || "",
          bbbeeCertificateExpiry: providerData.bbbeeCertificateExpiry || "",
          blackOwnershipPercentage: providerData.blackOwnershipPercentage?.toString() || "",
          blackYouthOwnershipPercentage: providerData.blackYouthOwnershipPercentage?.toString() || "",
          blackWomenOwnershipPercentage: providerData.blackWomenOwnershipPercentage?.toString() || "",
          disabledPersonOwnershipPercentage: providerData.disabledPersonOwnershipPercentage?.toString() || "",
          preferredInstitution: (providerData as any).preferredInstitution || "",
          preferredCampus: (providerData as any).preferredCampus || "",
          officeTelephone: (providerData as any).officeTelephone || "",
          website: (providerData as any).website || "",
          customerServiceEmail: (providerData as any).customerServiceEmail || "",
          street: "",
          suburb: "",
          townCity: "",
          province: "",
          postalCode: "",
        });
      } catch (err) {
        console.error("Error loading provider:", err);
        setError("Failed to load provider data");
      } finally {
        setLoading(false);
      }
    };

    if (isFullyLoaded) {
      loadProviderData();
    }
  }, [user, isFullyLoaded, router]);

  // Update address form when address loads
  useEffect(() => {
    if (address) {
      setFormData(prev => ({
        ...prev,
        street: address.street || "",
        suburb: address.suburb || "",
        townCity: address.townCity || "",
        province: address.province || "",
        postalCode: address.postalCode || "",
      }));
    }
  }, [address]);

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !provider || !storage) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPEG or PNG image");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      // Create storage reference
      const logoRef = ref(storage, `providers/${provider.providerId}/logo/${file.name}`);
      
      // Upload file
      await uploadBytes(logoRef, file);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(logoRef);
      
      // Update provider with logo URL
      await updateProvider(provider.providerId, { companyLogoUrl: downloadUrl });
      
      setLogoUrl(downloadUrl);
      toast.success("Company logo uploaded successfully!");
    } catch (err) {
      console.error("Error uploading logo:", err);
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Handle logo removal
  const handleRemoveLogo = async () => {
    if (!provider || !logoUrl || !storage) return;

    setUploadingLogo(true);
    try {
      // Try to delete from storage (may fail if URL is external)
      try {
        const logoRef = ref(storage, logoUrl);
        await deleteObject(logoRef);
      } catch {
        // Ignore deletion errors - URL might be external or already deleted
      }

      // Update provider to remove logo URL
      await updateProvider(provider.providerId, { companyLogoUrl: "" });
      
      setLogoUrl(null);
      toast.success("Company logo removed");
    } catch (err) {
      console.error("Error removing logo:", err);
      toast.error("Failed to remove logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!provider) return;

    setSaving(true);
    setError("");

    try {
      // Update provider data
      const providerUpdates: any = {
        tradingName: formData.tradingName || undefined,
        vatRegistered: formData.vatRegistered === "Yes",
        vatNumber: formData.vatRegistered === "Yes" ? formData.vatNumber : undefined,
        bbbeeLevel: formData.bbbeeLevel ? parseInt(formData.bbbeeLevel) : undefined,
        bbbeeCertificateExpiry: formData.bbbeeCertificateExpiry || undefined,
        blackOwnershipPercentage: formData.blackOwnershipPercentage ? parseFloat(formData.blackOwnershipPercentage) : undefined,
        blackYouthOwnershipPercentage: formData.blackYouthOwnershipPercentage ? parseFloat(formData.blackYouthOwnershipPercentage) : undefined,
        blackWomenOwnershipPercentage: formData.blackWomenOwnershipPercentage ? parseFloat(formData.blackWomenOwnershipPercentage) : undefined,
        disabledPersonOwnershipPercentage: formData.disabledPersonOwnershipPercentage ? parseFloat(formData.disabledPersonOwnershipPercentage) : undefined,
        preferredInstitution: formData.preferredInstitution || undefined,
        preferredCampus: formData.preferredCampus || undefined,
        officeTelephone: formData.officeTelephone || undefined,
        website: formData.website || undefined,
        customerServiceEmail: formData.customerServiceEmail || undefined,
      };

      // Remove undefined values
      Object.keys(providerUpdates).forEach(key => {
        if (providerUpdates[key] === undefined) {
          delete providerUpdates[key];
        }
      });

      await updateProvider(provider.providerId, providerUpdates);

      // Update address if exists
      if (address && provider.physicalAddressId) {
        await updateAddress(provider.physicalAddressId, {
          street: formData.street,
          suburb: formData.suburb || undefined,
          townCity: formData.townCity,
          province: formData.province,
          postalCode: formData.postalCode || undefined,
        });
      }

      toast.success("Settings saved successfully");
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Failed to save settings. Please try again.");
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader />
        <div className="flex">
          <Sidebar userType="provider" />
          <main className="flex-1 p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />
      <div className="flex">
        <Sidebar userType="provider" />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/provider-dashboard">
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Provider Settings</h1>
                  <p className="text-gray-500 dark:text-gray-400">Update your business information</p>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Locked Fields Notice */}
            <Card className="mb-6 border-gray-200 dark:border-gray-700 dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg dark:text-white">
                  <Lock className="w-5 h-5 text-gray-400" />
                  Locked Information
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  The following information cannot be changed. Contact support if you need to update these details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Company Name</p>
                    <p className="font-medium dark:text-white flex items-center gap-2">
                      {provider?.companyName}
                      <Lock className="w-3 h-3 text-gray-400" />
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Legal Form</p>
                    <p className="font-medium dark:text-white flex items-center gap-2">
                      {provider?.legalForm}
                      <Lock className="w-3 h-3 text-gray-400" />
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Registration Number</p>
                    <p className="font-medium dark:text-white flex items-center gap-2">
                      {provider?.companyRegistrationNumber || "Not set"}
                      <Lock className="w-3 h-3 text-gray-400" />
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tax Reference Number</p>
                    <p className="font-medium dark:text-white flex items-center gap-2">
                      {provider?.taxReferenceNumber || "Not set"}
                      <Lock className="w-3 h-3 text-gray-400" />
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Bank Account</p>
                    <p className="font-medium dark:text-white flex items-center gap-2">
                      {provider?.bankName ? `${provider.bankName} - ****${provider.accountNumber?.slice(-4)}` : "Not set"}
                      <Lock className="w-3 h-3 text-gray-400" />
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  <CreditCard className="w-3 h-3 inline mr-1" />
                  Banking details and tax numbers require verification and can only be changed by contacting support.
                </p>
              </CardContent>
            </Card>

            {/* Company Logo */}
            <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <ImageIcon className="w-5 h-5 text-amber-500" />
                  Company Logo
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Upload your company logo to appear on invoices and documents
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  {/* Logo Preview */}
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-700">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt="Company Logo"
                        width={128}
                        height={128}
                        className="object-contain w-full h-full"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                        <p className="text-xs">No logo</p>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={uploadingLogo}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploadingLogo}
                          className="pointer-events-none"
                        >
                          {uploadingLogo ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Logo
                            </>
                          )}
                        </Button>
                      </label>
                      {logoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveLogo}
                          disabled={uploadingLogo}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Accepted formats: JPEG, PNG. Max size: 2MB.
                      <br />
                      Recommended: Square image, at least 200x200 pixels.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editable: Trading Name */}
            <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Building2 className="w-5 h-5 text-amber-500" />
                  Business Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Trading Name</Label>
                    <Input 
                      value={formData.tradingName} 
                      onChange={(e) => setFormData(prev => ({ ...prev, tradingName: e.target.value }))}
                      placeholder="Trading name (if different from company name)"
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Years in Operation</Label>
                    <Input 
                      value={provider?.yearsInOperation?.toString() || ""} 
                      disabled
                      className="bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400">Contact support to update</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editable: Campus & Contact Info */}
            <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Globe className="w-5 h-5 text-amber-500" />
                  Campus & Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preferred Institution</Label>
                    <Input 
                      value={formData.preferredInstitution} 
                      onChange={(e) => setFormData(prev => ({ ...prev, preferredInstitution: e.target.value }))}
                      placeholder="e.g. Wits University"
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Campus</Label>
                    <Input 
                      value={formData.preferredCampus} 
                      onChange={(e) => setFormData(prev => ({ ...prev, preferredCampus: e.target.value }))}
                      placeholder="e.g. Main Campus"
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Office Telephone</Label>
                    <Input 
                      type="tel"
                      value={formData.officeTelephone} 
                      onChange={(e) => setFormData(prev => ({ ...prev, officeTelephone: e.target.value }))}
                      placeholder="e.g. 0127458100"
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Service Email</Label>
                    <Input 
                      type="email"
                      value={formData.customerServiceEmail} 
                      onChange={(e) => setFormData(prev => ({ ...prev, customerServiceEmail: e.target.value }))}
                      placeholder="e.g. info@company.co.za"
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input 
                    type="url"
                    value={formData.website} 
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://www.yourcompany.co.za"
                    className="bg-gray-50 dark:bg-gray-700"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Editable: VAT Information */}
            <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <FileText className="w-5 h-5 text-amber-500" />
                  VAT Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>VAT Registered</Label>
                    <Select 
                      value={formData.vatRegistered} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, vatRegistered: v }))}
                    >
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-700">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
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
                    <Input 
                      value={formData.vatNumber} 
                      onChange={(e) => setFormData(prev => ({ ...prev, vatNumber: e.target.value }))}
                      placeholder="VAT number"
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Editable: B-BBEE Information */}
            <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <FileText className="w-5 h-5 text-amber-500" />
                  B-BBEE Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>B-BBEE Level</Label>
                    <Input 
                      type="number"
                      min="1"
                      max="8"
                      value={formData.bbbeeLevel} 
                      onChange={(e) => setFormData(prev => ({ ...prev, bbbeeLevel: e.target.value }))}
                      placeholder="1-8"
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Certificate Expiry Date</Label>
                    <Input 
                      type="date"
                      value={formData.bbbeeCertificateExpiry} 
                      onChange={(e) => setFormData(prev => ({ ...prev, bbbeeCertificateExpiry: e.target.value }))}
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Black Ownership %</Label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      value={formData.blackOwnershipPercentage} 
                      onChange={(e) => setFormData(prev => ({ ...prev, blackOwnershipPercentage: e.target.value }))}
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Women %</Label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      value={formData.blackWomenOwnershipPercentage} 
                      onChange={(e) => setFormData(prev => ({ ...prev, blackWomenOwnershipPercentage: e.target.value }))}
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Youth %</Label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      value={formData.blackYouthOwnershipPercentage} 
                      onChange={(e) => setFormData(prev => ({ ...prev, blackYouthOwnershipPercentage: e.target.value }))}
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Disabled %</Label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      value={formData.disabledPersonOwnershipPercentage} 
                      onChange={(e) => setFormData(prev => ({ ...prev, disabledPersonOwnershipPercentage: e.target.value }))}
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editable: Address */}
            <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <MapPin className="w-5 h-5 text-amber-500" />
                  Business Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input 
                    value={formData.street} 
                    onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="Street address"
                    className="bg-gray-50 dark:bg-gray-700"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Suburb</Label>
                    <Input 
                      value={formData.suburb} 
                      onChange={(e) => setFormData(prev => ({ ...prev, suburb: e.target.value }))}
                      placeholder="Suburb"
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Town/City</Label>
                    <Input 
                      value={formData.townCity} 
                      onChange={(e) => setFormData(prev => ({ ...prev, townCity: e.target.value }))}
                      placeholder="Town or city"
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Province</Label>
                    <Select 
                      value={formData.province} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, province: v }))}
                    >
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-700">
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
                      onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="Postal code"
                      className="bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button (bottom) */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ProviderSettingsPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <ProviderSettingsContent />
    </ProtectedRoute>
  );
}
