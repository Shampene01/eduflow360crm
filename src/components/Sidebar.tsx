"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getProviderByUserId } from "@/lib/db";
import { AccommodationProvider } from "@/lib/schema";
import { OnlineStatus } from "@/components/OnlineStatus";
import {
  Home,
  Building2,
  Users,
  FileText,
  Ticket,
  BookOpen,
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
      { label: "Resources", href: "/resources", icon: BookOpen },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Support Tickets", href: "/tickets", icon: Ticket },
    ],
  },
];

const pendingProviderSections: SidebarSection[] = [
  {
    title: "Navigation",
    items: [
      { label: "Home", href: "/dashboard", icon: Home },
      { label: "Support Tickets", href: "/tickets", icon: Ticket },
    ],
  },
];

const studentSections: SidebarSection[] = [
  {
    title: "Navigation",
    items: [
      { label: "Home", href: "/dashboard", icon: Home },
      { label: "Browse Properties", href: "/properties", icon: Building2 },
      { label: "Support Tickets", href: "/tickets", icon: Ticket },
    ],
  },
];

interface SidebarProps {
  userType?: "student" | "provider";
}

export function Sidebar({ userType = "provider" }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [providerStatus, setProviderStatus] = useState<AccommodationProvider | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);

  // Check if user has a provider application
  useEffect(() => {
    const checkProviderStatus = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid || userType !== "provider") {
        setLoadingProvider(false);
        return;
      }
      try {
        const provider = await getProviderByUserId(uid);
        setProviderStatus(provider);
      } catch (err) {
        console.error("Error checking provider status:", err);
      } finally {
        setLoadingProvider(false);
      }
    };
    checkProviderStatus();
  }, [user?.userId, user?.uid, userType]);

  // Determine which sections to show based on provider status
  const getSections = () => {
    if (userType !== "provider") {
      return studentSections;
    }

    // If provider is approved, show full provider sections
    if (providerStatus?.approvalStatus === "Approved") {
      return providerSections;
    }

    // If no provider or pending/rejected, show limited sections
    return pendingProviderSections;
  };

  const sections = getSections();

  const getUserInitials = () => {
    if (!user) return "U";
    const first = user.firstNames?.charAt(0) || user.firstName?.charAt(0) || "";
    const last = user.surname?.charAt(0) || user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  const getRoleLabel = () => {
    if (!user) return "Loading...";
    
    // First priority: Use the role field directly (Manager, Supervisor, Registrar, Administrator, etc.)
    if (user.role) {
      return user.role;
    }

    // Second priority: Fallback to userType if role is not set
    if (user.userType) {
      switch (user.userType) {
        case "provider":
          return "Provider";
        case "student":
          return "Student";
        case "admin":
          return "Administrator";
        default:
          return String(user.userType).charAt(0).toUpperCase() + String(user.userType).slice(1);
      }
    }

    // Third priority: Based on provider status
    if (providerStatus) {
      return providerStatus.approvalStatus === "Approved" ? "Provider" : "Pending Provider";
    }

    // Final fallback based on userType prop
    return userType === "provider" ? "Provider" : userType === "student" ? "Student" : "";
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* User Info */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="relative w-fit mb-3">
          {user?.profilePhotoUrl ? (
            <img
              src={user.profilePhotoUrl}
              alt="Profile"
              className="w-14 h-14 rounded-full object-cover border-2 border-amber-200 dark:border-amber-700"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-gray-900 font-semibold text-xl border-2 border-amber-200 dark:border-amber-700">
              {getUserInitials()}
            </div>
          )}
          {/* Online status indicator on avatar */}
          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-white dark:bg-gray-800 rounded-full">
            <OnlineStatus userId={user?.userId || user?.uid} size="md" />
          </div>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {user ? `${user.firstNames || user.firstName || ""} ${user.surname || user.lastName || ""}`.trim() : "Loading..."}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {getRoleLabel()}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <h4 className="px-6 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
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
                          ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-l-amber-500"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 border-l-transparent hover:border-l-amber-500"
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

    </aside>
  );
}
