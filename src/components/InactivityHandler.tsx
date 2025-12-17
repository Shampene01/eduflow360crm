"use client";

import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { AlertTriangle, Clock } from "lucide-react";

/**
 * Component that handles automatic logout after inactivity.
 * Shows a warning modal before auto-logout.
 * Must be placed inside AuthProvider.
 */
export function InactivityHandler() {
  const { showWarning, secondsRemaining, stayLoggedIn } = useInactivityLogout();

  if (!showWarning) {
    return null;
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeDisplay = minutes > 0 
    ? `${minutes}:${seconds.toString().padStart(2, "0")}` 
    : `${seconds}s`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Session Timeout Warning
          </h2>
          
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            You will be logged out due to inactivity in:
          </p>
          
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-3 dark:bg-gray-700">
            <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {timeDisplay}
            </span>
          </div>
          
          <div className="flex w-full gap-3">
            <button
              onClick={stayLoggedIn}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Stay Logged In
            </button>
          </div>
          
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Click anywhere or press any key to stay logged in
          </p>
        </div>
      </div>
    </div>
  );
}
