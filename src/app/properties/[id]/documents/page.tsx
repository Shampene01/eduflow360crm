"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Upload, 
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  ArrowLeft,
  Loader2,
  File,
  FileCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { 
  getProviderByUserId, 
  getPropertyById,
  getPropertyDocuments,
  createPropertyDocument,
} from "@/lib/db";
import { AccommodationProvider, Property, PropertyDocument } from "@/lib/schema";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

// Property Document Categories
const PROPERTY_DOCUMENT_CATEGORIES: { value: string; label: string; description: string; required?: boolean }[] = [
  { value: "TITLE_DEED", label: "Title Deed", description: "Property ownership title deed", required: true },
  { value: "LEASE_AGREEMENT", label: "Lease Agreement", description: "Valid lease agreement (if leased)", required: true },
  { value: "COMPLIANCE_CERTIFICATE", label: "Compliance Certificate", description: "Building compliance certificate", required: true },
  { value: "FIRE_CERTIFICATE", label: "Fire Safety Certificate", description: "Fire safety compliance certificate", required: true },
  { value: "INSPECTION_REPORT", label: "Inspection Report", description: "Property inspection report" },
  { value: "FLOOR_PLAN", label: "Floor Plan", description: "Property floor plan" },
  { value: "ZONING_CERTIFICATE", label: "Zoning Certificate", description: "Municipal zoning certificate" },
  { value: "ELECTRICAL_CERTIFICATE", label: "Electrical Certificate", description: "Certificate of compliance for electrical" },
  { value: "GAS_CERTIFICATE", label: "Gas Certificate", description: "Gas installation compliance certificate" },
  { value: "OTHER", label: "Other Document", description: "Any other property document" },
];

function getDocumentTypeLabel(type: string): string {
  const cat = PROPERTY_DOCUMENT_CATEGORIES.find(c => c.value === type);
  return cat ? cat.label : type;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PropertyDocumentsContent() {
  const { user, isFullyLoaded } = useAuth();
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [provider, setProvider] = useState<AccommodationProvider | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [error, setError] = useState("");
  
  // Upload form state
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid || !propertyId) return;

      try {
        const providerData = await getProviderByUserId(uid);
        if (!providerData) {
          router.push("/provider-dashboard");
          return;
        }

        setProvider(providerData);

        // Load property
        const propertyData = await getPropertyById(providerData.providerId, propertyId);
        if (!propertyData) {
          toast.error("Property not found");
          router.push("/provider-documents");
          return;
        }

        setProperty(propertyData);

        // Load documents
        const docs = await getPropertyDocuments(providerData.providerId, propertyId);
        setDocuments(docs);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load property documents");
      } finally {
        setLoading(false);
      }
    };

    if (isFullyLoaded) {
      loadData();
    }
  }, [user, isFullyLoaded, router, propertyId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only PDF, JPG, and PNG files are allowed");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedCategory || !selectedFile || !provider || !property) {
      toast.error("Please select a document category and file");
      return;
    }

    setUploading(true);
    try {
      // Upload to Firebase Storage
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `providers/${provider.providerId}/properties/${propertyId}/documents/${selectedCategory}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, selectedFile);
      const downloadUrl = await getDownloadURL(storageRef);

      // Create document record in Firestore
      const uid = user?.userId || user?.uid;
      await createPropertyDocument(provider.providerId, {
        propertyId: propertyId,
        documentType: selectedCategory as any,
        documentName: selectedFile.name,
        fileUrl: downloadUrl,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        uploadedBy: uid || "",
      });

      // Refresh documents list
      const updatedDocs = await getPropertyDocuments(provider.providerId, propertyId);
      setDocuments(updatedDocs);

      // Reset form
      setSelectedCategory("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success("Document uploaded successfully");
    } catch (err) {
      console.error("Error uploading document:", err);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/provider-documents">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Property Documents</h1>
                <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {property?.name}
                </p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Upload Section */}
            <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Upload className="w-5 h-5 text-amber-500" />
                  Upload Property Document
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Upload required property documents. Accepted formats: PDF, JPG, PNG (max 10MB)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Document Category *</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-700">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_DOCUMENT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div>
                              <span className="font-medium">{cat.label}</span>
                              {cat.required && <span className="text-red-500 ml-1">*</span>}
                              <span className="text-xs text-gray-500 ml-2">- {cat.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select File *</Label>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1"
                      >
                        <File className="w-4 h-4 mr-2" />
                        {selectedFile ? "Change File" : "Choose File"}
                      </Button>
                      {selectedFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={clearFileSelection}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {selectedFile && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedCategory || !selectedFile || uploading}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Document
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Documents List */}
            <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <FileCheck className="w-5 h-5 text-amber-500" />
                  Uploaded Documents
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  {documents.length} document(s) uploaded for this property
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No documents uploaded yet</p>
                    <p className="text-sm">Upload your first document above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.documentId}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <FileText className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium dark:text-white">{getDocumentTypeLabel(doc.documentType)}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {doc.documentName} • {formatFileSize(doc.fileSize)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Uploaded {doc.uploadedAt?.toDate ? new Date(doc.uploadedAt.toDate()).toLocaleDateString() : "Recently"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={doc.verified ? "default" : "secondary"} className={doc.verified ? "bg-green-100 text-green-700" : ""}>
                            {doc.verified ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </>
                            )}
                          </Badge>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={doc.fileUrl} download={doc.documentName}>
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Required Documents Checklist */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Document Checklist
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Documents marked with * are required for property approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {PROPERTY_DOCUMENT_CATEGORIES.filter(c => c.value !== "OTHER").map((cat) => {
                    const hasDocument = documents.some(d => d.documentType === cat.value);
                    const isVerified = documents.some(d => d.documentType === cat.value && d.verified);
                    return (
                      <div
                        key={cat.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          hasDocument
                            ? isVerified
                              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                              : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                            : "border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
                        }`}
                      >
                        {hasDocument ? (
                          isVerified ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-600" />
                          )
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-500" />
                        )}
                        <div>
                          <p className={`font-medium ${hasDocument ? (isVerified ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400") : "text-gray-600 dark:text-gray-300"}`}>
                            {cat.label}
                            {cat.required && <span className="text-red-500 ml-1">*</span>}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{cat.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function PropertyDocumentsPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <PropertyDocumentsContent />
    </ProtectedRoute>
  );
}
