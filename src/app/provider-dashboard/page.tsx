"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  FileText,
  Ticket,
  DollarSign,
  TrendingUp,
  Plus,
  Eye,
  MapPin,
  Mail,
  Calendar,
  Phone,
  Briefcase,
  CreditCard,
  Shield,
  CheckCircle,
  Clock,
  RefreshCw,
  Pencil,
  Loader2,
  Settings,
  FolderOpen,
} from "lucide-react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProviderByUserId, getAddressById, getProviderContacts, getProviderDocuments, getPropertiesByProvider, getPropertyAssignments, updateProviderContact } from "@/lib/db";
import { syncProviderToCRM } from "@/lib/crmSync";
import { toast } from "sonner";
import { AccommodationProvider, Address, ProviderContactPerson, ProviderDocument, Property, Student, StudentPropertyAssignment } from "@/lib/schema";
import { getStudentById } from "@/lib/db";
import { providerDisplayId } from "@/lib/utils/maskId";
import { OnlineStatus } from "@/components/OnlineStatus";

interface DashboardStats {
  totalProperties: number;
  totalStudents: number;
  occupancyRate: number;
  pendingInvoices: number;
  openTickets: number;
  monthlyRevenue: number;
}

interface StudentWithProperty {
  student: Student;
  assignment: StudentPropertyAssignment;
  property: Property;
}

function ProviderDashboardContent() {
  const { user, isFullyLoaded, profileLoading } = useAuth();
  const router = useRouter();
  const [providerStatus, setProviderStatus] = useState<AccommodationProvider | null>(null);
  const [providerAddress, setProviderAddress] = useState<Address | null>(null);
  const [providerContacts, setProviderContacts] = useState<ProviderContactPerson[]>([]);
  const [providerDocuments, setProviderDocuments] = useState<ProviderDocument[]>([]);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalStudents: 0,
    occupancyRate: 0,
    pendingInvoices: 0,
    openTickets: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [propertiesList, setPropertiesList] = useState<Property[]>([]);
  const [studentsList, setStudentsList] = useState<StudentWithProperty[]>([]);
  const [syncingToDataverse, setSyncingToDataverse] = useState(false);
  
  // Edit Contact Modal State
  const [editingContact, setEditingContact] = useState<ProviderContactPerson | null>(null);
  const [editContactForm, setEditContactForm] = useState({
    firstNames: "",
    surname: "",
    position: "",
    phoneNumber: "",
    email: "",
    idNumber: "",
  });
  const [savingContact, setSavingContact] = useState(false);

  const openEditContactModal = (contact: ProviderContactPerson) => {
    setEditingContact(contact);
    setEditContactForm({
      firstNames: contact.firstNames || "",
      surname: contact.surname || "",
      position: contact.position || "",
      phoneNumber: contact.phoneNumber || "",
      email: contact.email || "",
      idNumber: contact.idNumber || "",
    });
  };

  const handleSaveContact = async () => {
    if (!editingContact) return;
    
    setSavingContact(true);
    try {
      await updateProviderContact(editingContact.contactId, {
        firstNames: editContactForm.firstNames,
        surname: editContactForm.surname,
        position: editContactForm.position,
        phoneNumber: editContactForm.phoneNumber,
        email: editContactForm.email,
        idNumber: editContactForm.idNumber,
      });
      
      // Update local state
      setProviderContacts(prev => prev.map(c => 
        c.contactId === editingContact.contactId 
          ? { ...c, ...editContactForm }
          : c
      ));
      
      toast.success("Contact updated successfully");
      setEditingContact(null);
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Failed to update contact");
    } finally {
      setSavingContact(false);
    }
  };

  // Handle Sync to Dataverse
  const handleSyncToDataverse = async () => {
    if (!providerStatus || !user) return;
    
    setSyncingToDataverse(true);
    try {
      const primaryContact = providerContacts.find(c => c.isPrimary);
      const secondaryContact = providerContacts.find(c => !c.isPrimary);
      
      // Fetch latest documents before sync
      const latestDocs = await getProviderDocuments(providerStatus.providerId);
      
      const result = await syncProviderToCRM(
        providerStatus,
        user.dataverseId || "",
        providerAddress,
        primaryContact,
        secondaryContact,
        latestDocs
      );
      
      if (result.success) {
        toast.success("Provider synced to Dataverse successfully");
        if (result.providerDataverseId) {
          setProviderStatus({ ...providerStatus, dataverseId: result.providerDataverseId });
        }
      } else {
        toast.error(result.message || "Failed to sync to Dataverse");
        console.error("Dataverse sync error:", result.error);
      }
    } catch (error) {
      console.error("Error syncing to Dataverse:", error);
      toast.error("Failed to sync to Dataverse");
    } finally {
      setSyncingToDataverse(false);
    }
  };

  // Check if user has approved provider status and fetch related data
  useEffect(() => {
    const checkProviderStatus = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid) {
        setLoadingProvider(false);
        return;
      }
      try {
        const provider = await getProviderByUserId(uid);
        setProviderStatus(provider);

        // Redirect to dashboard if no provider or not approved
        if (!provider || provider.approvalStatus !== "Approved") {
          router.push("/dashboard");
          return;
        }

        // Fetch address if available
        if (provider.physicalAddressId) {
          const address = await getAddressById(provider.physicalAddressId);
          setProviderAddress(address);
        }

        // Fetch contacts
        const contacts = await getProviderContacts(provider.providerId);
        setProviderContacts(contacts);
      } catch (err) {
        console.error("Error checking provider status:", err);
        router.push("/dashboard");
      } finally {
        setLoadingProvider(false);
      }
    };
    checkProviderStatus();
  }, [user?.userId, user?.uid, router]);

  useEffect(() => {
    const fetchStats = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid || !db || !providerStatus) {
        setLoading(false);
        return;
      }

      try {
        // Use the provider's ID, not the user's ID
        const providerId = providerStatus.providerId;

        // Fetch all properties for this provider
        const properties = await getPropertiesByProvider(providerId);
        const totalProperties = properties.length;
        
        // Store properties list (limit to 10 for dashboard display)
        setPropertiesList(properties.slice(0, 10));

        // Calculate total beds across all properties
        let totalBeds = 0;
        properties.forEach((property) => {
          totalBeds += property.totalBeds || 0;
        });

        // Fetch all active student assignments across all properties
        // Only count assignments where the student still exists (handles external deletions)
        let totalStudents = 0;
        const allStudentsWithProperties: StudentWithProperty[] = [];
        
        for (const property of properties) {
          const assignments = await getPropertyAssignments(property.propertyId);
          const activeAssignments = assignments.filter(a => a.status === "Active");
          
          // Verify each student exists before counting
          for (const assignment of activeAssignments) {
            const student = await getStudentById(assignment.studentId);
            if (student) {
              totalStudents += 1;
              // Store for display (limit to 10)
              if (allStudentsWithProperties.length < 10) {
                allStudentsWithProperties.push({
                  student,
                  assignment,
                  property,
                });
              }
            }
          }
        }
        
        // Store students list
        setStudentsList(allStudentsWithProperties);

        // Calculate occupancy rate based on total beds vs assigned students
        const occupancyRate = totalBeds > 0 ? Math.round((totalStudents / totalBeds) * 100) : 0;

        // Fetch open tickets (still uses userId for ticket ownership)
        const ticketsQuery = query(
          collection(db, "tickets"),
          where("userId", "==", uid),
          where("status", "in", ["open", "in_progress"])
        );
        const ticketsSnap = await getDocs(ticketsQuery);

        setStats({
          totalProperties,
          totalStudents,
          occupancyRate,
          pendingInvoices: 0, // Invoicing not implemented yet
          openTickets: ticketsSnap.size,
          monthlyRevenue: 0, // Would need more complex calculation
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.userId, user?.uid, providerStatus]);

  // Helper variables for contacts
  const primaryContact = providerContacts.find(c => c.isPrimary);
  const secondaryContact = providerContacts.find(c => !c.isPrimary);

  // Show loading skeleton if user data is not yet available
  // This must come AFTER all hooks to comply with React rules
  if (!isFullyLoaded || profileLoading || !user || loadingProvider) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader />
        <div className="flex">
          <Sidebar userType="provider" />
          <main className="flex-1 p-8 overflow-y-auto">
            {/* Loading skeleton */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-sm p-8 mb-8 animate-pulse">
              <div className="h-8 bg-gray-700 rounded w-1/3 mb-3"></div>
              <div className="flex gap-6">
                <div className="h-4 bg-gray-700 rounded w-32"></div>
                <div className="h-4 bg-gray-700 rounded w-48"></div>
                <div className="h-4 bg-gray-700 rounded w-36"></div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse dark:bg-gray-800 dark:border-gray-700">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="animate-pulse dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i}>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
        <DashboardFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />

      <div className="flex">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Provider Header Card */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-sm p-8 mb-8 relative overflow-hidden">
            <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="relative z-10 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-2xl font-semibold">
                    Welcome, {providerStatus?.companyName || (primaryContact ? `${primaryContact.firstNames} ${primaryContact.surname}` : "Provider")}
                  </h1>
                  <OnlineStatus userId={user?.userId || user?.uid} showLabel size="md" />
                </div>
                <div className="flex flex-wrap gap-6 text-sm opacity-90">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    {providerAddress?.townCity || "Location not set"}{providerAddress?.province ? `, ${providerAddress.province}` : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-500" />
                    {primaryContact?.email || user?.email || "Email not set"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    Member since {providerStatus?.createdAt ? new Date(providerStatus.createdAt.toDate()).getFullYear() : user?.createdAt ? new Date(user.createdAt.toDate()).getFullYear() : "2024"}
                  </div>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Link href="/provider-documents">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Documents
                  </Link>
                </Button>
                <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Link href="/provider-settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </Button>
                {/* Sync to Dataverse button - only visible for shampene@lebonconsulting.co.za */}
                {user?.email === "shampene@lebonconsulting.co.za" && (
                  <Button
                    onClick={handleSyncToDataverse}
                    disabled={syncingToDataverse}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {syncingToDataverse ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync To Dataverse
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Properties"
              value={stats.totalProperties}
              icon={Building2}
            />
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={Users}
            />
            <StatCard
              title="Occupancy Rate"
              value={`${stats.occupancyRate}%`}
              icon={TrendingUp}
            />
            <StatCard
              title="Pending Invoices"
              value={stats.pendingInvoices}
              icon={FileText}
            />
          </div>

          {/* Tabs Section */}
          <Tabs defaultValue="overview" className="space-y-6">
            <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
              <TabsList className="w-full justify-start border-b dark:border-gray-700 rounded-none h-auto p-0 bg-transparent">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 dark:text-gray-300 px-6 py-4"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="properties"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 dark:text-gray-300 px-6 py-4"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Properties
                </TabsTrigger>
                <TabsTrigger
                  value="students"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 dark:text-gray-300 px-6 py-4"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Students
                </TabsTrigger>
                <TabsTrigger
                  value="invoices"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 dark:text-gray-300 px-6 py-4"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Invoices
                </TabsTrigger>
                <TabsTrigger
                  value="tickets"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 dark:text-gray-300 px-6 py-4"
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  Tickets
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 dark:text-gray-300 px-6 py-4"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  My Info
                </TabsTrigger>
              </TabsList>
            </Card>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Basic Details Section */}
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                    <Building2 className="w-5 h-5 text-amber-500" />
                    Basic Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Provider ID</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerDisplayId(providerStatus?.providerId)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Provider Name</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerStatus?.companyName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Company Registration Number</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerStatus?.companyRegistrationNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tax Number</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerStatus?.taxReferenceNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Vat Number</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {providerStatus?.vatRegistered ? (providerStatus?.vatNumber || "-") : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">VAT Registration</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerStatus?.vatRegistered ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Street Address</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerAddress?.street || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Surburb</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerAddress?.suburb || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">City</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerAddress?.townCity || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Province</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerAddress?.province || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Provider Type</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerStatus?.legalForm || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Years in Operation</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerStatus?.yearsInOperation || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Longitude</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerAddress?.longitude || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Latitude</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{providerAddress?.latitude || "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-gray-100">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <Button asChild className="h-auto py-4 flex-col gap-2 bg-amber-500 hover:bg-amber-600 text-gray-900">
                      <Link href="/properties/add">
                        <Plus className="w-5 h-5" />
                        Add Property
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                      <Link href="/students">
                        <Users className="w-5 h-5" />
                        Manage Students
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                      <Link href="/invoices">
                        <FileText className="w-5 h-5" />
                        Submit Invoice
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                      <Link href="/tickets">
                        <Ticket className="w-5 h-5" />
                        Create Ticket
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-gray-100">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { action: "New student allocated", time: "2 hours ago", type: "success" },
                        { action: "Invoice #INV-2024-001 submitted", time: "1 day ago", type: "info" },
                        { action: "Property inspection scheduled", time: "2 days ago", type: "warning" },
                      ].map((activity, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              activity.type === "success"
                                ? "bg-green-500"
                                : activity.type === "warning"
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                            }`}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{activity.action}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="dark:text-gray-100">My Properties</CardTitle>
                  <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                    <Link href="/properties/add">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Property
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                      <p className="text-gray-500 dark:text-gray-400">Loading properties...</p>
                    </div>
                  ) : stats.totalProperties === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Properties Captured</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        You haven't added any properties yet. Start by adding your first accommodation property to begin managing students and bookings.
                      </p>
                      <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                        <Link href="/properties/add">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Your First Property
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="dark:border-gray-700">
                          <TableHead className="dark:text-gray-300">Property Name</TableHead>
                          <TableHead className="dark:text-gray-300">Location</TableHead>
                          <TableHead className="dark:text-gray-300">Beds</TableHead>
                          <TableHead className="dark:text-gray-300">Status</TableHead>
                          <TableHead className="dark:text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {propertiesList.map((property) => (
                          <TableRow key={property.propertyId} className="dark:border-gray-700">
                            <TableCell>
                              <Link
                                href={`/properties/${property.propertyId}`}
                                className="font-medium text-amber-600 hover:text-amber-700 hover:underline"
                              >
                                {property.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {property.institution || "-"}
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {property.totalBeds || 0}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  property.status === "Active"
                                    ? "bg-green-500"
                                    : property.status === "Pending"
                                    ? "bg-yellow-500"
                                    : property.status === "Draft"
                                    ? "bg-blue-500"
                                    : "bg-gray-500"
                                }
                              >
                                {property.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/properties/${property.propertyId}`}>
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="dark:text-gray-100">Allocated Students</CardTitle>
                  <Button asChild variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                    <Link href="/students">
                      View All Students
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {studentsList.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No students allocated</h3>
                      <p className="text-gray-500 dark:text-gray-400">Students will appear here once allocated to your properties</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="dark:border-gray-700">
                          <TableHead className="dark:text-gray-300">Student Name</TableHead>
                          <TableHead className="dark:text-gray-300">ID Number</TableHead>
                          <TableHead className="dark:text-gray-300">Property</TableHead>
                          <TableHead className="dark:text-gray-300">NSFAS</TableHead>
                          <TableHead className="dark:text-gray-300">Monthly Rent</TableHead>
                          <TableHead className="dark:text-gray-300">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentsList.map(({ student, assignment, property }) => (
                          <TableRow key={`${student.studentId}-${assignment.assignmentId}`} className="dark:border-gray-700">
                            <TableCell>
                              <Link
                                href={`/students/${student.studentId}`}
                                className="font-medium text-amber-600 hover:text-amber-700 hover:underline"
                              >
                                {student.firstNames} {student.surname}
                              </Link>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-gray-600 dark:text-gray-400">
                              {student.idNumber}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/properties/${property.propertyId}`}
                                className="text-amber-600 hover:text-amber-700 hover:underline"
                              >
                                {property.name}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {student.funded ? (
                                <Badge className="bg-green-500">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Funded
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Not Funded</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {assignment.monthlyRate ? `R${assignment.monthlyRate.toLocaleString()}` : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  assignment.status === "Active"
                                    ? "border-green-500 text-green-700 bg-green-50 dark:bg-green-900/30"
                                    : assignment.status === "Future"
                                    ? "border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-900/30"
                                    : "border-gray-500 text-gray-700 bg-gray-50 dark:bg-gray-900/30"
                                }
                              >
                                {assignment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="dark:text-gray-100">Invoices</CardTitle>
                  <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                    <Link href="/invoices/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Invoice
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No invoices yet</h3>
                    <p className="text-gray-500 dark:text-gray-400">Create your first invoice to get started</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="dark:text-gray-100">Support Tickets</CardTitle>
                  <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                    <Link href="/tickets/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Ticket
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {stats.openTickets === 0 ? (
                    <div className="text-center py-12">
                      <Ticket className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No open tickets</h3>
                      <p className="text-gray-500 dark:text-gray-400">Create a ticket if you need assistance</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="dark:border-gray-700">
                          <TableHead className="dark:text-gray-300">Ticket ID</TableHead>
                          <TableHead className="dark:text-gray-300">Subject</TableHead>
                          <TableHead className="dark:text-gray-300">Category</TableHead>
                          <TableHead className="dark:text-gray-300">Priority</TableHead>
                          <TableHead className="dark:text-gray-300">Status</TableHead>
                          <TableHead className="dark:text-gray-300">Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="dark:border-gray-700">
                          <TableCell colSpan={6} className="text-center text-gray-500 dark:text-gray-400">
                            Loading tickets...
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* My Info Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Provider Profile */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                      <Building2 className="w-5 h-5 text-amber-500" />
                      Provider Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Provider Name</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.companyName || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Provider Type</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.legalForm || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Years in Operation</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.yearsInOperation || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Registration Number</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.companyRegistrationNumber || "Not set"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Status & Accreditation */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                      <Shield className="w-5 h-5 text-amber-500" />
                      Status & Accreditation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Account Status</p>
                        <Badge variant={providerStatus?.approvalStatus === "Approved" ? "default" : "secondary"} className={providerStatus?.approvalStatus === "Approved" ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400"}>
                          {providerStatus?.approvalStatus || "Pending"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Accreditation</p>
                        <Badge variant={providerStatus?.nsfasAccredited ? "default" : "secondary"} className={providerStatus?.nsfasAccredited ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400"}>
                          {providerStatus?.nsfasAccredited ? "Approved" : "Pending"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Compliance</p>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400">
                          Pending
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">VAT Registered</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.vatRegistered ? "Yes" : "Not set"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                      <MapPin className="w-5 h-5 text-amber-500" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Street Address</p>
                      <p className="font-medium dark:text-gray-100">{providerAddress?.street || "Not set"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Suburb</p>
                        <p className="font-medium dark:text-gray-100">{providerAddress?.suburb || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">City</p>
                        <p className="font-medium dark:text-gray-100">{providerAddress?.townCity || "Not set"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Province</p>
                      <p className="font-medium dark:text-gray-100">{providerAddress?.province || "Not set"}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-amber-500" />
                        Contact Information
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-b dark:border-gray-700 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">PRIMARY CONTACT</p>
                        {primaryContact && (
                          <Button variant="ghost" size="sm" onClick={() => openEditContactModal(primaryContact)} className="h-7 px-2">
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                          <p className="font-medium dark:text-gray-100">{primaryContact ? `${primaryContact.firstNames} ${primaryContact.surname}` : "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Position</p>
                          <p className="font-medium dark:text-gray-100">{primaryContact?.position || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                          <p className="font-medium dark:text-gray-100">{primaryContact?.phoneNumber || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                          <p className="font-medium dark:text-gray-100">{primaryContact?.email || "Not set"}</p>
                        </div>
                      </div>
                    </div>
                    {secondaryContact && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">SECONDARY CONTACT</p>
                          <Button variant="ghost" size="sm" onClick={() => openEditContactModal(secondaryContact)} className="h-7 px-2">
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                            <p className="font-medium dark:text-gray-100">{`${secondaryContact.firstNames} ${secondaryContact.surname}`}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Position</p>
                            <p className="font-medium dark:text-gray-100">{secondaryContact.position || "-"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ID Number</p>
                            <p className="font-medium dark:text-gray-100">{secondaryContact.idNumber || "-"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                            <p className="font-medium dark:text-gray-100">{secondaryContact.phoneNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                            <p className="font-medium dark:text-gray-100">{secondaryContact.email || "-"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Campus & Contact Info */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                      <Building2 className="w-5 h-5 text-amber-500" />
                      Campus & Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Preferred Institution</p>
                        <p className="font-medium dark:text-gray-100">{(providerStatus as any)?.preferredInstitution || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Preferred Campus</p>
                        <p className="font-medium dark:text-gray-100">{(providerStatus as any)?.preferredCampus || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Office Telephone</p>
                        <p className="font-medium dark:text-gray-100">{(providerStatus as any)?.officeTelephone || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Customer Service Email</p>
                        <p className="font-medium dark:text-gray-100">{(providerStatus as any)?.customerServiceEmail || "Not set"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Website</p>
                        <p className="font-medium dark:text-gray-100">
                          {(providerStatus as any)?.website ? (
                            <a href={(providerStatus as any).website} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                              {(providerStatus as any).website}
                            </a>
                          ) : "Not set"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tax & B-BBEE */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                      <FileText className="w-5 h-5 text-amber-500" />
                      Tax & B-BBEE Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tax Number</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.taxReferenceNumber || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">VAT Number</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.vatNumber || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">B-BBEE Level</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.bbbeeLevel ? `Level ${providerStatus.bbbeeLevel}` : "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">B-BBEE Expiry</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.bbbeeCertificateExpiry || "Not set"}</p>
                      </div>
                    </div>
                    {(providerStatus?.blackOwnershipPercentage || providerStatus?.blackWomenOwnershipPercentage) && (
                      <div className="border-t dark:border-gray-700 pt-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">OWNERSHIP BREAKDOWN</p>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                            <p className="text-lg font-semibold dark:text-gray-100">{providerStatus?.blackOwnershipPercentage || 0}%</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Black</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                            <p className="text-lg font-semibold dark:text-gray-100">{providerStatus?.blackWomenOwnershipPercentage || 0}%</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Women</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                            <p className="text-lg font-semibold dark:text-gray-100">{providerStatus?.blackYouthOwnershipPercentage || 0}%</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Youth</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                            <p className="text-lg font-semibold dark:text-gray-100">{providerStatus?.disabledPersonOwnershipPercentage || 0}%</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Disability</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bank Details */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                      <CreditCard className="w-5 h-5 text-amber-500" />
                      Bank Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Bank Name</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.bankName || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Account Type</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.accountType || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Account Number</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.accountNumber ? `****${providerStatus.accountNumber.slice(-4)}` : "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Branch Code</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.branchCode || "Not set"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Account Holder</p>
                        <p className="font-medium dark:text-gray-100">{providerStatus?.accountHolder || "Not set"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <DashboardFooter />

      {/* Edit Contact Modal */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {editingContact?.isPrimary ? "Primary" : "Secondary"} Contact
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstNames">First Name(s)</Label>
                <Input
                  id="firstNames"
                  value={editContactForm.firstNames}
                  onChange={(e) => setEditContactForm(prev => ({ ...prev, firstNames: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Surname</Label>
                <Input
                  id="surname"
                  value={editContactForm.surname}
                  onChange={(e) => setEditContactForm(prev => ({ ...prev, surname: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Position/Title</Label>
                <Input
                  id="position"
                  value={editContactForm.position}
                  onChange={(e) => setEditContactForm(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="e.g. Director, Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number</Label>
                <Input
                  id="idNumber"
                  value={editContactForm.idNumber}
                  onChange={(e) => setEditContactForm(prev => ({ ...prev, idNumber: e.target.value }))}
                  placeholder="SA ID Number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={editContactForm.phoneNumber}
                  onChange={(e) => setEditContactForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editContactForm.email}
                  onChange={(e) => setEditContactForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)} disabled={savingContact}>
              Cancel
            </Button>
            <Button onClick={handleSaveContact} disabled={savingContact} className="bg-amber-500 hover:bg-amber-600">
              {savingContact ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProviderDashboardPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <ProviderDashboardContent />
    </ProtectedRoute>
  );
}
