"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_BEFORE_LOGOUT_MS = 2 * 60 * 1000; // Show warning 2 minutes before logout

/**
 * Hook that automatically logs out the user after a period of inactivity.
 * Tracks mouse movements, clicks, keyboard events, scroll, and touch events.
 */
export function useInactivityLogout() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(async () => {
    console.log("Auto-logout due to inactivity");
    try {
      await signOut();
      // Redirect to login page
      window.location.href = "/login?reason=inactivity";
    } catch (error) {
      console.error("Error during auto-logout:", error);
    }
  }, [signOut]);

  const startCountdown = useCallback(() => {
    const warningDurationSec = Math.floor(WARNING_BEFORE_LOGOUT_MS / 1000);
    setSecondsRemaining(warningDurationSec);
    setShowWarning(true);

    // Update countdown every second
    countdownRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    // Hide warning if shown
    setShowWarning(false);

    // Set new timeouts only if user is logged in
    if (user) {
      // Set warning timeout (fires 2 min before logout)
      warningTimeoutRef.current = setTimeout(() => {
        startCountdown();
      }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_LOGOUT_MS);

      // Set logout timeout
      timeoutRef.current = setTimeout(() => {
        handleLogout();
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [user, handleLogout, startCountdown]);

  const stayLoggedIn = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // Don't set up listeners if user is not logged in
    if (!user) {
      return;
    }

    // Activity events to track
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "wheel",
    ];

    // Throttle the reset to avoid excessive timer resets
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledReset = () => {
      if (!throttleTimeout) {
        resetTimer();
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
        }, 1000); // Throttle to once per second
      }
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, throttledReset, { passive: true });
    });

    // Also check for visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check if we've been away too long
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS) {
          handleLogout();
        } else {
          resetTimer();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initialize the timer
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, throttledReset);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, resetTimer, handleLogout]);

  return {
    resetTimer,
    stayLoggedIn,
    showWarning,
    secondsRemaining,
    lastActivity: lastActivityRef.current,
  };
}
