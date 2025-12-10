"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  Download,
  Play,
  Shield,
  Bell,
  HelpCircle,
  Search,
  ExternalLink,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  FileDown,
  Video,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlatformResources, incrementDownloadCount } from "@/lib/db";
import { PlatformResource } from "@/lib/schema";

// Expected resources - these define what resources SHOULD exist
// They will be matched against uploaded platform resources
interface ExpectedResource {
  id: string;
  title: string;
  description: string;
  format: string;
  category: "Guides & Tutorials" | "Templates & Forms" | "Policies & Regulations";
  subCategory: string;
}

const expectedGuides: ExpectedResource[] = [
  {
    id: "guide-1",
    title: "How to Onboard Students",
    description: "Complete guide to registering and onboarding new students to your property",
    format: "PDF",
    category: "Guides & Tutorials",
    subCategory: "Onboarding",
  },
  {
    id: "guide-2",
    title: "How to Upload Compliance Documents",
    description: "Step-by-step instructions for uploading and managing compliance documentation",
    format: "PDF",
    category: "Guides & Tutorials",
    subCategory: "Compliance",
  },
  {
    id: "guide-3",
    title: "Fire Safety Compliance Guide",
    description: "Essential fire safety requirements and compliance checklist for accommodation providers",
    format: "PDF",
    category: "Guides & Tutorials",
    subCategory: "Safety",
  },
  {
    id: "guide-4",
    title: "Property Registration Walkthrough",
    description: "Video tutorial on how to register your property on the platform",
    format: "VIDEO",
    category: "Guides & Tutorials",
    subCategory: "Onboarding",
  },
  {
    id: "guide-5",
    title: "Invoice Submission Tutorial",
    description: "Learn how to create and submit invoices for student accommodation",
    format: "VIDEO",
    category: "Guides & Tutorials",
    subCategory: "Billing",
  },
  {
    id: "guide-6",
    title: "Room Configuration Guide",
    description: "How to set up and manage room configurations for your properties",
    format: "PDF",
    category: "Guides & Tutorials",
    subCategory: "Property Management",
  },
];

const expectedTemplates: ExpectedResource[] = [
  {
    id: "template-1",
    title: "Lease Agreement Template",
    description: "Standard lease agreement template for student accommodation",
    format: "DOCX",
    category: "Templates & Forms",
    subCategory: "Legal",
  },
  {
    id: "template-2",
    title: "Property Inspection Checklist",
    description: "Comprehensive checklist for property inspections and compliance",
    format: "PDF",
    category: "Templates & Forms",
    subCategory: "Compliance",
  },
  {
    id: "template-3",
    title: "Financial Statement Template",
    description: "Template for submitting financial documentation to NSFAS",
    format: "XLSX",
    category: "Templates & Forms",
    subCategory: "Financial",
  },
  {
    id: "template-4",
    title: "Incident Report Form",
    description: "Standard form for reporting incidents at your property",
    format: "PDF",
    category: "Templates & Forms",
    subCategory: "Safety",
  },
  {
    id: "template-5",
    title: "Room Configuration Template",
    description: "Template for documenting room layouts and configurations",
    format: "XLSX",
    category: "Templates & Forms",
    subCategory: "Property Management",
  },
  {
    id: "template-6",
    title: "Student Check-in/Check-out Form",
    description: "Form for documenting student arrivals and departures",
    format: "PDF",
    category: "Templates & Forms",
    subCategory: "Operations",
  },
];

const expectedPolicies: ExpectedResource[] = [
  {
    id: "policy-1",
    title: "NSFAS Accreditation Policy 2025",
    description: "Official NSFAS accreditation requirements and guidelines for accommodation providers",
    format: "PDF",
    category: "Policies & Regulations",
    subCategory: "Accreditation",
  },
  {
    id: "policy-2",
    title: "Fire & Safety Regulations",
    description: "National fire safety regulations applicable to student accommodation",
    format: "PDF",
    category: "Policies & Regulations",
    subCategory: "Safety",
  },
  {
    id: "policy-3",
    title: "Occupancy Compliance Rules",
    description: "Guidelines for maximum occupancy and room allocation standards",
    format: "PDF",
    category: "Policies & Regulations",
    subCategory: "Compliance",
  },
  {
    id: "policy-4",
    title: "Building Safety Standards",
    description: "Structural and building safety requirements for student housing",
    format: "PDF",
    category: "Policies & Regulations",
    subCategory: "Safety",
  },
  {
    id: "policy-5",
    title: "Student Rights & Responsibilities",
    description: "Policy document outlining student rights and provider obligations",
    format: "PDF",
    category: "Policies & Regulations",
    subCategory: "Legal",
  },
  {
    id: "policy-6",
    title: "Data Protection & Privacy Policy",
    description: "POPIA compliance guidelines for handling student information",
    format: "PDF",
    category: "Policies & Regulations",
    subCategory: "Legal",
  },
];

const announcements = [
  {
    id: "1",
    title: "NSFAS 2025 Accreditation Framework Updated",
    description: "Important changes to the accreditation process for the 2025 academic year. All providers must review and comply by March 2025.",
    date: "2024-12-05",
    category: "Accreditation",
    priority: "high",
    isRead: false,
  },
  {
    id: "2",
    title: "New Safety Guidelines Released",
    description: "Updated fire safety and emergency evacuation guidelines have been published. Please review and update your safety protocols.",
    date: "2024-12-01",
    category: "Safety",
    priority: "high",
    isRead: false,
  },
  {
    id: "3",
    title: "Inspection Protocol Changes",
    description: "Changes to the property inspection schedule and requirements for Q1 2025.",
    date: "2024-11-28",
    category: "Compliance",
    priority: "medium",
    isRead: true,
  },
  {
    id: "4",
    title: "System Maintenance Scheduled",
    description: "The portal will undergo scheduled maintenance on December 15th from 2:00 AM to 6:00 AM.",
    date: "2024-11-25",
    category: "System",
    priority: "low",
    isRead: true,
  },
  {
    id: "5",
    title: "New Invoice Submission Deadline",
    description: "Reminder: All invoices for November must be submitted by December 10th.",
    date: "2024-11-20",
    category: "Billing",
    priority: "medium",
    isRead: true,
  },
];

const supportContacts = [
  {
    id: "1",
    name: "NSFAS Regional Liaison - Gauteng",
    role: "Regional Support",
    phone: "+27 12 345 6789",
    email: "gauteng@nsfas.org.za",
    region: "Gauteng",
  },
  {
    id: "2",
    name: "NSFAS Regional Liaison - Western Cape",
    role: "Regional Support",
    phone: "+27 21 345 6789",
    email: "westerncape@nsfas.org.za",
    region: "Western Cape",
  },
  {
    id: "3",
    name: "Fire Safety Officer",
    role: "Safety Compliance",
    phone: "+27 10 111 2222",
    email: "firesafety@gov.za",
    region: "National",
  },
  {
    id: "4",
    name: "Building Inspector",
    role: "Property Compliance",
    phone: "+27 10 333 4444",
    email: "inspections@gov.za",
    region: "National",
  },
  {
    id: "5",
    name: "EduFlow360 Technical Support",
    role: "Platform Support",
    phone: "+27 10 555 6666",
    email: "support@eduflow360.co.za",
    region: "National",
  },
];

const helpArticles = [
  {
    id: "1",
    title: "Troubleshooting Login Issues",
    category: "Account",
    views: 1520,
  },
  {
    id: "2",
    title: "How to Reset Your Password",
    category: "Account",
    views: 980,
  },
  {
    id: "3",
    title: "Understanding Invoice Rejections",
    category: "Billing",
    views: 750,
  },
  {
    id: "4",
    title: "Fixing Document Upload Errors",
    category: "Technical",
    views: 620,
  },
  {
    id: "5",
    title: "Property Verification Process",
    category: "Compliance",
    views: 540,
  },
];

function ResourcesContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("guides");
  const [platformResources, setPlatformResources] = useState<PlatformResource[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch platform resources from Firestore
  useEffect(() => {
    const fetchResources = async () => {
      try {
        console.log("Fetching platform resources...");
        const resources = await getPlatformResources();
        console.log("Fetched resources:", resources);
        setPlatformResources(resources);
      } catch (error) {
        console.error("Error fetching resources:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  // Helper function to find uploaded resource matching an expected resource
  // Matches by predefinedResourceId for exact matching
  const findUploadedResource = (expected: ExpectedResource): PlatformResource | undefined => {
    // Find by predefinedResourceId (exact match)
    const match = platformResources.find(
      (r) => r.isActive !== false && r.predefinedResourceId === expected.id
    );
    
    return match;
  };

  // Helper to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle download with tracking
  const handleDownload = async (resource: PlatformResource) => {
    try {
      // Increment download count in database
      await incrementDownloadCount(resource.resourceId);
      
      // Update local state to reflect the new count
      setPlatformResources(prev => 
        prev.map(r => 
          r.resourceId === resource.resourceId 
            ? { ...r, downloadCount: (r.downloadCount || 0) + 1 }
            : r
        )
      );
      
      // Open the file in a new tab
      window.open(resource.fileUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error tracking download:', error);
      // Still open the file even if tracking fails
      window.open(resource.fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />

      <div className="flex flex-1">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
              <p className="text-gray-500">Your knowledge hub for guides, templates, policies, and support</p>
            </div>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <Card className="border-gray-200">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent flex-wrap">
                <TabsTrigger
                  value="guides"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-4 py-3"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Guides & Tutorials
                </TabsTrigger>
                <TabsTrigger
                  value="templates"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-4 py-3"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Templates & Forms
                </TabsTrigger>
                <TabsTrigger
                  value="policies"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-4 py-3"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Policies & Regulations
                </TabsTrigger>
                <TabsTrigger
                  value="announcements"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-4 py-3"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Announcements
                  <Badge className="ml-2 bg-red-500 text-white text-xs">2</Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="support"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-4 py-3"
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Support Resources
                </TabsTrigger>
              </TabsList>
            </Card>

            {/* Guides & Tutorials Tab */}
            <TabsContent value="guides" className="space-y-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Loading resources...</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Display expected guides with upload status */}
                  {expectedGuides
                    .filter(
                      (guide) =>
                        guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        guide.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((guide) => {
                      const uploadedResource = findUploadedResource(guide);
                      const isUploaded = !!uploadedResource;
                      const isVideo = guide.format === "VIDEO";
                      
                      return (
                        <Card key={guide.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                !isUploaded ? "bg-gray-100" : isVideo ? "bg-red-100" : "bg-blue-100"
                              }`}>
                                {isVideo ? (
                                  <Play className={`w-6 h-6 ${isUploaded ? "text-red-600" : "text-gray-400"}`} />
                                ) : (
                                  <FileText className={`w-6 h-6 ${isUploaded ? "text-blue-600" : "text-gray-400"}`} />
                                )}
                              </div>
                              {!isUploaded && (
                                <Badge className="bg-orange-100 text-orange-600">Pending</Badge>
                              )}
                            </div>
                            <h3 className={`font-semibold mb-2 ${isUploaded ? "text-gray-900" : "text-gray-500"}`}>
                              {uploadedResource?.title || guide.title}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                              {uploadedResource?.description || guide.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{guide.subCategory}</Badge>
                                {isUploaded && uploadedResource?.duration && (
                                  <span className="text-xs text-gray-400">{uploadedResource.duration}</span>
                                )}
                              </div>
                              {isUploaded && uploadedResource ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDownload(uploadedResource)}
                                >
                                  {isVideo ? (
                                    <>
                                      <Play className="w-4 h-4 mr-1" />
                                      Watch
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-4 h-4 mr-1" />
                                      Download
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" disabled className="text-gray-400">
                                  <Clock className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </TabsContent>

            {/* Templates & Forms Tab */}
            <TabsContent value="templates" className="space-y-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Loading resources...</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Display expected templates with upload status */}
                  {expectedTemplates
                    .filter(
                      (template) =>
                        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        template.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((template) => {
                      const uploadedResource = findUploadedResource(template);
                      const isUploaded = !!uploadedResource;
                      
                      return (
                        <Card key={template.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isUploaded ? "bg-amber-100" : "bg-gray-100"
                              }`}>
                                <FileDown className={`w-6 h-6 ${isUploaded ? "text-amber-600" : "text-gray-400"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-semibold truncate ${isUploaded ? "text-gray-900" : "text-gray-500"}`}>
                                  {uploadedResource?.title || template.title}
                                </h3>
                                <p className="text-sm text-gray-500 truncate">
                                  {uploadedResource?.description || template.description}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {uploadedResource?.fileType?.toUpperCase() || template.format}
                                  </Badge>
                                  {isUploaded && uploadedResource?.fileSize && (
                                    <span className="text-xs text-gray-400">
                                      {formatFileSize(uploadedResource.fileSize)}
                                    </span>
                                  )}
                                  {isUploaded ? (
                                    <span className="text-xs text-gray-400">
                                      {uploadedResource?.downloadCount || 0} downloads
                                    </span>
                                  ) : (
                                    <span className="text-xs text-orange-500 font-medium">
                                      Pending Upload
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isUploaded && uploadedResource ? (
                                <Button 
                                  className="bg-amber-500 hover:bg-amber-600 text-gray-900 flex-shrink-0"
                                  onClick={() => handleDownload(uploadedResource)}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              ) : (
                                <Button 
                                  className="bg-gray-200 text-gray-400 flex-shrink-0 cursor-not-allowed" 
                                  disabled
                                >
                                  <Clock className="w-4 h-4 mr-2" />
                                  Pending
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </TabsContent>

            {/* Policies & Regulations Tab */}
            <TabsContent value="policies" className="space-y-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Loading resources...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Display expected policies with upload status */}
                  {expectedPolicies
                    .filter(
                      (policy) =>
                        policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        policy.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((policy) => {
                      const uploadedResource = findUploadedResource(policy);
                      const isUploaded = !!uploadedResource;
                      
                      return (
                        <Card key={policy.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isUploaded ? "bg-purple-100" : "bg-gray-100"
                              }`}>
                                <Shield className={`w-6 h-6 ${isUploaded ? "text-purple-600" : "text-gray-400"}`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={`font-semibold ${isUploaded ? "text-gray-900" : "text-gray-500"}`}>
                                    {uploadedResource?.title || policy.title}
                                  </h3>
                                  {!isUploaded && (
                                    <Badge className="bg-orange-100 text-orange-600 text-xs">Pending Upload</Badge>
                                  )}
                                  {isUploaded && uploadedResource?.isUpdated && (
                                    <Badge className="bg-blue-500 text-xs">Updated</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {uploadedResource?.description || policy.description}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <Badge variant="outline" className="text-xs">{policy.subCategory}</Badge>
                                  {isUploaded && uploadedResource?.effectiveDate && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Effective: {new Date(uploadedResource.effectiveDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isUploaded && uploadedResource ? (
                                <Button 
                                  variant="outline" 
                                  className="flex-shrink-0 border-purple-500 text-purple-600 hover:bg-purple-50"
                                  onClick={() => handleDownload(uploadedResource)}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View
                                </Button>
                              ) : (
                                <Button variant="outline" className="flex-shrink-0 text-gray-400 border-gray-300" disabled>
                                  <Clock className="w-4 h-4 mr-2" />
                                  Pending
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </TabsContent>

            {/* Announcements Tab */}
            <TabsContent value="announcements" className="space-y-6">
              <div className="space-y-4">
                {announcements
                  .filter(
                    (announcement) =>
                      announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      announcement.description.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((announcement) => (
                    <Card 
                      key={announcement.id} 
                      className={`hover:shadow-md transition-shadow ${!announcement.isRead ? "border-l-4 border-l-amber-500" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            announcement.priority === "high" 
                              ? "bg-red-100" 
                              : announcement.priority === "medium"
                              ? "bg-yellow-100"
                              : "bg-gray-100"
                          }`}>
                            {announcement.priority === "high" ? (
                              <AlertCircle className={`w-5 h-5 text-red-600`} />
                            ) : announcement.priority === "medium" ? (
                              <Clock className="w-5 h-5 text-yellow-600" />
                            ) : (
                              <Bell className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                              {!announcement.isRead && (
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mb-2">{announcement.description}</p>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{announcement.category}</Badge>
                              <span className="text-xs text-gray-400">
                                {new Date(announcement.date).toLocaleDateString("en-ZA", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            {/* Support Resources Tab */}
            <TabsContent value="support" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Help Articles */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-500" />
                      Help Articles
                    </CardTitle>
                    <CardDescription>Common questions and troubleshooting guides</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {helpArticles.map((article) => (
                        <div
                          key={article.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <HelpCircle className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{article.title}</p>
                              <p className="text-xs text-gray-500">{article.category}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      View All Articles
                    </Button>
                  </CardContent>
                </Card>

                {/* Contact Directory */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-500" />
                      Contact Directory
                    </CardTitle>
                    <CardDescription>Key contacts for support and compliance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {supportContacts.slice(0, 4).map((contact) => (
                        <div key={contact.id} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{contact.name}</p>
                              <p className="text-xs text-gray-500 mb-2">{contact.role}</p>
                              <div className="flex flex-col gap-1">
                                <a href={`tel:${contact.phone}`} className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {contact.phone}
                                </a>
                                <a href={`mailto:${contact.email}`} className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {contact.email}
                                </a>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">{contact.region}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      View All Contacts
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Support Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Need More Help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                      <Link href="/tickets/create">
                        <HelpCircle className="w-6 h-6 text-amber-500" />
                        <span>Create Support Ticket</span>
                      </Link>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                      <Phone className="w-6 h-6 text-amber-500" />
                      <span>Call Support Hotline</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                      <Mail className="w-6 h-6 text-amber-500" />
                      <span>Email Support Team</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <ResourcesContent />
    </ProtectedRoute>
  );
}
