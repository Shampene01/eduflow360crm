"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-t-xl px-8 py-8 relative overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="relative z-10 text-center">
            <Image src="/logo-white.webp" alt="EduFlow360" width={160} height={50} className="h-10 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white">Terms of Service</h1>
            <p className="text-gray-400 text-sm mt-1">Last updated: December 2024</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-xl shadow-lg border border-t-0 border-gray-200 p-8">
          <div className="prose prose-gray max-w-none">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-6">
              By accessing and using EduFlow360, you accept and agree to be bound by the terms and provisions of this agreement. 
              If you do not agree to abide by these terms, please do not use this service.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-6">
              EduFlow360 is a student accommodation management platform that connects students with accommodation providers. 
              We facilitate the listing, searching, and management of student housing options.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            <p className="text-gray-600 mb-4">When creating an account, you agree to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">4. User Conduct</h2>
            <p className="text-gray-600 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
              <li>Use the service for any unlawful purpose</li>
              <li>Post false, misleading, or fraudulent content</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with the proper operation of the service</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">5. Accommodation Providers</h2>
            <p className="text-gray-600 mb-6">
              Accommodation providers are responsible for ensuring their listings are accurate and comply with all applicable 
              laws and regulations. EduFlow360 does not guarantee the accuracy of listings and is not responsible for disputes 
              between providers and students.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">6. Limitation of Liability</h2>
            <p className="text-gray-600 mb-6">
              EduFlow360 shall not be liable for any indirect, incidental, special, consequential, or punitive damages 
              resulting from your use of or inability to use the service. Our total liability shall not exceed the amount 
              paid by you, if any, for using the service.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">7. Changes to Terms</h2>
            <p className="text-gray-600 mb-6">
              We reserve the right to modify these terms at any time. We will notify users of significant changes via email 
              or through the platform. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">8. Contact Information</h2>
            <p className="text-gray-600 mb-6">
              For questions about these Terms of Service, please contact us at support@eduflow360.co.za
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link href="/register">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Registration
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
