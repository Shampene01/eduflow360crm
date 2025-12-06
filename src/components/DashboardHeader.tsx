"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Settings, LogOut, User, ChevronDown } from "lucide-react";
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

export function DashboardHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <header className="h-[70px] bg-gradient-to-r from-gray-900 to-gray-800 sticky top-0 z-50 shadow-md">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
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
        <div className="flex items-center gap-4">
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
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-gray-900 font-semibold border-2 border-amber-300/30">
                  {getUserInitials()}
                </div>
                <span className="text-white text-sm font-medium hidden sm:block">
                  {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {user ? `${user.firstName} ${user.lastName}` : "User"}
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {user?.email}
                  </span>
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
