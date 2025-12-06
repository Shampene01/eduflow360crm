import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Users,
  FileText,
  Headset,
  Shield,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section - Clean & Modern */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 via-white to-white" />
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-10 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-full text-sm text-amber-700 font-medium mb-8">
              <Sparkles size={14} className="text-amber-500" />
              NSFAS Accredited Platform
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] mb-6 tracking-tight">
              Student Housing
              <br />
              <span className="text-amber-500">Made Simple</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              The all-in-one platform for NSFAS accommodation providers. 
              Manage properties, students, and billing effortlessly.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button
                asChild
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 h-12 text-base"
              >
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight size={18} className="ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 h-12 text-base"
              >
                <Link href="/login">Sign In</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                <span>Free 14-day trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                <span>NSFAS compliant</span>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="bg-gradient-to-b from-gray-100 to-gray-50 rounded-2xl p-2 shadow-2xl shadow-gray-200/50 border border-gray-200">
              <div className="bg-white rounded-xl overflow-hidden">
                {/* Browser chrome */}
                <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-white rounded-md px-4 py-1 text-xs text-gray-500 border border-gray-200">
                      crm.eduflow360.co.za
                    </div>
                  </div>
                </div>
                
                {/* Dashboard content */}
                <div className="p-6 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Properties", value: "24", color: "bg-amber-500" },
                      { label: "Students", value: "186", color: "bg-blue-500" },
                      { label: "Occupancy", value: "94%", color: "bg-green-500" },
                      { label: "Revenue", value: "R2.4M", color: "bg-purple-500" },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white rounded-lg p-4 border border-gray-100">
                        <div className={`w-2 h-2 rounded-full ${stat.color} mb-3`} />
                        <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                        <div className="text-sm text-gray-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need
            </h2>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              Powerful tools built for NSFAS accommodation providers
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Building2,
                title: "Property Management",
                description: "Manage multiple properties, track availability, and maintain records.",
              },
              {
                icon: Users,
                title: "Student Allocation",
                description: "Streamline placements with NSFAS verification integration.",
              },
              {
                icon: FileText,
                title: "Billing & Invoicing",
                description: "Submit invoices, track payments, and maintain billing history.",
              },
              {
                icon: Headset,
                title: "Support Tickets",
                description: "Create and track tickets for quick issue resolution.",
              },
              {
                icon: Shield,
                title: "NSFAS Integration",
                description: "Verify funding status instantly and ensure compliance.",
              },
              {
                icon: BarChart3,
                title: "Analytics",
                description: "Get insights into occupancy, revenue, and performance.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-amber-300 hover:shadow-lg transition-all group"
              >
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <feature.icon size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="benefits" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-900 rounded-2xl p-8 sm:p-12">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { value: "500+", label: "Properties" },
                { value: "10K+", label: "Students" },
                { value: "99.9%", label: "Uptime" },
                { value: "60%", label: "Time Saved" },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl sm:text-4xl font-bold text-amber-500 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-amber-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join hundreds of providers streamlining their operations with EduFlow360.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-gray-900 hover:bg-gray-800 text-white px-8 h-12"
            >
              <Link href="/register">
                Start Free Trial
                <ArrowRight size={18} className="ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-gray-300 px-8 h-12"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
