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
  getRoomConfiguration,
} from "@/lib/db";
import { RoomConfiguration } from "@/lib/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface StudentWithAssignment {
  student: Student;
  assignment: StudentPropertyAssignment;
}

function ManageStudentsContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [roomConfig, setRoomConfig] = useState<RoomConfiguration | null>(null);
  const [students, setStudents] = useState<StudentWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Add Student Dialog State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [verifyingNsfas, setVerifyingNsfas] = useState(false);
  const [nsfasVerified, setNsfasVerified] = useState<boolean | null>(null);
  const [formStep, setFormStep] = useState(1);
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
    fundedAmount: 0,
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

  // Room types with their prices from room configuration
  const getRoomTypes = () => {
    if (!roomConfig) return [];
    const types: { value: string; label: string; price: number; available: number }[] = [];
    
    if (roomConfig.bachelor > 0) {
      types.push({ value: "bachelor", label: "Bachelor", price: roomConfig.bachelorPrice, available: roomConfig.bachelor });
    }
    if (roomConfig.singleEnSuite > 0) {
      types.push({ value: "singleEnSuite", label: "Single En-Suite", price: roomConfig.singleEnSuitePrice, available: roomConfig.singleEnSuite });
    }
    if (roomConfig.singleStandard > 0) {
      types.push({ value: "singleStandard", label: "Single Standard", price: roomConfig.singleStandardPrice, available: roomConfig.singleStandard });
    }
    if (roomConfig.sharing2Beds_EnSuite > 0) {
      types.push({ value: "sharing2Beds_EnSuite", label: "Sharing (2 Beds) En-Suite", price: roomConfig.sharing2Beds_EnSuitePrice, available: roomConfig.sharing2Beds_EnSuite });
    }
    if (roomConfig.sharing2Beds_Standard > 0) {
      types.push({ value: "sharing2Beds_Standard", label: "Sharing (2 Beds) Standard", price: roomConfig.sharing2Beds_StandardPrice, available: roomConfig.sharing2Beds_Standard });
    }
    if (roomConfig.sharing3Beds_EnSuite > 0) {
      types.push({ value: "sharing3Beds_EnSuite", label: "Sharing (3 Beds) En-Suite", price: roomConfig.sharing3Beds_EnSuitePrice, available: roomConfig.sharing3Beds_EnSuite });
    }
    if (roomConfig.sharing3Beds_Standard > 0) {
      types.push({ value: "sharing3Beds_Standard", label: "Sharing (3 Beds) Standard", price: roomConfig.sharing3Beds_StandardPrice, available: roomConfig.sharing3Beds_Standard });
    }
    return types;
  };

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

        // Fetch room configuration for pricing
        const roomConfigData = await getRoomConfiguration(provider.providerId, id as string);
        if (roomConfigData) {
          setRoomConfig(roomConfigData);
        }

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

  // Verify NSFAS funding status via server-side API route
  const handleVerifyNsfas = async () => {
    if (!studentForm.idNumber || studentForm.idNumber.length !== 13) {
      toast.error("Please enter a valid 13-digit ID number");
      return;
    }

    setVerifyingNsfas(true);
    setNsfasVerified(null);

    try {
      // Call our server-side API route which proxies to Power Automate
      const response = await fetch("/api/nsfas/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idNumber: studentForm.idNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `NSFAS verification failed: ${response.status}`);
      }
      
      // Response format: { idNumber, funded, accommodationCosts }
      const isFunded = data.funded === true;
      const fundedAmount = data.accommodationCosts || 0;
      
      setStudentForm(prev => ({
        ...prev,
        funded: isFunded,
        fundedAmount: fundedAmount,
        nsfasNumber: isFunded ? `NSFAS${studentForm.idNumber.slice(0, 6)}` : "",
      }));
      setNsfasVerified(isFunded);
      
      if (isFunded) {
        toast.success(`Student is NSFAS funded! Accommodation allowance: R${fundedAmount.toLocaleString()}`);
      } else {
        toast.info("Student is not NSFAS funded");
      }
    } catch (error: any) {
      console.error("Error verifying NSFAS:", error);
      toast.error(error.message || "Failed to verify NSFAS status. Please try again.");
      setNsfasVerified(false);
    } finally {
      setVerifyingNsfas(false);
    }
  };

  // Reset form to initial state
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
  };

  // Add new student
  const handleAddStudent = async () => {
    if (!property || !providerId) return;

    // Validation
    if (!studentForm.idNumber || !studentForm.firstNames || !studentForm.surname) {
      toast.error("Please fill in all required fields");
      setFormStep(1);
      return;
    }

    if (studentForm.idNumber.length !== 13) {
      toast.error("ID number must be 13 digits");
      setFormStep(1);
      return;
    }

    if (!studentForm.roomType) {
      toast.error("Please select a room type");
      setFormStep(3);
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
          dateOfBirth: studentForm.dateOfBirth || undefined,
          institution: studentForm.institution || undefined,
          studentNumber: studentForm.studentNumber || undefined,
          program: studentForm.program || undefined,
          yearOfStudy: studentForm.yearOfStudy || undefined,
          nsfasNumber: studentForm.nsfasNumber || undefined,
          funded: studentForm.funded,
          fundedAmount: studentForm.fundedAmount || undefined,
          fundingYear: studentForm.funded ? new Date().getFullYear() : undefined,
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

      // Create assignment with room type and monthly rent
      const assignment = await createStudentAssignment({
        studentId: student.studentId,
        propertyId: property.propertyId,
        startDate: studentForm.startDate || new Date().toISOString().split("T")[0],
        monthlyRate: studentForm.monthlyRent,
        createdBy: user?.userId || user?.uid || "",
      });

      // Add to local state
      setStudents(prev => [...prev, { student, assignment }]);
      
      // Reset form and close dialog
      resetForm();
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
            
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>
                    Complete all sections to register a new student
                  </DialogDescription>
                </DialogHeader>

                <Tabs value={`step-${formStep}`} className="w-full">
                  {/* Step Indicators */}
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger 
                      value="step-1" 
                      onClick={() => setFormStep(1)}
                      className={formStep >= 1 ? "data-[state=active]:bg-amber-500" : ""}
                    >
                      1. NSFAS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="step-2" 
                      onClick={() => setFormStep(2)}
                      className={formStep >= 2 ? "data-[state=active]:bg-amber-500" : ""}
                    >
                      2. Personal
                    </TabsTrigger>
                    <TabsTrigger 
                      value="step-3" 
                      onClick={() => setFormStep(3)}
                      className={formStep >= 3 ? "data-[state=active]:bg-amber-500" : ""}
                    >
                      3. Room
                    </TabsTrigger>
                    <TabsTrigger 
                      value="step-4" 
                      onClick={() => setFormStep(4)}
                      className={formStep >= 4 ? "data-[state=active]:bg-amber-500" : ""}
                    >
                      4. Next of Kin
                    </TabsTrigger>
                  </TabsList>

                  {/* Step 1: NSFAS Verification */}
                  <TabsContent value="step-1" className="space-y-4">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-1">Verify NSFAS Funding Status</h4>
                      <p className="text-sm text-gray-600 mb-4">Enter the student&apos;s ID number to check their NSFAS funding status</p>
                      
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
                            className="mt-1 font-mono text-lg"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            onClick={handleVerifyNsfas}
                            disabled={verifyingNsfas || studentForm.idNumber.length !== 13}
                            className="bg-amber-500 hover:bg-amber-600 text-gray-900"
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
                        <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
                          nsfasVerified ? "bg-green-100 border border-green-300" : "bg-gray-100 border border-gray-300"
                        }`}>
                          {nsfasVerified ? (
                            <>
                              <CheckCircle className="w-8 h-8 text-green-600" />
                              <div>
                                <p className="font-semibold text-green-800">NSFAS Funded Student</p>
                                <p className="text-sm text-green-700">Accommodation Allowance: R{studentForm.fundedAmount.toLocaleString()}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-8 h-8 text-gray-500" />
                              <div>
                                <p className="font-semibold text-gray-800">Not NSFAS Funded</p>
                                <p className="text-sm text-gray-600">Student will need to pay privately</p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={() => setFormStep(2)}
                        disabled={studentForm.idNumber.length !== 13}
                        className="bg-amber-500 hover:bg-amber-600 text-gray-900"
                      >
                        Next: Personal Details
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Step 2: Personal & Academic Information */}
                  <TabsContent value="step-2" className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Personal Information</h4>
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
                        <div>
                          <Label htmlFor="dateOfBirth">Date of Birth</Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            value={studentForm.dateOfBirth}
                            onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-4">Academic Information</h4>
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

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setFormStep(1)}>
                        Back
                      </Button>
                      <Button 
                        onClick={() => setFormStep(3)}
                        disabled={!studentForm.firstNames || !studentForm.surname}
                        className="bg-amber-500 hover:bg-amber-600 text-gray-900"
                      >
                        Next: Room Assignment
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Step 3: Room Assignment */}
                  <TabsContent value="step-3" className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Room Type Assignment</h4>
                      <p className="text-sm text-gray-600 mb-4">Select the room type for this student. The monthly rent will be calculated automatically.</p>
                      
                      {getRoomTypes().length === 0 ? (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-yellow-800">No room types configured for this property. Please configure room types in the property settings first.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {getRoomTypes().map((room) => (
                            <div
                              key={room.value}
                              onClick={() => setStudentForm({ 
                                ...studentForm, 
                                roomType: room.value, 
                                monthlyRent: room.price 
                              })}
                              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                studentForm.roomType === room.value
                                  ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500"
                                  : "border-gray-200 hover:border-amber-300 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-semibold text-gray-900">{room.label}</p>
                                  <p className="text-sm text-gray-500">{room.available} rooms available</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-amber-600">R{room.price.toLocaleString()}</p>
                                  <p className="text-sm text-gray-500">per month</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {studentForm.roomType && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-green-800">Selected Room Type</p>
                              <p className="text-sm text-green-700">{getRoomTypes().find(r => r.value === studentForm.roomType)?.label}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-green-700">Monthly Rent</p>
                              <p className="text-2xl font-bold text-green-800">R{studentForm.monthlyRent.toLocaleString()}</p>
                            </div>
                          </div>
                          {studentForm.funded && studentForm.fundedAmount > 0 && (
                            <div className="mt-3 pt-3 border-t border-green-300">
                              <div className="flex justify-between text-sm">
                                <span className="text-green-700">NSFAS Annual Allowance:</span>
                                <span className="font-medium text-green-800">R{studentForm.fundedAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm mt-1">
                                <span className="text-green-700">Annual Rent (10 months):</span>
                                <span className="font-medium text-green-800">R{(studentForm.monthlyRent * 10).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm mt-1">
                                <span className="text-green-700">Shortfall/Surplus:</span>
                                <span className={`font-medium ${studentForm.fundedAmount >= (studentForm.monthlyRent * 10) ? "text-green-800" : "text-red-600"}`}>
                                  R{(studentForm.fundedAmount - (studentForm.monthlyRent * 10)).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4">
                        <Label htmlFor="startDate">Lease Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={studentForm.startDate}
                          onChange={(e) => setStudentForm({ ...studentForm, startDate: e.target.value })}
                          className="mt-1 max-w-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setFormStep(2)}>
                        Back
                      </Button>
                      <Button 
                        onClick={() => setFormStep(4)}
                        disabled={!studentForm.roomType}
                        className="bg-amber-500 hover:bg-amber-600 text-gray-900"
                      >
                        Next: Next of Kin
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Step 4: Next of Kin */}
                  <TabsContent value="step-4" className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Next of Kin / Emergency Contact</h4>
                      <p className="text-sm text-gray-600 mb-4">Provide emergency contact details for this student</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="nextOfKinName">Full Name *</Label>
                          <Input
                            id="nextOfKinName"
                            value={studentForm.nextOfKinName}
                            onChange={(e) => setStudentForm({ ...studentForm, nextOfKinName: e.target.value })}
                            placeholder="e.g., John Doe"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="nextOfKinRelationship">Relationship *</Label>
                          <Select
                            value={studentForm.nextOfKinRelationship}
                            onValueChange={(value) => setStudentForm({ ...studentForm, nextOfKinRelationship: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Parent">Parent</SelectItem>
                              <SelectItem value="Guardian">Guardian</SelectItem>
                              <SelectItem value="Spouse">Spouse</SelectItem>
                              <SelectItem value="Sibling">Sibling</SelectItem>
                              <SelectItem value="Relative">Other Relative</SelectItem>
                              <SelectItem value="Friend">Friend</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="nextOfKinPhone">Phone Number *</Label>
                          <Input
                            id="nextOfKinPhone"
                            value={studentForm.nextOfKinPhone}
                            onChange={(e) => setStudentForm({ ...studentForm, nextOfKinPhone: e.target.value })}
                            placeholder="e.g., 0821234567"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="nextOfKinEmail">Email</Label>
                          <Input
                            id="nextOfKinEmail"
                            type="email"
                            value={studentForm.nextOfKinEmail}
                            onChange={(e) => setStudentForm({ ...studentForm, nextOfKinEmail: e.target.value })}
                            placeholder="e.g., john@example.com"
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="nextOfKinAddress">Address</Label>
                          <Textarea
                            id="nextOfKinAddress"
                            value={studentForm.nextOfKinAddress}
                            onChange={(e) => setStudentForm({ ...studentForm, nextOfKinAddress: e.target.value })}
                            placeholder="Full address"
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="p-4 bg-gray-50 border rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Summary</h4>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">Student:</span>
                          <span className="ml-2 font-medium">{studentForm.firstNames} {studentForm.surname}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">ID Number:</span>
                          <span className="ml-2 font-mono">{studentForm.idNumber}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">NSFAS Status:</span>
                          <span className={`ml-2 font-medium ${studentForm.funded ? "text-green-600" : "text-gray-600"}`}>
                            {studentForm.funded ? "Funded" : "Not Funded"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Room Type:</span>
                          <span className="ml-2 font-medium">{getRoomTypes().find(r => r.value === studentForm.roomType)?.label || "-"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Monthly Rent:</span>
                          <span className="ml-2 font-medium">R{studentForm.monthlyRent.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Start Date:</span>
                          <span className="ml-2 font-medium">{studentForm.startDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setFormStep(3)}>
                        Back
                      </Button>
                      <Button
                        onClick={handleAddStudent}
                        disabled={addingStudent || !studentForm.nextOfKinName || !studentForm.nextOfKinPhone || !studentForm.nextOfKinRelationship}
                        className="bg-amber-500 hover:bg-amber-600 text-gray-900"
                      >
                        {addingStudent ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding Student...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Student
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
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
