"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";
import {
  Ticket as TicketIcon,
  ArrowLeft,
  Clock,
  User,
  Send,
  Paperclip,
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Ticket, 
  TicketUpdate,
  TicketAttachment,
} from "@/lib/schema";
import { 
  getTicketWithUpdates,
  createTicketUpdate,
  updateTicketDataverseId,
  deleteTicket,
  generateId,
} from "@/lib/db";
import { RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

function TicketDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const ticketId = params.id as string;
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [updates, setUpdates] = useState<TicketUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const isAdmin = user?.email === "shampene@lebonconsulting.co.za" || (user?.roleCode && user.roleCode >= 3);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTicket = async () => {
    try {
      console.log("Fetching ticket:", ticketId, "User:", user?.uid || user?.userId);
      const ticketWithUpdates = await getTicketWithUpdates(ticketId);
      if (ticketWithUpdates) {
        setTicket(ticketWithUpdates);
        setUpdates(ticketWithUpdates.updates || []);
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
      toast.error("Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to be ready before fetching
    const uid = user?.uid || user?.userId;
    if (ticketId && uid) {
      fetchTicket();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, user?.uid, user?.userId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Resolved":
      case "Closed":
        return <Badge className="bg-green-500">{status}</Badge>;
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
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const handleSyncToDataverse = async () => {
    if (!ticket) return;
    
    setSyncing(true);
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.ticketId,
          subject: ticket.subject,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          submittedBy: ticket.submittedBy,
          submittedByEmail: ticket.submittedByEmail,
          submittedByName: ticket.submittedByName,
          providerId: ticket.providerId || "",
          providerName: ticket.providerName || "",
          attachmentUrls: ticket.attachments?.map(a => a.fileUrl) || [],
          createdAt: ticket.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.dataverseId) {
          await updateTicketDataverseId(ticket.ticketId, data.dataverseId);
          toast.success(`Synced to Dataverse! ID: ${data.dataverseId}`);
          fetchTicket(); // Refresh to show synced status
        } else {
          toast.success(data.message || "Sync request sent");
        }
      } else {
        toast.error(data.error || "Failed to sync to Dataverse");
      }
    } catch (error) {
      console.error("Error syncing to Dataverse:", error);
      toast.error("Failed to sync to Dataverse");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticket || !isAdmin) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete this ticket?\n\nSubject: ${ticket.subject}\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setDeleting(true);
    try {
      await deleteTicket(ticket.ticketId);
      toast.success("Ticket deleted successfully");
      router.push("/tickets");
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error("Failed to delete ticket");
    } finally {
      setDeleting(false);
    }
  };

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

  const uploadAttachments = async (): Promise<TicketAttachment[]> => {
    if (!storage || attachments.length === 0) return [];
    
    const uploadedAttachments: TicketAttachment[] = [];
    
    for (const file of attachments) {
      const fileRef = ref(storage, `tickets/${ticketId}/updates/${Date.now()}_${file.name}`);
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

  const handleSubmitUpdate = async () => {
    if (!newMessage.trim() && attachments.length === 0) {
      toast.error("Please enter a message or attach a file");
      return;
    }

    const uid = user?.userId || user?.uid;
    if (!uid) {
      toast.error("User not authenticated");
      return;
    }

    setSubmitting(true);
    try {
      const uploadedAttachments = await uploadAttachments();

      const update: TicketUpdate = {
        updateId: generateId(),
        ticketId,
        message: newMessage.trim(),
        isInternal: false,
        attachments: uploadedAttachments,
        authorId: uid,
        authorEmail: user?.email || "",
        authorName: `${user?.firstNames || user?.firstName || ""} ${user?.surname || user?.lastName || ""}`.trim() || user?.email || "",
        authorRole: isAdmin ? "admin" : "user",
        createdAt: Timestamp.now(),
      };

      await createTicketUpdate(update);
      
      toast.success("Reply sent successfully");
      setNewMessage("");
      setAttachments([]);
      fetchTicket();
    } catch (error) {
      console.error("Error submitting update:", error);
      toast.error("Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "-";
    return new Date(timestamp.toDate()).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <Sidebar userType="provider" />
          <main className="flex-1 p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          </main>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <Sidebar userType="provider" />
          <main className="flex-1 p-8">
            <div className="text-center py-16">
              <TicketIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ticket not found</h3>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/tickets">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Tickets
                </Link>
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />

      <div className="flex flex-1">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Back Button */}
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/tickets">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tickets
            </Link>
          </Button>

          {/* Ticket Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-gray-500">
                      #{ticket.ticketId.slice(0, 8).toUpperCase()}
                    </span>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.subject}</h1>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {ticket.submittedByName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(ticket.createdAt)}
                    </span>
                    <Badge variant="outline">{ticket.category}</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {ticket.dataverseId ? (
                    <div className="text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Synced to CRM
                      </span>
                      <span className="text-xs text-gray-400 mt-1 block">
                        ID: {ticket.dataverseId.slice(0, 12)}...
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncToDataverse}
                      disabled={syncing}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Sync to Dataverse
                        </>
                      )}
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteTicket}
                      disabled={deleting}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Ticket
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Original Description */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              
              {/* Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments</h4>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((att) => (
                      <a
                        key={att.attachmentId}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        {att.mimeType.startsWith("image/") ? (
                          <ImageIcon className="w-4 h-4 text-blue-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm truncate max-w-[150px]">{att.fileName}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Updates/Replies */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Updates ({updates.length})
              </h3>
              
              {updates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No updates yet</p>
              ) : (
                <div className="space-y-4">
                  {updates.map((update) => (
                    <div
                      key={update.updateId}
                      className={`p-4 rounded-lg ${
                        update.authorRole === "admin" 
                          ? "bg-purple-50 border-l-4 border-purple-500" 
                          : update.authorRole === "support"
                          ? "bg-emerald-50 border-l-4 border-emerald-500"
                          : "bg-slate-50 border-l-4 border-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{update.authorName}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              update.authorRole === "admin" 
                                ? "border-purple-500 text-purple-700 bg-purple-100" 
                                : update.authorRole === "support"
                                ? "border-emerald-500 text-emerald-700"
                                : ""
                            }`}
                          >
                            {update.authorRole === "admin" ? "Admin" : update.authorRole === "support" ? "Support" : "You"}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(update.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{update.message}</p>
                      
                      {update.attachments && update.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {update.attachments.map((att) => (
                            <a
                              key={att.attachmentId}
                              href={att.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1 bg-white rounded border text-sm hover:bg-gray-50"
                            >
                              {att.mimeType.startsWith("image/") ? (
                                <ImageIcon className="w-3 h-3 text-blue-500" />
                              ) : (
                                <FileText className="w-3 h-3 text-red-500" />
                              )}
                              <span className="truncate max-w-[100px]">{att.fileName}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reply Form or Closed Ticket Warning */}
          {(ticket.status === "Resolved" || ticket.status === "Closed") ? (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-800 mb-1">This ticket is {ticket.status.toLowerCase()}</h3>
                    <p className="text-amber-700 text-sm">
                      Replies are disabled for resolved tickets. If you have a new issue, please{" "}
                      <Link href="/tickets" className="font-medium underline hover:text-amber-900">
                        open a new ticket
                      </Link>
                      . If you feel your current issue is not resolved, please contact support.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Add Reply</h3>
                
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={4}
                  className="mb-4"
                />

                {/* File Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    Attach Files
                  </Button>

                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-sm"
                    >
                      {file.type.startsWith("image/") ? (
                        <ImageIcon className="w-3 h-3 text-blue-500" />
                      ) : (
                        <FileText className="w-3 h-3 text-red-500" />
                      )}
                      <span className="truncate max-w-[100px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="p-0.5 hover:bg-slate-200 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitUpdate}
                    disabled={submitting || (!newMessage.trim() && attachments.length === 0)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Reply
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}

export default function TicketDetailPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider", "student"]}>
      <TicketDetailContent />
    </ProtectedRoute>
  );
}
