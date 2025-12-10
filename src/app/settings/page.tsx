"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { User, MapPin, FileText, Upload, Loader2, CheckCircle, Lock, Mail, FolderOpen } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { updateUser, createPlatformResource } from "@/lib/db";
import { UserAddress } from "@/lib/types";
import { ResourceCategory, ResourceSubCategory, ResourceFileType } from "@/lib/schema";
import { Textarea } from "@/components/ui/textarea";

const provinces = [
  "Western Cape", "Eastern Cape", "Northern Cape",
  "Gauteng", "KwaZulu-Natal", "Free State",
  "North West", "Mpumalanga", "Limpopo"
];

// Predefined resources for each category
interface PredefinedResource {
  id: string;
  title: string;
  description: string;
  subCategory: ResourceSubCategory;
}

const predefinedGuides: PredefinedResource[] = [
  { id: "guide-1", title: "How to Onboard Students", description: "Complete guide to registering and onboarding new students to your property", subCategory: "Onboarding" },
  { id: "guide-2", title: "How to Upload Compliance Documents", description: "Step-by-step instructions for uploading and managing compliance documentation", subCategory: "Compliance" },
  { id: "guide-3", title: "Fire Safety Compliance Guide", description: "Essential fire safety requirements and compliance checklist for accommodation providers", subCategory: "Safety" },
  { id: "guide-4", title: "Property Registration Walkthrough", description: "Video tutorial on how to register your property on the platform", subCategory: "Onboarding" },
  { id: "guide-5", title: "Invoice Submission Tutorial", description: "Learn how to create and submit invoices for student accommodation", subCategory: "Billing" },
  { id: "guide-6", title: "Room Configuration Guide", description: "How to set up and manage room configurations for your properties", subCategory: "Property Management" },
];

const predefinedTemplates: PredefinedResource[] = [
  { id: "template-1", title: "Lease Agreement Template", description: "Standard lease agreement template for student accommodation", subCategory: "Legal" },
  { id: "template-2", title: "Property Inspection Checklist", description: "Comprehensive checklist for property inspections and compliance", subCategory: "Operations" },
  { id: "template-3", title: "Financial Statement Template", description: "Template for submitting financial documentation to NSFAS", subCategory: "Financial" },
  { id: "template-4", title: "Incident Report Form", description: "Standard form for reporting incidents at your property", subCategory: "Operations" },
  { id: "template-5", title: "Room Configuration Template", description: "Template for documenting room layouts and configurations", subCategory: "Operations" },
  { id: "template-6", title: "Student Check-in/Check-out Form", description: "Form for documenting student arrivals and departures", subCategory: "Operations" },
];

const predefinedPolicies: PredefinedResource[] = [
  { id: "policy-1", title: "NSFAS Accreditation Policy 2025", description: "Official NSFAS accreditation requirements and guidelines for accommodation providers", subCategory: "Accreditation" },
  { id: "policy-2", title: "Fire & Safety Regulations", description: "National fire safety regulations applicable to student accommodation", subCategory: "Accreditation" },
  { id: "policy-3", title: "Occupancy Compliance Rules", description: "Guidelines for maximum occupancy and room allocation standards", subCategory: "Accreditation" },
  { id: "policy-4", title: "Building Safety Standards", description: "Structural and building safety requirements for student housing", subCategory: "Accreditation" },
  { id: "policy-5", title: "Student Rights & Responsibilities", description: "Policy document outlining student rights and provider obligations", subCategory: "System" },
  { id: "policy-6", title: "Data Protection & Privacy Policy", description: "POPIA compliance guidelines for handling student information", subCategory: "System" },
];

type UploadType = "Guides & Tutorials" | "Templates & Forms" | "Policies & Regulations" | "Other";

function SettingsContent() {
  const { user, refreshUser, isFullyLoaded, profileLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idDocInputRef = useRef<HTMLInputElement>(null);

  // Profile Picture State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState(false);

  // Address State
  const [address, setAddress] = useState<Partial<UserAddress>>({
    street: "",
    suburb: "",
    townCity: "",
    province: "",
    postalCode: "",
    country: "South Africa",
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressSuccess, setAddressSuccess] = useState(false);

  // ID Document State
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docSuccess, setDocSuccess] = useState(false);
  const [idDocUrl, setIdDocUrl] = useState<string>("");

  const [error, setError] = useState("");

  // Password Reset State
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Platform Resource Upload State (Admin Only)
  const resourceFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [resourceSuccess, setResourceSuccess] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType | "">("");
  const [selectedPredefinedId, setSelectedPredefinedId] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceCategory, setResourceCategory] = useState<ResourceCategory | "">("");
  const [resourceSubCategory, setResourceSubCategory] = useState<ResourceSubCategory | "">("");

  // Subcategory options based on selected category
  const getSubCategories = (category: ResourceCategory): ResourceSubCategory[] => {
    switch (category) {
      case "Guides & Tutorials":
        return ["Onboarding", "Compliance", "Safety", "Billing", "Property Management"];
      case "Templates & Forms":
        return ["Legal", "Financial", "Operations"];
      case "Policies & Regulations":
        return ["Accreditation", "System"];
      default:
        return [];
    }
  };

  // Get predefined resources based on upload type
  const getPredefinedResources = (type: UploadType): PredefinedResource[] => {
    switch (type) {
      case "Guides & Tutorials":
        return predefinedGuides;
      case "Templates & Forms":
        return predefinedTemplates;
      case "Policies & Regulations":
        return predefinedPolicies;
      default:
        return [];
    }
  };

  // Handle upload type change
  const handleUploadTypeChange = (type: UploadType | "") => {
    setUploadType(type);
    setSelectedPredefinedId("");
    setResourceTitle("");
    setResourceDescription("");
    setResourceSubCategory("");
    
    // Set category based on upload type (except for "Other")
    if (type && type !== "Other") {
      setResourceCategory(type as ResourceCategory);
    } else {
      setResourceCategory("");
    }
  };

  // Handle predefined resource selection
  const handlePredefinedSelect = (predefinedId: string) => {
    setSelectedPredefinedId(predefinedId);
    
    if (!predefinedId) {
      setResourceTitle("");
      setResourceDescription("");
      setResourceSubCategory("");
      return;
    }
    
    const resources = getPredefinedResources(uploadType as UploadType);
    const selected = resources.find(r => r.id === predefinedId);
    
    if (selected) {
      setResourceTitle(selected.title);
      setResourceDescription(selected.description);
      setResourceSubCategory(selected.subCategory);
    }
  };

  // Load existing address and ID document from user object
  useEffect(() => {
    // Load existing address from user object
    if (user?.address) {
      setAddress(user.address);
    }

    // Load existing ID document URL if available
    if (user?.idDocumentUrl) {
      setIdDocUrl(user.idDocumentUrl);
    }
  }, [user?.address, user?.idDocumentUrl]);

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    setError("");
    setPhotoSuccess(false);

    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `profile-photos/${user.userId || user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update user profile
      const uid = user.userId || user.uid;
      await updateUser(uid, { profilePhotoUrl: downloadURL });

      // Refresh user data
      await refreshUser();

      setPhotoSuccess(true);
      setTimeout(() => setPhotoSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error uploading photo:", err);
      setError(err.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddressSave = async () => {
    if (!user) return;

    // Validation
    if (!address.street || !address.townCity || !address.province) {
      setError("Please fill in street, city, and province");
      return;
    }

    setSavingAddress(true);
    setError("");
    setAddressSuccess(false);

    try {
      const uid = user.userId || user.uid;

      // Update user with embedded address object
      await updateUser(uid, {
        address: {
          street: address.street!,
          suburb: address.suburb,
          townCity: address.townCity!,
          province: address.province!,
          postalCode: address.postalCode,
          country: address.country || "South Africa",
        }
      });

      // Refresh user data
      await refreshUser();

      setAddressSuccess(true);
      setTimeout(() => setAddressSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error saving address:", err);
      setError(err.message || "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleIdDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type - PDF only
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file only");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("PDF size must be less than 10MB");
      return;
    }

    setUploadingDoc(true);
    setError("");
    setDocSuccess(false);

    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `id-documents/${user.userId || user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setIdDocUrl(downloadURL);

      // Update user profile with document URL
      const uid = user.userId || user.uid;
      await updateUser(uid, { idDocumentUrl: downloadURL });

      // Refresh user data
      await refreshUser();

      setDocSuccess(true);
      setTimeout(() => setDocSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error uploading document:", err);
      setError(err.message || "Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleResourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate required fields
    if (!resourceTitle.trim()) {
      setError("Please enter a resource title");
      return;
    }
    if (!resourceDescription.trim()) {
      setError("Please enter a resource description");
      return;
    }
    if (!resourceCategory) {
      setError("Please select a category");
      return;
    }
    if (!resourceSubCategory) {
      setError("Please select a subcategory");
      return;
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "video/mp4",
      "video/quicktime",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PDF, DOCX, XLSX, or video file");
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be less than 50MB");
      return;
    }

    setUploadingResource(true);
    setError("");
    setResourceSuccess(false);

    try {
      // Determine file type
      let fileType: ResourceFileType = "pdf";
      if (file.type.includes("wordprocessingml")) fileType = "docx";
      else if (file.type.includes("spreadsheetml")) fileType = "xlsx";
      else if (file.type.includes("video")) fileType = "video";

      // Upload to Firebase Storage
      const storageRef = ref(
        storage,
        `platform-resources/${resourceCategory}/${Date.now()}_${file.name}`
      );
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Create platform resource in Firestore
      await createPlatformResource(
        {
          title: resourceTitle.trim(),
          description: resourceDescription.trim(),
          category: resourceCategory as ResourceCategory,
          subCategory: resourceSubCategory as ResourceSubCategory,
          fileType,
          fileUrl: downloadURL,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          downloadCount: 0,
          uploadedByEmail: user.email || "",
          isActive: true,
          ...(selectedPredefinedId && { predefinedResourceId: selectedPredefinedId }),
        },
        user.email || user.userId || user.uid
      );

      setResourceSuccess(true);
      setTimeout(() => {
        setResourceSuccess(false);
        // Reset form
        setUploadType("");
        setSelectedPredefinedId("");
        setResourceTitle("");
        setResourceDescription("");
        setResourceCategory("");
        setResourceSubCategory("");
        if (resourceFileInputRef.current) {
          resourceFileInputRef.current.value = "";
        }
      }, 3000);
    } catch (err: any) {
      console.error("Error uploading resource:", err);
      setError(err.message || "Failed to upload resource");
    } finally {
      setUploadingResource(false);
    }
  };

  // Show loading state while user data is being fetched
  if (!isFullyLoaded || profileLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex">
          <Sidebar userType="provider" />
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-64"></div>
              </div>
              <div className="grid gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-gray-200 rounded w-48"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
        <Sidebar userType="provider" />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-500">Manage your account preferences and documents</p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6">
              {/* Profile Picture */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-500" />
                    Profile Picture
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {user?.profilePhotoUrl ? (
                        <img
                          src={user.profilePhotoUrl}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover border-4 border-amber-200"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-amber-200">
                          {user?.firstNames?.charAt(0) || user?.firstName?.charAt(0) || "U"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-3">
                        Upload a profile picture. JPG, PNG or GIF. Max size 5MB.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoUpload}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="bg-amber-500 hover:bg-amber-600 text-gray-900"
                      >
                        {uploadingPhoto ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : photoSuccess ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Uploaded!
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Photo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-amber-500" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                      <div>
                        <Label htmlFor="street">Street Address *</Label>
                        <Input
                          id="street"
                          value={address.street || ""}
                          onChange={(e) => setAddress({ ...address, street: e.target.value })}
                          placeholder="123 Main Street"
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="suburb">Suburb</Label>
                          <Input
                            id="suburb"
                            value={address.suburb || ""}
                            onChange={(e) => setAddress({ ...address, suburb: e.target.value })}
                            placeholder="Suburb"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="townCity">City/Town *</Label>
                          <Input
                            id="townCity"
                            value={address.townCity || ""}
                            onChange={(e) => setAddress({ ...address, townCity: e.target.value })}
                            placeholder="Cape Town"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="province">Province *</Label>
                          <Select
                            value={address.province || ""}
                            onValueChange={(v) => setAddress({ ...address, province: v })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select province" />
                            </SelectTrigger>
                            <SelectContent>
                              {provinces.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="postalCode">Postal Code</Label>
                          <Input
                            id="postalCode"
                            value={address.postalCode || ""}
                            onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                            placeholder="7530"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleAddressSave}
                        disabled={savingAddress}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900"
                      >
                        {savingAddress ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : addressSuccess ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Saved!
                          </>
                        ) : (
                          <>
                            Save Address
                          </>
                        )}
                      </Button>
                    </div>
                </CardContent>
              </Card>

              {/* ID Document */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500" />
                    ID Document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a copy of your ID document. PDF format only. Max size 10MB.
                  </p>
                  <input
                    ref={idDocInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleIdDocUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={() => idDocInputRef.current?.click()}
                      disabled={uploadingDoc}
                      variant="outline"
                      className="border-amber-500 text-amber-600 hover:bg-amber-50"
                    >
                      {uploadingDoc ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : docSuccess ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Uploaded!
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload ID Document (PDF)
                        </>
                      )}
                    </Button>
                    {idDocUrl && (
                      <a
                        href={idDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-amber-600 hover:underline"
                      >
                        View uploaded document
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Platform Resources Upload (Admin Only) */}
              {user?.email === "shampene@lebonconsulting.co.za" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-amber-500" />
                      Platform Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload resources for all authenticated users to access. Select a predefined document type or choose &quot;Other&quot; for custom uploads.
                    </p>

                    <div className="space-y-4">
                      {/* Upload Type */}
                      <div>
                        <Label htmlFor="uploadType">Upload Type *</Label>
                        <Select
                          value={uploadType}
                          onValueChange={(value) => handleUploadTypeChange(value as UploadType | "")}
                          disabled={uploadingResource}
                        >
                          <SelectTrigger id="uploadType">
                            <SelectValue placeholder="Select upload type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Guides & Tutorials">Guides & Tutorials</SelectItem>
                            <SelectItem value="Templates & Forms">Templates & Forms</SelectItem>
                            <SelectItem value="Policies & Regulations">Policies & Regulations</SelectItem>
                            <SelectItem value="Other">Other (Custom)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Predefined Document Selection (for non-Other types) */}
                      {uploadType && uploadType !== "Other" && (
                        <div>
                          <Label htmlFor="predefinedResource">Document Name *</Label>
                          <Select
                            value={selectedPredefinedId}
                            onValueChange={handlePredefinedSelect}
                            disabled={uploadingResource}
                          >
                            <SelectTrigger id="predefinedResource">
                              <SelectValue placeholder="Select document to upload" />
                            </SelectTrigger>
                            <SelectContent>
                              {getPredefinedResources(uploadType as UploadType).map((resource) => (
                                <SelectItem key={resource.id} value={resource.id}>
                                  {resource.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedPredefinedId && (
                            <p className="text-xs text-gray-500 mt-1">
                              {getPredefinedResources(uploadType as UploadType).find(r => r.id === selectedPredefinedId)?.description}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Manual fields for "Other" type */}
                      {uploadType === "Other" && (
                        <>
                          {/* Category */}
                          <div>
                            <Label htmlFor="resourceCategory">Category *</Label>
                            <Select
                              value={resourceCategory}
                              onValueChange={(value) => {
                                setResourceCategory(value as ResourceCategory);
                                setResourceSubCategory("");
                              }}
                              disabled={uploadingResource}
                            >
                              <SelectTrigger id="resourceCategory">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Guides & Tutorials">Guides & Tutorials</SelectItem>
                                <SelectItem value="Templates & Forms">Templates & Forms</SelectItem>
                                <SelectItem value="Policies & Regulations">Policies & Regulations</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Subcategory */}
                          {resourceCategory && (
                            <div>
                              <Label htmlFor="resourceSubCategory">Subcategory *</Label>
                              <Select
                                value={resourceSubCategory}
                                onValueChange={(value) => setResourceSubCategory(value as ResourceSubCategory)}
                                disabled={uploadingResource}
                              >
                                <SelectTrigger id="resourceSubCategory">
                                  <SelectValue placeholder="Select subcategory" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getSubCategories(resourceCategory as ResourceCategory).map((sub) => (
                                    <SelectItem key={sub} value={sub}>
                                      {sub}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Title */}
                          <div>
                            <Label htmlFor="resourceTitle">Title *</Label>
                            <Input
                              id="resourceTitle"
                              value={resourceTitle}
                              onChange={(e) => setResourceTitle(e.target.value)}
                              placeholder="e.g., NSFAS Lease Agreement Template 2025"
                              disabled={uploadingResource}
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <Label htmlFor="resourceDescription">Description *</Label>
                            <Textarea
                              id="resourceDescription"
                              value={resourceDescription}
                              onChange={(e) => setResourceDescription(e.target.value)}
                              placeholder="Describe what this resource is and how it should be used..."
                              rows={3}
                              disabled={uploadingResource}
                            />
                          </div>
                        </>
                      )}

                      {/* File Upload */}
                      <div>
                        <Label>File *</Label>
                        <input
                          ref={resourceFileInputRef}
                          type="file"
                          accept=".pdf,.docx,.xlsx,.mp4,.mov"
                          onChange={handleResourceUpload}
                          className="hidden"
                          disabled={uploadingResource}
                        />
                        <Button
                          onClick={() => resourceFileInputRef.current?.click()}
                          disabled={
                            uploadingResource || 
                            !uploadType ||
                            (uploadType !== "Other" && !selectedPredefinedId) ||
                            (uploadType === "Other" && (!resourceTitle || !resourceDescription || !resourceCategory || !resourceSubCategory))
                          }
                          variant="outline"
                          className="border-amber-500 text-amber-600 hover:bg-amber-50 w-full"
                        >
                          {uploadingResource ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : resourceSuccess ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Uploaded Successfully!
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Select File to Upload
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                          Accepted formats: PDF, DOCX, XLSX, MP4, MOV (Max 50MB)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Password Reset */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-500" />
                    Password & Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Click the button below to receive a password reset link at your registered email address.
                  </p>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email Address</p>
                      <p className="font-medium text-gray-900">{user?.email || "No email"}</p>
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!user?.email || !auth) return;
                      
                      setSendingReset(true);
                      setError("");
                      setResetSuccess(false);
                      
                      try {
                        await sendPasswordResetEmail(auth, user.email);
                        setResetSuccess(true);
                        setTimeout(() => setResetSuccess(false), 5000);
                      } catch (err: any) {
                        console.error("Error sending reset email:", err);
                        setError(err.message || "Failed to send password reset email");
                      } finally {
                        setSendingReset(false);
                      }
                    }}
                    disabled={sendingReset || !user?.email}
                    variant="outline"
                    className="border-amber-500 text-amber-600 hover:bg-amber-50"
                  >
                    {sendingReset ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : resetSuccess ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Reset Link Sent!
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Send Password Reset Link
                      </>
                    )}
                  </Button>
                  {resetSuccess && (
                    <p className="text-sm text-green-600 mt-3">
                      A password reset link has been sent to {user?.email}. Please check your inbox.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
