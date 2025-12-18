"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Building2,
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Calendar,
  DollarSign,
  Clock,
  BadgeCheck,
  FileText,
  User,
  Info,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Payment,
  PaymentSource,
  PaymentStatus,
  AllowanceType,
  Property,
  Student,
  StudentPropertyAssignment,
} from "@/lib/schema";
import { getProviderByUserId, getProviderById, getPropertiesByProvider, getPaymentsByProvider, getPaymentSummary, getPaymentSummaryFromAggregation, createPayment, approvePayment, rejectPayment, deletePayment, getStudentById, getPropertyAssignments } from "@/lib/db";

interface PaymentWithStudent extends Payment {
  student?: Student;
  propertyName?: string;
}

function PaymentsContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<PaymentWithStudent[]>([]);
  const [providerId, setProviderId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Filters
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    new Date().toISOString().slice(0, 7) // Current month YYYY-MM
  );
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Summary
  const [summary, setSummary] = useState({
    totalPaid: 0,
    nsfasPaid: 0,
    manualPaid: 0,
    pendingApproval: 0,
  });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithStudent | null>(null);
  const [processing, setProcessing] = useState(false);

  // Add payment form
  const [assignedStudents, setAssignedStudents] = useState<{ student: Student; assignment: StudentPropertyAssignment; propertyName: string }[]>([]);
  const [newPayment, setNewPayment] = useState({
    studentId: "",
    propertyId: "",
    paymentPeriod: new Date().toISOString().slice(0, 7),
    disbursedAmount: 0,
    reason: "",
    notes: "",
  });
  const [rejectionReason, setRejectionReason] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Role-based permissions
  const isSuperAdmin = user?.roleCode === 4 || user?.platformRole === "superAdmin";
  const isAdmin = (user?.roleCode && user.roleCode >= 3) || isSuperAdmin;
  const isFinance = user?.roleCode === 1; // Manager role as Finance
  const canAddPayment = isSuperAdmin || isAdmin || isFinance;
  const canApprove = isSuperAdmin || isAdmin;
  const canDelete = isSuperAdmin;

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid) return;

      try {
        let provider = null;
        if ((user as any)?.providerId) {
          provider = await getProviderById((user as any).providerId);
        } else {
          provider = await getProviderByUserId(uid);
        }
        if (!provider) {
          toast.error("No provider found");
          setLoading(false);
          return;
        }
        setProviderId(provider.providerId);

        // Fetch properties
        const props = await getPropertiesByProvider(provider.providerId);
        setProperties(props);

        // Fetch payments
        await fetchPayments(provider.providerId);

        // Fetch assigned students for add payment modal
        await fetchAssignedStudents(provider.providerId, props);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, user?.uid]);

  const fetchPayments = async (provId: string) => {
    try {
      const filters: {
        propertyId?: string;
        paymentPeriod?: string;
        source?: PaymentSource;
        status?: PaymentStatus;
      } = {};

      if (selectedPropertyId !== "all") filters.propertyId = selectedPropertyId;
      if (selectedPeriod) filters.paymentPeriod = selectedPeriod;
      if (selectedSource !== "all") filters.source = selectedSource as PaymentSource;
      if (selectedStatus !== "all") filters.status = selectedStatus as PaymentStatus;

      const paymentsData = await getPaymentsByProvider(provId, filters);

      // Enrich with student and property data
      const enrichedPayments: PaymentWithStudent[] = await Promise.all(
        paymentsData.map(async (payment) => {
          const student = await getStudentById(payment.studentId);
          const property = properties.find(p => p.propertyId === payment.propertyId);
          return {
            ...payment,
            student: student || undefined,
            propertyName: property?.name,
          };
        })
      );

      setPayments(enrichedPayments);

      // Update summary (uses pre-aggregated data when available - 1 read vs hundreds)
      const summaryData = await getPaymentSummaryFromAggregation(provId, selectedPeriod || undefined);
      setSummary(summaryData);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const fetchAssignedStudents = async (provId: string, props: Property[]) => {
    try {
      const allAssigned: { student: Student; assignment: StudentPropertyAssignment; propertyName: string }[] = [];
      
      for (const property of props) {
        const assignments = await getPropertyAssignments(property.propertyId, "Active", provId);
        for (const assignment of assignments) {
          const student = await getStudentById(assignment.studentId);
          if (student) {
            allAssigned.push({
              student,
              assignment,
              propertyName: property.name,
            });
          }
        }
      }
      
      setAssignedStudents(allAssigned);
    } catch (error) {
      console.error("Error fetching assigned students:", error);
    }
  };

  // Re-fetch when filters change
  useEffect(() => {
    if (providerId) {
      fetchPayments(providerId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId, selectedPeriod, selectedSource, selectedStatus, providerId]);

  // Filter by search
  const filteredPayments = payments.filter((payment) => {
    const search = searchTerm.toLowerCase();
    return (
      payment.student?.firstNames.toLowerCase().includes(search) ||
      payment.student?.surname.toLowerCase().includes(search) ||
      payment.student?.idNumber.includes(search) ||
      payment.student?.studentNumber?.toLowerCase().includes(search)
    );
  });

  // Pagination calculations
  const totalRecords = filteredPayments.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPropertyId, selectedPeriod, selectedSource, selectedStatus, pageSize]);

  // Add manual payment
  const handleAddPayment = async () => {
    if (!newPayment.studentId || !newPayment.disbursedAmount || !newPayment.reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    const selectedAssignment = assignedStudents.find(a => a.student.studentId === newPayment.studentId);
    if (!selectedAssignment) {
      toast.error("Please select a valid student");
      return;
    }

    setProcessing(true);
    try {
      await createPayment({
        providerId,
        propertyId: selectedAssignment.assignment.propertyId,
        studentId: newPayment.studentId,
        source: "Manual",
        allowanceType: "AccommodationAllowance",
        disbursedAmount: newPayment.disbursedAmount,
        paymentPeriod: newPayment.paymentPeriod,
        status: "PendingApproval",
        reason: newPayment.reason,
        notes: newPayment.notes || undefined,
        createdBy: user?.userId || user?.uid || "",
      });

      toast.success("Manual payment added - pending approval");
      setIsAddModalOpen(false);
      setNewPayment({
        studentId: "",
        propertyId: "",
        paymentPeriod: new Date().toISOString().slice(0, 7),
        disbursedAmount: 0,
        reason: "",
        notes: "",
      });
      fetchPayments(providerId);
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error("Failed to add payment");
    } finally {
      setProcessing(false);
    }
  };

  // Approve payment
  const handleApprove = async () => {
    if (!selectedPayment) return;

    // Cannot approve own payment
    if (selectedPayment.createdBy === (user?.userId || user?.uid)) {
      toast.error("You cannot approve your own payment");
      return;
    }

    setProcessing(true);
    try {
      await approvePayment(selectedPayment.paymentId, user?.userId || user?.uid || "");
      toast.success("Payment approved");
      setIsApproveDialogOpen(false);
      setSelectedPayment(null);
      fetchPayments(providerId);
    } catch (error) {
      console.error("Error approving payment:", error);
      toast.error("Failed to approve payment");
    } finally {
      setProcessing(false);
    }
  };

  // Reject payment
  const handleReject = async () => {
    if (!selectedPayment || !rejectionReason) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setProcessing(true);
    try {
      await rejectPayment(
        selectedPayment.paymentId,
        user?.userId || user?.uid || "",
        rejectionReason
      );
      toast.success("Payment rejected");
      setIsRejectDialogOpen(false);
      setSelectedPayment(null);
      setRejectionReason("");
      fetchPayments(providerId);
    } catch (error) {
      console.error("Error rejecting payment:", error);
      toast.error("Failed to reject payment");
    } finally {
      setProcessing(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  // Format period for display
  const formatPeriod = (period: string) => {
    const [year, month] = period.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });
  };

  // Mask ID number
  const maskIdNumber = (idNumber: string) => {
    if (!idNumber || idNumber.length < 4) return idNumber;
    return "****" + idNumber.slice(-4);
  };

  // Get status badge
  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "Posted":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Posted</Badge>;
      case "PendingApproval":
        return <Badge className="bg-amber-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "Rejected":
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get source badge
  const getSourceBadge = (source: PaymentSource) => {
    if (source === "NSFAS") {
      return <Badge className="bg-blue-500">NSFAS</Badge>;
    }
    return <Badge className="bg-orange-500">Manual</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <Sidebar userType="provider" />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-4" />
              <p className="text-gray-500">Loading payments...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <Sidebar userType="provider" />
        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-7 h-7 text-amber-500" />
                Payments
              </h1>
              <p className="text-gray-500">Track NSFAS disbursements and manage student accommodation payments</p>
            </div>
            {canAddPayment && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-gray-900"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Manual Payment
              </Button>
            )}
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Property</Label>
                  <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Properties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      {properties.map((p) => (
                        <SelectItem key={p.propertyId} value={p.propertyId}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Payment Period</Label>
                  <Input
                    type="month"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Source</Label>
                  <Select value={selectedSource} onValueChange={setSelectedSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="NSFAS">NSFAS</SelectItem>
                      <SelectItem value="Manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Posted">Posted</SelectItem>
                      <SelectItem value="PendingApproval">Pending Approval</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Name, ID, Student #"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="w-5 h-5 text-green-600 font-bold text-lg flex items-center justify-center">R</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Paid (Period)</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalPaid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BadgeCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">NSFAS Paid</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.nsfasPaid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Manual Paid</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.manualPaid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={summary.pendingApproval > 0 ? "border-amber-300" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${summary.pendingApproval > 0 ? "bg-amber-100" : "bg-gray-100"}`}>
                    <Clock className={`w-5 h-5 ${summary.pendingApproval > 0 ? "text-amber-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pending Approval</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.pendingApproval)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Records ({filteredPayments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPayments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>No payments found for the selected filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>ID Number</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPayments.map((payment) => (
                        <TableRow key={payment.paymentId}>
                          <TableCell className="font-medium">
                            {payment.student?.firstNames} {payment.student?.surname}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {maskIdNumber(payment.student?.idNumber || "")}
                          </TableCell>
                          <TableCell>{payment.propertyName || "-"}</TableCell>
                          <TableCell className="text-sm">{payment.allowanceType}</TableCell>
                          <TableCell>{getSourceBadge(payment.source)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(payment.disbursedAmount)}
                          </TableCell>
                          <TableCell>{formatPeriod(payment.paymentPeriod)}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setIsDetailsOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {payment.status === "PendingApproval" && payment.source === "Manual" && canApprove && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setIsApproveDialogOpen(true);
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setIsRejectDialogOpen(true);
                                    }}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination Controls */}
              {totalRecords > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Showing</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => setPageSize(Number(value))}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>of {totalRecords} records</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      <DashboardFooter />

      {/* Add Manual Payment Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Manual Payment
            </DialogTitle>
            <DialogDescription>
              Create a manual payment record. This will require admin approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Student *</Label>
              <Select
                value={newPayment.studentId}
                onValueChange={(v) => setNewPayment({ ...newPayment, studentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assigned student" />
                </SelectTrigger>
                <SelectContent>
                  {assignedStudents.length === 0 ? (
                    <SelectItem value="" disabled>No assigned students</SelectItem>
                  ) : (
                    assignedStudents.map(({ student, propertyName }) => (
                      <SelectItem key={student.studentId} value={student.studentId}>
                        {student.firstNames} {student.surname} - {propertyName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Only students with active allocations are shown</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Period *</Label>
                <Input
                  type="month"
                  value={newPayment.paymentPeriod}
                  onChange={(e) => setNewPayment({ ...newPayment, paymentPeriod: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (R) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newPayment.disbursedAmount || ""}
                  onChange={(e) => setNewPayment({ ...newPayment, disbursedAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Input
                placeholder="Reason for manual payment"
                value={newPayment.reason}
                onChange={(e) => setNewPayment({ ...newPayment, reason: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Additional notes..."
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              <Info className="w-4 h-4 inline mr-2" />
              Manual payments require admin approval before being posted.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={processing || !newPayment.studentId || !newPayment.disbursedAmount || !newPayment.reason}
              className="bg-amber-500 hover:bg-amber-600 text-gray-900"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Payment Details</SheetTitle>
            <SheetDescription>
              {selectedPayment?.source === "NSFAS" && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
                  <BadgeCheck className="w-4 h-4 inline mr-1" />
                  Imported from NSFAS
                </div>
              )}
            </SheetDescription>
          </SheetHeader>

          {selectedPayment && (
            <div className="mt-6 space-y-6">
              {/* Payment Information */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Payment Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source</span>
                    {getSourceBadge(selectedPayment.source)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Allowance Type</span>
                    <span>{selectedPayment.allowanceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold text-lg">{formatCurrency(selectedPayment.disbursedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Period</span>
                    <span>{formatPeriod(selectedPayment.paymentPeriod)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    {getStatusBadge(selectedPayment.status)}
                  </div>
                  {selectedPayment.reason && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reason</span>
                      <span>{selectedPayment.reason}</span>
                    </div>
                  )}
                  {selectedPayment.externalReference && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reference</span>
                      <span className="font-mono">{selectedPayment.externalReference}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Student Information */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Student Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span>{selectedPayment.student?.firstNames} {selectedPayment.student?.surname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ID Number</span>
                    <span className="font-mono">{selectedPayment.student?.idNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Institution</span>
                    <span>{selectedPayment.student?.institution || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Property</span>
                    <span>{selectedPayment.propertyName}</span>
                  </div>
                </div>
              </div>

              {/* Audit Trail */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Audit Trail
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created By</span>
                    <span>{selectedPayment.createdBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created At</span>
                    <span>
                      {selectedPayment.createdAt?.toDate
                        ? selectedPayment.createdAt.toDate().toLocaleString()
                        : "-"}
                    </span>
                  </div>
                  {selectedPayment.approvedBy && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Approved By</span>
                        <span>{selectedPayment.approvedBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Approved At</span>
                        <span>
                          {selectedPayment.approvedAt?.toDate
                            ? selectedPayment.approvedAt.toDate().toLocaleString()
                            : "-"}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedPayment.rejectedBy && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rejected By</span>
                        <span>{selectedPayment.rejectedBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rejection Reason</span>
                        <span className="text-red-600">{selectedPayment.rejectionReason}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve Dialog */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this payment of{" "}
              <strong>{selectedPayment && formatCurrency(selectedPayment.disbursedAmount)}</strong> for{" "}
              <strong>{selectedPayment?.student?.firstNames} {selectedPayment?.student?.surname}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-500 hover:bg-green-600"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={processing || !rejectionReason}
              className="bg-red-500 hover:bg-red-600"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <PaymentsContent />
    </ProtectedRoute>
  );
}
