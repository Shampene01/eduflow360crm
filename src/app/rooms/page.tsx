"use client";

import { useState, useEffect } from "react";
import {
  BedDouble,
  Building2,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  UserPlus,
  LogOut,
  PauseCircle,
  Search,
  Calendar,
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
  Property,
  Student,
  StudentPropertyAssignment,
  RoomConfiguration,
} from "@/lib/schema";
import { getProviderByUserId, getProviderById,
  getPropertiesByProvider,
  getPropertyAssignments,
  getRoomConfiguration,
  getStudentById,
  closeStudentAssignment,
  createStudentAssignment,
  getStudentsWithoutActiveAllocation,
} from "@/lib/db";

interface AllocationWithStudent {
  assignment: StudentPropertyAssignment;
  student: Student;
}

function OccupancyContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [roomConfig, setRoomConfig] = useState<RoomConfiguration | null>(null);
  const [allocations, setAllocations] = useState<AllocationWithStudent[]>([]);
  const [providerId, setProviderId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationWithStudent | null>(null);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [newAllocation, setNewAllocation] = useState({
    studentId: "",
    startDate: new Date().toISOString().split("T")[0],
    monthlyRate: 0,
  });
  const [endReason, setEndReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Calculated KPIs
  const totalCapacity = roomConfig?.totalBeds || 0;
  const occupiedBeds = allocations.filter(a => a.assignment.status === "Active").length;
  const availableCapacity = totalCapacity - occupiedBeds;
  const isOverAllocated = occupiedBeds > totalCapacity;

  // Fetch properties on load
  useEffect(() => {
    const fetchProperties = async () => {
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

        const props = await getPropertiesByProvider(provider.providerId);
        setProperties(props);

        // Auto-select first property if available
        if (props.length > 0) {
          handlePropertySelect(props[0].propertyId, provider.providerId);
        }
      } catch (error) {
        console.error("Error fetching properties:", error);
        toast.error("Failed to load properties");
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, user?.uid]);

  // Handle property selection
  const handlePropertySelect = async (propertyId: string, provId?: string) => {
    const pid = provId || providerId;
    setSelectedPropertyId(propertyId);
    setLoading(true);

    try {
      const property = properties.find(p => p.propertyId === propertyId);
      setSelectedProperty(property || null);

      // Fetch room configuration
      const config = await getRoomConfiguration(pid, propertyId);
      setRoomConfig(config);

      // Fetch allocations
      const assignments = await getPropertyAssignments(propertyId, undefined, pid);
      
      // Fetch student details for each allocation
      const allocsWithStudents: AllocationWithStudent[] = [];
      for (const assignment of assignments) {
        const student = await getStudentById(assignment.studentId);
        if (student) {
          allocsWithStudents.push({ assignment, student });
        }
      }
      setAllocations(allocsWithStudents);

      // Fetch available students (those without any active allocation anywhere)
      const unallocatedStudents = await getStudentsWithoutActiveAllocation();
      setAvailableStudents(unallocatedStudents);
    } catch (error) {
      console.error("Error loading property data:", error);
      toast.error("Failed to load property data");
    } finally {
      setLoading(false);
    }
  };

  // Add new allocation
  const handleAddAllocation = async () => {
    if (!selectedPropertyId || !newAllocation.studentId) {
      toast.error("Please select a student");
      return;
    }

    // Check capacity
    if (occupiedBeds >= totalCapacity) {
      toast.error("This property has reached maximum capacity.");
      return;
    }

    setProcessing(true);
    try {
      await createStudentAssignment({
        studentId: newAllocation.studentId,
        propertyId: selectedPropertyId,
        providerId: providerId,
        startDate: newAllocation.startDate,
        monthlyRate: newAllocation.monthlyRate || undefined,
        createdBy: user?.userId || user?.uid || "",
      });

      toast.success("Student allocated successfully");
      setIsAddDialogOpen(false);
      setNewAllocation({ studentId: "", startDate: new Date().toISOString().split("T")[0], monthlyRate: 0 });
      
      // Refresh allocations
      handlePropertySelect(selectedPropertyId);
    } catch (error) {
      console.error("Error creating allocation:", error);
      toast.error("Failed to create allocation");
    } finally {
      setProcessing(false);
    }
  };

  // End allocation
  const handleEndAllocation = async () => {
    if (!selectedAllocation) return;

    setProcessing(true);
    try {
      await closeStudentAssignment(
        selectedAllocation.assignment.assignmentId,
        user?.userId || user?.uid || "",
        endReason || "Allocation ended by provider"
      );

      toast.success("Allocation ended successfully");
      setIsEndDialogOpen(false);
      setSelectedAllocation(null);
      setEndReason("");
      
      // Refresh allocations
      handlePropertySelect(selectedPropertyId);
    } catch (error) {
      console.error("Error ending allocation:", error);
      toast.error("Failed to end allocation");
    } finally {
      setProcessing(false);
    }
  };

  // Filter allocations by search
  const filteredAllocations = allocations.filter(({ student }) => {
    const search = searchTerm.toLowerCase();
    return (
      student.firstNames.toLowerCase().includes(search) ||
      student.surname.toLowerCase().includes(search) ||
      student.idNumber.includes(search)
    );
  });

  // Active allocations for display
  const activeAllocations = filteredAllocations.filter(a => a.assignment.status === "Active");
  const otherAllocations = filteredAllocations.filter(a => a.assignment.status !== "Active");

  if (loading && properties.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <Sidebar userType="provider" />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-4" />
              <p className="text-gray-500">Loading properties...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Occupancy & Capacity</h1>
              <p className="text-gray-500">Manage student allocations and track property occupancy</p>
            </div>
          </div>

          {/* Property Selector */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-500" />
                  <Label className="font-medium">Select Property:</Label>
                </div>
                <Select
                  value={selectedPropertyId}
                  onValueChange={(v) => handlePropertySelect(v)}
                >
                  <SelectTrigger className="w-full md:w-[350px]">
                    <SelectValue placeholder="Choose a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.propertyId} value={property.propertyId}>
                        {property.name} ({property.propertyType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selectedPropertyId && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BedDouble className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Capacity</p>
                        <p className="text-2xl font-bold text-gray-900">{totalCapacity}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Occupied Beds</p>
                        <p className="text-2xl font-bold text-gray-900">{occupiedBeds}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${availableCapacity > 0 ? "bg-amber-100" : "bg-gray-100"}`}>
                        <CheckCircle className={`w-5 h-5 ${availableCapacity > 0 ? "text-amber-600" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Available</p>
                        <p className="text-2xl font-bold text-gray-900">{availableCapacity}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={isOverAllocated ? "border-red-300 bg-red-50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isOverAllocated ? "bg-red-100" : "bg-green-100"}`}>
                        {isOverAllocated ? (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Over-allocated?</p>
                        <p className={`text-lg font-bold ${isOverAllocated ? "text-red-600" : "text-green-600"}`}>
                          {isOverAllocated ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions Bar */}
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search allocations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  disabled={availableCapacity <= 0}
                  className="bg-amber-500 hover:bg-amber-600 text-gray-900"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Allocation
                </Button>
              </div>

              {/* Allocations Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Active Allocations ({activeAllocations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    </div>
                  ) : activeAllocations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p>No active allocations for this property</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>ID Number</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Monthly Rate</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeAllocations.map(({ assignment, student }) => (
                            <TableRow key={assignment.assignmentId}>
                              <TableCell className="font-medium">
                                {student.firstNames} {student.surname}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {student.idNumber}
                              </TableCell>
                              <TableCell>{assignment.startDate}</TableCell>
                              <TableCell>{assignment.endDate || "-"}</TableCell>
                              <TableCell>
                                {assignment.monthlyRate
                                  ? `R${assignment.monthlyRate.toLocaleString()}`
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-green-500">{assignment.status}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAllocation({ assignment, student });
                                      setIsEndDialogOpen(true);
                                    }}
                                  >
                                    <LogOut className="w-4 h-4 mr-1" />
                                    End
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Past Allocations */}
              {otherAllocations.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-gray-600">Past Allocations ({otherAllocations.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {otherAllocations.map(({ assignment, student }) => (
                            <TableRow key={assignment.assignmentId} className="text-gray-500">
                              <TableCell>{student.firstNames} {student.surname}</TableCell>
                              <TableCell>{assignment.startDate}</TableCell>
                              <TableCell>{assignment.endDate || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{assignment.status}</Badge>
                              </TableCell>
                              <TableCell>{assignment.closureReason || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!selectedPropertyId && properties.length > 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Property</h3>
                <p className="text-gray-500">Choose a property above to view and manage allocations</p>
              </CardContent>
            </Card>
          )}

          {properties.length === 0 && !loading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Properties Found</h3>
                <p className="text-gray-500">Add a property first to manage occupancy</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
      <DashboardFooter />

      {/* Add Allocation Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add New Allocation
            </DialogTitle>
            <DialogDescription>
              Allocate a student to {selectedProperty?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Student *</Label>
              <Select
                value={newAllocation.studentId}
                onValueChange={(v) => setNewAllocation({ ...newAllocation, studentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500 text-center">No students available</div>
                  ) : (
                    availableStudents.map((student) => (
                      <SelectItem key={student.studentId} value={student.studentId}>
                        {student.firstNames} {student.surname} ({student.idNumber})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={newAllocation.startDate}
                onChange={(e) => setNewAllocation({ ...newAllocation, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Monthly Rate (R)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={newAllocation.monthlyRate || ""}
                onChange={(e) => setNewAllocation({ ...newAllocation, monthlyRate: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {availableCapacity <= 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                This property has reached maximum capacity.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddAllocation}
              disabled={processing || !newAllocation.studentId || availableCapacity <= 0}
              className="bg-amber-500 hover:bg-amber-600 text-gray-900"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Allocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Allocation Dialog */}
      <AlertDialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Allocation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end the allocation for{" "}
              <strong>{selectedAllocation?.student.firstNames} {selectedAllocation?.student.surname}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Reason for ending (optional)</Label>
            <Input
              placeholder="e.g., Student moved out, transferred..."
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedAllocation(null);
              setEndReason("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndAllocation}
              disabled={processing}
              className="bg-red-500 hover:bg-red-600"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              End Allocation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function OccupancyPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <OccupancyContent />
    </ProtectedRoute>
  );
}
