"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  GraduationCap,
  Building2,
  Calendar,
  CreditCard,
  Users,
  MapPin,
  Edit,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Student, StudentPropertyAssignment, Property, Payment } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  getStudentById,
  getStudentAssignments,
  getPropertyById,
  getProviderByUserId,
  getPaymentsByStudent,
} from "@/lib/db";
import { syncStudentToCRM } from "@/lib/crmSync";

interface AssignmentWithProperty {
  assignment: StudentPropertyAssignment;
  property: Property | null;
}

function StudentDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string>("");
  const [syncingToDataverse, setSyncingToDataverse] = useState(false);
  const [providerDataverseId, setProviderDataverseId] = useState<string>("");
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const uid = user?.userId || user?.uid;
      if (!id || !uid) return;

      try {
        // Get provider info
        const provider = await getProviderByUserId(uid);
        if (provider) {
          setProviderId(provider.providerId);
          setProviderDataverseId(provider.dataverseId || "");
        }

        // Fetch student
        const studentData = await getStudentById(id as string);
        if (!studentData) {
          toast.error("Student not found");
          router.push("/students");
          return;
        }
        setStudent(studentData);

        // Fetch student's property assignments
        const studentAssignments = await getStudentAssignments(id as string);
        
        // Fetch property details for each assignment
        const assignmentsWithProperties: AssignmentWithProperty[] = [];
        for (const assignment of studentAssignments) {
          let property: Property | null = null;
          if (provider) {
            property = await getPropertyById(provider.providerId, assignment.propertyId);
          }
          assignmentsWithProperties.push({ assignment, property });
        }
        setAssignments(assignmentsWithProperties);

        // Fetch student's payment history
        const studentPayments = await getPaymentsByStudent(id as string);
        setPayments(studentPayments);
      } catch (error) {
        console.error("Error fetching student:", error);
        toast.error("Failed to load student data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user?.userId, user?.uid, router]);

  // Handle sync to Dataverse
  const handleSyncToDataverse = async () => {
    if (!student || !providerDataverseId) {
      toast.error("Provider must be synced to Dataverse first");
      return;
    }

    // Get the active assignment (if any)
    const activeAssignment = assignments.find(a => a.assignment.status === "Active");
    if (!activeAssignment) {
      toast.error("Student must have an active property assignment to sync");
      return;
    }

    // Check if property has Dataverse ID
    const propertyDataverseId = activeAssignment.property?.dataverseId;
    if (!propertyDataverseId) {
      toast.error("Property must be synced to Dataverse first");
      return;
    }

    setSyncingToDataverse(true);
    try {
      const result = await syncStudentToCRM(
        student,
        activeAssignment.assignment,
        propertyDataverseId,
        providerDataverseId,
        user?.dataverseId || "",
        providerId
      );

      if (result.success) {
        toast.success("Student synced to Dataverse successfully!");
        // Update local state with new Dataverse ID
        if (result.studentDataverseId) {
          setStudent({ ...student, dataverseId: result.studentDataverseId });
        }
      } else {
        toast.error(result.error || "Failed to sync student to Dataverse");
      }
    } catch (error) {
      console.error("Error syncing to Dataverse:", error);
      toast.error("Failed to sync student to Dataverse");
    } finally {
      setSyncingToDataverse(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900">Student not found</h2>
              <Button asChild className="mt-4">
                <Link href="/students">Back to Students</Link>
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      Pending: "bg-yellow-500",
      Verified: "bg-blue-500",
      Active: "bg-green-500",
      Inactive: "bg-gray-500",
      Graduated: "bg-purple-500",
    };
    return <Badge className={statusColors[status] || "bg-gray-500"}>{status}</Badge>;
  };

  const getAssignmentStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      Active: "bg-green-500",
      Future: "bg-blue-500",
      Closed: "bg-gray-500",
      Cancelled: "bg-red-500",
    };
    return <Badge className={statusColors[status] || "bg-gray-500"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/students">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {student.firstNames} {student.surname}
                </h1>
                <p className="text-gray-500">Student Profile</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(student.status)}
              {/* Sync to Dataverse button - only visible for Admin (roleCode >= 3) */}
              {(user?.roleCode ?? 0) >= 3 && (
                <Button
                  onClick={handleSyncToDataverse}
                  disabled={syncingToDataverse}
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {syncingToDataverse ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync to Dataverse
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Student
              </Button>
            </div>
          </div>

          {/* Tabs at the top */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Student Details
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment History
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                Documents
              </TabsTrigger>
            </TabsList>

            {/* Student Details Tab */}
            <TabsContent value="details">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Personal Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Full Name</p>
                          <p className="font-medium">{student.firstNames} {student.surname}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">ID Number</p>
                          <p className="font-mono">{student.idNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Gender</p>
                          <p className="font-medium">{student.gender || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Date of Birth</p>
                          <p className="font-medium">{student.dateOfBirth || "-"}</p>
                        </div>
                      </div>

                      <div className="border-t my-4" />

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{student.email || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium">{student.phoneNumber || "-"}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Academic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5" />
                        Academic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Institution</p>
                          <p className="font-medium">{student.institution || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Student Number</p>
                          <p className="font-mono">{student.studentNumber || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Program/Course</p>
                          <p className="font-medium">{student.program || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Year of Study</p>
                          <p className="font-medium">
                            {student.yearOfStudy ? `Year ${student.yearOfStudy}` : "-"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Property Assignments */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Property Assignments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {assignments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No property assignments found</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {assignments.map(({ assignment, property }) => (
                            <div
                              key={assignment.assignmentId}
                              className="p-4 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <Link
                                    href={`/properties/${assignment.propertyId}`}
                                    className="font-semibold text-amber-600 hover:underline"
                                  >
                                    {property?.name || "Unknown Property"}
                                  </Link>
                                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      {assignment.startDate}
                                      {assignment.endDate && ` - ${assignment.endDate}`}
                                    </span>
                                    {assignment.monthlyRate && (
                                      <span className="flex items-center gap-1">
                                        <CreditCard className="w-4 h-4" />
                                        R{assignment.monthlyRate.toLocaleString()}/month
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {getAssignmentStatusBadge(assignment.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar for Student Details */}
                <div className="space-y-6">
                  {/* NSFAS Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        NSFAS Funding
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`p-4 rounded-lg ${student.funded ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
                        <div className="flex items-center gap-3">
                          {student.funded ? (
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          ) : (
                            <XCircle className="w-8 h-8 text-gray-400" />
                          )}
                          <div>
                            <p className={`font-semibold ${student.funded ? "text-green-800" : "text-gray-700"}`}>
                              {student.funded ? "NSFAS Funded" : "Not Funded"}
                            </p>
                            {student.funded && student.fundedAmount && (
                              <p className="text-sm text-green-700">
                                R{student.fundedAmount.toLocaleString()} / year
                              </p>
                            )}
                          </div>
                        </div>
                        {student.nsfasNumber && (
                          <div className="mt-3 pt-3 border-t border-green-200">
                            <p className="text-sm text-gray-500">NSFAS Number</p>
                            <p className="font-mono">{student.nsfasNumber}</p>
                          </div>
                        )}
                        {student.fundingYear && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-500">Funding Year</p>
                            <p className="font-medium">{student.fundingYear}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Next of Kin */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Next of Kin
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {student.nextOfKinName ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-500">Name</p>
                            <p className="font-medium">{student.nextOfKinName}</p>
                          </div>
                          {student.nextOfKinRelationship && (
                            <div>
                              <p className="text-sm text-gray-500">Relationship</p>
                              <p className="font-medium">{student.nextOfKinRelationship}</p>
                            </div>
                          )}
                          {student.nextOfKinPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-500">Phone</p>
                                <p className="font-medium">{student.nextOfKinPhone}</p>
                              </div>
                            </div>
                          )}
                          {student.nextOfKinEmail && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium">{student.nextOfKinEmail}</p>
                              </div>
                            </div>
                          )}
                          {student.nextOfKinAddress && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <p className="text-sm text-gray-500">Address</p>
                                <p className="font-medium text-sm">{student.nextOfKinAddress}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No next of kin information</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Assignments</span>
                        <span className="font-semibold">{assignments.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Active Assignments</span>
                        <span className="font-semibold">
                          {assignments.filter(a => a.assignment.status === "Active").length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Member Since</span>
                        <span className="font-semibold">
                          {student.createdAt?.toDate?.()?.toLocaleDateString() || "-"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Payment History Tab */}
            <TabsContent value="payments">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Payment History</CardTitle>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <span className="text-gray-500">Total Received: </span>
                        <span className="font-bold text-green-600">
                          R{payments
                            .filter(p => p.status === "Posted")
                            .reduce((sum, p) => sum + p.disbursedAmount, 0)
                            .toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No payment history found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((payment) => (
                            <TableRow key={payment.paymentId}>
                              <TableCell className="font-medium">
                                {(() => {
                                  const [year, month] = payment.paymentPeriod.split("-");
                                  const date = new Date(parseInt(year), parseInt(month) - 1);
                                  return date.toLocaleDateString("en-ZA", { month: "short", year: "numeric" });
                                })()}
                              </TableCell>
                              <TableCell>
                                <Badge className={payment.source === "NSFAS" ? "bg-blue-500" : "bg-orange-500"}>
                                  {payment.source}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {payment.allowanceType}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                R{payment.disbursedAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  payment.status === "Posted" ? "bg-green-500" :
                                  payment.status === "PendingApproval" ? "bg-amber-500" :
                                  "bg-red-500"
                                }>
                                  {payment.status === "Posted" ? "Posted" :
                                   payment.status === "PendingApproval" ? "Pending" :
                                   "Rejected"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-gray-500">
                    <p>No documents uploaded</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}

export default function StudentDetailPage() {
  return (
    <ProtectedRoute>
      <StudentDetailContent />
    </ProtectedRoute>
  );
}
