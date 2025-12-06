"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardHeader } from "@/components/DashboardHeader";
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
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalStudents: 0,
    occupancyRate: 0,
    pendingInvoices: 0,
    openTickets: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.uid || !db) return;

      try {
        // Fetch properties count
        const propertiesQuery = query(
          collection(db, "properties"),
          where("providerId", "==", user.uid)
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
          where("providerId", "==", user.uid),
          where("status", "==", "submitted")
        );
        const invoicesSnap = await getDocs(invoicesQuery);

        // Fetch open tickets
        const ticketsQuery = query(
          collection(db, "tickets"),
          where("userId", "==", user.uid),
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
  }, [user?.uid]);

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
                Welcome, {user?.companyName || `${user?.firstName} ${user?.lastName}`}
              </h1>
              <div className="flex flex-wrap gap-6 text-sm opacity-90">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  {user?.city || "Location not set"}, {user?.province || ""}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-500" />
                  {user?.email}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Member since {user?.createdAt ? new Date(user.createdAt.toDate()).getFullYear() : "2024"}
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
              </TabsList>
            </Card>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
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
                  {stats.totalProperties === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
                      <p className="text-gray-500 mb-4">Add your first property to get started</p>
                      <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                        <Link href="/properties/add">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Property
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
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500">
                            Loading properties...
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
          </Tabs>
        </main>
      </div>
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
