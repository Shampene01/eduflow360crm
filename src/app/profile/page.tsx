"use client";

import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Building2, MapPin } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 ml-0 lg:ml-64">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-500">View and manage your account information</p>
            </div>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-500" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {user?.email || user?.email || "Not set"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Account Type</label>
                      <p className="mt-1 capitalize">{user?.userType || "Provider"}</p>
                    </div>
                  </div>
                  {user?.providerName && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Provider Name</label>
                      <p className="flex items-center gap-2 mt-1">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {user.providerName}
                      </p>
                    </div>
                  )}
                  {user?.primaryContactPhone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="flex items-center gap-2 mt-1">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {user.primaryContactPhone}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {user?.streetAddress && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-amber-500" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{user.streetAddress}</p>
                    <p>{user.suburb}, {user.city}</p>
                    <p>{user.province}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Account Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user?.status === "active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {user?.status || "Pending"}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Accreditation</label>
                      <p className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user?.accreditationStatus === "Approved" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {user?.accreditationStatus || "Pending"}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
