"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-t-xl px-8 py-8 relative overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="relative z-10 text-center">
            <Image src="/logo-white.webp" alt="EduFlow360" width={160} height={50} className="h-10 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white">Privacy Policy</h1>
            <p className="text-gray-400 text-sm mt-1">Last updated: October 29, 2024</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-xl shadow-lg border border-t-0 border-gray-200 p-8">
          {/* Company Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-8 text-sm text-gray-600">
            <p className="font-semibold text-gray-900">Lebon Consulting (Pty) Ltd</p>
            <p>Registration Number: K2021570343</p>
            <p>FSP Number: 53013</p>
            <p className="mt-2">5th Floor, Bloukrans Building, Lynwood Bridge, Pretoria, 0081</p>
            <p>info@lebonconsulting.co.za | 012 745 8100</p>
          </div>

          <div className="prose prose-gray max-w-none">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-6">
              Lebon Consulting (Pty) Ltd (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you interact with our services, website, and business operations.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            <p className="text-gray-600 mb-4">We collect and process the following types of personal information:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
              <li><strong>Identity Information:</strong> Names, ID numbers, date of birth</li>
              <li><strong>Contact Information:</strong> Email addresses, telephone numbers, physical addresses</li>
              <li><strong>Financial Information:</strong> Banking details, financial statements, tax information</li>
              <li><strong>Professional Information:</strong> Employment history, qualifications, professional memberships</li>
              <li><strong>Technical Information:</strong> Device information, IP addresses, browser type and version</li>
              <li><strong>Usage Information:</strong> How you use our website and services</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">3. How We Collect Information</h2>
            <p className="text-gray-600 mb-4">We collect information through:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
              <li>Direct interactions when you provide information to us</li>
              <li>Automated technologies when you use our website</li>
              <li>Third parties or publicly available sources</li>
              <li>Client onboarding processes</li>
              <li>Service delivery and communication</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">4. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use your personal information for the following purposes:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
              <li>Providing our financial services and products</li>
              <li>Managing our relationship with you</li>
              <li>Compliance with legal and regulatory obligations</li>
              <li>Risk assessment and management</li>
              <li>Marketing and communications (with your consent)</li>
              <li>Improving our services and website</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">5. Legal Basis for Processing</h2>
            <p className="text-gray-600 mb-4">We process your personal information based on:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
              <li>Your consent</li>
              <li>Contractual necessity</li>
              <li>Legal obligations</li>
              <li>Legitimate business interests</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">6. Information Sharing</h2>
            <p className="text-gray-600 mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
              <li>Service providers and business partners</li>
              <li>Regulatory authorities and government bodies</li>
              <li>Professional advisers</li>
              <li>Third parties involved in corporate transactions</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">7. Your Rights</h2>
            <p className="text-gray-600 mb-4">Under POPIA, you have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
              <li>Access your personal information</li>
              <li>Correct your personal information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to processing of your personal information</li>
              <li>Lodge a complaint with the Information Regulator</li>
              <li>Withdraw consent for processing</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">8. Information Security</h2>
            <p className="text-gray-600 mb-4">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, accidental loss, or damage. Our security measures include:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-6 space-y-2">
              <li>Encryption of data</li>
              <li>Access controls and authentication</li>
              <li>Regular security assessments</li>
              <li>Staff training on data protection</li>
              <li>Secure data storage and transmission</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">9. Retention Period</h2>
            <p className="text-gray-600 mb-6">
              We retain your personal information only for as long as necessary to fulfill the purposes for which it was collected, including legal, regulatory, and reporting requirements.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">10. International Transfers</h2>
            <p className="text-gray-600 mb-6">
              When we transfer personal information outside South Africa, we ensure adequate safeguards are in place in compliance with POPIA requirements.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">11. Contact Information</h2>
            <p className="text-gray-600 mb-2">For any privacy-related queries, please contact our Information Officer:</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-gray-600">
              <p className="font-semibold text-gray-900">Isaiah Mphaloane</p>
              <p>Managing Director &amp; Information Officer</p>
              <p>Email: info@lebonconsulting.co.za</p>
              <p>Phone: 012 745 8100</p>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">12. Changes to This Policy</h2>
            <p className="text-gray-600 mb-6">
              We reserve the right to update this Privacy Policy at any time. Any changes will be posted on our website with an updated revision date. Your continued use of our services after such modifications constitutes your acknowledgment of the modified Privacy Policy.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">13. Complaints</h2>
            <p className="text-gray-600 mb-4">
              If you believe your privacy rights have been violated, you may file a complaint with us or with the Information Regulator:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-gray-600">
              <p><strong>Website:</strong> <a href="https://inforegulator.org.za/" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">https://inforegulator.org.za/</a></p>
              <p><strong>Email:</strong> <a href="mailto:POPIAComplaints@inforegulator.org.za" className="text-amber-600 hover:underline">POPIAComplaints@inforegulator.org.za</a></p>
            </div>
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
