"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  Building2,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);

    // Reset form after showing success
    setTimeout(() => {
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      setIsSubmitted(false);
    }, 3000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant="light" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-3">
              Get in Touch
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6 tracking-tight">
              We&apos;d love to
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">
                hear from you
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Have questions about EduFlow360? Want to learn more about our
              platform? Our team is here to help you succeed.
            </p>
          </div>
        </div>

        {/* Gradient fade to white */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: MapPin,
                title: "Visit Us",
                info: "123 Innovation Drive",
                subInfo: "Pretoria, Gauteng 0001",
                color: "bg-blue-500",
              },
              {
                icon: Phone,
                title: "Call Us",
                info: "+27 12 345 6789",
                subInfo: "Mon-Fri 8am-5pm SAST",
                color: "bg-emerald-500",
              },
              {
                icon: Mail,
                title: "Email Us",
                info: "hello@eduflow360.co.za",
                subInfo: "We reply within 24 hours",
                color: "bg-violet-500",
              },
              {
                icon: Clock,
                title: "Business Hours",
                info: "Monday - Friday",
                subInfo: "8:00 AM - 5:00 PM SAST",
                color: "bg-amber-500",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="group bg-slate-50 hover:bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
                >
                  <item.icon size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-700 font-medium">{item.info}</p>
                <p className="text-slate-500 text-sm">{item.subInfo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map Section */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                    <Send size={20} className="text-slate-900" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    Send us a message
                  </h2>
                </div>
                <p className="text-slate-400">
                  Fill out the form below and we&apos;ll get back to you as soon
                  as possible.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {isSubmitted ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 size={32} className="text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      Message Sent!
                    </h3>
                    <p className="text-slate-600">
                      Thank you for reaching out. We&apos;ll be in touch soon.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+27 12 345 6789"
                          value={formData.phone}
                          onChange={handleChange}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          name="subject"
                          placeholder="How can we help?"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Tell us more about your inquiry..."
                        value={formData.message}
                        onChange={handleChange}
                        required
                        className="min-h-[150px] resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold h-12 shadow-lg shadow-amber-500/25"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send size={18} className="ml-2" />
                        </>
                      )}
                    </Button>
                  </>
                )}
              </form>
            </div>

            {/* Google Maps */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                      <MapPin size={20} className="text-slate-900" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Find Us on the Map
                      </h2>
                      <p className="text-slate-400 text-sm">
                        Visit our office in Pretoria
                      </p>
                    </div>
                  </div>
                </div>

                {/* Google Maps Embed */}
                <div className="relative h-[400px] w-full">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d57644.30513893899!2d28.18831565!3d-25.7478676!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1e956008c1e0f7a7%3A0x583f5e9f1e4e5a4e!2sPretoria%2C%20South%20Africa!5e0!3m2!1sen!2sus!4v1702123456789!5m2!1sen!2sus"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0"
                    title="EduFlow360 Office Location"
                  />
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">
                  Quick Links
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "View Pricing", href: "/#pricing" },
                    { label: "See Features", href: "/#features" },
                    { label: "Get Started", href: "/register" },
                    { label: "Sign In", href: "/login" },
                  ].map((link, i) => (
                    <Link
                      key={i}
                      href={link.href}
                      className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition-colors group"
                    >
                      <ArrowRight
                        size={14}
                        className="text-slate-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all"
                      />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">
              Frequently Asked Questions
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Common questions answered
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                question: "How do I get started with EduFlow360?",
                answer:
                  "Getting started is easy! Simply click 'Get Started' to create your account. You can set up your first property in under 5 minutes and start managing students right away.",
              },
              {
                question: "Is EduFlow360 NSFAS compliant?",
                answer:
                  "Yes, EduFlow360 is fully NSFAS compliant. Our platform integrates directly with NSFAS systems for instant funding verification and automated compliance checks.",
              },
              {
                question: "What support do you offer?",
                answer:
                  "We offer dedicated support via email, phone, and live chat during business hours. Our team typically responds within 24 hours for email inquiries.",
              },
              {
                question: "Can I manage multiple properties?",
                answer:
                  "Absolutely! EduFlow360 is designed to scale with your business. You can manage unlimited properties from a single dashboard with our per-property pricing model.",
              },
              {
                question: "Do you offer volume discounts?",
                answer:
                  "Yes, we offer competitive volume discounts for providers managing 10 or more properties. Contact our sales team to discuss custom pricing.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 size={32} className="text-slate-900" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Join hundreds of providers who have streamlined their operations
            with EduFlow360. Start your free trial today.
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
              className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 px-8 h-14 text-base"
            >
              <Link href="/#pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
