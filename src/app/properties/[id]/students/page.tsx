"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Search,
  Loader2,
  Building2,
  CheckCircle,
  XCircle,
  GraduationCap,
  Phone,
  Mail,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Property, Student, StudentPropertyAssignment } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getProviderByUserId,
  getPropertyById,
  getPropertyAssignments,
  getStudentById,
  createStudent,
  createStudentAssignment,
  getStudentByIdNumber,
} from "@/lib/db";

interface StudentWithAssignment {
  student: Student;
  assignment: StudentPropertyAssignment;
}

function ManageStudentsContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [students, setStudents] = useState<StudentWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Add Student Dialog State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [verifyingNsfas, setVerifyingNsfas] = useState(false);
  const [nsfasVerified, setNsfasVerified] = useState<boolean | null>(null);
  const [studentForm, setStudentForm] = useState({
    idNumber: "",
    firstNames: "",
    surname: "",
    email: "",
    phoneNumber: "",
    institution: "",
    studentNumber: "",
    program: "",
    yearOfStudy: 1,
    nsfasNumber: "",
    funded: false,
    fundedAmount: 0,
    gender: "" as "Male" | "Female" | "Other" | "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const uid = user?.userId || user?.uid;
      if (!id || !uid) return;

      try {
        const provider = await getProviderByUserId(uid);
        if (!provider) {
          toast.error("No provider found");
          setLoading(false);
          return;
        }
        setProviderId(provider.providerId);

        const propertyData = await getPropertyById(provider.providerId, id as string);
        if (!propertyData) {
          toast.error("Property not found");
          setLoading(false);
          return;
        }
        setProperty(propertyData);

        // Fetch student assignments for this property
        const assignments = await getPropertyAssignments(id as string);
        
        // Fetch student details for each assignment
        const studentsWithAssignments: StudentWithAssignment[] = [];
        for (const assignment of assignments) {
          const student = await getStudentById(assignment.studentId);
          if (student) {
            studentsWithAssignments.push({ student, assignment });
          }
        }
        setStudents(studentsWithAssignments);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user?.userId, user?.uid]);

  // Verify NSFAS funding status
  const handleVerifyNsfas = async () => {
    if (!studentForm.idNumber || studentForm.idNumber.length !== 13) {
      toast.error("Please enter a valid 13-digit ID number");
      return;
    }

    setVerifyingNsfas(true);
    setNsfasVerified(null);

    try {
      // TODO: Replace with actual NSFAS API call
      // For now, simulate API call with mock response
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock NSFAS verification - in production, call actual API
      // const response = await fetch(`/api/nsfas/verify?idNumber=${studentForm.idNumber}`);
      // const data = await response.json();
      
      // Simulate: IDs starting with "9" are funded
      const isFunded = studentForm.idNumber.startsWith("9");
      const mockFundedAmount = isFunded ? 45000 : 0;
      
      setStudentForm(prev => ({
        ...prev,
        funded: isFunded,
        fundedAmount: mockFundedAmount,
        nsfasNumber: isFunded ? `NSFAS${studentForm.idNumber.slice(0, 6)}` : "",
      }));
      setNsfasVerified(isFunded);
      
      if (isFunded) {
        toast.success("Student is NSFAS funded!");
      } else {
        toast.info("Student is not NSFAS funded");
      }
    } catch (error) {
      console.error("Error verifying NSFAS:", error);
      toast.error("Failed to verify NSFAS status");
      setNsfasVerified(false);
    } finally {
      setVerifyingNsfas(false);
    }
  };

  // Add new student
  const handleAddStudent = async () => {
    if (!property || !providerId) return;

    // Validation
    if (!studentForm.idNumber || !studentForm.firstNames || !studentForm.surname) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (studentForm.idNumber.length !== 13) {
      toast.error("ID number must be 13 digits");
      return;
    }

    setAddingStudent(true);

    try {
      // Check if student already exists
      let student = await getStudentByIdNumber(studentForm.idNumber);
      
      if (!student) {
        // Create new student
        student = await createStudent({
          idNumber: studentForm.idNumber,
          firstNames: studentForm.firstNames,
          surname: studentForm.surname,
          email: studentForm.email || undefined,
          phoneNumber: studentForm.phoneNumber || undefined,
          institution: studentForm.institution || undefined,
          studentNumber: studentForm.studentNumber || undefined,
          program: studentForm.program || undefined,
          yearOfStudy: studentForm.yearOfStudy || undefined,
          nsfasNumber: studentForm.nsfasNumber || undefined,
          funded: studentForm.funded,
          fundedAmount: studentForm.fundedAmount || undefined,
          fundingYear: studentForm.funded ? new Date().getFullYear() : undefined,
          gender: studentForm.gender || undefined,
          status: "Pending",
        });
        toast.success("Student record created");
      } else {
        toast.info("Student already exists in the system");
      }

      // Create assignment
      const assignment = await createStudentAssignment({
        studentId: student.studentId,
        propertyId: property.propertyId,
        startDate: new Date().toISOString().split("T")[0],
        createdBy: user?.userId || user?.uid || "",
      });

      // Add to local state
      setStudents(prev => [...prev, { student, assignment }]);
      
      // Reset form and close dialog
      setStudentForm({
        idNumber: "",
        firstNames: "",
        surname: "",
        email: "",
        phoneNumber: "",
        institution: "",
        studentNumber: "",
        program: "",
        yearOfStudy: 1,
        nsfasNumber: "",
        funded: false,
        fundedAmount: 0,
        gender: "",
      });
      setNsfasVerified(null);
      setIsAddDialogOpen(false);
      
      toast.success("Student assigned to property successfully!");
    } catch (error) {
      console.error("Error adding student:", error);
      toast.error("Failed to add student");
    } finally {
      setAddingStudent(false);
    }
  };

  // Filter students by search term
  const filteredStudents = students.filter(({ student }) => {
    const search = searchTerm.toLowerCase();
    return (
      student.firstNames.toLowerCase().includes(search) ||
      student.surname.toLowerCase().includes(search) ||
      student.idNumber.includes(search) ||
      (student.studentNumber && student.studentNumber.toLowerCase().includes(search))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex">
          <Sidebar userType="provider" />
          <main className="flex-1 p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </main>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex">
          <Sidebar userType="provider" />
          <main className="flex-1 p-8">
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Property not found</h3>
                <Button asChild>
                  <Link href="/properties">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Properties
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <div className="flex">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon">
                <Link href={`/properties/${property.propertyId}`}>
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Students</h1>
                <p className="text-gray-500">{property.name}</p>
              </div>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>
                    Enter student details and verify NSFAS funding status
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* NSFAS Verification Section */}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Step 1: Verify NSFAS Status</h4>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label htmlFor="idNumber">ID Number *</Label>
                        <Input
                          id="idNumber"
                          placeholder="Enter 13-digit ID number"
                          value={studentForm.idNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "").slice(0, 13);
                            setStudentForm({ ...studentForm, idNumber: value });
                            setNsfasVerified(null);
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={handleVerifyNsfas}
                          disabled={verifyingNsfas || studentForm.idNumber.length !== 13}
                          variant="outline"
                        >
                          {verifyingNsfas ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            "Verify NSFAS"
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {nsfasVerified !== null && (
                      <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                        nsfasVerified ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                      }`}>
                        {nsfasVerified ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-medium">NSFAS Funded</p>
                              <p className="text-sm">Amount: R{studentForm.fundedAmount.toLocaleString()}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-gray-500" />
                            <p className="font-medium">Not NSFAS Funded</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Personal Information */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Step 2: Personal Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstNames">First Names *</Label>
                        <Input
                          id="firstNames"
                          value={studentForm.firstNames}
                          onChange={(e) => setStudentForm({ ...studentForm, firstNames: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="surname">Surname *</Label>
                        <Input
                          id="surname"
                          value={studentForm.surname}
                          onChange={(e) => setStudentForm({ ...studentForm, surname: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={studentForm.email}
                          onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          value={studentForm.phoneNumber}
                          onChange={(e) => setStudentForm({ ...studentForm, phoneNumber: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <Select
                          value={studentForm.gender}
                          onValueChange={(value) => setStudentForm({ ...studentForm, gender: value as "Male" | "Female" | "Other" })}
                        >
                          <SelectTrigger className="mt-1">
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
                  </div>

                  {/* Academic Information */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Step 3: Academic Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="institution">Institution</Label>
                        <Input
                          id="institution"
                          value={studentForm.institution}
                          onChange={(e) => setStudentForm({ ...studentForm, institution: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="studentNumber">Student Number</Label>
                        <Input
                          id="studentNumber"
                          value={studentForm.studentNumber}
                          onChange={(e) => setStudentForm({ ...studentForm, studentNumber: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="program">Program/Course</Label>
                        <Input
                          id="program"
                          value={studentForm.program}
                          onChange={(e) => setStudentForm({ ...studentForm, program: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="yearOfStudy">Year of Study</Label>
                        <Select
                          value={studentForm.yearOfStudy.toString()}
                          onValueChange={(value) => setStudentForm({ ...studentForm, yearOfStudy: parseInt(value) })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1st Year</SelectItem>
                            <SelectItem value="2">2nd Year</SelectItem>
                            <SelectItem value="3">3rd Year</SelectItem>
                            <SelectItem value="4">4th Year</SelectItem>
                            <SelectItem value="5">5th Year</SelectItem>
                            <SelectItem value="6">Postgraduate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddStudent}
                      disabled={addingStudent || !studentForm.idNumber || !studentForm.firstNames || !studentForm.surname}
                      className="bg-amber-500 hover:bg-amber-600 text-gray-900"
                    >
                      {addingStudent ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Student
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">NSFAS Funded</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {students.filter(s => s.student.funded).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Beds</p>
                    <p className="text-2xl font-bold text-gray-900">{property.totalBeds || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Available Beds</p>
                    <p className="text-2xl font-bold text-gray-900">{property.availableBeds || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Students Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assigned Students</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTerm ? "No students found" : "No students assigned"}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm
                      ? "Try adjusting your search term"
                      : "Click 'Add Student' to assign students to this property"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>ID Number</TableHead>
                        <TableHead>Institution</TableHead>
                        <TableHead>NSFAS Status</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map(({ student, assignment }) => (
                        <TableRow key={student.studentId}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">
                                {student.firstNames} {student.surname}
                              </p>
                              {student.studentNumber && (
                                <p className="text-sm text-gray-500">{student.studentNumber}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{student.idNumber}</TableCell>
                          <TableCell>{student.institution || "-"}</TableCell>
                          <TableCell>
                            {student.funded ? (
                              <Badge className="bg-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                NSFAS Funded
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Not Funded</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {student.email && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Mail className="w-3 h-3" />
                                  {student.email}
                                </div>
                              )}
                              {student.phoneNumber && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Phone className="w-3 h-3" />
                                  {student.phoneNumber}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                assignment.status === "Active"
                                  ? "bg-green-500"
                                  : assignment.status === "Future"
                                  ? "bg-blue-500"
                                  : assignment.status === "Closed"
                                  ? "bg-gray-500"
                                  : "bg-red-500"
                              }
                            >
                              {assignment.status}
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
        </main>
      </div>
    </div>
  );
}

export default function ManageStudentsPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider", "admin"]}>
      <ManageStudentsContent />
    </ProtectedRoute>
  );
}
