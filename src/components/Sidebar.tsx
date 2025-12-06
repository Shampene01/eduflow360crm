"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Building2,
  Users,
  FileText,
  Ticket,
  Settings,
  HelpCircle,
  Bell,
  Heart,
  Calculator,
  Calendar,
  Book,
  MessageSquare,
  LucideIcon,
} from "lucide-react";

interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

const providerSections: SidebarSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/provider-dashboard", icon: Home },
      { label: "Properties", href: "/properties", icon: Building2 },
      { label: "Students", href: "/students", icon: Users },
      { label: "Invoices", href: "/invoices", icon: FileText },
      { label: "Tickets", href: "/tickets", icon: Ticket },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Help & Support", href: "/support", icon: HelpCircle },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
];

const studentSections: SidebarSection[] = [
  {
    title: "Navigation",
    items: [
      { label: "Home", href: "/dashboard", icon: Home },
      { label: "Browse Properties", href: "/properties", icon: Building2 },
      { label: "Saved Listings", href: "/saved", icon: Heart },
      { label: "My Applications", href: "/applications", icon: FileText },
      { label: "Financial Aid", href: "/financial-aid", icon: Calculator },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "My Profile", href: "/profile", icon: Users },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Help & Support", href: "/support", icon: HelpCircle },
    ],
  },
];

interface SidebarProps {
  userType?: "student" | "provider";
}

export function Sidebar({ userType = "provider" }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const sections = userType === "provider" ? providerSections : studentSections;

  const getUserInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* User Info */}
      <div className="p-6 border-b border-gray-200">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-gray-900 font-semibold text-xl mb-3 border-2 border-amber-200">
          {getUserInitials()}
        </div>
        <h3 className="font-semibold text-gray-900">
          {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
        </h3>
        <p className="text-sm text-gray-500">
          {userType === "provider" ? "Accommodation Provider" : "Student"}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <h4 className="px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {section.title}
            </h4>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all border-l-3",
                        isActive
                          ? "bg-amber-50 text-amber-600 border-l-amber-500"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-transparent hover:border-l-amber-500"
                      )}
                    >
                      <item.icon size={20} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Quick Links */}
      {userType === "student" && (
        <div className="p-6 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Quick Links
          </h4>
          <div className="space-y-2">
            <Link
              href="/schedule"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-all"
            >
              <Calendar size={16} />
              Schedule Viewing
            </Link>
            <Link
              href="/guide"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-all"
            >
              <Book size={16} />
              Housing Guide
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-all"
            >
              <MessageSquare size={16} />
              Contact Support
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
