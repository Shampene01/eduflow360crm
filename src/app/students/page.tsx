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
  XCircle,
  ArrowRight,
  ArrowLeft,
  Wallet,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BulkImportDialog } from "@/components/students/BulkImportDialog";
import { Student, StudentPropertyAssignment, Property } from "@/lib/schema";
import * as XLSX from "xlsx";
import {
  getProviderByUserId,
  getPropertiesByProvider,
  getPropertyAssignments,
  getStudentById,
  getStudentByIdNumber,
  createStudent,
  createStudentAssignment,
  getRoomConfiguration,
} from "@/lib/db";
import { RoomConfiguration } from "@/lib/schema";

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

  // Add Student Dialog State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [verifyingNsfas, setVerifyingNsfas] = useState(false);
  const [nsfasVerified, setNsfasVerified] = useState<boolean | null>(null);
  const [formStep, setFormStep] = useState(1);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [roomConfig, setRoomConfig] = useState<RoomConfiguration | null>(null);
  const [studentForm, setStudentForm] = useState({
    // Personal Info
    idNumber: "",
    firstNames: "",
    surname: "",
    email: "",
    phoneNumber: "",
    gender: "" as "Male" | "Female" | "Other" | "",
    dateOfBirth: "",
    // Academic Info
    institution: "",
    studentNumber: "",
    program: "",
    yearOfStudy: 1,
    // NSFAS Info
    nsfasNumber: "",
    funded: false,
    nsfasFunded: false,
    nsfasDataverseId: "",
    fundedAmount: 0,
    // Non-NSFAS Funding Info
    fundingSource: "",
    fundingYear: new Date().getFullYear(),
    fundingDetails: "",
    // Room Assignment
    roomType: "" as string,
    monthlyRent: 0,
    startDate: new Date().toISOString().split("T")[0],
    // Next of Kin
    nextOfKinName: "",
    nextOfKinRelationship: "",
    nextOfKinPhone: "",
    nextOfKinEmail: "",
    nextOfKinAddress: "",
  });

  // Get room types from room configuration
  const getRoomTypes = () => {
    if (!roomConfig) return [];
    const types: { value: string; label: string; price: number }[] = [];
    
    if (roomConfig.bachelor > 0) {
      types.push({ value: "bachelor", label: "Bachelor", price: roomConfig.bachelorPrice });
    }
    if (roomConfig.singleEnSuite > 0) {
      types.push({ value: "singleEnSuite", label: "Single En-Suite", price: roomConfig.singleEnSuitePrice });
    }
    if (roomConfig.singleStandard > 0) {
      types.push({ value: "singleStandard", label: "Single Standard", price: roomConfig.singleStandardPrice });
    }
    if (roomConfig.sharing2Beds_EnSuite > 0) {
      types.push({ value: "sharing2Beds_EnSuite", label: "Sharing (2 Beds) En-Suite", price: roomConfig.sharing2Beds_EnSuitePrice });
    }
    if (roomConfig.sharing2Beds_Standard > 0) {
      types.push({ value: "sharing2Beds_Standard", label: "Sharing (2 Beds) Standard", price: roomConfig.sharing2Beds_StandardPrice });
    }
    return types;
  };

  // Handle property selection
  const handlePropertySelect = async (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    const property = properties.find(p => p.propertyId === propertyId);
    setSelectedProperty(property || null);
    
    if (property && providerId) {
      // Fetch room configuration for this property
      const config = await getRoomConfiguration(providerId, propertyId);
      setRoomConfig(config);
    }
  };

  // Verify NSFAS funding status
  const handleVerifyNsfas = async () => {
    if (!studentForm.idNumber || studentForm.idNumber.length !== 13) {
      toast.error("Please enter a valid 13-digit ID number");
      return;
    }

    setVerifyingNsfas(true);
    setNsfasVerified(null);

    try {
      const response = await fetch("/api/nsfas/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idNumber: studentForm.idNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `NSFAS verification failed: ${response.status}`);
      }
      
      const isFunded = data.funded === true;
      const fundedAmount = data.accommodationCosts || 0;
      
      if (isFunded) {
        let genderValue: "Male" | "Female" | "Other" | "" = "";
        if (data.gender) {
          const g = String(data.gender).toLowerCase();
          if (g === "male" || g === "m" || g === "0") genderValue = "Male";
          else if (g === "female" || g === "f" || g === "1") genderValue = "Female";
          else genderValue = "Other";
        }
        
        let dobValue = "";
        if (data.dateOfBirth) {
          try {
            const dob = new Date(data.dateOfBirth);
            if (!isNaN(dob.getTime())) {
              dobValue = dob.toISOString().split("T")[0];
            }
          } catch {
            dobValue = "";
          }
        }
        
        // Parse year of study from levelOfStudy (e.g., "Year 2" -> 2)
        let yearValue = 1;
        if (data.levelOfStudy) {
          const match = data.levelOfStudy.match(/\d+/);
          if (match) yearValue = parseInt(match[0]) || 1;
        }
        
        setStudentForm(prev => ({
          ...prev,
          funded: true,
          nsfasFunded: true,
          nsfasDataverseId: data.dataverseId || "",
          fundedAmount: fundedAmount,
          nsfasNumber: data.dataverseId || `NSFAS${studentForm.idNumber.slice(0, 6)}`,
          // Personal info
          firstNames: data.studentName || prev.firstNames,
          surname: data.surname || prev.surname,
          email: data.email || prev.email,
          phoneNumber: data.phoneNumber || prev.phoneNumber,
          dateOfBirth: dobValue || prev.dateOfBirth,
          gender: genderValue || prev.gender,
          // Academic info from NSFAS
          institution: data.institution || prev.institution,
          program: data.fieldOfStudy || prev.program,
          yearOfStudy: yearValue || prev.yearOfStudy,
          studentNumber: data.studentNumber || prev.studentNumber,
        }));
        
        toast.success(`Student is NSFAS funded! Accommodation allowance: R${fundedAmount.toLocaleString()}. Form auto-populated.`);
      } else {
        setStudentForm(prev => ({
          ...prev,
          funded: false,
          nsfasFunded: false,
          nsfasDataverseId: "",
          fundedAmount: 0,
          nsfasNumber: "",
        }));
        toast.info("Student is not NSFAS funded. Please fill in details manually.");
      }
      
      setNsfasVerified(isFunded);
    } catch (error: unknown) {
      console.error("Error verifying NSFAS:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to verify NSFAS status";
      toast.error(errorMessage);
      setNsfasVerified(false);
    } finally {
      setVerifyingNsfas(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setStudentForm({
      idNumber: "",
      firstNames: "",
      surname: "",
      email: "",
      phoneNumber: "",
      gender: "",
      dateOfBirth: "",
      institution: "",
      studentNumber: "",
      program: "",
      yearOfStudy: 1,
      nsfasNumber: "",
      funded: false,
      nsfasFunded: false,
      nsfasDataverseId: "",
      fundedAmount: 0,
      roomType: "",
      monthlyRent: 0,
      startDate: new Date().toISOString().split("T")[0],
      nextOfKinName: "",
      nextOfKinRelationship: "",
      nextOfKinPhone: "",
      nextOfKinEmail: "",
      nextOfKinAddress: "",
    });
    setNsfasVerified(null);
    setFormStep(1);
    setSelectedPropertyId("");
    setSelectedProperty(null);
    setRoomConfig(null);
  };

  // Add new student
  const handleAddStudent = async () => {
    if (!selectedProperty || !providerId) {
      toast.error("Please select a property first");
      return;
    }

    if (!studentForm.idNumber || !studentForm.firstNames || !studentForm.surname) {
      toast.error("Please fill in all required fields");
      setFormStep(2);
      return;
    }

    if (studentForm.idNumber.length !== 13) {
      toast.error("ID number must be 13 digits");
      setFormStep(2);
      return;
    }

    if (!studentForm.roomType) {
      toast.error("Please select a room type");
      setFormStep(4);
      return;
    }

    setAddingStudent(true);

    try {
      let student = await getStudentByIdNumber(studentForm.idNumber);
      
      if (!student) {
        student = await createStudent({
          idNumber: studentForm.idNumber,
          firstNames: studentForm.firstNames,
          surname: studentForm.surname,
          email: studentForm.email || undefined,
          phoneNumber: studentForm.phoneNumber || undefined,
          dateOfBirth: studentForm.dateOfBirth || undefined,
          institution: studentForm.institution || undefined,
          studentNumber: studentForm.studentNumber || undefined,
          program: studentForm.program || undefined,
          yearOfStudy: studentForm.yearOfStudy || undefined,
          nsfasNumber: studentForm.nsfasNumber || undefined,
          funded: studentForm.funded,
          nsfasFunded: studentForm.nsfasFunded,
          nsfasDataverseId: studentForm.nsfasDataverseId || undefined,
          fundedAmount: studentForm.fundedAmount || undefined,
          fundingYear: studentForm.fundingYear || new Date().getFullYear(),
          // Non-NSFAS funding fields
          fundingSource: studentForm.fundingSource || undefined,
          fundingDetails: studentForm.fundingDetails || undefined,
          fundingVerified: false,
          gender: studentForm.gender || undefined,
          nextOfKinName: studentForm.nextOfKinName || undefined,
          nextOfKinRelationship: studentForm.nextOfKinRelationship || undefined,
          nextOfKinPhone: studentForm.nextOfKinPhone || undefined,
          nextOfKinEmail: studentForm.nextOfKinEmail || undefined,
          nextOfKinAddress: studentForm.nextOfKinAddress || undefined,
          status: "Pending",
        });
        toast.success("Student record created");
      } else {
        toast.info("Student already exists in the system");
      }

      const assignment = await createStudentAssignment({
        studentId: student.studentId,
        propertyId: selectedProperty.propertyId,
        startDate: studentForm.startDate || new Date().toISOString().split("T")[0],
        monthlyRate: studentForm.monthlyRent,
        createdBy: user?.userId || user?.uid || "",
      });

      setStudentsWithProperties(prev => [...prev, { student, assignment, property: selectedProperty }]);
      
      resetForm();
      setIsAddDialogOpen(false);
      
      toast.success("Student assigned to property successfully!");
    } catch (error) {
      console.error("Error adding student:", error);
      toast.error("Failed to add student. Please try again.");
    } finally {
      setAddingStudent(false);
    }
  };

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
                  className="border-green-600 text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={properties.length === 0}
                  title={properties.length === 0 ? "Add a property first" : "Export students to Excel"}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              )}
              {(user?.role === "provider" || user?.role === "admin") && (
                <Button
                  onClick={() => setBulkImportOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={properties.length === 0}
                  title={properties.length === 0 ? "Add a property first" : "Bulk import students"}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>
              )}
              <Button
                onClick={() => setIsAddDialogOpen(true)}
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

      {/* Add Student Dialog - Modern UI */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[90vh] overflow-y-auto overflow-x-hidden p-0">
          {/* Header with soft gradient */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 text-white rounded-t-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-xl">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                Add New Student
              </DialogTitle>
              <DialogDescription className="text-slate-300 mt-2">
                {formStep === 1 && "Select the property where this student will be accommodated"}
                {formStep === 2 && "Verify NSFAS status and enter personal details"}
                {formStep === 3 && "Academic information and emergency contact"}
                {formStep === 4 && "Room assignment and final confirmation"}
              </DialogDescription>
            </DialogHeader>

            {/* Modern Step Indicator */}
            <div className="flex items-center justify-between mt-6 px-2 md:px-4">
              {[
                { step: 1, label: "Property" },
                { step: 2, label: "Personal" },
                { step: 3, label: "Academic" },
                { step: 4, label: "Assignment" },
              ].map((item, index) => (
                <div key={item.step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                        formStep === item.step
                          ? "bg-white text-slate-700 shadow-lg scale-110"
                          : formStep > item.step
                          ? "bg-emerald-500 text-white"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {formStep > item.step ? <CheckCircle className="w-5 h-5" /> : item.step}
                    </div>
                    <span className={`text-xs mt-1 hidden sm:block ${formStep >= item.step ? "text-white" : "text-white/60"}`}>
                      {item.label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className={`w-8 md:w-16 h-0.5 mx-1 md:mx-2 ${formStep > item.step ? "bg-emerald-500" : "bg-white/20"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 md:p-10">
            {/* Step 1: Property Selection */}
            {formStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Choose a Property</h3>
                  <p className="text-sm text-gray-500">Select where this student will be accommodated</p>
                </div>

                <div className="grid gap-3 max-h-[40vh] overflow-y-auto pr-2">
                  {properties.map((property) => (
                    <div
                      key={property.propertyId}
                      onClick={() => handlePropertySelect(property.propertyId)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedPropertyId === property.propertyId
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          selectedPropertyId === property.propertyId ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{property.name}</h4>
                          <p className="text-sm text-gray-500">{property.propertyType} • {property.totalBeds} beds available</p>
                        </div>
                        {selectedPropertyId === property.propertyId && (
                          <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => setFormStep(2)}
                    disabled={!selectedPropertyId}
                    className="bg-slate-700 hover:bg-slate-800 px-8"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Personal Information */}
            {formStep === 2 && (
              <div className="space-y-6">
                {/* NSFAS Verification Card */}
                <Card className={`border-2 transition-all ${
                  nsfasVerified === true ? "border-emerald-500 bg-emerald-50" : 
                  nsfasVerified === false ? "border-slate-300 bg-slate-50" : "border-gray-200"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        nsfasVerified === true ? "bg-emerald-500 text-white" :
                        nsfasVerified === false ? "bg-slate-400 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {nsfasVerified === true ? <CheckCircle className="w-6 h-6 md:w-7 md:h-7" /> :
                         nsfasVerified === false ? <XCircle className="w-6 h-6 md:w-7 md:h-7" /> :
                         <CreditCard className="w-6 h-6 md:w-7 md:h-7" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900">NSFAS Verification</h4>
                        <p className="text-sm text-gray-500 truncate">
                          {nsfasVerified === true ? `Funded - R${studentForm.fundedAmount.toLocaleString()} allowance` :
                           nsfasVerified === false ? "Not funded - Manual entry required" :
                           "Enter ID number and verify funding status"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <Input
                        value={studentForm.idNumber}
                        onChange={(e) => setStudentForm({ ...studentForm, idNumber: e.target.value.replace(/\D/g, "").slice(0, 13) })}
                        placeholder="Enter 13-digit ID number"
                        maxLength={13}
                        className="font-mono text-base md:text-lg tracking-wider flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyNsfas}
                        disabled={verifyingNsfas || studentForm.idNumber.length !== 13}
                        className={`px-6 ${nsfasVerified === true ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-700 hover:bg-slate-800"}`}
                      >
                        {verifyingNsfas ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Non-NSFAS Funding Details - shown when not NSFAS funded */}
                {nsfasVerified === false && (
                  <Card className="border-2 border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-500 text-white rounded-lg flex items-center justify-center">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Alternative Funding Details</h4>
                          <p className="text-sm text-gray-500">Provide funding source information for non-NSFAS students</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">Funding Source *</Label>
                          <Select
                            value={studentForm.fundingSource}
                            onValueChange={(v) => setStudentForm({ ...studentForm, fundingSource: v })}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select funding source" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Self-funded">Self-funded</SelectItem>
                              <SelectItem value="Parent/Guardian">Parent/Guardian</SelectItem>
                              <SelectItem value="Bursary">Bursary</SelectItem>
                              <SelectItem value="Scholarship">Scholarship</SelectItem>
                              <SelectItem value="Employer Sponsored">Employer Sponsored</SelectItem>
                              <SelectItem value="Funza Lushaka">Funza Lushaka</SelectItem>
                              <SelectItem value="Sasol">Sasol Bursary</SelectItem>
                              <SelectItem value="Anglo American">Anglo American</SelectItem>
                              <SelectItem value="Old Mutual">Old Mutual</SelectItem>
                              <SelectItem value="Thuthuka">Thuthuka Bursary</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">Funding Year</Label>
                          <Select
                            value={String(studentForm.fundingYear)}
                            onValueChange={(v) => setStudentForm({ ...studentForm, fundingYear: parseInt(v) })}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[2024, 2025, 2026, 2027].map((year) => (
                                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">Funded Amount (Optional)</Label>
                          <Input
                            type="number"
                            value={studentForm.fundedAmount || ""}
                            onChange={(e) => setStudentForm({ ...studentForm, fundedAmount: parseFloat(e.target.value) || 0 })}
                            placeholder="e.g. 45000"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">Reference/Details</Label>
                          <Input
                            value={studentForm.fundingDetails}
                            onChange={(e) => setStudentForm({ ...studentForm, fundingDetails: e.target.value })}
                            placeholder="e.g. Bursary reference number"
                            className="h-11"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Personal Details Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">First Names *</Label>
                    <Input
                      value={studentForm.firstNames}
                      onChange={(e) => setStudentForm({ ...studentForm, firstNames: e.target.value })}
                      placeholder="Enter first names"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Surname *</Label>
                    <Input
                      value={studentForm.surname}
                      onChange={(e) => setStudentForm({ ...studentForm, surname: e.target.value })}
                      placeholder="Enter surname"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Email Address</Label>
                    <Input
                      type="email"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                      placeholder="student@email.com"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Phone Number</Label>
                    <Input
                      value={studentForm.phoneNumber}
                      onChange={(e) => setStudentForm({ ...studentForm, phoneNumber: e.target.value })}
                      placeholder="082 123 4567"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Date of Birth</Label>
                    <Input
                      type="date"
                      value={studentForm.dateOfBirth}
                      onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Gender</Label>
                    <Select
                      value={studentForm.gender}
                      onValueChange={(v) => setStudentForm({ ...studentForm, gender: v as "Male" | "Female" | "Other" })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setFormStep(1)} className="px-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setFormStep(3)}
                    disabled={
                      !studentForm.idNumber || 
                      !studentForm.firstNames || 
                      !studentForm.surname ||
                      (nsfasVerified === false && !studentForm.fundingSource)
                    }
                    className="bg-slate-700 hover:bg-slate-800 px-8"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Academic Information */}
            {formStep === 3 && (
              <div className="space-y-6">
                {/* Academic Info Header */}
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Academic Information</h3>
                    <p className="text-sm text-gray-500">Institution and study details</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Institution</Label>
                    <Input
                      value={studentForm.institution}
                      onChange={(e) => setStudentForm({ ...studentForm, institution: e.target.value })}
                      placeholder="University/College name"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Student Number</Label>
                    <Input
                      value={studentForm.studentNumber}
                      onChange={(e) => setStudentForm({ ...studentForm, studentNumber: e.target.value })}
                      placeholder="Student number"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Program/Course</Label>
                    <Input
                      value={studentForm.program}
                      onChange={(e) => setStudentForm({ ...studentForm, program: e.target.value })}
                      placeholder="e.g. Bachelor of Commerce"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Year of Study</Label>
                    <Select
                      value={String(studentForm.yearOfStudy)}
                      onValueChange={(v) => setStudentForm({ ...studentForm, yearOfStudy: parseInt(v) })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((year) => (
                          <SelectItem key={year} value={String(year)}>Year {year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="pt-4">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Emergency Contact</h3>
                      <p className="text-sm text-gray-500">Next of kin details (optional)</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Full Name</Label>
                      <Input
                        value={studentForm.nextOfKinName}
                        onChange={(e) => setStudentForm({ ...studentForm, nextOfKinName: e.target.value })}
                        placeholder="Contact person name"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Relationship</Label>
                      <Input
                        value={studentForm.nextOfKinRelationship}
                        onChange={(e) => setStudentForm({ ...studentForm, nextOfKinRelationship: e.target.value })}
                        placeholder="e.g. Parent, Guardian"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Phone Number</Label>
                      <Input
                        value={studentForm.nextOfKinPhone}
                        onChange={(e) => setStudentForm({ ...studentForm, nextOfKinPhone: e.target.value })}
                        placeholder="082 123 4567"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Email Address</Label>
                      <Input
                        type="email"
                        value={studentForm.nextOfKinEmail}
                        onChange={(e) => setStudentForm({ ...studentForm, nextOfKinEmail: e.target.value })}
                        placeholder="contact@email.com"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setFormStep(2)} className="px-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={() => setFormStep(4)} className="bg-slate-700 hover:bg-slate-800 px-8">
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Room Assignment */}
            {formStep === 4 && (
              <div className="space-y-6">
                {/* Room Selection */}
                <div className="text-center mb-4">
                  <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Room Assignment</h3>
                  <p className="text-sm text-gray-500">Select room type and confirm details</p>
                </div>

                {/* Room Type Cards */}
                <div className="grid gap-3 max-h-[35vh] overflow-y-auto pr-2">
                  {getRoomTypes().length > 0 ? (
                    getRoomTypes().map((room) => (
                      <div
                        key={room.value}
                        onClick={() => setStudentForm({ ...studentForm, roomType: room.value, monthlyRent: room.price })}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                          studentForm.roomType === room.value
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              studentForm.roomType === room.value ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
                            }`}>
                              <Building2 className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{room.label}</h4>
                              <p className="text-sm text-gray-500">Available for assignment</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-emerald-600">R{room.price.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">per month</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center">
                        <p className="text-gray-500">No room types configured for this property</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Start Date */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Monthly Rent</Label>
                    <Input
                      type="number"
                      value={studentForm.monthlyRent}
                      onChange={(e) => setStudentForm({ ...studentForm, monthlyRent: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="h-11 text-lg font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Start Date</Label>
                    <Input
                      type="date"
                      value={studentForm.startDate}
                      onChange={(e) => setStudentForm({ ...studentForm, startDate: e.target.value })}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Summary Card */}
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4 md:p-5">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      Confirmation Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Student</span>
                          <span className="font-medium text-right truncate">{studentForm.firstNames} {studentForm.surname}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">ID Number</span>
                          <span className="font-mono text-right">{studentForm.idNumber}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-gray-500">NSFAS Status</span>
                          <Badge className={studentForm.funded ? "bg-emerald-500" : "bg-slate-400"}>
                            {studentForm.funded ? "Funded" : "Not Funded"}
                          </Badge>
                        </div>
                        {!studentForm.funded && studentForm.fundingSource && (
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-gray-500">Funding Source</span>
                            <Badge className="bg-amber-500">{studentForm.fundingSource}</Badge>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Property</span>
                          <span className="font-medium text-right truncate">{selectedProperty?.name}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Room Type</span>
                          <span className="font-medium text-right truncate">{getRoomTypes().find(r => r.value === studentForm.roomType)?.label || "-"}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Monthly Rent</span>
                          <span className="font-bold text-emerald-600">R{studentForm.monthlyRent.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4">
                  <Button variant="outline" onClick={() => setFormStep(3)} className="px-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleAddStudent}
                    disabled={addingStudent || !studentForm.roomType}
                    className="bg-emerald-600 hover:bg-emerald-700 px-8 shadow-md"
                  >
                    {addingStudent ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding Student...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm & Add Student
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
