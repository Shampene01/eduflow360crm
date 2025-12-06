import Link from "next/link";
import {
  Building2,
  Users,
  FileText,
  Headset,
  Shield,
  BarChart3,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  Clock,
  Zap,
  Award,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-20 pb-16 px-4 bg-gradient-to-br from-white via-gray-50 to-gray-100 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/5 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/5 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Text */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-200 px-4 py-2 rounded-full text-sm text-amber-700 mb-6">
                <Shield size={14} />
                NSFAS Accredited Platform
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                Streamline Your{" "}
                <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
                  Student Accommodation
                </span>{" "}
                Management
              </h1>

              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                The complete CRM solution for NSFAS-accredited accommodation providers.
                Manage properties, students, billing, and support tickets all in one
                powerful platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-900 shadow-lg shadow-amber-500/30"
                >
                  <Link href="/login">
                    <ArrowRight size={18} className="mr-2" />
                    Access Dashboard
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-amber-600 text-amber-700 hover:bg-amber-50"
                >
                  <Link href="#features">
                    <PlayCircle size={18} className="mr-2" />
                    Learn More
                  </Link>
                </Button>
              </div>

              {/* Stats */}
              <div className="flex gap-8 flex-wrap">
                <div>
                  <div className="text-3xl font-bold text-amber-600">500+</div>
                  <div className="text-sm text-gray-500">Properties Managed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-600">10K+</div>
                  <div className="text-sm text-gray-500">Students Housed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-600">99%</div>
                  <div className="text-sm text-gray-500">Uptime</div>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="hidden lg:block">
              <div className="bg-gradient-to-br from-amber-100/50 to-amber-50/30 border border-amber-200/50 rounded-2xl p-8">
                <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                  {/* Preview Header */}
                  <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 flex items-center gap-3">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-gray-400 text-sm ml-auto">
                      EduFlow360 Dashboard
                    </span>
                  </div>

                  {/* Preview Body */}
                  <div className="p-6 bg-gray-50">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {[
                        { icon: Building2, value: "24", label: "Properties", color: "amber" },
                        { icon: Users, value: "186", label: "Students", color: "blue" },
                        { icon: CheckCircle, value: "98%", label: "Occupancy", color: "green" },
                      ].map((stat, i) => (
                        <div key={i} className="bg-white p-4 rounded-lg shadow-sm">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                              stat.color === "amber"
                                ? "bg-amber-100 text-amber-600"
                                : stat.color === "blue"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            <stat.icon size={18} />
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {stat.value}
                          </div>
                          <div className="text-xs text-gray-500">{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Chart Preview */}
                    <div className="bg-white p-4 rounded-lg h-24 flex items-end gap-2">
                      {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t opacity-80"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide mb-4">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful tools designed specifically for student accommodation providers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Building2,
                title: "Property Management",
                description:
                  "Easily manage multiple properties, track room availability, and maintain detailed property records with photos and documentation.",
              },
              {
                icon: Users,
                title: "Student Allocation",
                description:
                  "Streamline student placements with NSFAS verification integration. Track allocations and manage student records efficiently.",
              },
              {
                icon: FileText,
                title: "Billing & Invoicing",
                description:
                  "Submit monthly invoices, track payment status, and maintain complete billing history all in one secure location.",
              },
              {
                icon: Headset,
                title: "Support Ticketing",
                description:
                  "Create and track support tickets for quick issue resolution. Communicate directly with our support team.",
              },
              {
                icon: Shield,
                title: "NSFAS Integration",
                description:
                  "Verify student funding status instantly with our NSFAS integration. Ensure compliance and reduce administrative burden.",
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description:
                  "Get insights into occupancy rates, revenue trends, and performance metrics with our comprehensive analytics.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-8 hover:-translate-y-1 hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 transition-all"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center text-gray-900 mb-6">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Choose <span className="text-amber-600">EduFlow360</span>?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join hundreds of accommodation providers who trust our platform to
                manage their student housing operations efficiently.
              </p>

              <ul className="space-y-4">
                {[
                  "Reduce administrative workload by up to 60%",
                  "Real-time NSFAS verification and compliance",
                  "Automated billing and payment tracking",
                  "24/7 support and dedicated account management",
                  "Secure, cloud-based platform with 99.9% uptime",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700">
                    <CheckCircle className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: Clock, value: "60%", label: "Time Saved" },
                { icon: Zap, value: "3x", label: "Faster Processing" },
                { icon: Users, value: "10K+", label: "Students Managed" },
                { icon: Award, value: "99.9%", label: "Uptime Guarantee" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className={`bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm hover:border-amber-500 hover:-translate-y-1 transition-all ${
                    i % 2 === 1 ? "mt-8" : ""
                  }`}
                >
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mx-auto mb-4">
                    <stat.icon size={24} />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-amber-500 to-amber-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Operations?
          </h2>
          <p className="text-lg text-gray-800/80 mb-8 max-w-2xl mx-auto">
            Join the growing community of accommodation providers using EduFlow360 to
            streamline their student housing management.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-gray-900 text-amber-500 hover:bg-gray-800"
          >
            <Link href="/register">
              Get Started Today
              <ArrowRight size={18} className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
