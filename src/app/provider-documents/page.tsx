"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Upload, 
  Download,
  Eye,
  Trash2,
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
  getProviderDocuments, 
  createProviderDocument,
  getPropertiesByProvider,
} from "@/lib/db";
import { AccommodationProvider, ProviderDocument, Property, DocumentType } from "@/lib/schema";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

// Provider Document Categories
const PROVIDER_DOCUMENT_CATEGORIES: { value: DocumentType; label: string; description: string }[] = [
  { value: "ID_COPY", label: "Director/Owner ID Copy", description: "Certified copy of ID document" },
  { value: "CIPC_COR14_3", label: "CIPC Certificate", description: "Company registration certificate" },
  { value: "BANK_LETTER", label: "Bank Confirmation Letter", description: "Confirmation of banking details" },
  { value: "PROOF_OF_ADDRESS", label: "Proof of Address", description: "Utility bill or bank statement (not older than 3 months)" },
  { value: "TAX_CLEARANCE", label: "Tax Clearance Certificate", description: "Valid SARS tax clearance" },
  { value: "BBBEE_CERTIFICATE", label: "B-BBEE Certificate", description: "Valid B-BBEE certificate or affidavit" },
  { value: "COMPANY_PROFILE", label: "Company Profile", description: "Company profile document" },
  { value: "OTHER", label: "Other Document", description: "Any other supporting document" },
];

// Property Document Categories
const PROPERTY_DOCUMENT_CATEGORIES: { value: string; label: string; description: string }[] = [
  { value: "TITLE_DEED", label: "Title Deed", description: "Property ownership title deed" },
  { value: "LEASE_AGREEMENT", label: "Lease Agreement", description: "Valid lease agreement (if leased)" },
  { value: "COMPLIANCE_CERTIFICATE", label: "Compliance Certificate", description: "Building compliance certificate" },
  { value: "FIRE_CERTIFICATE", label: "Fire Safety Certificate", description: "Fire safety compliance certificate" },
  { value: "INSPECTION_REPORT", label: "Inspection Report", description: "Property inspection report" },
  { value: "FLOOR_PLAN", label: "Floor Plan", description: "Property floor plan" },
  { value: "ZONING_CERTIFICATE", label: "Zoning Certificate", description: "Municipal zoning certificate" },
  { value: "OTHER", label: "Other Document", description: "Any other property document" },
];

function getDocumentTypeLabel(type: string): string {
  const providerCat = PROVIDER_DOCUMENT_CATEGORIES.find(c => c.value === type);
  if (providerCat) return providerCat.label;
  const propertyCat = PROPERTY_DOCUMENT_CATEGORIES.find(c => c.value === type);
  if (propertyCat) return propertyCat.label;
  return type;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProviderDocumentsContent() {
  const { user, isFullyLoaded } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [provider, setProvider] = useState<AccommodationProvider | null>(null);
  const [documents, setDocuments] = useState<ProviderDocument[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [error, setError] = useState("");
  
  // Upload form state
  const [selectedCategory, setSelectedCategory] = useState<DocumentType | "">("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("provider");

  useEffect(() => {
    const loadData = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid) return;

      try {
        const providerData = await getProviderByUserId(uid);
        if (!providerData) {
          router.push("/provider-dashboard");
          return;
        }

        setProvider(providerData);

        // Load documents and properties
        const [docs, props] = await Promise.all([
          getProviderDocuments(providerData.providerId),
          getPropertiesByProvider(providerData.providerId),
        ]);

        setDocuments(docs);
        setProperties(props);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load documents");
      } finally {
        setLoading(false);
      }
    };

    if (isFullyLoaded) {
      loadData();
    }
  }, [user, isFullyLoaded, router]);

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
    if (!selectedCategory || !selectedFile || !provider) {
      toast.error("Please select a document category and file");
      return;
    }

    setUploading(true);
    try {
      // Upload to Firebase Storage
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `providers/${provider.providerId}/documents/${selectedCategory}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, selectedFile);
      const downloadUrl = await getDownloadURL(storageRef);

      // Create document record in Firestore
      const uid = user?.userId || user?.uid;
      await createProviderDocument({
        providerId: provider.providerId,
        documentType: selectedCategory,
        documentName: selectedFile.name,
        fileUrl: downloadUrl,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        uploadedBy: uid || "",
      });

      // Refresh documents list
      const updatedDocs = await getProviderDocuments(provider.providerId);
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
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/provider-dashboard">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Management</h1>
                <p className="text-gray-500 dark:text-gray-400">Upload and manage your business documents</p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="provider" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Provider Documents
                </TabsTrigger>
                <TabsTrigger value="property" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Property Documents
                </TabsTrigger>
              </TabsList>

              {/* Provider Documents Tab */}
              <TabsContent value="provider" className="space-y-6">
                {/* Upload Section */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-white">
                      <Upload className="w-5 h-5 text-amber-500" />
                      Upload Provider Document
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      Upload required business documents. Accepted formats: PDF, JPG, PNG (max 10MB)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Document Category *</Label>
                        <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as DocumentType)}>
                          <SelectTrigger className="bg-gray-50 dark:bg-gray-700">
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDER_DOCUMENT_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                <div>
                                  <span className="font-medium">{cat.label}</span>
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
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-white">
                      <FileCheck className="w-5 h-5 text-amber-500" />
                      Uploaded Documents
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      {documents.length} document(s) uploaded
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
                      Required Documents Checklist
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-3">
                      {PROVIDER_DOCUMENT_CATEGORIES.filter(c => c.value !== "OTHER" && c.value !== "COMPANY_PROFILE").map((cat) => {
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
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{cat.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Property Documents Tab */}
              <TabsContent value="property" className="space-y-6">
                {properties.length === 0 ? (
                  <Card className="dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="py-12 text-center">
                      <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Properties Yet</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        You need to add a property before you can upload property documents.
                      </p>
                      <Button asChild className="bg-amber-500 hover:bg-amber-600">
                        <Link href="/properties/new">Add Your First Property</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Property Selection Info */}
                    <Alert className="dark:bg-gray-800 dark:border-gray-700">
                      <Building2 className="h-4 w-4" />
                      <AlertDescription>
                        Property documents are managed per property. Select a property below to view and upload documents.
                      </AlertDescription>
                    </Alert>

                    {/* Properties List */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {properties.map((property) => (
                        <Card key={property.propertyId} className="dark:bg-gray-800 dark:border-gray-700 hover:border-amber-500 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium dark:text-white">{property.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {property.propertyType} • {property.ownershipType}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {property.totalBeds || 0} beds
                                </p>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/properties/${property.propertyId}/documents`}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Manage Docs
                                </Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Property Document Categories Reference */}
                    <Card className="dark:bg-gray-800 dark:border-gray-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 dark:text-white text-base">
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                          Property Document Categories
                        </CardTitle>
                        <CardDescription className="dark:text-gray-400">
                          These are the document types you can upload for each property
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-3">
                          {PROPERTY_DOCUMENT_CATEGORIES.map((cat) => (
                            <div
                              key={cat.value}
                              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
                            >
                              <FileText className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-700 dark:text-gray-300">{cat.label}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{cat.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ProviderDocumentsPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <ProviderDocumentsContent />
    </ProtectedRoute>
  );
}
