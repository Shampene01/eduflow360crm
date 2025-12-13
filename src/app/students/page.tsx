"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  Building2,
  CheckCircle,
  Clock,
  Upload,
  GraduationCap,
  CreditCard,
  Loader2,
  Download,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BulkImportDialog } from "@/components/students/BulkImportDialog";
import { Student, StudentPropertyAssignment, Property } from "@/lib/schema";
import * as XLSX from "xlsx";
import {
  getProviderByUserId,
  getPropertiesByProvider,
  getPropertyAssignments,
  getStudentById,
} from "@/lib/db";

interface StudentWithProperty {
  student: Student;
  assignment: StudentPropertyAssignment;
  property: Property;
}

function StudentsContent() {
  const { user } = useAuth();
  const [studentsWithProperties, setStudentsWithProperties] = useState<StudentWithProperty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [providerId, setProviderId] = useState<string>("");

  const fetchData = async () => {
    const uid = user?.userId || user?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    try {
      // Get provider
      const provider = await getProviderByUserId(uid);
      if (!provider) {
        setLoading(false);
        return;
      }
      setProviderId(provider.providerId);

      // Get all properties for this provider
      const providerProperties = await getPropertiesByProvider(provider.providerId);
      setProperties(providerProperties);

      // Get all students assigned to these properties
      const allStudentsWithProperties: StudentWithProperty[] = [];
      
      for (const property of providerProperties) {
        // Get assignments for this property
        const assignments = await getPropertyAssignments(property.propertyId);
        
        // Get student details for each assignment
        for (const assignment of assignments) {
          const student = await getStudentById(assignment.studentId);
          if (student) {
            allStudentsWithProperties.push({
              student,
              assignment,
              property,
            });
          }
        }
      }

      setStudentsWithProperties(allStudentsWithProperties);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.userId, user?.uid]);

  const filteredStudents = studentsWithProperties.filter(
    ({ student, property }) =>
      student.firstNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      student.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if user can export (Provider or Administrator)
  const canExport = user?.role === "provider" || user?.role === "administrator";

  // Export to Excel function
  const exportToExcel = () => {
    if (!canExport) return;

    // Prepare data for export
    const exportData = filteredStudents.map(({ student, assignment, property }) => ({
      "First Names": student.firstNames,
      "Surname": student.surname,
      "ID Number": student.idNumber,
      "Student Number": student.studentNumber || "-",
      "Email": student.email || "-",
      "Phone": student.phoneNumber || "-",
      "Property": property.name,
      "Institution": student.institution || "-",
      "NSFAS Funded": student.funded ? "Yes" : "No",
      "Monthly Rent": assignment.monthlyRate || 0,
      "Status": assignment.status,
      "Room ID": assignment.roomId || "-",
      "Bed ID": assignment.bedId || "-",
      "Start Date": assignment.startDate ? new Date(assignment.startDate).toLocaleDateString() : "-",
      "End Date": assignment.endDate ? new Date(assignment.endDate).toLocaleDateString() : "-",
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws["!cols"] = [
      { wch: 15 }, // First Names
      { wch: 15 }, // Surname
      { wch: 15 }, // ID Number
      { wch: 15 }, // Student Number
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 20 }, // Property
      { wch: 20 }, // Institution
      { wch: 12 }, // NSFAS Funded
      { wch: 12 }, // Monthly Rent
      { wch: 10 }, // Status
      { wch: 12 }, // Room Number
      { wch: 12 }, // Bed Number
      { wch: 12 }, // Start Date
      { wch: 12 }, // End Date
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Students");

    // Generate filename with date
    const date = new Date().toISOString().split("T")[0];
    const filename = `Students_Export_${date}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  };

  // Calculate stats
  const totalStudents = studentsWithProperties.length;
  const fundedStudents = studentsWithProperties.filter(({ student }) => student.funded).length;
  const activeAssignments = studentsWithProperties.filter(({ assignment }) => assignment.status === "Active").length;
  const totalMonthlyRevenue = studentsWithProperties
    .filter(({ assignment }) => assignment.status === "Active")
    .reduce((sum, { assignment }) => sum + (assignment.monthlyRate || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />

      <div className="flex flex-1">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Students</h1>
              <p className="text-gray-500">Manage students allocated to your properties</p>
            </div>
            <div className="flex gap-2">
              {canExport && (
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              )}
              {(user?.role === "provider" || user?.role === "admin") && (
                <Button
                  onClick={() => setBulkImportOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>
              )}
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={properties.length === 0}
                title={properties.length === 0 ? "Add a property first before adding students" : "Add a new student"}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                    <p className="text-sm text-gray-500">Total Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{fundedStudents}</p>
                    <p className="text-sm text-gray-500">NSFAS Funded</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{activeAssignments}</p>
                    <p className="text-sm text-gray-500">Active Placements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      R{totalMonthlyRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Monthly Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, ID number, email or property..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Students Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {searchTerm ? "No students found" : "No students yet"}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "Students will appear here once allocated to your properties"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>ID Number</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>NSFAS</TableHead>
                      <TableHead>Monthly Rent</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(({ student, assignment, property }) => (
                      <TableRow key={`${student.studentId}-${assignment.assignmentId}`}>
                        <TableCell>
                          <div>
                            <Link
                              href={`/students/${student.studentId}`}
                              className="font-medium text-amber-600 hover:text-amber-700 hover:underline"
                            >
                              {student.firstNames} {student.surname}
                            </Link>
                            {student.studentNumber && (
                              <p className="text-sm text-gray-500">{student.studentNumber}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{student.idNumber}</TableCell>
                        <TableCell>
                          <Link
                            href={`/properties/${property.propertyId}`}
                            className="text-amber-600 hover:text-amber-700 hover:underline"
                          >
                            {property.name}
                          </Link>
                        </TableCell>
                        <TableCell>{student.institution || "-"}</TableCell>
                        <TableCell>
                          {student.funded ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Funded
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Not Funded</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment.monthlyRate ? (
                            <span className="font-medium">R{assignment.monthlyRate.toLocaleString()}</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              assignment.status === "Active"
                                ? "border-green-500 text-green-700 bg-green-50"
                                : assignment.status === "Future"
                                ? "border-blue-500 text-blue-700 bg-blue-50"
                                : assignment.status === "Closed"
                                ? "border-gray-500 text-gray-700 bg-gray-50"
                                : "border-red-500 text-red-700 bg-red-50"
                            }
                          >
                            {assignment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      <DashboardFooter />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onImportComplete={() => {
          // Refresh student list after import
          fetchData();
        }}
      />
    </div>
  );
}

export default function StudentsPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <StudentsContent />
    </ProtectedRoute>
  );
}
