"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Loader2, X, CheckCircle } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  getProviderByUserId,
  createProperty,
  createAddress,
  createRoomConfiguration,
  createPropertyDocument,
  createPropertyImage
} from "@/lib/db";
import { AccommodationProvider, PropertyType, OwnershipType } from "@/lib/schema";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const provinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

const institutions = [
  "University of Cape Town",
  "University of Witwatersrand",
  "University of Pretoria",
  "Stellenbosch University",
  "University of KwaZulu-Natal",
  "University of Johannesburg",
  "Rhodes University",
  "Nelson Mandela University",
  "University of the Free State",
  "North-West University",
  "Other",
];

const ROOM_TYPES = [
  { key: "bachelor", label: "Bachelor", description: "Single occupancy studio" },
  { key: "singleEnSuite", label: "Single En Suite", description: "Private bathroom included" },
  { key: "singleStandard", label: "Single Standard", description: "Minimum 8m² shared facilities" },
  { key: "sharing2Beds_EnSuite", label: "Sharing En Suite (2 Beds)", description: "Minimum 14m² with private bathroom" },
  { key: "sharing2Beds_Standard", label: "Sharing Standard (2 Beds)", description: "Minimum 14m² shared facilities" },
  { key: "sharing3Beds_EnSuite", label: "Sharing En Suite (3 Beds)", description: "Minimum 19m² with private bathroom" },
  { key: "sharing3Beds_Standard", label: "Sharing Standard (3 Beds)", description: "Minimum 19m² shared facilities" },
];

function AddPropertyContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<AccommodationProvider | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = 5;

  // File input refs
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const roomImagesInputRef = useRef<HTMLInputElement>(null);
  const commonRoomImagesInputRef = useRef<HTMLInputElement>(null);
  const ablutionImagesInputRef = useRef<HTMLInputElement>(null);
  const kitchenImagesInputRef = useRef<HTMLInputElement>(null);
  const amenitiesImagesInputRef = useRef<HTMLInputElement>(null);
  const titleDeedInputRef = useRef<HTMLInputElement>(null);
  const safetyCertInputRef = useRef<HTMLInputElement>(null);
  const utilityBillInputRef = useRef<HTMLInputElement>(null);

  // Fetch provider on mount
  useEffect(() => {
    const fetchProvider = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid) return;

      try {
        const providerData = await getProviderByUserId(uid);
        if (!providerData) {
          setError("You must be an approved accommodation provider to add properties.");
          return;
        }
        if (providerData.approvalStatus !== "Approved") {
          setError("Your provider application must be approved before adding properties.");
          return;
        }
        setProvider(providerData);
      } catch (err) {
        console.error("Error fetching provider:", err);
        setError("Failed to load provider information.");
      }
    };
    fetchProvider();
  }, [user?.userId, user?.uid]);

  // Step 1: Property Information
  const [step1Data, setStep1Data] = useState({
    name: "",
    ownershipType: "" as OwnershipType | "",
    propertyType: "" as PropertyType | "",
    province: "",
    institution: "",
    description: "",
    coverImageFile: null as File | null,
    coverImagePreview: "",
  });

  // Step 2: Property Address & Manager
  const [step2Data, setStep2Data] = useState({
    street: "",
    suburb: "",
    city: "",
    managerName: "",
    managerId: "",
    managerEmail: "",
    managerPhone: "",
  });

  // Step 3: Room Configuration
  const [step3Data, setStep3Data] = useState({
    bachelor: 0,
    singleEnSuite: 0,
    singleStandard: 0,
    sharing2Beds_EnSuite: 0,
    sharing2Beds_Standard: 0,
    sharing3Beds_EnSuite: 0,
    sharing3Beds_Standard: 0,
  });

  // Step 4: Property Images
  const [step4Data, setStep4Data] = useState({
    roomImages: [] as File[],
    roomImagePreviews: [] as string[],
    commonRoomImages: [] as File[],
    commonRoomImagePreviews: [] as string[],
    ablutionImages: [] as File[],
    ablutionImagePreviews: [] as string[],
    kitchenImages: [] as File[],
    kitchenImagePreviews: [] as string[],
    amenitiesImages: [] as File[],
    amenitiesImagePreviews: [] as string[],
  });

  // Step 5: Documents
  const [step5Data, setStep5Data] = useState({
    titleDeedFile: null as File | null,
    titleDeedName: "",
    safetyCertFile: null as File | null,
    safetyCertName: "",
    utilityBillFile: null as File | null,
    utilityBillName: "",
  });

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const preview = URL.createObjectURL(file);
    setStep1Data({ ...step1Data, coverImageFile: file, coverImagePreview: preview });
  };

  const handleRoomImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (step4Data.roomImages.length + files.length > 5) {
      toast.error("Maximum 5 images allowed for rooms");
      return;
    }

    const validFiles = files.filter(f => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} is not an image file`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} is larger than 5MB`);
        return false;
      }
      return true;
    });

    const previews = validFiles.map(f => URL.createObjectURL(f));
    setStep4Data({
      ...step4Data,
      roomImages: [...step4Data.roomImages, ...validFiles],
      roomImagePreviews: [...step4Data.roomImagePreviews, ...previews],
    });
  };

  const handleCommonRoomImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (step4Data.commonRoomImages.length + files.length > 2) {
      toast.error("Maximum 2 images allowed for common room");
      return;
    }

    const validFiles = files.filter(f => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} is not an image file`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} is larger than 5MB`);
        return false;
      }
      return true;
    });

    const previews = validFiles.map(f => URL.createObjectURL(f));
    setStep4Data({
      ...step4Data,
      commonRoomImages: [...step4Data.commonRoomImages, ...validFiles],
      commonRoomImagePreviews: [...step4Data.commonRoomImagePreviews, ...previews],
    });
  };

  const removeRoomImage = (index: number) => {
    const newImages = step4Data.roomImages.filter((_, i) => i !== index);
    const newPreviews = step4Data.roomImagePreviews.filter((_, i) => i !== index);
    setStep4Data({ ...step4Data, roomImages: newImages, roomImagePreviews: newPreviews });
  };

  const removeCommonRoomImage = (index: number) => {
    const newImages = step4Data.commonRoomImages.filter((_, i) => i !== index);
    const newPreviews = step4Data.commonRoomImagePreviews.filter((_, i) => i !== index);
    setStep4Data({ ...step4Data, commonRoomImages: newImages, commonRoomImagePreviews: newPreviews });
  };

  const handleAblutionImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (step4Data.ablutionImages.length + files.length > 2) {
      toast.error("Maximum 2 images allowed for ablution facilities");
      return;
    }

    const validFiles = files.filter(f => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} is not an image file`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} is larger than 5MB`);
        return false;
      }
      return true;
    });

    const previews = validFiles.map(f => URL.createObjectURL(f));
    setStep4Data({
      ...step4Data,
      ablutionImages: [...step4Data.ablutionImages, ...validFiles],
      ablutionImagePreviews: [...step4Data.ablutionImagePreviews, ...previews],
    });
  };

  const removeAblutionImage = (index: number) => {
    const newImages = step4Data.ablutionImages.filter((_, i) => i !== index);
    const newPreviews = step4Data.ablutionImagePreviews.filter((_, i) => i !== index);
    setStep4Data({ ...step4Data, ablutionImages: newImages, ablutionImagePreviews: newPreviews });
  };

  const handleKitchenImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (step4Data.kitchenImages.length + files.length > 3) {
      toast.error("Maximum 3 images allowed for kitchen");
      return;
    }

    const validFiles = files.filter(f => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} is not an image file`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} is larger than 5MB`);
        return false;
      }
      return true;
    });

    const previews = validFiles.map(f => URL.createObjectURL(f));
    setStep4Data({
      ...step4Data,
      kitchenImages: [...step4Data.kitchenImages, ...validFiles],
      kitchenImagePreviews: [...step4Data.kitchenImagePreviews, ...previews],
    });
  };

  const removeKitchenImage = (index: number) => {
    const newImages = step4Data.kitchenImages.filter((_, i) => i !== index);
    const newPreviews = step4Data.kitchenImagePreviews.filter((_, i) => i !== index);
    setStep4Data({ ...step4Data, kitchenImages: newImages, kitchenImagePreviews: newPreviews });
  };

  const handleAmenitiesImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (step4Data.amenitiesImages.length + files.length > 2) {
      toast.error("Maximum 2 images allowed for amenities");
      return;
    }

    const validFiles = files.filter(f => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} is not an image file`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} is larger than 5MB`);
        return false;
      }
      return true;
    });

    const previews = validFiles.map(f => URL.createObjectURL(f));
    setStep4Data({
      ...step4Data,
      amenitiesImages: [...step4Data.amenitiesImages, ...validFiles],
      amenitiesImagePreviews: [...step4Data.amenitiesImagePreviews, ...previews],
    });
  };

  const removeAmenitiesImage = (index: number) => {
    const newImages = step4Data.amenitiesImages.filter((_, i) => i !== index);
    const newPreviews = step4Data.amenitiesImagePreviews.filter((_, i) => i !== index);
    setStep4Data({ ...step4Data, amenitiesImages: newImages, amenitiesImagePreviews: newPreviews });
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "titleDeed" | "safetyCert" | "utilityBill") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload PDF, JPG, or PNG file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (type === "titleDeed") {
      setStep5Data({ ...step5Data, titleDeedFile: file, titleDeedName: file.name });
    } else if (type === "safetyCert") {
      setStep5Data({ ...step5Data, safetyCertFile: file, safetyCertName: file.name });
    } else if (type === "utilityBill") {
      setStep5Data({ ...step5Data, utilityBillFile: file, utilityBillName: file.name });
    }
  };

  const validateStep = (step: number): boolean => {
    setError("");

    if (step === 1) {
      if (!step1Data.name.trim()) {
        setError("Property name is required");
        return false;
      }
      if (!step1Data.ownershipType) {
        setError("Ownership type is required");
        return false;
      }
      if (!step1Data.propertyType) {
        setError("Property type is required");
        return false;
      }
      if (!step1Data.province) {
        setError("Province is required");
        return false;
      }
      if (!step1Data.coverImageFile) {
        setError("Cover image is required");
        return false;
      }
    } else if (step === 2) {
      if (!step2Data.street.trim()) {
        setError("Street address is required");
        return false;
      }
      if (!step2Data.city.trim()) {
        setError("City is required");
        return false;
      }
      if (!step2Data.managerName.trim()) {
        setError("Manager name is required");
        return false;
      }
      if (!step2Data.managerId.trim()) {
        setError("Manager ID number is required");
        return false;
      }
      if (!step2Data.managerEmail.trim()) {
        setError("Manager email is required");
        return false;
      }
      if (!step2Data.managerPhone.trim()) {
        setError("Manager phone is required");
        return false;
      }
    } else if (step === 3) {
      const totalRooms = Object.values(step3Data).reduce((sum, val) => sum + val, 0);
      if (totalRooms === 0) {
        setError("Please add at least one room configuration");
        return false;
      }
    } else if (step === 4) {
      if (step4Data.roomImages.length === 0) {
        setError("Please upload at least 1 room image");
        return false;
      }
    } else if (step === 5) {
      if (!step5Data.titleDeedFile) {
        setError("Title deed or lease agreement is required");
        return false;
      }
      if (!step5Data.safetyCertFile) {
        setError("Electrical safety certificate is required");
        return false;
      }
      if (!step5Data.utilityBillFile) {
        setError("Municipal utility bill is required");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(TOTAL_STEPS)) return;

    if (!provider) {
      setError("Provider information not found");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Upload cover image
      let coverImageUrl = "";
      if (step1Data.coverImageFile) {
        const coverRef = ref(storage, `properties/${provider.providerId}/${Date.now()}_cover_${step1Data.coverImageFile.name}`);
        await uploadBytes(coverRef, step1Data.coverImageFile);
        coverImageUrl = await getDownloadURL(coverRef);
      }

      // 2. Calculate total rooms and beds from room configuration
      const totalRooms = Object.values(step3Data).reduce((sum, val) => sum + val, 0);
      const totalBeds =
        step3Data.bachelor * 1 +
        step3Data.singleEnSuite * 1 +
        step3Data.singleStandard * 1 +
        step3Data.sharing2Beds_EnSuite * 2 +
        step3Data.sharing2Beds_Standard * 2 +
        step3Data.sharing3Beds_EnSuite * 3 +
        step3Data.sharing3Beds_Standard * 3;

      // 3. Create address
      // Note: createAddress already filters out undefined values
      const addressPayload: any = {
        street: step2Data.street,
        townCity: step2Data.city,
        province: step1Data.province,
        country: "South Africa",
      };

      // Only add optional fields if they have values
      if (step2Data.suburb) addressPayload.suburb = step2Data.suburb;

      const address = await createAddress(addressPayload);

      // 4. Create property with "Pending" status for accreditation
      // Note: Optional fields with undefined values will be filtered out by createProperty
      const propertyPayload: any = {
        providerId: provider.providerId,
        name: step1Data.name,
        ownershipType: step1Data.ownershipType as OwnershipType,
        propertyType: step1Data.propertyType as PropertyType,
        addressId: address.addressId,
        coverImageUrl,
        totalRooms,
        totalBeds,
        availableBeds: totalBeds, // Initially all beds are available
        status: "Pending", // Pending Accreditation
        nsfasApproved: false,
        amenities: [],
      };

      // Only add optional fields if they have values
      if (step1Data.institution) propertyPayload.institution = step1Data.institution;
      if (step1Data.description) propertyPayload.description = step1Data.description;

      const property = await createProperty(propertyPayload);

      // 5. Create room configuration (totalRooms and totalBeds are calculated automatically)
      await createRoomConfiguration(provider.providerId, {
        propertyId: property.propertyId,
        bachelor: step3Data.bachelor,
        singleEnSuite: step3Data.singleEnSuite,
        singleStandard: step3Data.singleStandard,
        sharing2Beds_EnSuite: step3Data.sharing2Beds_EnSuite,
        sharing2Beds_Standard: step3Data.sharing2Beds_Standard,
        sharing3Beds_EnSuite: step3Data.sharing3Beds_EnSuite,
        sharing3Beds_Standard: step3Data.sharing3Beds_Standard,
      });

      // 5. Upload property images
      let sortOrder = 0;
      for (const imageFile of step4Data.roomImages) {
        const imageRef = ref(storage, `properties/${provider.providerId}/${property.propertyId}/rooms/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        const imageUrl = await getDownloadURL(imageRef);

        await createPropertyImage(provider.providerId, {
          propertyId: property.propertyId,
          imageUrl,
          caption: `Room image ${sortOrder + 1}`,
          sortOrder: sortOrder++,
          isCover: false,
          uploadedBy: user?.email || provider.providerId,
        });
      }

      for (const imageFile of step4Data.commonRoomImages) {
        const imageRef = ref(storage, `properties/${provider.providerId}/${property.propertyId}/common/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        const imageUrl = await getDownloadURL(imageRef);

        await createPropertyImage(provider.providerId, {
          propertyId: property.propertyId,
          imageUrl,
          caption: `Common room image ${sortOrder + 1}`,
          sortOrder: sortOrder++,
          isCover: false,
          uploadedBy: user?.email || provider.providerId,
        });
      }

      // Upload ablution facilities images
      for (const imageFile of step4Data.ablutionImages) {
        const imageRef = ref(storage, `properties/${provider.providerId}/${property.propertyId}/ablution/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        const imageUrl = await getDownloadURL(imageRef);

        await createPropertyImage(provider.providerId, {
          propertyId: property.propertyId,
          imageUrl,
          caption: `Ablution facilities ${sortOrder + 1}`,
          sortOrder: sortOrder++,
          isCover: false,
          uploadedBy: user?.email || provider.providerId,
        });
      }

      // Upload kitchen images
      for (const imageFile of step4Data.kitchenImages) {
        const imageRef = ref(storage, `properties/${provider.providerId}/${property.propertyId}/kitchen/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        const imageUrl = await getDownloadURL(imageRef);

        await createPropertyImage(provider.providerId, {
          propertyId: property.propertyId,
          imageUrl,
          caption: `Kitchen image ${sortOrder + 1}`,
          sortOrder: sortOrder++,
          isCover: false,
          uploadedBy: user?.email || provider.providerId,
        });
      }

      // Upload amenities images
      for (const imageFile of step4Data.amenitiesImages) {
        const imageRef = ref(storage, `properties/${provider.providerId}/${property.propertyId}/amenities/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        const imageUrl = await getDownloadURL(imageRef);

        await createPropertyImage(provider.providerId, {
          propertyId: property.propertyId,
          imageUrl,
          caption: `Amenities image ${sortOrder + 1}`,
          sortOrder: sortOrder++,
          isCover: false,
          uploadedBy: user?.email || provider.providerId,
        });
      }

      // 6. Upload documents
      if (step5Data.titleDeedFile) {
        const docRef = ref(storage, `properties/${provider.providerId}/${property.propertyId}/documents/title_deed_${Date.now()}_${step5Data.titleDeedFile.name}`);
        await uploadBytes(docRef, step5Data.titleDeedFile);
        const docUrl = await getDownloadURL(docRef);

        await createPropertyDocument(provider.providerId, {
          propertyId: property.propertyId,
          documentType: step1Data.ownershipType === "Leased" ? "LEASE_AGREEMENT" : "OTHER",
          documentName: "Title Deed / Lease Agreement",
          fileUrl: docUrl,
          fileSize: step5Data.titleDeedFile.size,
          mimeType: step5Data.titleDeedFile.type,
          uploadedBy: user?.email || provider.providerId,
        });
      }

      if (step5Data.safetyCertFile) {
        const docRef = ref(storage, `properties/${provider.providerId}/${property.propertyId}/documents/safety_cert_${Date.now()}_${step5Data.safetyCertFile.name}`);
        await uploadBytes(docRef, step5Data.safetyCertFile);
        const docUrl = await getDownloadURL(docRef);

        await createPropertyDocument(provider.providerId, {
          propertyId: property.propertyId,
          documentType: "COMPLIANCE_CERTIFICATE",
          documentName: "Electrical Safety Certificate",
          fileUrl: docUrl,
          fileSize: step5Data.safetyCertFile.size,
          mimeType: step5Data.safetyCertFile.type,
          uploadedBy: user?.email || provider.providerId,
        });
      }

      if (step5Data.utilityBillFile) {
        const docRef = ref(storage, `properties/${provider.providerId}/${property.propertyId}/documents/utility_bill_${Date.now()}_${step5Data.utilityBillFile.name}`);
        await uploadBytes(docRef, step5Data.utilityBillFile);
        const docUrl = await getDownloadURL(docRef);

        await createPropertyDocument(provider.providerId, {
          propertyId: property.propertyId,
          documentType: "OTHER",
          documentName: "Municipal Utility Bill",
          fileUrl: docUrl,
          fileSize: step5Data.utilityBillFile.size,
          mimeType: step5Data.utilityBillFile.type,
          uploadedBy: user?.email || provider.providerId,
        });
      }

      toast.success("Property submitted for accreditation successfully!");
      router.push("/properties");
    } catch (err: any) {
      console.error("Error creating property:", err);
      setError(err.message || "Failed to create property. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex">
          <Sidebar userType="provider" />
          <main className="flex-1 p-8">
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-600">{error || "Loading provider information..."}</p>
              </CardContent>
            </Card>
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
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => router.push("/properties")}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Properties
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentStep === 1 && "Add Property Details"}
                {currentStep === 2 && "Property Address"}
                {currentStep === 3 && "Room Configuration"}
                {currentStep === 4 && "Property Images"}
                {currentStep === 5 && "Document Upload"}
              </h1>
              {currentStep === 2 && (
                <p className="text-gray-500 mt-2">
                  Please provide the complete address details and property manager information.
                </p>
              )}
              {currentStep === 4 && (
                <p className="text-gray-500 mt-2">
                  Please upload 1-5 images for each category to showcase your property
                </p>
              )}
              {currentStep === 5 && (
                <p className="text-gray-500 mt-2">
                  Please upload the following documents to complete your application. All documents must be clear and legible.
                </p>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-2 mx-1 rounded-full ${
                      step <= currentStep ? "bg-amber-500" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500 text-center">
                Step {currentStep} of {TOTAL_STEPS}
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              {/* Step 1: Property Information */}
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Property Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="name">Property Name *</Label>
                      <Input
                        id="name"
                        value={step1Data.name}
                        onChange={(e) => setStep1Data({ ...step1Data, name: e.target.value })}
                        placeholder="Enter property name"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ownership">Ownership *</Label>
                      <Select
                        value={step1Data.ownershipType}
                        onValueChange={(value) => setStep1Data({ ...step1Data, ownershipType: value as OwnershipType })}
                      >
                        <SelectTrigger id="ownership" className="mt-2">
                          <SelectValue placeholder="Select ownership type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Owned">Owned</SelectItem>
                          <SelectItem value="Leased">Leased</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Upload Cover Image *</Label>
                      <input
                        ref={coverImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageUpload}
                        className="hidden"
                      />
                      <div
                        onClick={() => coverImageInputRef.current?.click()}
                        className="mt-3 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-amber-500 transition-colors"
                      >
                        {step1Data.coverImagePreview ? (
                          <div className="relative">
                            <img
                              src={step1Data.coverImagePreview}
                              alt="Cover preview"
                              className="max-h-48 mx-auto rounded"
                            />
                            <p className="text-sm text-gray-500 mt-2">Click to change image</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-600 font-medium">Upload Cover Image</p>
                            <p className="text-sm text-gray-500">Tap to select image</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="propertyType">Select Property Type *</Label>
                      <Select
                        value={step1Data.propertyType}
                        onValueChange={(value) => setStep1Data({ ...step1Data, propertyType: value as PropertyType })}
                      >
                        <SelectTrigger id="propertyType" className="mt-2">
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Student Residence">Student Residence</SelectItem>
                          <SelectItem value="Apartment Block">Apartment Block</SelectItem>
                          <SelectItem value="House">House</SelectItem>
                          <SelectItem value="Commune">Commune</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="province">Select Province *</Label>
                      <Select
                        value={step1Data.province}
                        onValueChange={(value) => setStep1Data({ ...step1Data, province: value })}
                      >
                        <SelectTrigger id="province" className="mt-2">
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
                      <Label htmlFor="institution">Select Institution</Label>
                      <Select
                        value={step1Data.institution}
                        onValueChange={(value) => setStep1Data({ ...step1Data, institution: value })}
                      >
                        <SelectTrigger id="institution" className="mt-2">
                          <SelectValue placeholder="Select nearby institution" />
                        </SelectTrigger>
                        <SelectContent>
                          {institutions.map((inst) => (
                            <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="description">Property Description</Label>
                      <Textarea
                        id="description"
                        value={step1Data.description}
                        onChange={(e) => setStep1Data({ ...step1Data, description: e.target.value })}
                        placeholder="Describe the property features and amenities"
                        rows={4}
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Property Address & Manager */}
              {currentStep === 2 && (
                <Card>
                  <CardContent className="space-y-6 pt-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Property Address</h3>
                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="street">Street Address *</Label>
                          <Input
                            id="street"
                            value={step2Data.street}
                            onChange={(e) => setStep2Data({ ...step2Data, street: e.target.value })}
                            placeholder="123 Main Street"
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="suburb">Suburb</Label>
                          <Input
                            id="suburb"
                            value={step2Data.suburb}
                            onChange={(e) => setStep2Data({ ...step2Data, suburb: e.target.value })}
                            placeholder="Downtown"
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={step2Data.city}
                            onChange={(e) => setStep2Data({ ...step2Data, city: e.target.value })}
                            placeholder="Johannesburg"
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Property Manager Details</h3>
                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="managerName">Manager Name *</Label>
                          <Input
                            id="managerName"
                            value={step2Data.managerName}
                            onChange={(e) => setStep2Data({ ...step2Data, managerName: e.target.value })}
                            placeholder="John Smith"
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="managerId">Manager ID *</Label>
                          <Input
                            id="managerId"
                            value={step2Data.managerId}
                            onChange={(e) => setStep2Data({ ...step2Data, managerId: e.target.value })}
                            placeholder="Enter Id Number of Property Manager"
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="managerEmail">Email Address *</Label>
                          <Input
                            id="managerEmail"
                            type="email"
                            value={step2Data.managerEmail}
                            onChange={(e) => setStep2Data({ ...step2Data, managerEmail: e.target.value })}
                            placeholder="john.smith@property.com"
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="managerPhone">Phone Number *</Label>
                          <Input
                            id="managerPhone"
                            value={step2Data.managerPhone}
                            onChange={(e) => setStep2Data({ ...step2Data, managerPhone: e.target.value })}
                            placeholder="0127345678"
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Room Configuration */}
              {currentStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Room Configuration</CardTitle>
                    <p className="text-sm text-gray-500">Enter the number of rooms for each type</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {ROOM_TYPES.map((roomType) => (
                      <div key={roomType.key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{roomType.label}</h4>
                          <p className="text-sm text-gray-500">{roomType.description}</p>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          className="w-20"
                          value={step3Data[roomType.key as keyof typeof step3Data]}
                          onChange={(e) => setStep3Data({ ...step3Data, [roomType.key]: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Property Images */}
              {currentStep === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Property Images</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Room Images */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Rooms</h3>
                        <span className="text-sm text-gray-500">1-5 images</span>
                      </div>
                      <input
                        ref={roomImagesInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleRoomImagesUpload}
                        className="hidden"
                      />
                      <div className="grid grid-cols-3 gap-4">
                        {step4Data.roomImagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img src={preview} alt={`Room ${index + 1}`} className="w-full h-32 object-cover rounded" />
                            <button
                              type="button"
                              onClick={() => removeRoomImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {step4Data.roomImages.length < 5 && (
                          <div
                            onClick={() => roomImagesInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500"
                          >
                            <Upload className="w-8 h-8 text-gray-400 mb-1" />
                            <p className="text-sm text-gray-500">Add Photos</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Common Room Images */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Common Room</h3>
                        <span className="text-sm text-gray-500">1-2 images</span>
                      </div>
                      <input
                        ref={commonRoomImagesInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleCommonRoomImagesUpload}
                        className="hidden"
                      />
                      <div className="grid grid-cols-3 gap-4">
                        {step4Data.commonRoomImagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img src={preview} alt={`Common room ${index + 1}`} className="w-full h-32 object-cover rounded" />
                            <button
                              type="button"
                              onClick={() => removeCommonRoomImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {step4Data.commonRoomImages.length < 2 && (
                          <div
                            onClick={() => commonRoomImagesInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500"
                          >
                            <Upload className="w-8 h-8 text-gray-400 mb-1" />
                            <p className="text-sm text-gray-500">Add Photo</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ablution Facilities Images */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Ablution Facilities</h3>
                        <span className="text-sm text-gray-500">1-2 images</span>
                      </div>
                      <input
                        ref={ablutionImagesInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAblutionImagesUpload}
                        className="hidden"
                      />
                      <div className="grid grid-cols-3 gap-4">
                        {step4Data.ablutionImagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img src={preview} alt={`Ablution ${index + 1}`} className="w-full h-32 object-cover rounded" />
                            <button
                              type="button"
                              onClick={() => removeAblutionImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {step4Data.ablutionImages.length < 2 && (
                          <div
                            onClick={() => ablutionImagesInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500"
                          >
                            <Upload className="w-8 h-8 text-gray-400 mb-1" />
                            <p className="text-sm text-gray-500">Add Photo</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Kitchen Images */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Kitchen</h3>
                        <span className="text-sm text-gray-500">1-3 images</span>
                      </div>
                      <input
                        ref={kitchenImagesInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleKitchenImagesUpload}
                        className="hidden"
                      />
                      <div className="grid grid-cols-3 gap-4">
                        {step4Data.kitchenImagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img src={preview} alt={`Kitchen ${index + 1}`} className="w-full h-32 object-cover rounded" />
                            <button
                              type="button"
                              onClick={() => removeKitchenImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {step4Data.kitchenImages.length < 3 && (
                          <div
                            onClick={() => kitchenImagesInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500"
                          >
                            <Upload className="w-8 h-8 text-gray-400 mb-1" />
                            <p className="text-sm text-gray-500">Add Photo</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amenities Images */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Amenities</h3>
                        <span className="text-sm text-gray-500">1-2 images</span>
                      </div>
                      <input
                        ref={amenitiesImagesInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAmenitiesImagesUpload}
                        className="hidden"
                      />
                      <div className="grid grid-cols-3 gap-4">
                        {step4Data.amenitiesImagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img src={preview} alt={`Amenity ${index + 1}`} className="w-full h-32 object-cover rounded" />
                            <button
                              type="button"
                              onClick={() => removeAmenitiesImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {step4Data.amenitiesImages.length < 2 && (
                          <div
                            onClick={() => amenitiesImagesInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500"
                          >
                            <Upload className="w-8 h-8 text-gray-400 mb-1" />
                            <p className="text-sm text-gray-500">Add Photo</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 5: Document Upload */}
              {currentStep === 5 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Document Upload</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Title Deed */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-2xl">🏠</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">Title Deed (if owned) or Lease Agreement (if leased)</h4>
                        </div>
                      </div>
                      <input
                        ref={titleDeedInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleDocumentUpload(e, "titleDeed")}
                        className="hidden"
                      />
                      <div
                        onClick={() => titleDeedInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-amber-500"
                      >
                        {step5Data.titleDeedName ? (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-gray-700">{step5Data.titleDeedName}</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-600 font-medium">Tap to upload document</p>
                            <p className="text-sm text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Safety Certificate */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-2xl">⚡</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">Valid electrical safety certificate</h4>
                        </div>
                      </div>
                      <input
                        ref={safetyCertInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleDocumentUpload(e, "safetyCert")}
                        className="hidden"
                      />
                      <div
                        onClick={() => safetyCertInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-amber-500"
                      >
                        {step5Data.safetyCertName ? (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-gray-700">{step5Data.safetyCertName}</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-600 font-medium">Tap to upload certificate</p>
                            <p className="text-sm text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Utility Bill */}
                    <div className="border rounded-lg p-4 border-amber-500">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-2xl">📄</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">Latest municipal utility bill (not older than 3 months)</h4>
                        </div>
                      </div>
                      <input
                        ref={utilityBillInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleDocumentUpload(e, "utilityBill")}
                        className="hidden"
                      />
                      <div
                        onClick={() => utilityBillInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-amber-500"
                      >
                        {step5Data.utilityBillName ? (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-gray-700">{step5Data.utilityBillName}</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-600 font-medium">Tap to upload bill</p>
                            <p className="text-sm text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-6">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}

                {currentStep < TOTAL_STEPS ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="ml-auto bg-amber-500 hover:bg-amber-600 text-gray-900"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="ml-auto bg-amber-500 hover:bg-amber-600 text-gray-900"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submit for Accreditation
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}

export default function AddPropertyPage() {
  return (
    <ProtectedRoute>
      <AddPropertyContent />
    </ProtectedRoute>
  );
}
