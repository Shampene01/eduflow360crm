"use client";

import { useEffect, useState } from "react";
import { subscribeToPresence, UserPresence, isPresenceAvailable } from "@/lib/presence";
import { cn } from "@/lib/utils";

interface OnlineStatusProps {
  userId?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function OnlineStatus({ 
  userId, 
  showLabel = false, 
  size = "md",
  className 
}: OnlineStatusProps) {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Check if presence system is available
    if (!isPresenceAvailable()) {
      setAvailable(false);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToPresence(userId, (data) => {
      setPresence(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };

  const labelSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  // Don't render anything if presence system isn't available
  if (!available) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className={cn(
          sizeClasses[size],
          "rounded-full bg-gray-400 animate-pulse"
        )} />
        {showLabel && (
          <span className={cn(labelSizeClasses[size], "text-gray-400")}>
            ...
          </span>
        )}
      </div>
    );
  }

  const isOnline = presence?.online ?? false;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className={cn(
        sizeClasses[size],
        "rounded-full",
        isOnline 
          ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" 
          : "bg-red-500"
      )} />
      {showLabel && (
        <span className={cn(
          labelSizeClasses[size],
          isOnline ? "text-green-500" : "text-red-500"
        )}>
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
    </div>
  );
}

// Inline dot version for use in text
export function OnlineStatusDot({ 
  userId,
  className 
}: { 
  userId?: string;
  className?: string;
}) {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!userId) return;

    if (!isPresenceAvailable()) {
      setAvailable(false);
      return;
    }

    const unsubscribe = subscribeToPresence(userId, setPresence);
    return () => unsubscribe();
  }, [userId]);

  if (!available) {
    return null;
  }

  const isOnline = presence?.online ?? false;

  return (
    <span 
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        isOnline 
          ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" 
          : "bg-red-500",
        className
      )}
      title={isOnline ? "Online" : "Offline"}
    />
  );
}
