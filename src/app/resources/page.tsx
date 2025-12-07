"use client";

import { useState } from "react";
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

// Mock data for resources
const guides = [
  {
    id: "1",
    title: "How to Onboard Students",
    description: "Complete guide to registering and onboarding new students to your property",
    type: "pdf",
    category: "Onboarding",
    duration: "15 min read",
    isNew: true,
  },
  {
    id: "2",
    title: "How to Upload Compliance Documents",
    description: "Step-by-step instructions for uploading and managing compliance documentation",
    type: "pdf",
    category: "Compliance",
    duration: "10 min read",
    isNew: false,
  },
  {
    id: "3",
    title: "Fire Safety Compliance Guide",
    description: "Essential fire safety requirements and compliance checklist for accommodation providers",
    type: "pdf",
    category: "Safety",
    duration: "20 min read",
    isNew: false,
  },
  {
    id: "4",
    title: "Property Registration Walkthrough",
    description: "Video tutorial on how to register your property on the platform",
    type: "video",
    category: "Onboarding",
    duration: "8 min",
    isNew: true,
  },
  {
    id: "5",
    title: "Invoice Submission Tutorial",
    description: "Learn how to create and submit invoices for student accommodation",
    type: "video",
    category: "Billing",
    duration: "12 min",
    isNew: false,
  },
  {
    id: "6",
    title: "Room Configuration Guide",
    description: "How to set up and manage room configurations for your properties",
    type: "pdf",
    category: "Property Management",
    duration: "8 min read",
    isNew: false,
  },
];

const templates = [
  {
    id: "1",
    title: "Lease Agreement Template",
    description: "Standard lease agreement template for student accommodation",
    format: "DOCX",
    size: "245 KB",
    category: "Legal",
    downloads: 1250,
  },
  {
    id: "2",
    title: "Property Inspection Checklist",
    description: "Comprehensive checklist for property inspections and compliance",
    format: "PDF",
    size: "180 KB",
    category: "Compliance",
    downloads: 890,
  },
  {
    id: "3",
    title: "Financial Statement Template",
    description: "Template for submitting financial documentation to NSFAS",
    format: "XLSX",
    size: "120 KB",
    category: "Financial",
    downloads: 650,
  },
  {
    id: "4",
    title: "Incident Report Form",
    description: "Standard form for reporting incidents at your property",
    format: "PDF",
    size: "95 KB",
    category: "Safety",
    downloads: 420,
  },
  {
    id: "5",
    title: "Room Configuration Template",
    description: "Template for documenting room layouts and configurations",
    format: "XLSX",
    size: "85 KB",
    category: "Property Management",
    downloads: 380,
  },
  {
    id: "6",
    title: "Student Check-in/Check-out Form",
    description: "Form for documenting student arrivals and departures",
    format: "PDF",
    size: "75 KB",
    category: "Operations",
    downloads: 720,
  },
];

const policies = [
  {
    id: "1",
    title: "NSFAS Accreditation Policy 2025",
    description: "Official NSFAS accreditation requirements and guidelines for accommodation providers",
    effectiveDate: "January 2025",
    category: "Accreditation",
    isUpdated: true,
  },
  {
    id: "2",
    title: "Fire & Safety Regulations",
    description: "National fire safety regulations applicable to student accommodation",
    effectiveDate: "March 2024",
    category: "Safety",
    isUpdated: false,
  },
  {
    id: "3",
    title: "Occupancy Compliance Rules",
    description: "Guidelines for maximum occupancy and room allocation standards",
    effectiveDate: "June 2024",
    category: "Compliance",
    isUpdated: false,
  },
  {
    id: "4",
    title: "Building Safety Standards",
    description: "Structural and building safety requirements for student housing",
    effectiveDate: "February 2024",
    category: "Safety",
    isUpdated: false,
  },
  {
    id: "5",
    title: "Student Rights & Responsibilities",
    description: "Policy document outlining student rights and provider obligations",
    effectiveDate: "January 2024",
    category: "Legal",
    isUpdated: false,
  },
  {
    id: "6",
    title: "Data Protection & Privacy Policy",
    description: "POPIA compliance guidelines for handling student information",
    effectiveDate: "April 2024",
    category: "Legal",
    isUpdated: true,
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
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guides
                  .filter(
                    (guide) =>
                      guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      guide.description.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((guide) => (
                    <Card key={guide.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            guide.type === "video" ? "bg-red-100" : "bg-blue-100"
                          }`}>
                            {guide.type === "video" ? (
                              <Play className="w-6 h-6 text-red-600" />
                            ) : (
                              <FileText className="w-6 h-6 text-blue-600" />
                            )}
                          </div>
                          {guide.isNew && (
                            <Badge className="bg-green-500">New</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{guide.title}</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{guide.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{guide.category}</Badge>
                            <span className="text-xs text-gray-400">{guide.duration}</span>
                          </div>
                          <Button variant="ghost" size="sm">
                            {guide.type === "video" ? (
                              <Play className="w-4 h-4" />
                            ) : (
                              <ExternalLink className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            {/* Templates & Forms Tab */}
            <TabsContent value="templates" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                {templates
                  .filter(
                    (template) =>
                      template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      template.description.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <FileDown className="w-6 h-6 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{template.title}</h3>
                            <p className="text-sm text-gray-500 truncate">{template.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline" className="text-xs">{template.format}</Badge>
                              <span className="text-xs text-gray-400">{template.size}</span>
                              <span className="text-xs text-gray-400">{template.downloads} downloads</span>
                            </div>
                          </div>
                          <Button className="bg-amber-500 hover:bg-amber-600 text-gray-900 flex-shrink-0">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            {/* Policies & Regulations Tab */}
            <TabsContent value="policies" className="space-y-6">
              <div className="space-y-4">
                {policies
                  .filter(
                    (policy) =>
                      policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      policy.description.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((policy) => (
                    <Card key={policy.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{policy.title}</h3>
                              {policy.isUpdated && (
                                <Badge className="bg-blue-500 text-xs">Updated</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{policy.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline">{policy.category}</Badge>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Effective: {policy.effectiveDate}
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" className="flex-shrink-0">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
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
