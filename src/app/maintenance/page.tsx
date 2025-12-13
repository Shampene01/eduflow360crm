"use client";

import { Wrench } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";

function MaintenanceContent() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <Sidebar userType="provider" />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-12 text-center">
                <Wrench className="w-16 h-16 mx-auto text-amber-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Maintenance</h1>
                <p className="text-gray-500 mb-4">
                  Track maintenance requests, work orders, and property upkeep.
                </p>
                <p className="text-sm text-amber-600 font-medium">Coming Soon</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <ProtectedRoute>
      <MaintenanceContent />
    </ProtectedRoute>
  );
}
