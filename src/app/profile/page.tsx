"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit,
  FileText,
  CheckCircle,
  Clock,
  IdCard,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { userDisplayId } from "@/lib/utils/maskId";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

const ADMIN_EMAIL = "shampene@lebonconsulting.co.za";
const FLOW_URL = "https://2009c4ecf752ec149f8257b7de138b.5c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/f85d6f24660241b08ef228c7f808e84f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=yw1CtpEKrA7RTZ8hQgNQh21UUpPkX2aujzKQ24JgrlA";

function ProfileContent() {
  const { user, firebaseUser } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSyncToFirebase = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setSyncResult({ success: false, message: "No authenticated user" });
        return;
      }

      // 1. Read Firestore user document
      const userRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        setSyncResult({ success: false, message: "User document not found" });
        return;
      }

      const data = snap.data();

      // Helper to convert gender string to integer (0 = Male, 1 = Female)
      const getGenderCode = (gender: string | undefined): number => {
        if (!gender) return 0;
        const g = gender.toLowerCase();
        if (g === "female" || g === "f") return 1;
        return 0; // Male or default
      };

      // 2. Build payload (flatten address map) - ensure all types match schema
      const payload: {
        firebaseUserId: string;
        firstNames: string;
        surname: string;
        email: string;
        phoneNumber: string;
        dateOfBirth: string;
        idNumber: string;
        gender: number;
        country: string;
        province: string;
        townCity: string;
        suburb: string;
        street: string;
        postalCode: string;
        role: string;
        marketingConsent: boolean;
        isActive: boolean;
        createdAt: string;
        lastLoginAt: string;
        profilePhotoUrl: string;
      } = {
        firebaseUserId: String(currentUser.uid || ""),
        firstNames: String(data.firstNames || ""),
        surname: String(data.surname || ""),
        email: String(data.email || ""),
        phoneNumber: String(data.phoneNumber || ""),
        dateOfBirth: String(data.dateOfBirth || ""),
        idNumber: String(data.idNumber || ""),
        gender: getGenderCode(data.gender),
        country: String(data.address?.country || ""),
        province: String(data.address?.province || ""),
        townCity: String(data.address?.townCity || ""),
        suburb: String(data.address?.suburb || ""),
        street: String(data.address?.street || ""),
        postalCode: String(data.address?.postalCode || ""),
        role: String(data.role || ""),
        marketingConsent: Boolean(data.marketingConsent === true),
        isActive: Boolean(data.isActive !== false),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : "",
        lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate().toISOString() : "",
        profilePhotoUrl: String(data.profilePhotoUrl || "")
      };

      console.log("Syncing payload to Dataverse:", payload);

      // 3. POST to Power Automate Flow
      try {
        const res = await fetch(FLOW_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          mode: "cors"
        });

        console.log("Response status:", res.status);
        
        if (!res.ok) {
          const text = await res.text();
          console.error("Flow error", res.status, text);
          
          if (res.status === 502) {
            setSyncResult({ 
              success: false, 
              message: "Flow timeout or not responding. Please check if the Power Automate Flow is enabled and try again." 
            });
          } else if (res.status === 401 || res.status === 403) {
            setSyncResult({ 
              success: false, 
              message: "Flow URL may have expired. Please regenerate the Flow URL." 
            });
          } else {
            setSyncResult({ success: false, message: `Failed to sync: ${res.status} - ${text}` });
          }
          return;
        }

        const responseText = await res.text();
        console.log("Flow response:", responseText);
        
        setSyncResult({ success: true, message: "User synced to Dataverse successfully!" });
      } catch (fetchError: any) {
        console.error("Fetch error:", fetchError);
        
        // CORS or network error
        if (fetchError.message?.includes("CORS") || fetchError.message?.includes("NetworkError")) {
          setSyncResult({ 
            success: false, 
            message: "CORS error - the Flow may need to allow cross-origin requests, or use a server-side API route." 
          });
        } else {
          throw fetchError;
        }
      }
      setTimeout(() => setSyncResult(null), 5000);
    } catch (error: any) {
      console.error("Sync error:", error);
      setSyncResult({ success: false, message: error.message || "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "Not set";
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Not set";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <Sidebar userType="provider" />
        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header with Edit Button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-500">View your account information</p>
            </div>
            <div className="flex gap-3">
              {/* Sync to Firebase - Only visible for admin email */}
              {user?.email === ADMIN_EMAIL && (
                <Button
                  onClick={handleSyncToFirebase}
                  disabled={syncing}
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync to Firebase
                    </>
                  )}
                </Button>
              )}
              <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                <Link href="/settings">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
            </div>
          </div>

          {/* Sync Result Message */}
          {syncResult && (
            <div className={`mb-6 p-4 rounded-lg ${
              syncResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}>
              <p className={`text-sm font-medium ${
                syncResult.success ? "text-green-800" : "text-red-800"
              }`}>
                {syncResult.success ? (
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                ) : null}
                {syncResult.message}
              </p>
            </div>
          )}

          {/* Profile Header Card */}
          <Card className="mb-6 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Profile Photo */}
                <div className="relative">
                  {user?.profilePhotoUrl ? (
                    <img
                      src={user.profilePhotoUrl}
                      alt="Profile"
                      className="w-28 h-28 rounded-full object-cover border-4 border-amber-400 shadow-lg"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-gray-900 text-4xl font-bold border-4 border-amber-400 shadow-lg">
                      {user?.firstNames?.charAt(0) || user?.firstName?.charAt(0) || "U"}
                      {user?.surname?.charAt(0) || user?.lastName?.charAt(0) || ""}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-900 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Name and Role */}
                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-bold text-white">
                    {user?.firstNames || user?.firstName || ""} {user?.surname || user?.lastName || ""}
                  </h2>
                  <p className="text-amber-400 font-medium mt-1">
                    {user?.role || user?.userType || "Provider"}
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-gray-300 text-sm">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {user?.email || "No email"}
                    </span>
                    {(user?.phoneNumber || user?.phone) && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {user?.phoneNumber || user?.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-500" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">First Name(s)</p>
                      <p className="font-medium text-gray-900">
                        {user?.firstNames || user?.firstName || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Surname</p>
                      <p className="font-medium text-gray-900">
                        {user?.surname || user?.lastName || "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Email Address</p>
                      <p className="font-medium text-gray-900">{user?.email || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="font-medium text-gray-900">
                        {user?.phoneNumber || user?.phone || "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">ID Number</p>
                      <p className="font-medium text-gray-900">{user?.idNumber || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gender</p>
                      <p className="font-medium text-gray-900">{user?.gender || "Not set"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="font-medium text-gray-900">
                      {user?.dateOfBirth || "Not set"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user?.address ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Street Address</p>
                      <p className="font-medium text-gray-900">{user.address.street || "Not set"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Suburb</p>
                        <p className="font-medium text-gray-900">{user.address.suburb || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">City/Town</p>
                        <p className="font-medium text-gray-900">{user.address.townCity || "Not set"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Province</p>
                        <p className="font-medium text-gray-900">{user.address.province || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Postal Code</p>
                        <p className="font-medium text-gray-900">{user.address.postalCode || "Not set"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Country</p>
                      <p className="font-medium text-gray-900">{user.address.country || "South Africa"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No address information added yet</p>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/settings">
                        <Edit className="w-4 h-4 mr-2" />
                        Add Address
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-500" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Account Status</p>
                      <p className="font-medium text-gray-900">Active</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Role</p>
                      <p className="font-medium text-gray-900">{user?.role || user?.userType || "Provider"}</p>
                    </div>
                    <Badge variant="outline">{user?.role || user?.userType || "Provider"}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Email Verified</p>
                      <p className="font-medium text-gray-900">
                        {firebaseUser?.emailVerified ? "Yes" : "Pending"}
                      </p>
                    </div>
                    {firebaseUser?.emailVerified ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <IdCard className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">ID Document</p>
                        <p className="text-sm text-gray-500">
                          {user?.idDocumentUrl ? "Uploaded" : "Not uploaded"}
                        </p>
                      </div>
                    </div>
                    {user?.idDocumentUrl ? (
                      <a
                        href={user.idDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 hover:underline text-sm font-medium"
                      >
                        View
                      </a>
                    ) : (
                      <Button asChild variant="outline" size="sm">
                        <Link href="/settings">Upload</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Activity */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Account Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Member Since</p>
                  <p className="font-semibold text-gray-900">{formatDate(user?.createdAt)}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Last Updated</p>
                  <p className="font-semibold text-gray-900">{formatDate(user?.updatedAt)}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">User ID</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {userDisplayId(user?.userId || user?.uid)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
