"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  variant?: "dark" | "light";
}

export function Navbar({ variant = "dark" }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isDark = variant === "dark" && !scrolled;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm"
          : isDark
          ? "bg-transparent"
          : "bg-white"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={isDark ? "/logo-white.webp" : "/logo.webp"}
              alt="EduFlow360"
              width={150}
              height={30}
              className="h-8 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className={`font-medium transition-colors ${
                isDark
                  ? "text-white/80 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Features
            </Link>
            <Link
              href="#benefits"
              className={`font-medium transition-colors ${
                isDark
                  ? "text-white/80 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className={`font-medium transition-colors ${
                isDark
                  ? "text-white/80 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Contact
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              asChild
              className={`font-medium ${
                isDark
                  ? "text-white hover:bg-white/10 hover:text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold shadow-lg shadow-amber-500/25"
            >
              <Link href="/register">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden p-2 ${isDark ? "text-white" : "text-slate-600"}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200/20 bg-white rounded-b-2xl shadow-xl">
            <div className="flex flex-col gap-1 px-2">
              <Link
                href="#features"
                className="text-slate-700 hover:bg-slate-100 font-medium py-3 px-4 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#benefits"
                className="text-slate-700 hover:bg-slate-100 font-medium py-3 px-4 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/contact"
                className="text-slate-700 hover:bg-slate-100 font-medium py-3 px-4 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-slate-100 px-2">
                <Button variant="outline" asChild className="w-full justify-center">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild className="w-full justify-center bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold">
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
