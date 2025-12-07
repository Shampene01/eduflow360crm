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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProviderByUserId, getAddressById, getProviderContacts } from "@/lib/db";
import { AccommodationProvider, Address, ProviderContactPerson } from "@/lib/schema";
import { providerDisplayId } from "@/lib/utils/maskId";

interface DashboardStats {
  totalProperties: number;
  totalStudents: number;
  occupancyRate: number;
  pendingInvoices: number;
  openTickets: number;
  monthlyRevenue: number;
}

function ProviderDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [providerStatus, setProviderStatus] = useState<AccommodationProvider | null>(null);
  const [providerAddress, setProviderAddress] = useState<Address | null>(null);
  const [providerContacts, setProviderContacts] = useState<ProviderContactPerson[]>([]);
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
      if (!uid || !db) {
        setLoading(false);
        return;
      }

      try {
        // Fetch properties count
        const propertiesQuery = query(
          collection(db, "properties"),
          where("providerId", "==", uid)
        );
        const propertiesSnap = await getDocs(propertiesQuery);
        const totalProperties = propertiesSnap.size;

        // Calculate total rooms and students
        let totalRooms = 0;
        let occupiedRooms = 0;
        propertiesSnap.forEach((doc) => {
          const data = doc.data();
          totalRooms += data.totalRooms || 0;
          occupiedRooms += (data.totalRooms || 0) - (data.availableRooms || 0);
        });

        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

        // Fetch pending invoices
        const invoicesQuery = query(
          collection(db, "invoices"),
          where("providerId", "==", uid),
          where("status", "==", "submitted")
        );
        const invoicesSnap = await getDocs(invoicesQuery);

        // Fetch open tickets
        const ticketsQuery = query(
          collection(db, "tickets"),
          where("userId", "==", uid),
          where("status", "in", ["open", "in_progress"])
        );
        const ticketsSnap = await getDocs(ticketsQuery);

        setStats({
          totalProperties,
          totalStudents: occupiedRooms,
          occupancyRate,
          pendingInvoices: invoicesSnap.size,
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
  }, [user?.userId, user?.uid]);

  // Helper variables for contacts
  const primaryContact = providerContacts.find(c => c.isPrimary);
  const secondaryContact = providerContacts.find(c => !c.isPrimary);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <div className="flex">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Provider Header Card */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-sm p-8 mb-8 relative overflow-hidden">
            <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="relative z-10 text-white">
              <h1 className="text-2xl font-semibold mb-3">
                Welcome, {providerStatus?.companyName || (primaryContact ? `${primaryContact.firstNames} ${primaryContact.surname}` : "Provider")}
              </h1>
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
            <Card className="border-gray-200">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-6 py-4"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="properties"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-6 py-4"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Properties
                </TabsTrigger>
                <TabsTrigger
                  value="students"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-6 py-4"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Students
                </TabsTrigger>
                <TabsTrigger
                  value="invoices"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-6 py-4"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Invoices
                </TabsTrigger>
                <TabsTrigger
                  value="tickets"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-6 py-4"
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  Tickets
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-6 py-4"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  My Info
                </TabsTrigger>
              </TabsList>
            </Card>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Basic Details Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-500" />
                    Basic Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Provider ID</p>
                      <p className="font-medium text-gray-900">{providerDisplayId(providerStatus?.providerId)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Provider Name</p>
                      <p className="font-medium text-gray-900">{providerStatus?.companyName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Company Registration Number</p>
                      <p className="font-medium text-gray-900">{providerStatus?.companyRegistrationNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Tax Number</p>
                      <p className="font-medium text-gray-900">{providerStatus?.taxReferenceNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Vat Number</p>
                      <p className="font-medium text-gray-900">
                        {providerStatus?.vatRegistered ? (providerStatus?.vatNumber || "-") : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">VAT Registration</p>
                      <p className="font-medium text-gray-900">{providerStatus?.vatRegistered ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Street Address</p>
                      <p className="font-medium text-gray-900">{providerAddress?.street || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Surburb</p>
                      <p className="font-medium text-gray-900">{providerAddress?.suburb || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">City</p>
                      <p className="font-medium text-gray-900">{providerAddress?.townCity || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Province</p>
                      <p className="font-medium text-gray-900">{providerAddress?.province || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Provider Type</p>
                      <p className="font-medium text-gray-900">{providerStatus?.legalForm || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Years in Operation</p>
                      <p className="font-medium text-gray-900">{providerStatus?.yearsInOperation || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Longitude</p>
                      <p className="font-medium text-gray-900">{providerAddress?.longitude || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Latitude</p>
                      <p className="font-medium text-gray-900">{providerAddress?.latitude || "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <Button asChild className="h-auto py-4 flex-col gap-2 bg-amber-500 hover:bg-amber-600 text-gray-900">
                      <Link href="/properties/add">
                        <Plus className="w-5 h-5" />
                        Add Property
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                      <Link href="/students">
                        <Users className="w-5 h-5" />
                        Manage Students
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                      <Link href="/invoices">
                        <FileText className="w-5 h-5" />
                        Submit Invoice
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                      <Link href="/tickets">
                        <Ticket className="w-5 h-5" />
                        Create Ticket
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { action: "New student allocated", time: "2 hours ago", type: "success" },
                        { action: "Invoice #INV-2024-001 submitted", time: "1 day ago", type: "info" },
                        { action: "Property inspection scheduled", time: "2 days ago", type: "warning" },
                      ].map((activity, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
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
                            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                            <p className="text-xs text-gray-500">{activity.time}</p>
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>My Properties</CardTitle>
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
                      <p className="text-gray-500">Loading properties...</p>
                    </div>
                  ) : stats.totalProperties === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Captured</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
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
                        <TableRow>
                          <TableHead>Property Name</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Rooms</TableHead>
                          <TableHead>Occupancy</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Properties will be listed here when available */}
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            Property list functionality coming soon
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students">
              <Card>
                <CardHeader>
                  <CardTitle>Allocated Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No students allocated</h3>
                    <p className="text-gray-500">Students will appear here once allocated to your properties</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Invoices</CardTitle>
                  <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                    <Link href="/invoices/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Invoice
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                    <p className="text-gray-500">Create your first invoice to get started</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Support Tickets</CardTitle>
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
                      <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No open tickets</h3>
                      <p className="text-gray-500">Create a ticket if you need assistance</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticket ID</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500">
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-amber-500" />
                      Provider Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Provider Name</p>
                        <p className="font-medium">{providerStatus?.companyName || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Provider Type</p>
                        <p className="font-medium">{providerStatus?.legalForm || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Years in Operation</p>
                        <p className="font-medium">{providerStatus?.yearsInOperation || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Registration Number</p>
                        <p className="font-medium">{providerStatus?.companyRegistrationNumber || "Not set"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Status & Accreditation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-amber-500" />
                      Status & Accreditation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Account Status</p>
                        <Badge variant={providerStatus?.approvalStatus === "Approved" ? "default" : "secondary"} className={providerStatus?.approvalStatus === "Approved" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {providerStatus?.approvalStatus || "Pending"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Accreditation</p>
                        <Badge variant={providerStatus?.nsfasAccredited ? "default" : "secondary"} className={providerStatus?.nsfasAccredited ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {providerStatus?.nsfasAccredited ? "Approved" : "Pending"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Compliance</p>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Pending
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">VAT Registered</p>
                        <p className="font-medium">{providerStatus?.vatRegistered ? "Yes" : "Not set"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-amber-500" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Street Address</p>
                      <p className="font-medium">{providerAddress?.street || "Not set"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Suburb</p>
                        <p className="font-medium">{providerAddress?.suburb || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">City</p>
                        <p className="font-medium">{providerAddress?.townCity || "Not set"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Province</p>
                      <p className="font-medium">{providerAddress?.province || "Not set"}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-amber-500" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-b pb-4">
                      <p className="text-xs text-amber-600 font-medium mb-2">PRIMARY CONTACT</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p className="font-medium">{primaryContact ? `${primaryContact.firstNames} ${primaryContact.surname}` : "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Position</p>
                          <p className="font-medium">{primaryContact?.position || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium">{primaryContact?.phoneNumber || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{primaryContact?.email || "Not set"}</p>
                        </div>
                      </div>
                    </div>
                    {secondaryContact && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-2">SECONDARY CONTACT</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Name</p>
                            <p className="font-medium">{`${secondaryContact.firstNames} ${secondaryContact.surname}`}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium">{secondaryContact.phoneNumber}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tax & B-BBEE */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-500" />
                      Tax & B-BBEE Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Tax Number</p>
                        <p className="font-medium">{providerStatus?.taxReferenceNumber || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">VAT Number</p>
                        <p className="font-medium">{providerStatus?.vatNumber || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">B-BBEE Level</p>
                        <p className="font-medium">{providerStatus?.bbbeeLevel ? `Level ${providerStatus.bbbeeLevel}` : "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">B-BBEE Expiry</p>
                        <p className="font-medium">{providerStatus?.bbbeeCertificateExpiry || "Not set"}</p>
                      </div>
                    </div>
                    {(providerStatus?.blackOwnershipPercentage || providerStatus?.blackWomenOwnershipPercentage) && (
                      <div className="border-t pt-4">
                        <p className="text-xs text-gray-500 font-medium mb-2">OWNERSHIP BREAKDOWN</p>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-lg font-semibold">{providerStatus?.blackOwnershipPercentage || 0}%</p>
                            <p className="text-xs text-gray-500">Black</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-lg font-semibold">{providerStatus?.blackWomenOwnershipPercentage || 0}%</p>
                            <p className="text-xs text-gray-500">Women</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-lg font-semibold">{providerStatus?.blackYouthOwnershipPercentage || 0}%</p>
                            <p className="text-xs text-gray-500">Youth</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-lg font-semibold">{providerStatus?.disabledPersonOwnershipPercentage || 0}%</p>
                            <p className="text-xs text-gray-500">Disability</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bank Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-500" />
                      Bank Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Bank Name</p>
                        <p className="font-medium">{providerStatus?.bankName || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Account Type</p>
                        <p className="font-medium">{providerStatus?.accountType || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Account Number</p>
                        <p className="font-medium">{providerStatus?.accountNumber ? `****${providerStatus.accountNumber.slice(-4)}` : "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Branch Code</p>
                        <p className="font-medium">{providerStatus?.branchCode || "Not set"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Account Holder</p>
                        <p className="font-medium">{providerStatus?.accountHolder || "Not set"}</p>
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
