"use client";

import { useState } from "react";
import { Loader2, Mail, UserPlus, Copy, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { CUSTOM_CLAIM_ROLES, type CustomClaimRole } from "@/lib/schema";

interface InviteStaffModalProps {
  providerId: string;
  providerName: string;
  trigger?: React.ReactNode;
  onInviteSent?: (email: string, inviteUrl: string) => void;
}

// Roles that can be invited (excluding none and superAdmin)
const INVITABLE_ROLES: { value: CustomClaimRole; label: string; description: string }[] = [
  { 
    value: "providerStaff", 
    label: "Provider Staff", 
    description: "Can register students and manage bookings" 
  },
  { 
    value: "provider", 
    label: "Provider", 
    description: "Full access to provider dashboard and settings" 
  },
];

// Admin-only roles
const ADMIN_ROLES: { value: CustomClaimRole; label: string; description: string }[] = [
  { 
    value: "admin", 
    label: "Admin", 
    description: "Platform administrator access" 
  },
];

export function InviteStaffModal({ 
  providerId, 
  providerName, 
  trigger,
  onInviteSent 
}: InviteStaffModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<CustomClaimRole>("providerStaff");

  // Get user's role code from custom claims or user profile
  const userRoleCode = user?.roleCode ?? 0;

  // Determine which roles this user can invite
  const availableRoles = userRoleCode >= CUSTOM_CLAIM_ROLES.admin 
    ? [...INVITABLE_ROLES, ...ADMIN_ROLES]
    : INVITABLE_ROLES.filter(role => CUSTOM_CLAIM_ROLES[role.value] < userRoleCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setInviteUrl("");

    if (!email) {
      setError("Please enter an email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          assignedRole: selectedRole,
          providerId,
          providerName,
          invitedBy: user?.uid || user?.userId,
          invitedByName: user?.firstNames && user?.surname 
            ? `${user.firstNames} ${user.surname}` 
            : user?.email,
          invitedByEmail: user?.email,
          inviterRoleCode: userRoleCode,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setSuccess(true);
      setInviteUrl(data.inviteUrl);
      onInviteSent?.(email, data.inviteUrl);

    } catch (err: any) {
      console.error("Error sending invitation:", err);
      setError(err.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleReset = () => {
    setEmail("");
    setSelectedRole("providerStaff");
    setError("");
    setSuccess(false);
    setInviteUrl("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when closing
      setTimeout(handleReset, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <UserPlus className="w-4 h-4" />
            Invite Staff
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Staff Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join {providerName} as a staff member.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Invitation created successfully! Share the link below with {email}.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={inviteUrl} 
                  readOnly 
                  className="text-sm font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This link expires in 7 days. The recipient will use it to create their account.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleReset}
              >
                Invite Another
              </Button>
              <Button 
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="staff@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as CustomClaimRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex flex-col">
                        <span>{role.label}</span>
                        <span className="text-xs text-gray-500">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
