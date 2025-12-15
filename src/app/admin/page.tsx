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
  Search,
  Loader2,
  Megaphone,
  BookOpen,
  UserCog,
  Activity,
  TrendingUp,
  Eye,
  Edit2,
  Wifi,
  WifiOff,
  LayoutDashboard,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Ticket as TicketType,
  TicketStatus,
  TicketPriority,
  User,
} from "@/lib/schema";
import { 
  getAllTickets,
  updateTicket,
  createTicketUpdate,
  generateId,
  getAllUsers,
  updateUserRole,
} from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

// Minimum roleCode required for Admin Portal access
const MIN_ADMIN_ROLE_CODE = 3;

// Role definitions
const ROLES = [
  { code: 0, name: "Student", label: "Student" },
  { code: 1, name: "Manager", label: "Manager" },
  { code: 2, name: "Provider", label: "Provider" },
  { code: 3, name: "Admin", label: "Admin" },
  { code: 4, name: "Supervisor", label: "Supervisor" },
  { code: 5, name: "Registrar", label: "Registrar" },
  { code: 6, name: "Administrator", label: "Administrator" },
];

function AdminPortalContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  
  // Ticket action dialog state
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<TicketStatus>("Open");
  const [newPriority, setNewPriority] = useState<TicketPriority>("Medium");
  const [adminComment, setAdminComment] = useState("");
  const [updating, setUpdating] = useState(false);

  // User role dialog state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState<number>(0);
  const [updatingUser, setUpdatingUser] = useState(false);

  // Announcement state
  const [announcement, setAnnouncement] = useState("");
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  // Check if user has admin access (roleCode >= 3)
  useEffect(() => {
    if (user && (user.roleCode ?? 0) < MIN_ADMIN_ROLE_CODE) {
      toast.error("Access denied. Admin access required.");
      router.push("/dashboard");
    }
  }, [user, router]);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      if ((user?.roleCode ?? 0) < MIN_ADMIN_ROLE_CODE) return;
      
      setLoading(true);
      setUsersLoading(true);
      try {
        const [allTickets, allUsers] = await Promise.all([
          getAllTickets(),
          getAllUsers(),
        ]);
        setTickets(allTickets);
        setUsers(allUsers);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
        setUsersLoading(false);
      }
    };
    
    fetchData();
  }, [user?.roleCode]);

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

  // Handle user role update
  const openUserDialog = (targetUser: User) => {
    setSelectedUser(targetUser);
    setNewRoleCode(targetUser.roleCode || 0);
    setIsUserDialogOpen(true);
  };

  const handleUpdateUserRole = async () => {
    if (!selectedUser) return;
    
    setUpdatingUser(true);
    try {
      const newRole = ROLES.find(r => r.code === newRoleCode)?.name || "Student";
      await updateUserRole(selectedUser.userId, newRole, newRoleCode, user?.roleCode ?? 0);
      
      // Refresh users list
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      
      toast.success("User role updated successfully");
      setIsUserDialogOpen(false);
      setSelectedUser(null);
    } catch (error: unknown) {
      console.error("Error updating user role:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update user role";
      toast.error(errorMessage);
    } finally {
      setUpdatingUser(false);
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

  // Filter users
  const filteredUsers = users.filter(u => {
    if (!userSearchQuery.trim()) return true;
    const term = userSearchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(term) ||
      u.firstNames?.toLowerCase().includes(term) ||
      u.surname?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term)
    );
  });

  // Stats
  const openTickets = tickets.filter(t => t.status === "Open").length;
  const inProgressTickets = tickets.filter(t => t.status === "In Progress").length;
  const resolvedTickets = tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;
  const criticalTickets = tickets.filter(t => t.priority === "Critical" && t.status !== "Resolved" && t.status !== "Closed").length;
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const recentUsers = users.filter(u => {
    if (!u.lastLoginAt) return false;
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return u.lastLoginAt.toDate() > dayAgo;
  }).length;

  const getRoleBadgeColor = (roleCode?: number) => {
    switch (roleCode) {
      case 6: return "bg-purple-600";
      case 5: return "bg-indigo-500";
      case 4: return "bg-blue-600";
      case 3: return "bg-emerald-500";
      case 2: return "bg-amber-500";
      case 1: return "bg-cyan-500";
      default: return "bg-gray-500";
    }
  };

  if ((user?.roleCode ?? 0) < MIN_ADMIN_ROLE_CODE) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardHeader />

      <main className="flex-1 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Admin Portal</h1>
                <p className="text-gray-500 text-sm">SuperAdmin Dashboard • {user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{recentUsers} Online (24h)</span>
              </div>
            </div>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-xs font-medium">Total Users</p>
                    <p className="text-2xl font-bold">{totalUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-emerald-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs font-medium">Active Users</p>
                    <p className="text-2xl font-bold">{activeUsers}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-500 to-amber-500 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-xs font-medium">Open Tickets</p>
                    <p className="text-2xl font-bold">{openTickets}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-yellow-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-100 text-xs font-medium">In Progress</p>
                    <p className="text-2xl font-bold">{inProgressTickets}</p>
                  </div>
                  <Clock className="w-8 h-8 text-cyan-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-xs font-medium">Resolved</p>
                    <p className="text-2xl font-bold">{resolvedTickets}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-xs font-medium">Critical</p>
                    <p className="text-2xl font-bold">{criticalTickets}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border shadow-sm p-1 h-auto flex-wrap">
              <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Ticket className="w-4 h-4" />
                Resolve Tickets
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <UserCog className="w-4 h-4" />
                Manage Users
              </TabsTrigger>
              <TabsTrigger value="announcements" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Megaphone className="w-4 h-4" />
                Post Announcements
              </TabsTrigger>
              <TabsTrigger value="resources" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <BookOpen className="w-4 h-4" />
                Manager Resources
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Activity className="w-5 h-5 text-purple-600" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tickets.slice(0, 5).map((ticket) => (
                        <div key={ticket.ticketId} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`p-2 rounded-full ${ticket.priority === "Critical" ? "bg-red-100" : ticket.priority === "High" ? "bg-orange-100" : "bg-blue-100"}`}>
                            <Ticket className={`w-4 h-4 ${ticket.priority === "Critical" ? "text-red-600" : ticket.priority === "High" ? "text-orange-600" : "text-blue-600"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{ticket.subject}</p>
                            <p className="text-xs text-gray-500">{ticket.submittedByName} • {formatDate(ticket.createdAt)}</p>
                          </div>
                          {getStatusBadge(ticket.status)}
                        </div>
                      ))}
                      {tickets.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No recent activity</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Online Users */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Wifi className="w-5 h-5 text-green-600" />
                      Recently Active Users (24h)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {users.filter(u => {
                        if (!u.lastLoginAt) return false;
                        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                        return u.lastLoginAt.toDate() > dayAgo;
                      }).slice(0, 6).map((u) => (
                        <div key={u.userId} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {u.firstNames?.charAt(0) || "U"}{u.surname?.charAt(0) || ""}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{u.firstNames} {u.surname}</p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <Badge className={getRoleBadgeColor(u.roleCode)}>{u.role || "User"}</Badge>
                          </div>
                        </div>
                      ))}
                      {recentUsers === 0 && (
                        <p className="text-center text-gray-500 py-4">No users active in last 24 hours</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-purple-600" />
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
                        <SelectTrigger className="w-36">
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
                        <SelectTrigger className="w-36">
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
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No tickets found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ticket</TableHead>
                            <TableHead>Submitted By</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTickets.map((ticket) => (
                            <TableRow key={ticket.ticketId} className="hover:bg-gray-50">
                              <TableCell>
                                <div>
                                  <p className="font-medium text-gray-900">{ticket.subject}</p>
                                  <Link href={`/tickets/${ticket.ticketId}`} className="text-sm text-blue-600 hover:underline font-mono">
                                    #{ticket.ticketId.slice(0, 8).toUpperCase()}
                                  </Link>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium">{ticket.submittedByName}</p>
                                  <p className="text-xs text-gray-500">{ticket.submittedByEmail}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{ticket.category}</Badge>
                              </TableCell>
                              <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                              <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {formatDate(ticket.createdAt)}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openActionDialog(ticket)}
                                  >
                                    <MessageSquare className="w-4 h-4 mr-1" />
                                    Respond
                                  </Button>
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/tickets/${ticket.ticketId}`}>
                                      <Eye className="w-4 h-4" />
                                    </Link>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <UserCog className="w-5 h-5 text-purple-600" />
                      Manage Users
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search users by name, email, or role..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="pl-9 w-80"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No users found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Login</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((u) => (
                            <TableRow key={u.userId} className="hover:bg-gray-50">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                    {u.firstNames?.charAt(0) || "U"}{u.surname?.charAt(0) || ""}
                                  </div>
                                  <div>
                                    <p className="font-medium">{u.firstNames} {u.surname}</p>
                                    <p className="text-xs text-gray-500 font-mono">{u.userId.slice(0, 8)}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{u.email}</TableCell>
                              <TableCell>
                                <Badge className={getRoleBadgeColor(u.roleCode)}>
                                  {u.role || "User"} ({u.roleCode ?? 0})
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {u.isActive ? (
                                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openUserDialog(u)}
                                  disabled={(u.roleCode ?? 0) >= 4}
                                >
                                  <Edit2 className="w-4 h-4 mr-1" />
                                  Edit Role
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Announcements Tab */}
            <TabsContent value="announcements">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-purple-600" />
                    Post Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-800 text-sm">
                      <strong>Coming Soon:</strong> Announcements will be broadcast to all users on their dashboard.
                    </p>
                  </div>
                  <Textarea
                    placeholder="Type your announcement here..."
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <Button disabled={!announcement.trim() || postingAnnouncement} className="bg-purple-600 hover:bg-purple-700">
                      <Megaphone className="w-4 h-4 mr-2" />
                      Post Announcement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    Manager Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Coming Soon:</strong> Upload and manage resources for managers and staff.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <Card className="border-dashed border-2 hover:border-purple-400 transition-colors cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <BookOpen className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                        <p className="font-medium text-gray-700">Training Materials</p>
                        <p className="text-sm text-gray-500">Upload training docs</p>
                      </CardContent>
                    </Card>
                    <Card className="border-dashed border-2 hover:border-purple-400 transition-colors cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <Building2 className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                        <p className="font-medium text-gray-700">Policy Documents</p>
                        <p className="text-sm text-gray-500">Company policies</p>
                      </CardContent>
                    </Card>
                    <Card className="border-dashed border-2 hover:border-purple-400 transition-colors cursor-pointer">
                      <CardContent className="p-6 text-center">
                        <TrendingUp className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                        <p className="font-medium text-gray-700">Reports & Analytics</p>
                        <p className="text-sm text-gray-500">View system reports</p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{selectedTicket.subject}</p>
                <p className="text-sm text-gray-500 mt-1">{selectedTicket.description}</p>
                <div className="flex gap-2 mt-2">
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Change Status</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Change Priority</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Response</label>
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
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTicket} disabled={updating} className="bg-purple-600 hover:bg-purple-700">
              {updating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : "Update Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Role Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedUser.firstNames?.charAt(0) || "U"}{selectedUser.surname?.charAt(0) || ""}
                  </div>
                  <div>
                    <p className="font-medium">{selectedUser.firstNames} {selectedUser.surname}</p>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Role</label>
                <Select value={String(newRoleCode)} onValueChange={(v) => setNewRoleCode(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.code} value={String(role.code)}>
                        {role.label} (Code: {role.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-800 text-sm">
                  <strong>Security Note:</strong> Only Admin (roleCode 3+) can modify user roles. Super Admins (roleCode 4) cannot be edited.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUserRole} disabled={updatingUser} className="bg-purple-600 hover:bg-purple-700">
              {updatingUser ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : "Update Role"}
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
