"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Eye,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ticketDisplayId } from "@/lib/utils/maskId";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Ticket as TicketType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function TicketsContent() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchTickets = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid || !db) {
        setLoading(false);
        return;
      }

      try {
        const ticketsQuery = query(
          collection(db, "tickets"),
          where("userId", "==", uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(ticketsQuery);
        const ticketsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TicketType[];
        setTickets(ticketsData);
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user?.userId, user?.uid]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
      case "closed":
        return <Badge className="bg-green-500">Resolved</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "open":
        return <Badge className="bg-yellow-500 text-gray-900">Open</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "high":
        return <Badge className="bg-orange-500">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500 text-gray-900">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress");
  const resolvedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />

      <div className="flex flex-1">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
              <p className="text-gray-500">Get help and track your support requests</p>
            </div>
            <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
              <Link href="/tickets/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Ticket
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
                    <p className="text-sm text-gray-500">Total Tickets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{openTickets.length}</p>
                    <p className="text-sm text-gray-500">Open</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{resolvedTickets.length}</p>
                    <p className="text-sm text-gray-500">Resolved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {tickets.filter((t) => t.priority === "urgent" || t.priority === "high").length}
                    </p>
                    <p className="text-sm text-gray-500">High Priority</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tickets Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-16 text-center">
                  <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No tickets yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Create a ticket if you need assistance
                  </p>
                  <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                    <Link href="/tickets/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Ticket
                    </Link>
                  </Button>
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">
                          {ticketDisplayId(ticket.id)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {ticket.subject}
                        </TableCell>
                        <TableCell className="capitalize">{ticket.category}</TableCell>
                        <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell>
                          {ticket.createdAt
                            ? new Date(ticket.createdAt.toDate()).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}

export default function TicketsPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider", "student"]}>
      <TicketsContent />
    </ProtectedRoute>
  );
}
