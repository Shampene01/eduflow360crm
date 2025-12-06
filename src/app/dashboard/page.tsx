"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
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
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

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
  const { user } = useAuth();

  const quickActions = [
    { icon: Search, title: "Browse Properties", description: "Explore available accommodations near your campus" },
    { icon: FileText, title: "Submit Application", description: "Apply for housing with financial aid support" },
    { icon: Upload, title: "Upload Documents", description: "Submit required verification documents" },
    { icon: MessageSquare, title: "Get Support", description: "Contact our accommodation advisors" },
  ];

  const supportTeam = [
    { icon: User, name: "Housing Advisor", role: "Available for consultation" },
    { icon: HandCoins, name: "Financial Aid Officer", role: "Financial assistance guidance" },
    { icon: Headset, name: "Student Services", role: "General support and guidance" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <div className="flex">
        <Sidebar userType="student" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute -top-1/2 -right-1/4 w-72 h-72 bg-white/5 rounded-full" />
            <div className="relative z-10">
              <h1 className="text-2xl font-bold text-white mb-2">
                Welcome back, {user?.firstName || "Student"}! 👋
              </h1>
              <p className="text-white/90">
                Ready to find your perfect accommodation? Let&apos;s explore your options.
              </p>
            </div>
          </div>

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
                    {user ? `${user.firstName} ${user.lastName}` : "-"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Student ID</span>
                  <span className="font-medium">{user?.studentId || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Email</span>
                  <span className="font-medium">{user?.email || "-"}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 text-sm">Phone</span>
                  <span className="font-medium">{user?.phone || "-"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Academic Information */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Academic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Institution</span>
                  <span className="font-medium">{user?.institution || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Program</span>
                  <span className="font-medium">{user?.program || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Year of Study</span>
                  <span className="font-medium">
                    {user?.yearOfStudy ? yearMap[user.yearOfStudy] || user.yearOfStudy : "-"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 text-sm">Status</span>
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    {(user?.status || "active").toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Application Status */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-lg">Application Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Current Status</span>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    {(user?.applicationStatus || "pending").toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">CRM Sync</span>
                  <span className="font-medium">
                    {user?.crmSynced ? "✅ Synced" : "⏳ Pending Sync"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
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
                    <span className="text-sm font-semibold text-amber-600">100%</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Document Upload</span>
                    <span className="text-sm font-semibold">0%</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Application Progress</span>
                    <span className="text-sm font-semibold">25%</span>
                  </div>
                  <Progress value={25} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickActions.map((action, i) => (
              <Card
                key={i}
                className="cursor-pointer hover:border-amber-500 hover:shadow-md transition-all"
              >
                <CardContent className="p-6">
                  <action.icon className="w-8 h-8 text-amber-500 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </CardContent>
              </Card>
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
    <ProtectedRoute allowedUserTypes={["student"]}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
