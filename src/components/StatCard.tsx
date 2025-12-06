import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-sm border border-gray-200 p-6 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-amber-500 transition-all",
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 rounded-sm bg-amber-100 flex items-center justify-center">
          <Icon className="w-6 h-6 text-amber-600" />
        </div>
        {trend && (
          <span
            className={cn(
              "text-sm font-medium px-2 py-1 rounded",
              trend.isPositive
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">
        {value}
      </div>
      <div className="text-sm text-gray-500">{title}</div>
    </div>
  );
}
