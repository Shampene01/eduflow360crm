"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Settings, LogOut, User, ChevronDown, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OnlineStatus } from "@/components/OnlineStatus";

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const first = user.firstNames?.charAt(0) || user.firstName?.charAt(0) || "";
    const last = user.surname?.charAt(0) || user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <header className="h-[70px] bg-gradient-to-r from-gray-900 to-gray-800 sticky top-0 z-50 shadow-md">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/logo-white.webp"
            alt="EduFlow360"
            width={120}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <div className="text-gray-300 hover:text-amber-500">
            <ThemeToggle />
          </div>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-amber-500 hover:bg-white/10"
          >
            <Bell size={20} />
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                <div className="relative">
                  {user?.profilePhotoUrl ? (
                    <img
                      src={user.profilePhotoUrl}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover border-2 border-amber-300/30"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-gray-900 font-semibold border-2 border-amber-300/30">
                      {getUserInitials()}
                    </div>
                  )}
                  {/* Online status indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-gray-800 rounded-full">
                    <OnlineStatus userId={user?.userId || user?.uid} size="sm" />
                  </div>
                </div>
                <span className="text-white text-sm font-medium hidden sm:block">
                  {user ? `${user.firstNames || user.firstName || ""} ${user.surname || user.lastName || ""}`.trim() : "Loading..."}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {user ? `${user.firstNames || user.firstName || ""} ${user.surname || user.lastName || ""}`.trim() : "User"}
                    </span>
                    <span className="text-xs text-gray-500 font-normal">
                      {user?.email}
                    </span>
                  </div>
                  <OnlineStatus userId={user?.userId || user?.uid} showLabel size="sm" />
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User size={16} className="mr-2" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings size={16} className="mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              {user?.email === "shampene@lebonconsulting.co.za" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer text-purple-600">
                    <Shield size={16} className="mr-2" />
                    Admin Portal
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 cursor-pointer"
              >
                <LogOut size={16} className="mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
