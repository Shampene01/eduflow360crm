"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Users,
  Building2,
  Download,
  Calendar,
  ChevronDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Pause,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Mock data - replace with Firestore queries
const mockData = {
  financialSummary: {
    expectedRevenue: 450000,
    receivedRevenue: 387500,
    outstanding: 62500,
    previousPeriod: 425000,
  },
  occupancy: {
    totalBeds: 100,
    occupied: 78,
    vacant: 22,
    rate: 78,
    previousRate: 72,
  },
  studentStatus: {
    pending: 5,
    active: 68,
    suspended: 8,
    terminated: 12,
  },
  monthlyRevenue: [
    { month: "Jul", expected: 75000, received: 72000 },
    { month: "Aug", expected: 75000, received: 75000 },
    { month: "Sep", expected: 75000, received: 68000 },
    { month: "Oct", expected: 75000, received: 71500 },
    { month: "Nov", expected: 75000, received: 52000 },
    { month: "Dec", expected: 75000, received: 49000 },
  ],
  recentPayments: [
    { student: "Thabo Molefe", amount: 6500, date: "2025-12-14", status: "received" as const },
    { student: "Naledi Khumalo", amount: 6500, date: "2025-12-12", status: "received" as const },
    { student: "Sipho Ndlovu", amount: 6500, date: "2025-12-10", status: "pending" as const },
    { student: "Lerato Dlamini", amount: 6500, date: "2025-12-08", status: "overdue" as const },
  ],
  propertyBreakdown: [
    { name: "Bloukrans Residence", beds: 60, occupied: 52, revenue: 338000 },
    { name: "Lynwood Heights", beds: 40, occupied: 26, revenue: 169000 },
  ],
};

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: string;
  trendUp?: boolean;
}

const StatCard = ({ icon: Icon, label, value, subValue, trend, trendUp }: StatCardProps) => (
  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
    <div className="flex items-start justify-between">
      <div className="p-2.5 bg-amber-50 rounded-lg">
        <Icon className="w-5 h-5 text-amber-500" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
          {trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {trend}
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
    </div>
  </div>
);

interface RevenueDataItem {
  month: string;
  expected: number;
  received: number;
}

const RevenueChart = ({ data }: { data: RevenueDataItem[] }) => {
  const maxValue = Math.max(...data.flatMap((d) => [d.expected, d.received]));

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">Revenue Overview</h3>
          <p className="text-sm text-gray-500 mt-0.5">Expected vs Received (NSFAS)</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-gray-600">Expected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-gray-600">Received</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-4 h-48">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex items-end justify-center gap-1 h-40">
              <div
                className="w-5 bg-amber-100 rounded-t-sm transition-all hover:bg-amber-200"
                style={{ height: `${(item.expected / maxValue) * 100}%` }}
              />
              <div
                className="w-5 bg-emerald-500 rounded-t-sm transition-all hover:bg-emerald-600"
                style={{ height: `${(item.received / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{item.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface StudentStatusData {
  pending: number;
  active: number;
  suspended: number;
  terminated: number;
}

const StudentStatusBreakdown = ({ data }: { data: StudentStatusData }) => {
  const total = data.pending + data.active + data.suspended + data.terminated;
  const statuses = [
    { key: "active", label: "Active", count: data.active, color: "bg-emerald-500", textColor: "text-emerald-500", icon: CheckCircle2 },
    { key: "pending", label: "Pending", count: data.pending, color: "bg-amber-400", textColor: "text-amber-400", icon: Clock },
    { key: "suspended", label: "Suspended", count: data.suspended, color: "bg-orange-500", textColor: "text-orange-500", icon: Pause },
    { key: "terminated", label: "Terminated", count: data.terminated, color: "bg-red-500", textColor: "text-red-500", icon: XCircle },
  ];

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">Student Status</h3>
          <p className="text-sm text-gray-500 mt-0.5">{total} total students</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 rounded-full bg-gray-100 flex overflow-hidden mb-6">
        {statuses.map((status) => (
          <div
            key={status.key}
            className={`${status.color} transition-all`}
            style={{ width: `${(status.count / total) * 100}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-4">
        {statuses.map((status) => (
          <div key={status.key} className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status.color} bg-opacity-10`}>
              <status.icon className={`w-4 h-4 ${status.textColor}`} />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{status.count}</p>
              <p className="text-xs text-gray-500">{status.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const OccupancyGauge = ({ rate, previousRate }: { rate: number; previousRate: number }) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (rate / 100) * circumference;
  const trend = rate - previousRate;

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Occupancy Rate</h3>
          <p className="text-sm text-gray-500 mt-0.5">Current period</p>
        </div>
      </div>

      <div className="flex items-center justify-center py-4">
        <div className="relative">
          <svg className="w-32 h-32 -rotate-90">
            <circle cx="64" cy="64" r="45" stroke="#f3f4f6" strokeWidth="12" fill="none" />
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="#f59e0b"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{rate}%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-2">
        <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {Math.abs(trend)}% vs last period
        </div>
      </div>
    </div>
  );
};

interface PropertyData {
  name: string;
  beds: number;
  occupied: number;
  revenue: number;
}

const PropertyTable = ({ data }: { data: PropertyData[] }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="p-6 border-b border-gray-100">
      <h3 className="font-semibold text-gray-900">Property Breakdown</h3>
      <p className="text-sm text-gray-500 mt-0.5">Performance by property</p>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
              Property
            </th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
              Capacity
            </th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
              Occupied
            </th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
              Occupancy
            </th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
              Revenue
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((property, idx) => (
            <tr key={idx} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Building2 className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="font-medium text-gray-900">{property.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-gray-600">{property.beds} beds</td>
              <td className="px-6 py-4 text-gray-600">{property.occupied} students</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${(property.occupied / property.beds) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">
                    {Math.round((property.occupied / property.beds) * 100)}%
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 font-medium text-gray-900">
                R {property.revenue.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

interface PaymentData {
  student: string;
  amount: number;
  date: string;
  status: "received" | "pending" | "overdue";
}

const RecentPayments = ({ data }: { data: PaymentData[] }) => {
  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    received: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Received" },
    pending: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending" },
    overdue: { bg: "bg-red-50", text: "text-red-700", label: "Overdue" },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Recent Payments</h3>
          <p className="text-sm text-gray-500 mt-0.5">Latest NSFAS transactions</p>
        </div>
        <button className="text-sm text-amber-600 hover:text-amber-700 font-medium">View all</button>
      </div>

      <div className="divide-y divide-gray-100">
        {data.map((payment, idx) => (
          <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {payment.student
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{payment.student}</p>
                <p className="text-sm text-gray-500">{payment.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold text-gray-900">R {payment.amount.toLocaleString()}</span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[payment.status].bg} ${statusStyles[payment.status].text}`}
              >
                {statusStyles[payment.status].label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function ReportsContent() {
  const [dateRange] = useState("This Month");
  const [selectedProperty] = useState("All Properties");

  const formatCurrency = (amount: number) => `R ${amount.toLocaleString()}`;
  const percentChange = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <Sidebar userType="provider" />
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
                <p className="text-gray-500 mt-1">Analytics and insights for your properties</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Date Range Selector */}
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{dateRange}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Property Filter */}
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{selectedProperty}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Export Button */}
                <button className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Export</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                icon={DollarSign}
                label="Expected Revenue"
                value={formatCurrency(mockData.financialSummary.expectedRevenue)}
                subValue="From NSFAS allocations"
                trend={percentChange(mockData.financialSummary.expectedRevenue, mockData.financialSummary.previousPeriod)}
                trendUp={mockData.financialSummary.expectedRevenue > mockData.financialSummary.previousPeriod}
              />
              <StatCard
                icon={TrendingUp}
                label="Received Revenue"
                value={formatCurrency(mockData.financialSummary.receivedRevenue)}
                subValue="Actually paid out"
                trend={`${Math.round((mockData.financialSummary.receivedRevenue / mockData.financialSummary.expectedRevenue) * 100)}% of expected`}
                trendUp={true}
              />
              <StatCard
                icon={AlertCircle}
                label="Outstanding"
                value={formatCurrency(mockData.financialSummary.outstanding)}
                subValue="Awaiting payment"
              />
              <StatCard
                icon={Users}
                label="Active Students"
                value={mockData.studentStatus.active}
                subValue={`${mockData.studentStatus.pending} pending approval`}
                trend="+12%"
                trendUp={true}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <RevenueChart data={mockData.monthlyRevenue} />
              </div>
              <OccupancyGauge rate={mockData.occupancy.rate} previousRate={mockData.occupancy.previousRate} />
            </div>

            {/* Student Status & Recent Payments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <StudentStatusBreakdown data={mockData.studentStatus} />
              <RecentPayments data={mockData.recentPayments} />
            </div>

            {/* Property Table */}
            <PropertyTable data={mockData.propertyBreakdown} />
          </div>
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  );
}
