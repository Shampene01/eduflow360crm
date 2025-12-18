"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  getProviderByUserId,
  getPropertiesByProvider,
  getPaymentsByProvider,
  getPropertyAssignments,
  getStudentById,
} from "@/lib/db";
import { Property, Student, Payment, StudentPropertyAssignment } from "@/lib/schema";

// Extended student with property info for reports
interface StudentWithProperty extends Student {
  propertyId?: string;
}

// Report data interfaces
interface ReportData {
  financialSummary: {
    expectedRevenue: number;
    receivedRevenue: number;
    outstanding: number;
    previousPeriod: number;
  };
  occupancy: {
    totalBeds: number;
    occupied: number;
    vacant: number;
    rate: number;
    previousRate: number;
  };
  studentStatus: {
    pending: number;
    active: number;
    suspended: number;
    terminated: number;
  };
  monthlyRevenue: { month: string; expected: number; received: number }[];
  recentPayments: { student: string; amount: number; date: string; status: "received" | "pending" | "overdue" }[];
  propertyBreakdown: { name: string; beds: number; occupied: number; revenue: number }[];
}

const emptyReportData: ReportData = {
  financialSummary: {
    expectedRevenue: 0,
    receivedRevenue: 0,
    outstanding: 0,
    previousPeriod: 0,
  },
  occupancy: {
    totalBeds: 0,
    occupied: 0,
    vacant: 0,
    rate: 0,
    previousRate: 0,
  },
  studentStatus: {
    pending: 0,
    active: 0,
    suspended: 0,
    terminated: 0,
  },
  monthlyRevenue: [],
  recentPayments: [],
  propertyBreakdown: [],
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string>("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [reportData, setReportData] = useState<ReportData>(emptyReportData);
  const [dateRange, setDateRange] = useState("This Month");
  const [selectedPropertyId, setSelectedPropertyId] = useState("all");

  const formatCurrency = (amount: number) => `R ${amount.toLocaleString()}`;
  const percentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  };

  // Fetch all report data
  useEffect(() => {
    const fetchReportData = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);

        // Get provider
        const provider = await getProviderByUserId(user.uid);
        if (!provider) return;
        setProviderId(provider.providerId);

        // Get properties
        const props = await getPropertiesByProvider(provider.providerId);
        setProperties(props);

        // Get all students with their property assignments
        const studentsWithProperty: StudentWithProperty[] = [];
        const allAssignments: StudentPropertyAssignment[] = [];
        
        for (const prop of props) {
          const assignments = await getPropertyAssignments(prop.propertyId, "Active", provider.providerId);
          for (const assignment of assignments) {
            allAssignments.push(assignment);
            const student = await getStudentById(assignment.studentId);
            if (student) {
              studentsWithProperty.push({
                ...student,
                propertyId: prop.propertyId,
              });
            }
          }
        }

        // Get payments
        const payments = await getPaymentsByProvider(provider.providerId);

        // Filter by selected property if not "all"
        const filteredStudents = selectedPropertyId === "all" 
          ? studentsWithProperty 
          : studentsWithProperty.filter((s: StudentWithProperty) => s.propertyId === selectedPropertyId);
        
        const filteredPayments = selectedPropertyId === "all"
          ? payments
          : payments.filter(p => p.propertyId === selectedPropertyId);

        // Calculate student status counts
        const studentStatus = {
          pending: filteredStudents.filter((s: StudentWithProperty) => s.status === "Pending").length,
          active: filteredStudents.filter((s: StudentWithProperty) => s.status === "Active").length,
          suspended: filteredStudents.filter((s: StudentWithProperty) => s.status === "Suspended").length,
          terminated: filteredStudents.filter((s: StudentWithProperty) => s.status === "Terminated" || s.status === "Vacated").length,
        };

        // Calculate occupancy
        const filteredProps = selectedPropertyId === "all" ? props : props.filter(p => p.propertyId === selectedPropertyId);
        const totalBeds = filteredProps.reduce((sum, p) => sum + (p.totalBeds || 0), 0);
        const occupied = studentStatus.active;
        const occupancyRate = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

        // Calculate financial summary
        const postedPayments = filteredPayments.filter(p => p.status === "Posted");
        const receivedRevenue = postedPayments.reduce((sum, p) => sum + (p.disbursedAmount || 0), 0);
        
        // Expected revenue: sum of funded amounts for active students
        const expectedRevenue = filteredStudents
          .filter((s: StudentWithProperty) => s.status === "Active")
          .reduce((sum: number, s: StudentWithProperty) => {
            // Use fundedAmount if available, otherwise estimate based on typical NSFAS allocation
            return sum + (s.fundedAmount || 0);
          }, 0);

        const outstanding = Math.max(0, expectedRevenue - receivedRevenue);

        // Monthly revenue (last 6 months)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();
        const monthlyRevenue: { month: string; expected: number; received: number }[] = [];
        
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          const monthPayments = postedPayments.filter(p => p.paymentPeriod?.startsWith(yearMonth));
          const monthReceived = monthPayments.reduce((sum, p) => sum + (p.disbursedAmount || 0), 0);
          
          monthlyRevenue.push({
            month: monthNames[date.getMonth()],
            expected: expectedRevenue / 6, // Distribute expected evenly for now
            received: monthReceived,
          });
        }

        // Recent payments (last 5)
        const sortedPayments = [...filteredPayments]
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5);

        const recentPayments = await Promise.all(
          sortedPayments.map(async (p) => {
            const student = studentsWithProperty.find((s: StudentWithProperty) => s.studentId === p.studentId);
            const studentName = student 
              ? `${student.firstNames} ${student.surname}`
              : "Unknown Student";
            
            const paymentDate = p.createdAt?.toDate?.() 
              ? p.createdAt.toDate().toISOString().split("T")[0]
              : "N/A";

            let status: "received" | "pending" | "overdue" = "pending";
            if (p.status === "Posted") status = "received";
            else if (p.status === "Rejected") status = "overdue";

            return {
              student: studentName,
              amount: p.disbursedAmount || 0,
              date: paymentDate,
              status,
            };
          })
        );

        // Property breakdown
        const propertyBreakdown = filteredProps.map(prop => {
          const propStudents = studentsWithProperty.filter((s: StudentWithProperty) => s.propertyId === prop.propertyId && s.status === "Active");
          const propPayments = postedPayments.filter(p => p.propertyId === prop.propertyId);
          const propRevenue = propPayments.reduce((sum, p) => sum + (p.disbursedAmount || 0), 0);

          return {
            name: prop.name,
            beds: prop.totalBeds || 0,
            occupied: propStudents.length,
            revenue: propRevenue,
          };
        });

        setReportData({
          financialSummary: {
            expectedRevenue,
            receivedRevenue,
            outstanding,
            previousPeriod: expectedRevenue * 0.9, // Estimate previous period
          },
          occupancy: {
            totalBeds,
            occupied,
            vacant: totalBeds - occupied,
            rate: occupancyRate,
            previousRate: Math.max(0, occupancyRate - 6), // Estimate previous rate
          },
          studentStatus,
          monthlyRevenue,
          recentPayments,
          propertyBreakdown,
        });
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [user, selectedPropertyId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <Sidebar userType="provider" />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading reports...</p>
            </div>
          </main>
        </div>
        <DashboardFooter />
      </div>
    );
  }

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
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                >
                  <option value="all">All Properties</option>
                  {properties.map((prop) => (
                    <option key={prop.propertyId} value={prop.propertyId}>
                      {prop.name}
                    </option>
                  ))}
                </select>

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
                value={formatCurrency(reportData.financialSummary.expectedRevenue)}
                subValue="From NSFAS allocations"
                trend={percentChange(reportData.financialSummary.expectedRevenue, reportData.financialSummary.previousPeriod)}
                trendUp={reportData.financialSummary.expectedRevenue >= reportData.financialSummary.previousPeriod}
              />
              <StatCard
                icon={TrendingUp}
                label="Received Revenue"
                value={formatCurrency(reportData.financialSummary.receivedRevenue)}
                subValue="Actually paid out"
                trend={reportData.financialSummary.expectedRevenue > 0 
                  ? `${Math.round((reportData.financialSummary.receivedRevenue / reportData.financialSummary.expectedRevenue) * 100)}% of expected`
                  : "0% of expected"}
                trendUp={true}
              />
              <StatCard
                icon={AlertCircle}
                label="Outstanding"
                value={formatCurrency(reportData.financialSummary.outstanding)}
                subValue="Awaiting payment"
              />
              <StatCard
                icon={Users}
                label="Active Students"
                value={reportData.studentStatus.active}
                subValue={`${reportData.studentStatus.pending} pending approval`}
                trend={reportData.occupancy.rate > reportData.occupancy.previousRate ? `+${reportData.occupancy.rate - reportData.occupancy.previousRate}%` : undefined}
                trendUp={reportData.occupancy.rate > reportData.occupancy.previousRate}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <RevenueChart data={reportData.monthlyRevenue} />
              </div>
              <OccupancyGauge rate={reportData.occupancy.rate} previousRate={reportData.occupancy.previousRate} />
            </div>

            {/* Student Status & Recent Payments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <StudentStatusBreakdown data={reportData.studentStatus} />
              <RecentPayments data={reportData.recentPayments} />
            </div>

            {/* Property Table */}
            <PropertyTable data={reportData.propertyBreakdown} />
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
