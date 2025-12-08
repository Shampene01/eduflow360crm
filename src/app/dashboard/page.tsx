"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  GraduationCap,
  CheckCircle,
  BarChart3,
  Search,
  FileText,
  Upload,
  MessageSquare,
  Calendar,
  HandCoins,
  Headset,
  Building2,
  ArrowRight,
  Clock,
  Shield,
  RefreshCw,
  Database,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getProviderByUserId } from "@/lib/db";
import { AccommodationProvider } from "@/lib/schema";
import { syncUserToCRM } from "@/lib/crmSync";
import { toast } from "sonner";

function formatDate(timestamp: Timestamp | Date | undefined): string {
  if (!timestamp) return "N/A";
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const yearMap: Record<string, string> = {
  "1": "First Year",
  "2": "Second Year",
  "3": "Third Year",
  "4": "Fourth Year",
  "5+": "Fifth Year+",
};

function DashboardContent() {
  const { user, isFullyLoaded, profileLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [providerStatus, setProviderStatus] = useState<AccommodationProvider | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Handle refresh and sync to CRM
  const handleRefreshAndSync = async () => {
    if (!user) return;
    
    setSyncing(true);
    try {
      // First refresh from Firestore
      await refreshUser();
      
      // Then sync to CRM
      const userId = user.userId || user.uid;
      if (userId && user.email && user.firstNames && user.surname) {
        const result = await syncUserToCRM(
          {
            userId,
            email: user.email,
            firstNames: user.firstNames,
            surname: user.surname,
            phoneNumber: user.phoneNumber,
            idNumber: user.idNumber,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            address: user.address,
            role: user.role,
            isActive: user.isActive,
          },
          "manual_sync"
        );
        
        if (result.success) {
          toast.success("Profile synced successfully");
        } else {
          toast.error(result.message || "Sync failed");
        }
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync profile");
    } finally {
      setSyncing(false);
    }
  };

  // Log dashboard rendering state
  useEffect(() => {
    console.log("🟣 Dashboard: Component state", {
      isFullyLoaded,
      profileLoading,
      hasUser: !!user,
      loadingProvider,
      userEmail: user?.email,
      userFirstNames: user?.firstNames
    });
  }, [isFullyLoaded, profileLoading, user, loadingProvider]);

  // Check if user has a provider application
  // This hook must be called unconditionally (before any early returns)
  useEffect(() => {
    const checkProviderStatus = async () => {
      const uid = user?.userId || user?.uid;
      console.log("🟣 Dashboard: Checking provider status", {
        hasUser: !!user,
        userId: user?.userId,
        uid: user?.uid,
        computedUid: uid,
        userKeys: user ? Object.keys(user).slice(0, 10) : []
      });
      if (!uid) {
        console.log("🔴 Dashboard: NO UID FOUND - This is the problem!");
        setLoadingProvider(false);
        return;
      }
      try {
        console.log("🟣 Dashboard: Fetching provider data");
        const provider = await getProviderByUserId(uid);
        console.log("🟣 Dashboard: Provider data fetched", { hasProvider: !!provider, status: provider?.approvalStatus });
        setProviderStatus(provider);
      } catch (err) {
        console.error("🔴 Dashboard: Error checking provider status:", err);
      } finally {
        console.log("🟣 Dashboard: Setting loadingProvider to false");
        setLoadingProvider(false);
      }
    };
    checkProviderStatus();
  }, [user?.userId, user?.uid]);

  // Show loading skeleton if user data or provider data is not yet available
  // This must come AFTER all hooks to comply with React rules
  const shouldShowLoading = !isFullyLoaded || profileLoading || !user || loadingProvider;
  console.log("🟣 Dashboard: Should show loading?", shouldShowLoading, {
    isFullyLoaded,
    profileLoading,
    hasUser: !!user,
    loadingProvider
  });

  if (shouldShowLoading) {
    console.log("🟡 Dashboard: Showing loading skeleton");

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader />
        <div className="flex">
          <Sidebar userType="provider" />
          <main className="flex-1 p-8 overflow-y-auto">
            {/* Loading skeleton */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-8 mb-8 animate-pulse">
              <div className="h-8 bg-gray-700 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  console.log("🟢 Dashboard: Rendering actual dashboard content with user data", {
    userEmail: user?.email,
    userFirstNames: user?.firstNames,
    hasAddress: !!user?.address
  });

  // Check if user has provider role or application
  const hasProviderRole = user?.roles?.includes("provider") || user?.userType === "provider";
  const isApprovedProvider = providerStatus?.approvalStatus === "Approved";

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    if (!user) return 0;
    let completion = 0;

    // Check required fields (5 fields = 90%)
    const requiredFields = ['firstNames', 'surname', 'email', 'phoneNumber', 'idNumber'];
    const filledFields = requiredFields.filter(field => {
      const value = user[field as keyof typeof user];
      return value !== null && value !== undefined && value !== '';
    });

    completion = (filledFields.length / requiredFields.length) * 75; // 5 fields = 75%

    // Address adds 15%
    if (user.address && user.address.street && user.address.townCity && user.address.province) {
      completion += 15;
    }

    // Profile photo adds 10%
    if (user.profilePhotoUrl) {
      completion += 10;
    }

    return Math.round(completion);
  };

  // Calculate document upload percentage
  const calculateDocumentUpload = () => {
    // Check if ID document is uploaded
    if (user?.idDocumentUrl) {
      return 100;
    }
    return 0;
  };

  // Calculate application progress
  const calculateApplicationProgress = () => {
    if (!providerStatus) return 0; // No application yet

    if (providerStatus.approvalStatus === "Approved") {
      // Check if provider has added at least one property
      // For now, return 100% after approval
      // You can add property count check here
      return 100;
    }

    if (providerStatus.approvalStatus === "Pending") {
      return 70; // Application submitted, awaiting approval
    }

    if (providerStatus.approvalStatus === "Rejected") {
      return 0; // Rejected, needs to reapply
    }

    return 0;
  };

  const profileCompletion = calculateProfileCompletion();
  const documentUpload = calculateDocumentUpload();
  const applicationProgress = calculateApplicationProgress();

  const quickActions = [
    { icon: Building2, title: "Apply as Provider", description: "Register your accommodation business", href: "/provider-application" },
    { icon: BarChart3, title: "View Progress", description: "Track your application status", href: "/dashboard" },
    { icon: FileText, title: "Documentation", description: "View required documents", href: "/dashboard" },
    { icon: MessageSquare, title: "Get Support", description: "Create a support ticket", href: "/tickets/create" },
  ];

  const supportTeam = [
    { icon: User, name: "Housing Advisor", role: "Available for consultation" },
    { icon: HandCoins, name: "Financial Aid Officer", role: "Financial assistance guidance" },
    { icon: Headset, name: "Student Services", role: "General support and guidance" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />

      <div className="flex">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute -top-1/2 -right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h1 className="text-2xl font-bold text-white mb-2">
                Welcome back, {user?.firstNames || user?.firstName || "User"}! 👋
              </h1>
              <p className="text-white/90">
                Manage your accommodation services with EduFlow360.
              </p>
            </div>
          </div>

          {/* Provider Application Card */}
          {!loadingProvider && (
            <Card className="mb-8 border-amber-200 dark:border-amber-900 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
              <CardContent className="p-6">
                {!providerStatus ? (
                  // No application yet
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-amber-500 flex items-center justify-center">
                        <Building2 className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Become an Accommodation Provider</h3>
                        <p className="text-gray-600 dark:text-gray-400">Apply to list your properties and host NSFAS students</p>
                      </div>
                    </div>
                    <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                      <Link href="/provider-application">
                        Apply Now <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                ) : providerStatus.approvalStatus === "Pending" ? (
                  // Application pending
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-yellow-500 flex items-center justify-center">
                        <Clock className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Application Under Review</h3>
                        <p className="text-gray-600 dark:text-gray-400">Your provider application is being reviewed by our team</p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 text-sm px-4 py-2">
                      Pending Approval
                    </Badge>
                  </div>
                ) : providerStatus.approvalStatus === "Approved" ? (
                  // Approved provider
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-green-500 flex items-center justify-center">
                        <CheckCircle className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Provider Account Active</h3>
                        <p className="text-gray-600">Access your provider dashboard to manage properties</p>
                      </div>
                    </div>
                    <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                      <Link href="/provider-dashboard">
                        Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  // Rejected
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-red-500 flex items-center justify-center">
                        <Shield className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Application Not Approved</h3>
                        <p className="text-gray-600">{providerStatus.rejectionReason || "Please contact support for more information"}</p>
                      </div>
                    </div>
                    <Button asChild variant="outline">
                      <Link href="/tickets/create">Contact Support</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dashboard Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
            {/* Personal Details */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-amber-600" />
                </div>
                <CardTitle className="text-lg">Personal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Full Name</span>
                  <span className="font-medium">
                    {user ? `${user.firstNames || user.firstName || ""} ${user.surname || user.lastName || ""}`.trim() || "-" : "-"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">ID Number</span>
                  <span className="font-medium">{user?.idNumber || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Date of Birth</span>
                  <span className="font-medium">{user?.dateOfBirth || "-"}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 text-sm">Gender</span>
                  <span className="font-medium">{user?.gender || "-"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Contact Details */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Email</span>
                  <span className="font-medium text-right">{user?.email || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Phone</span>
                  <span className="font-medium">{user?.phoneNumber || user?.phone || "-"}</span>
                </div>
                <div className="py-2">
                  <span className="text-gray-500 text-sm block mb-1">Address</span>
                  {user?.address ? (
                    <span className="font-medium text-sm text-right block">
                      {user.address.street}
                      {user.address.suburb && `, ${user.address.suburb}`}
                      <br />
                      {user.address.townCity}, {user.address.province}
                      {user.address.postalCode && ` ${user.address.postalCode}`}
                    </span>
                  ) : (
                    <span className="font-medium text-sm text-gray-400">Not Added</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Application Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">Application Status</CardTitle>
                </div>
                <button
                  onClick={handleRefreshAndSync}
                  disabled={syncing}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title="Refresh profile and sync to CRM"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 hover:text-amber-500 ${syncing ? 'animate-spin' : ''}`} />
                </button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 text-sm">Current Status</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    ACTIVE
                  </Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 text-sm">DB Sync</span>
                  <span className="font-medium flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    {user?.crmSynced ? "✅ Synced" : "Synced to Firestore"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 text-sm">Account Created</span>
                  <span className="font-medium">{formatDate(user?.createdAt)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 text-sm">Last Login</span>
                  <span className="font-medium">{formatDate(user?.lastLoginAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Progress */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Your Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Profile Completion</span>
                    <span className={`text-sm font-semibold ${profileCompletion === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                      {profileCompletion}%
                    </span>
                  </div>
                  <Progress value={profileCompletion} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Document Upload</span>
                    <span className={`text-sm font-semibold ${documentUpload === 100 ? 'text-green-600' : 'text-gray-600'}`}>
                      {documentUpload}%
                    </span>
                  </div>
                  <Progress value={documentUpload} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Application Progress</span>
                    <span className={`text-sm font-semibold ${applicationProgress === 100 ? 'text-green-600' : applicationProgress > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
                      {applicationProgress}%
                    </span>
                  </div>
                  <Progress value={applicationProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickActions.map((action, i) => (
              <Link key={i} href={action.href}>
                <Card className="cursor-pointer hover:border-amber-500 hover:shadow-md transition-all h-full">
                  <CardContent className="p-6">
                    <action.icon className="w-8 h-8 text-amber-500 mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Support Team */}
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Support Team</h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              {supportTeam.map((member, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white">
                    <member.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{member.name}</h4>
                    <p className="text-sm text-gray-500">{member.role}</p>
                  </div>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
