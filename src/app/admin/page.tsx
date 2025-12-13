"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import {
  Shield,
  Ticket,
  Users,
  Building2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  ChevronRight,
  Filter,
  Search,
  Loader2,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Ticket as TicketType,
  TicketStatus,
  TicketPriority,
} from "@/lib/schema";
import { 
  getAllTickets,
  updateTicket,
  createTicketUpdate,
  generateId,
} from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const SUPER_ADMIN_EMAIL = "shampene@lebonconsulting.co.za";

function AdminPortalContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  
  // Ticket action dialog state
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<TicketStatus>("Open");
  const [newPriority, setNewPriority] = useState<TicketPriority>("Medium");
  const [adminComment, setAdminComment] = useState("");
  const [updating, setUpdating] = useState(false);

  // Check if user is super admin
  useEffect(() => {
    if (user && user.email !== SUPER_ADMIN_EMAIL) {
      toast.error("Access denied. Super admin only.");
      router.push("/dashboard");
    }
  }, [user, router]);

  // Fetch all tickets
  useEffect(() => {
    const fetchTickets = async () => {
      if (user?.email !== SUPER_ADMIN_EMAIL) return;
      
      setLoading(true);
      try {
        const allTickets = await getAllTickets();
        setTickets(allTickets);
      } catch (error) {
        console.error("Error fetching tickets:", error);
        toast.error("Failed to load tickets");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTickets();
  }, [user?.email]);

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "N/A";
    return timestamp.toDate().toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Resolved":
        return <Badge className="bg-green-500">{status}</Badge>;
      case "Closed":
        return <Badge className="bg-gray-500">{status}</Badge>;
      case "In Progress":
        return <Badge className="bg-blue-500">{status}</Badge>;
      case "Open":
        return <Badge className="bg-yellow-500 text-gray-900">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Critical":
        return <Badge variant="destructive">{priority}</Badge>;
      case "High":
        return <Badge className="bg-orange-500">{priority}</Badge>;
      case "Medium":
        return <Badge className="bg-yellow-500 text-gray-900">{priority}</Badge>;
      case "Low":
        return <Badge className="bg-gray-400">{priority}</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const openActionDialog = (ticket: TicketType) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setNewPriority(ticket.priority);
    setAdminComment("");
    setIsActionDialogOpen(true);
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    
    setUpdating(true);
    try {
      // Update ticket status and priority
      const updates: Partial<TicketType> = {};
      
      if (newStatus !== selectedTicket.status) {
        updates.status = newStatus;
        if (newStatus === "Resolved" || newStatus === "Closed") {
          updates.closedAt = Timestamp.now();
          updates.closedBy = user?.uid || user?.userId;
        }
      }
      
      if (newPriority !== selectedTicket.priority) {
        updates.priority = newPriority;
      }
      
      if (Object.keys(updates).length > 0) {
        await updateTicket(selectedTicket.ticketId, updates);
      }
      
      // Add admin comment if provided
      if (adminComment.trim()) {
        await createTicketUpdate({
          updateId: generateId(),
          ticketId: selectedTicket.ticketId,
          message: adminComment,
          isInternal: false,
          attachments: [],
          authorId: user?.uid || user?.userId || "",
          authorName: `${user?.firstNames || user?.firstName || ""} ${user?.surname || user?.lastName || ""}`.trim() || "Admin",
          authorEmail: user?.email || "",
          authorRole: "admin",
          createdAt: Timestamp.now(),
        });
      }
      
      // Refresh tickets list
      const allTickets = await getAllTickets();
      setTickets(allTickets);
      
      toast.success("Ticket updated successfully");
      setIsActionDialogOpen(false);
      setSelectedTicket(null);
      setAdminComment("");
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Failed to update ticket");
    } finally {
      setUpdating(false);
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.submittedByName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Stats
  const openTickets = tickets.filter(t => t.status === "Open").length;
  const inProgressTickets = tickets.filter(t => t.status === "In Progress").length;
  const resolvedTickets = tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;
  const criticalTickets = tickets.filter(t => t.priority === "Critical" && t.status !== "Resolved" && t.status !== "Closed").length;

  if (user?.email !== SUPER_ADMIN_EMAIL) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <DashboardHeader />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-purple-600 rounded-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Portal</h1>
              <p className="text-gray-500">Manage tickets, users, and system settings</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Open Tickets</p>
                    <p className="text-3xl font-bold text-yellow-600">{openTickets}</p>
                  </div>
                  <AlertCircle className="w-10 h-10 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">In Progress</p>
                    <p className="text-3xl font-bold text-blue-600">{inProgressTickets}</p>
                  </div>
                  <Clock className="w-10 h-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Resolved</p>
                    <p className="text-3xl font-bold text-green-600">{resolvedTickets}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Critical</p>
                    <p className="text-3xl font-bold text-red-600">{criticalTickets}</p>
                  </div>
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tickets Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  All Tickets
                </CardTitle>
                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No tickets found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="pb-3 font-medium">Ticket</th>
                        <th className="pb-3 font-medium">Submitted By</th>
                        <th className="pb-3 font-medium">Category</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Priority</th>
                        <th className="pb-3 font-medium">Created</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.map((ticket) => (
                        <tr key={ticket.ticketId} className="border-b hover:bg-gray-50">
                          <td className="py-4">
                            <div>
                              <p className="font-medium text-gray-900">{ticket.subject}</p>
                              <p className="text-sm text-gray-500 font-mono">
                                #{ticket.ticketId.slice(0, 8).toUpperCase()}
                              </p>
                            </div>
                          </td>
                          <td className="py-4">
                            <div>
                              <p className="text-sm font-medium">{ticket.submittedByName}</p>
                              <p className="text-xs text-gray-500">{ticket.submittedByEmail}</p>
                            </div>
                          </td>
                          <td className="py-4">
                            <Badge variant="outline">{ticket.category}</Badge>
                          </td>
                          <td className="py-4">{getStatusBadge(ticket.status)}</td>
                          <td className="py-4">{getPriorityBadge(ticket.priority)}</td>
                          <td className="py-4 text-sm text-gray-500">
                            {formatDate(ticket.createdAt)}
                          </td>
                          <td className="py-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openActionDialog(ticket)}
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Respond
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <Link href={`/tickets/${ticket.ticketId}`}>
                                  <ChevronRight className="w-4 h-4" />
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <DashboardFooter />

      {/* Ticket Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Respond to Ticket</DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{selectedTicket.subject}</p>
                <p className="text-sm text-gray-500 mt-1">{selectedTicket.description}</p>
                <div className="flex gap-2 mt-2">
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
              </div>

              {/* Status Change */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Change Status
                </label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TicketStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Change */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Change Priority
                </label>
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TicketPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Response (visible to ticket owner)
                </label>
                <Textarea
                  placeholder="Type your response here..."
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTicket} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Ticket"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPortalPage() {
  return (
    <ProtectedRoute>
      <AdminPortalContent />
    </ProtectedRoute>
  );
}
