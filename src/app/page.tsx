import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Users,
  FileText,
  Headset,
  Shield,
  BarChart3,
  ArrowRight,
  Star,
  TrendingUp,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section - Ramp/Lattice Inspired */}
      <section className="relative pt-24 pb-0 overflow-hidden">
        {/* Dark gradient background - Ramp style */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-[600px]">
            {/* Left: Content */}
            <div className="py-12 lg:py-20">
              {/* Social proof badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm text-white/90 mb-8">
                <div className="flex -space-x-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="ml-1">Trusted by 500+ providers</span>
              </div>

              {/* Headline - Lattice style */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6 tracking-tight">
                The platform
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">
                  providers love
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-lg leading-relaxed">
                Join forward-thinking NSFAS accommodation providers using EduFlow360 to manage properties, students, and billing — all on one trusted platform.
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Button
                  asChild
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-8 h-12 text-base shadow-lg shadow-amber-500/25"
                >
                  <Link href="/register">
                    Get started
                    <ArrowRight size={18} className="ml-2" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="text-white hover:text-white hover:bg-white/10 px-6 h-12 text-base group"
                >
                  <Link href="#pricing" className="flex items-center">
                    View pricing
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>

              {/* Trust indicators - minimal */}
              <p className="text-sm text-slate-400">
                From R200/month · NSFAS accredited · Setup in 5 minutes
              </p>
            </div>

            {/* Right: Product Screenshots - Lattice style floating cards */}
            <div className="relative lg:h-[600px] hidden lg:block">
              {/* Main dashboard card */}
              <div className="absolute top-8 right-0 w-[480px] bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden border border-slate-200/50 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="bg-slate-100 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center text-xs text-slate-500 font-medium">
                    Dashboard Overview
                  </div>
                </div>
                <div className="p-5 bg-slate-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">Welcome back, Provider</h3>
                    <span className="text-xs text-slate-500">Dec 2025</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "Total Students", value: "186", change: "+12%", icon: Users },
                      { label: "Occupancy Rate", value: "94%", change: "+3%", icon: TrendingUp },
                      { label: "Properties", value: "24", change: "+2", icon: Building2 },
                      { label: "This Month", value: "R847K", change: "+18%", icon: BarChart3 },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <stat.icon size={16} className="text-slate-400" />
                          <span className="text-xs text-emerald-600 font-medium">{stat.change}</span>
                        </div>
                        <div className="text-xl font-bold text-slate-900">{stat.value}</div>
                        <div className="text-xs text-slate-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Mini chart placeholder */}
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-900">Revenue Trend</span>
                      <span className="text-xs text-slate-500">Last 6 months</span>
                    </div>
                    <div className="flex items-end gap-2 h-16">
                      {[40, 55, 45, 70, 85, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating notification card */}
              <div className="absolute bottom-32 left-0 w-72 bg-white rounded-xl shadow-xl shadow-black/10 p-4 border border-slate-200/50 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Payment Received</p>
                    <p className="text-xs text-slate-500 mt-0.5">NSFAS payment of R42,500 processed</p>
                    <p className="text-xs text-slate-400 mt-1">Just now</p>
                  </div>
                </div>
              </div>

              {/* Floating stats card */}
              <div className="absolute bottom-8 right-12 w-48 bg-slate-900 rounded-xl shadow-xl p-4 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} className="text-amber-400" />
                  <span className="text-xs text-slate-400">Quick Stats</span>
                </div>
                <div className="text-2xl font-bold text-white">98.5%</div>
                <div className="text-xs text-slate-400">Collection Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Gradient fade to white */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Trusted By Section - Ramp style */}
      <section className="py-16 px-4 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm text-slate-500 mb-8">
            Trusted by leading institutions and accommodation providers across South Africa
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {[
              "University of Pretoria",
              "Wits University",
              "UCT",
              "Stellenbosch",
              "UJ",
              "UNISA",
            ].map((name, i) => (
              <div key={i} className="text-slate-400 font-semibold text-lg tracking-tight hover:text-slate-600 transition-colors cursor-default">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Lattice style with larger cards */}
      <section id="features" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">
              Platform Features
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful tools designed specifically for NSFAS accommodation providers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Building2,
                title: "Property Management",
                description: "Manage multiple properties with detailed room tracking, maintenance schedules, and availability calendars.",
                color: "bg-blue-500",
              },
              {
                icon: Users,
                title: "Student Allocation",
                description: "Streamline student placements with automated NSFAS verification and smart matching algorithms.",
                color: "bg-emerald-500",
              },
              {
                icon: FileText,
                title: "Billing & Invoicing",
                description: "Generate compliant invoices, track payments in real-time, and automate NSFAS claim submissions.",
                color: "bg-violet-500",
              },
              {
                icon: Headset,
                title: "Support Management",
                description: "Handle student queries efficiently with a built-in ticketing system and response tracking.",
                color: "bg-rose-500",
              },
              {
                icon: Shield,
                title: "NSFAS Integration",
                description: "Direct integration with NSFAS systems for instant funding verification and compliance checks.",
                color: "bg-amber-500",
              },
              {
                icon: BarChart3,
                title: "Analytics & Reports",
                description: "Get actionable insights with real-time dashboards, occupancy trends, and financial reports.",
                color: "bg-cyan-500",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative bg-slate-50 hover:bg-white rounded-2xl p-8 border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
                <ArrowRight size={18} className="absolute bottom-8 right-8 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">
              Simple Pricing
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              One plan, everything included
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              No hidden fees. No complicated tiers. Just straightforward pricing.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              {/* Price header */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center">
                <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-2">
                  Provider Plan
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-white">R200</span>
                  <span className="text-slate-400 text-lg">/month</span>
                </div>
                <p className="text-slate-400 mt-2">per property</p>
              </div>

              {/* Features list */}
              <div className="p-8">
                <ul className="space-y-4">
                  {[
                    "Unlimited student allocations",
                    "NSFAS verification & compliance",
                    "Automated billing & invoicing",
                    "Real-time payment tracking",
                    "Analytics & reporting dashboard",
                    "Support ticket management",
                    "Email & SMS notifications",
                    "Dedicated support",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                      </div>
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  size="lg"
                  className="w-full mt-8 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold h-12 shadow-lg shadow-amber-500/25"
                >
                  <Link href="/register">
                    Get started now
                    <ArrowRight size={18} className="ml-2" />
                  </Link>
                </Button>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Cancel anytime · No setup fees
                </p>
              </div>
            </div>

            {/* Volume discount note */}
            <div className="mt-8 text-center">
              <p className="text-slate-600">
                Managing 10+ properties?{" "}
                <Link href="/contact" className="text-amber-600 font-semibold hover:underline">
                  Contact us for volume pricing
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Modern dark style */}
      <section id="benefits" className="py-24 px-4 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-3">
              By the numbers
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Trusted by providers nationwide
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: "500+", label: "Properties Managed", icon: Building2 },
              { value: "10,000+", label: "Students Housed", icon: Users },
              { value: "R50M+", label: "Payments Processed", icon: TrendingUp },
              { value: "99.9%", label: "Platform Uptime", icon: Zap },
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-amber-500/20 transition-colors">
                  <stat.icon size={24} className="text-amber-400" />
                </div>
                <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Clean steps */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Get started in minutes
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create your account",
                description: "Sign up in seconds with your email. No credit card required to start your free trial.",
                icon: Users,
              },
              {
                step: "02",
                title: "Add your properties",
                description: "Import your property portfolio or add them manually. Our system handles the rest.",
                icon: Building2,
              },
              {
                step: "03",
                title: "Start managing",
                description: "Allocate students, generate invoices, and track everything from one dashboard.",
                icon: BarChart3,
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold text-slate-200 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
                {i < 2 && (
                  <ArrowRight size={24} className="hidden md:block absolute top-8 -right-4 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Gradient style */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to transform your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">
              accommodation business?
            </span>
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Join hundreds of providers who have streamlined their operations and increased their revenue with EduFlow360.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-8 h-14 text-base shadow-lg shadow-amber-500/25"
            >
              <Link href="/register">
                Get started now
                <ArrowRight size={18} className="ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-slate-600 text-white hover:bg-white/10 px-8 h-14 text-base"
            >
              <Link href="/contact">Talk to sales</Link>
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-6">
            From R200/month · No setup fees · Cancel anytime
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
