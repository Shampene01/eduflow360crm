"use client";

import { useState, useEffect } from "react";
import { Loader2, Mail, Clock, CheckCircle, XCircle, Ban, MoreHorizontal, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CUSTOM_CLAIM_ROLE_LABELS } from "@/lib/schema";

interface Invitation {
  invitationId: string;
  email: string;
  assignedRole: string;
  assignedRoleCode: number;
  status: "pending" | "accepted" | "expired" | "revoked";
  invitedByName?: string;
  createdAt: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
}

interface StaffInvitationsListProps {
  providerId: string;
  refreshTrigger?: number;
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    variant: "outline" as const,
    className: "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle,
    variant: "outline" as const,
    className: "text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    variant: "outline" as const,
    className: "text-gray-500 border-gray-300 bg-gray-50 dark:bg-gray-800",
  },
  revoked: {
    label: "Revoked",
    icon: Ban,
    variant: "outline" as const,
    className: "text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20",
  },
};

export function StaffInvitationsList({ providerId, refreshTrigger }: StaffInvitationsListProps) {
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState("");

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/staff/invite?providerId=${providerId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch invitations");
      }

      // Check for expired invitations
      const now = new Date();
      const processedInvitations = data.invitations.map((inv: Invitation) => {
        if (inv.status === "pending" && inv.expiresAt) {
          const expiryDate = new Date(inv.expiresAt);
          if (expiryDate < now) {
            return { ...inv, status: "expired" as const };
          }
        }
        return inv;
      });

      // Sort by createdAt descending
      processedInvitations.sort((a: Invitation, b: Invitation) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setInvitations(processedInvitations);
    } catch (err: any) {
      console.error("Error fetching invitations:", err);
      setError(err.message || "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (providerId) {
      fetchInvitations();
    }
  }, [providerId, refreshTrigger]);

  const handleCopyLink = async (token: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const url = `${baseUrl}/accept-invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invitation link copied!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={fetchInvitations} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No invitations sent yet</p>
        <p className="text-sm">Use the &quot;Invite Staff&quot; button to send your first invitation.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => {
            const status = statusConfig[invitation.status];
            const StatusIcon = status.icon;

            return (
              <TableRow key={invitation.invitationId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{invitation.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {CUSTOM_CLAIM_ROLE_LABELS[invitation.assignedRoleCode] || invitation.assignedRole}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant} className={status.className}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {formatTimeAgo(invitation.createdAt)}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {invitation.status === "pending" 
                    ? formatDate(invitation.expiresAt)
                    : "—"
                  }
                </TableCell>
                <TableCell>
                  {invitation.status === "pending" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopyLink((invitation as any).token)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Revoke
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
