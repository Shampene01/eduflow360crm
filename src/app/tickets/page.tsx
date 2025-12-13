"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";
import {
  Ticket as TicketIcon,
  Plus,
  Search,
  Filter,
  Eye,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  Loader2,
  Paperclip,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Ticket, 
  TicketCategory, 
  TicketPriority, 
  TicketAttachment,
} from "@/lib/schema";
import { 
  createTicket, 
  getTicketsByProvider, 
  getTicketsByUser,
  updateTicketDataverseId,
  generateId,
} from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "Technical Issue", label: "Technical Issue" },
  { value: "Billing", label: "Billing" },
  { value: "Property", label: "Property" },
  { value: "Student", label: "Student" },
  { value: "Account", label: "Account" },
  { value: "Feature Request", label: "Feature Request" },
  { value: "Other", label: "Other" },
];

const PRIORITIES: { value: TicketPriority; label: string; color: string }[] = [
  { value: "Low", label: "Low", color: "bg-gray-500" },
  { value: "Medium", label: "Medium", color: "bg-yellow-500" },
  { value: "High", label: "High", color: "bg-orange-500" },
  { value: "Critical", label: "Critical", color: "bg-red-500" },
];

function TicketsContent() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Create ticket dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    category: "" as TicketCategory | "",
    priority: "Medium" as TicketPriority,
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTickets = async (showLoading = true) => {
    const uid = user?.userId || user?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    
    try {
      // Fetch tickets for this user
      const ticketsData = await getTicketsByUser(uid);
      console.log("Fetched tickets:", ticketsData.length, ticketsData);
      setTickets(ticketsData);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, user?.uid]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Resolved":
      case "Closed":
        return <Badge className="bg-green-500">Resolved</Badge>;
      case "In Progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "Open":
        return <Badge className="bg-yellow-500 text-gray-900">Open</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "High":
        return <Badge className="bg-orange-500">High</Badge>;
      case "Medium":
        return <Badge className="bg-yellow-500 text-gray-900">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  // File upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).filter(f => 
        f.type.startsWith("image/") || f.type === "application/pdf"
      );
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTicketForm({
      subject: "",
      description: "",
      category: "",
      priority: "Medium",
    });
    setAttachments([]);
  };

  // Upload files to Firebase Storage
  const uploadAttachments = async (ticketId: string): Promise<TicketAttachment[]> => {
    if (!storage || attachments.length === 0) return [];
    
    const uploadedAttachments: TicketAttachment[] = [];
    
    for (const file of attachments) {
      const fileRef = ref(storage, `tickets/${ticketId}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      uploadedAttachments.push({
        attachmentId: generateId(),
        fileName: file.name,
        fileUrl: url,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: Timestamp.now(),
      });
    }
    
    return uploadedAttachments;
  };

  // Submit ticket
  const handleSubmitTicket = async () => {
    if (!ticketForm.subject || !ticketForm.description || !ticketForm.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    const uid = user?.userId || user?.uid;
    if (!uid) {
      toast.error("User not authenticated");
      return;
    }

    setSubmitting(true);
    try {
      const ticketId = generateId();
      
      // Upload attachments first
      setUploadingFiles(true);
      const uploadedAttachments = await uploadAttachments(ticketId);
      setUploadingFiles(false);

      // Create ticket in Firestore
      const ticket: Ticket = {
        ticketId,
        subject: ticketForm.subject,
        description: ticketForm.description,
        category: ticketForm.category as TicketCategory,
        priority: ticketForm.priority,
        status: "Open",
        attachments: uploadedAttachments,
        submittedBy: uid,
        submittedByEmail: user?.email || "",
        submittedByName: `${user?.firstNames || user?.firstName || ""} ${user?.surname || user?.lastName || ""}`.trim() || user?.email || "",
        createdAt: Timestamp.now(),
      };

      await createTicket(ticket);

      // Submit to Dataverse
      try {
        const response = await fetch("/api/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId,
            subject: ticket.subject,
            description: ticket.description,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            submittedBy: ticket.submittedBy,
            submittedByEmail: ticket.submittedByEmail,
            submittedByName: ticket.submittedByName,
            attachmentUrls: uploadedAttachments.map(a => a.fileUrl),
            createdAt: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.dataverseId) {
            await updateTicketDataverseId(ticketId, data.dataverseId);
          }
        }
      } catch (syncError) {
        console.error("Error syncing ticket to Dataverse:", syncError);
      }

      toast.success("Ticket submitted successfully!");
      setIsCreateDialogOpen(false);
      resetForm();
      // Refresh the tickets list
      await fetchTickets(false);
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Failed to create ticket");
    } finally {
      setSubmitting(false);
      setUploadingFiles(false);
    }
  };

  const openTickets = tickets.filter((t) => t.status === "Open" || t.status === "In Progress");
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed");

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
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-slate-700 hover:bg-slate-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Ticket
            </Button>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TicketIcon className="w-5 h-5 text-blue-600" />
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
                      {tickets.filter((t) => t.priority === "Critical" || t.priority === "High").length}
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
                  <TicketIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No tickets yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Create a ticket if you need assistance
                  </p>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-slate-700 hover:bg-slate-800"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Ticket
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
                      <TableRow key={ticket.ticketId}>
                        <TableCell className="font-medium font-mono text-xs">
                          {ticket.ticketId.slice(0, 8).toUpperCase()}
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
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/tickets/${ticket.ticketId}`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/tickets/${ticket.ticketId}`}>
                                <MessageSquare className="w-4 h-4" />
                              </Link>
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

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 text-white rounded-t-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-xl">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <TicketIcon className="w-5 h-5" />
                </div>
                Create Support Ticket
              </DialogTitle>
              <DialogDescription className="text-slate-300 mt-2">
                Describe your issue and we&apos;ll get back to you as soon as possible
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            {/* Subject */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Subject *</Label>
              <Input
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                placeholder="Brief summary of your issue"
                className="h-11"
              />
            </div>

            {/* Category & Priority */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Category *</Label>
                <Select
                  value={ticketForm.category}
                  onValueChange={(v) => setTicketForm({ ...ticketForm, category: v as TicketCategory })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Priority</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v as TicketPriority })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.color}`} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Description *</Label>
              <Textarea
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, etc."
                rows={5}
                className="resize-none"
              />
            </div>

            {/* Attachments */}
            <div className="space-y-3">
              <Label className="text-gray-700 font-medium">Attachments</Label>
              <p className="text-sm text-gray-500">Upload screenshots or files to help explain your issue (images, PDFs)</p>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-dashed border-2 h-20 hover:bg-slate-50"
              >
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Click to upload files</span>
                </div>
              </Button>

              {/* Attachment Preview */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="relative p-3 bg-slate-50 rounded-lg border flex items-center gap-2"
                    >
                      {file.type.startsWith("image/") ? (
                        <ImageIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitTicket}
                disabled={submitting || !ticketForm.subject || !ticketForm.description || !ticketForm.category}
                className="bg-emerald-600 hover:bg-emerald-700 px-8"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadingFiles ? "Uploading..." : "Submitting..."}
                  </>
                ) : (
                  <>
                    <Paperclip className="w-4 h-4 mr-2" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
