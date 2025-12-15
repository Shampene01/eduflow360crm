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
  Wallet,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
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
      
      // Response format: { idNumber, funded, accommodationCosts, studentName, surname, email, phoneNumber, dateOfBirth, gender, dataverseId }
      const isFunded = data.funded === true;
      const fundedAmount = data.accommodationCosts || 0;
      
      if (isFunded) {
        // Auto-populate form fields with NSFAS data
        // Parse gender from NSFAS response (could be "Male", "Female", or numeric)
        let genderValue: "Male" | "Female" | "Other" | "" = "";
        if (data.gender) {
          const g = String(data.gender).toLowerCase();
          if (g === "male" || g === "m" || g === "0") genderValue = "Male";
          else if (g === "female" || g === "f" || g === "1") genderValue = "Female";
          else genderValue = "Other";
        }
        
        // Format date of birth if provided (could be ISO string or other format)
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
          // Personal info from NSFAS
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
      gender: "" as "Male" | "Female" | "Other" | "",
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
      fundingSource: "",
      fundingYear: new Date().getFullYear(),
      fundingDetails: "",
      roomType: "" as string,
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
          email: studentForm.email || "",
          phoneNumber: studentForm.phoneNumber || "",
          dateOfBirth: studentForm.dateOfBirth || "",
          institution: studentForm.institution || "",
          studentNumber: studentForm.studentNumber || "",
          program: studentForm.program || "",
          yearOfStudy: studentForm.yearOfStudy || 1,
          nsfasNumber: studentForm.nsfasNumber || "",
          funded: studentForm.funded,
          nsfasFunded: studentForm.nsfasFunded,
          nsfasDataverseId: studentForm.nsfasDataverseId || "",
          fundedAmount: studentForm.fundedAmount || 0,
          fundingYear: studentForm.fundingYear || new Date().getFullYear(),
          // Non-NSFAS funding fields
          fundingSource: studentForm.fundingSource || "",
          fundingDetails: studentForm.fundingDetails || "",
          fundingVerified: false,
          gender: studentForm.gender || undefined,
          nextOfKinName: studentForm.nextOfKinName || "",
          nextOfKinRelationship: studentForm.nextOfKinRelationship || "",
          nextOfKinPhone: studentForm.nextOfKinPhone || "",
          nextOfKinEmail: studentForm.nextOfKinEmail || "",
          nextOfKinAddress: studentForm.nextOfKinAddress || "",
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
                      {formStep === 1 && "Verify NSFAS status and enter personal details"}
                      {formStep === 2 && "Academic information and study details"}
                      {formStep === 3 && "Room assignment and pricing"}
                      {formStep === 4 && "Emergency contact and final confirmation"}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Modern Step Indicator */}
                  <div className="flex items-center justify-between mt-6 px-2 md:px-4">
                    {[
                      { step: 1, label: "NSFAS" },
                      { step: 2, label: "Personal" },
                      { step: 3, label: "Room" },
                      { step: 4, label: "Next of Kin" },
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
                  <Tabs value={`step-${formStep}`} className="w-full">

                  {/* Step 1: NSFAS & Personal Information */}
                  <TabsContent value="step-1" className="space-y-6">
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
                             <GraduationCap className="w-6 h-6 md:w-7 md:h-7" />}
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
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "").slice(0, 13);
                              setStudentForm({ ...studentForm, idNumber: value });
                              setNsfasVerified(null);
                            }}
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

                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={() => setFormStep(2)}
                        disabled={
                          !studentForm.idNumber || 
                          !studentForm.firstNames || 
                          !studentForm.surname ||
                          (nsfasVerified === false && !studentForm.fundingSource)
                        }
                        className="bg-slate-700 hover:bg-slate-800 px-8"
                      >
                        Continue
                        <Mail className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Step 2: Academic Information */}
                  <TabsContent value="step-2" className="space-y-6">
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

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setFormStep(1)} className="px-6">
                        Back
                      </Button>
                      <Button onClick={() => setFormStep(3)} className="bg-slate-700 hover:bg-slate-800 px-8">
                        Continue
                        <Building2 className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Step 3: Room Assignment */}
                  <TabsContent value="step-3" className="space-y-6">
                    {/* Room Selection Header */}
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
                                  <p className="text-sm text-gray-500">{room.available} rooms available</p>
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

                    {/* Start Date & Rent */}
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

                    {/* NSFAS Summary if funded */}
                    {studentForm.funded && studentForm.fundedAmount > 0 && (
                      <Card className="bg-emerald-50 border-emerald-200">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-emerald-700">NSFAS Allowance:</span>
                              <p className="font-semibold text-emerald-800">R{studentForm.fundedAmount.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-emerald-700">Annual Rent (10mo):</span>
                              <p className="font-semibold text-emerald-800">R{(studentForm.monthlyRent * 10).toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-emerald-700">Balance:</span>
                              <p className={`font-semibold ${studentForm.fundedAmount >= (studentForm.monthlyRent * 10) ? "text-emerald-800" : "text-red-600"}`}>
                                R{(studentForm.fundedAmount - (studentForm.monthlyRent * 10)).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setFormStep(2)} className="px-6">
                        Back
                      </Button>
                      <Button 
                        onClick={() => setFormStep(4)}
                        disabled={!studentForm.roomType}
                        className="bg-slate-700 hover:bg-slate-800 px-8"
                      >
                        Continue
                        <Phone className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Step 4: Next of Kin & Confirmation */}
                  <TabsContent value="step-4" className="space-y-6">
                    {/* Emergency Contact Header */}
                    <div className="flex items-center gap-3 pb-4 border-b">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Phone className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Emergency Contact</h3>
                        <p className="text-sm text-gray-500">Next of kin details</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Full Name *</Label>
                        <Input
                          value={studentForm.nextOfKinName}
                          onChange={(e) => setStudentForm({ ...studentForm, nextOfKinName: e.target.value })}
                          placeholder="Contact person name"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Relationship *</Label>
                        <Select
                          value={studentForm.nextOfKinRelationship}
                          onValueChange={(value) => setStudentForm({ ...studentForm, nextOfKinRelationship: value })}
                        >
                          <SelectTrigger className="h-11">
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
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Phone Number *</Label>
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
                              <span className="font-medium text-right truncate">{property?.name}</span>
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
                        Back
                      </Button>
                      <Button
                        onClick={handleAddStudent}
                        disabled={addingStudent || !studentForm.nextOfKinName || !studentForm.nextOfKinPhone || !studentForm.nextOfKinRelationship}
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
                  </TabsContent>
                  </Tabs>
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
                    <p className="text-2xl font-bold text-gray-900">{Math.max(0, (property.totalBeds || 0) - students.filter(s => s.assignment.status === "Active").length)}</p>
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
      <DashboardFooter />
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
