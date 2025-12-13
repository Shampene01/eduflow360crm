"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FileText,
  MapPin,
  Users,
  CreditCard,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  HelpCircle,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    num: 1,
    title: "Company Information",
    icon: Building2,
    description: "Basic details about your business entity",
    required: [
      "Registered Company Name",
      "Legal Form (Pty Ltd, CC, Sole Proprietor, etc.)",
      "Company Registration Number (CIPC) - Sole Proprietors can use ID Number",
    ],
    optional: [
      "Trading Name (if different from registered name)",
      "Years in Operation",
    ],
  },
  {
    num: 2,
    title: "Tax & B-BBEE Information",
    icon: FileText,
    description: "Tax compliance and empowerment credentials",
    required: [
      "Tax Reference Number",
      "B-BBEE Level (1-8)",
      "B-BBEE Certificate Expiry Date",
      "Black Ownership Percentage",
      "Black Youth Ownership Percentage",
      "Black Women Ownership Percentage",
      "Disabled Person Ownership Percentage",
    ],
    optional: [
      "VAT Registration Status & Number",
    ],
  },
  {
    num: 3,
    title: "Business Location",
    icon: MapPin,
    description: "Physical address of your business headquarters",
    required: [
      "Street Address",
      "Suburb",
      "Town/City",
      "Province",
    ],
    optional: [
      "Postal Code",
    ],
  },
  {
    num: 4,
    title: "Contact Persons",
    icon: Users,
    description: "Key people we can contact regarding your application",
    required: [
      "Primary Contact Full Name",
      "Primary Contact Phone Number",
      "Primary Contact Email Address",
    ],
    optional: [
      "Primary Contact Position/Title",
      "Primary Contact ID Number",
      "Secondary Contact Details (Name, Phone, Email)",
    ],
  },
  {
    num: 5,
    title: "Banking Details",
    icon: CreditCard,
    description: "Bank account for receiving payments",
    required: [
      "Bank Name",
      "Account Type (Current/Savings/Transmission)",
      "Account Number",
      "Branch Code",
      "Account Holder Name",
    ],
    optional: [],
  },
  {
    num: 6,
    title: "Supporting Documents",
    icon: FolderOpen,
    description: "Documents to verify your business and identity",
    required: [
      "ID Document (Director/Owner)",
      "CIPC Registration Certificate (Sole Proprietors can upload ID)",
      "Proof of Address (Utility bill, Bank statement - not older than 3 months)",
      "Bank Confirmation Letter",
      "B-BBEE Certificate or Sworn Affidavit",
    ],
    optional: [],
  },
];

const documentChecklist = [
  {
    name: "ID Document",
    description: "Certified copy of the director/owner's South African ID or passport",
    format: "PDF, JPG, PNG (max 5MB)",
    required: true,
  },
  {
    name: "CIPC Registration Certificate",
    description: "Company registration document from CIPC showing company name and registration number",
    format: "PDF (max 5MB)",
    required: true,
  },
  {
    name: "Proof of Address",
    description: "Recent utility bill, bank statement, or municipal account (not older than 3 months)",
    format: "PDF, JPG, PNG (max 5MB)",
    required: true,
  },
  {
    name: "Bank Confirmation Letter",
    description: "Letter from your bank confirming account details and account holder name",
    format: "PDF (max 5MB)",
    required: true,
  },
  {
    name: "B-BBEE Certificate",
    description: "Valid B-BBEE certificate or sworn affidavit",
    format: "PDF (max 5MB)",
    required: true,
  },
];

function ProviderGuidelinesContent() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />

      <div className="flex">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Important Notice Banner */}
          <Card className="mb-6 border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Before You Apply
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300">
                    Please familiarize yourself with the following registration requirements and ensure you have 
                    all necessary documents ready before proceeding with your application. This will help ensure 
                    a smooth and efficient registration process.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hero Section */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-8 mb-8 relative overflow-hidden">
            <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="relative z-10 text-white max-w-3xl">
              <h1 className="text-3xl font-bold mb-4">
                Accommodation Provider Registration Guide
              </h1>
              <p className="text-lg opacity-90 mb-6">
                Welcome to Eduflow360! This guide will help you prepare everything you need 
                to register as an Accommodation Provider and start listing your properties 
                for student accommodation.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span>~15 minutes to complete</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <span>6 steps</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
                  <Shield className="w-5 h-5 text-amber-500" />
                  <span>Secure & Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Steps */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Registration Steps Overview
          </h2>
          
          <div className="grid gap-6 mb-8">
            {steps.map((step) => (
              <Card key={step.num} className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 font-bold">
                      {step.num}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <step.icon className="w-5 h-5 text-amber-500" />
                        <CardTitle className="text-lg">{step.title}</CardTitle>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid md:grid-cols-2 gap-6 pl-14">
                    {step.required.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        </h4>
                        <ul className="space-y-2">
                          {step.required.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                              <CheckCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {step.optional.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        </h4>
                        <ul className="space-y-2">
                          {step.optional.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                              <CheckCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Document Checklist */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Document Checklist
          </h2>
          
          <Card className="mb-8 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-500" />
                Documents You&apos;ll Need
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documentChecklist.map((doc, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      doc.required
                        ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                        : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {doc.name}
                          </h4>
                          {doc.required ? (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Optional</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {doc.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Accepted formats: {doc.format}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {doc.required ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Important Information
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Processing Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Your application will be reviewed within <strong>2-5 business days</strong>. 
                  You&apos;ll receive an email notification once your application has been 
                  approved or if additional information is required.
                </p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-amber-500" />
                  Verification Process
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  All submitted documents will be verified for authenticity. 
                  Ensure all documents are clear, legible, and not expired. 
                  Providing false information may result in application rejection.
                </p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="w-5 h-5 text-amber-500" />
                  After Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Once approved, you&apos;ll gain access to the Provider Dashboard where you can 
                  add properties, manage student assignments, and track your accommodation 
                  business performance.
                </p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HelpCircle className="w-5 h-5 text-amber-500" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  If you have questions or need assistance with your application, 
                  please contact our support team at{" "}
                  <a href="mailto:support@eduflow360.co.za" className="text-amber-600 hover:underline">
                    support@eduflow360.co.za
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Final CTA */}
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Ready to Register?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
                Make sure you have all the required documents ready before starting. 
                The registration process takes approximately 15 minutes to complete.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Link href="/provider-application">
                    Start Registration
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/dashboard">
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

export default function ProviderGuidelinesPage() {
  return (
    <ProtectedRoute>
      <ProviderGuidelinesContent />
    </ProtectedRoute>
  );
}
