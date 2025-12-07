"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Mail,
  Phone,
  Building2,
  CheckCircle,
  Clock,
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

interface StudentData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  studentId?: string;
  institution?: string;
  nsfasVerified?: boolean;
  status: string;
  propertyName?: string;
  roomNumber?: string;
}

function StudentsContent() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [properties, setProperties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid || !db) {
        setLoading(false);
        return;
      }

      try {
        // Fetch provider's properties
        const providersQuery = query(
          collection(db, "accommodationProviders"),
          where("userId", "==", uid)
        );
        const providerSnap = await getDocs(providersQuery);
        
        if (!providerSnap.empty) {
          const providerId = providerSnap.docs[0].id;
          const propertiesQuery = query(
            collection(db, "properties"),
            where("providerId", "==", providerId)
          );
          const propertiesSnap = await getDocs(propertiesQuery);
          setProperties(propertiesSnap.docs.map(doc => doc.id));
        }

        // In a real app, you'd query students allocated to this provider's properties
        // For now, we'll show an empty state
        setStudents([]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.userId, user?.uid]);

  const filteredStudents = students.filter(
    (student) =>
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Button 
              className="bg-amber-500 hover:bg-amber-600 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={properties.length === 0}
              title={properties.length === 0 ? "Add a property first before adding students" : "Add a new student"}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
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
                    <p className="text-2xl font-bold text-gray-900">{students.length}</p>
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
                    <p className="text-2xl font-bold text-gray-900">
                      {students.filter((s) => s.nsfasVerified).length}
                    </p>
                    <p className="text-sm text-gray-500">NSFAS Verified</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {students.filter((s) => s.status === "pending").length}
                    </p>
                    <p className="text-sm text-gray-500">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {students.filter((s) => s.status === "allocated").length}
                    </p>
                    <p className="text-sm text-gray-500">Allocated</p>
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
                    placeholder="Search students..."
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
                      <TableHead>Contact</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>NSFAS</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{student.studentId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="w-3 h-3" />
                              {student.email}
                            </div>
                            {student.phone && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Phone className="w-3 h-3" />
                                {student.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{student.institution || "-"}</TableCell>
                        <TableCell>
                          {student.propertyName ? (
                            <div>
                              <p className="font-medium">{student.propertyName}</p>
                              <p className="text-sm text-gray-500">Room {student.roomNumber}</p>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={student.nsfasVerified ? "default" : "secondary"}
                            className={student.nsfasVerified ? "bg-green-500" : ""}
                          >
                            {student.nsfasVerified ? "Verified" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              student.status === "allocated"
                                ? "border-green-500 text-green-700"
                                : student.status === "pending"
                                ? "border-yellow-500 text-yellow-700"
                                : ""
                            }
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
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
