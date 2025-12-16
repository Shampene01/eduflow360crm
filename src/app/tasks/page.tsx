"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  Calendar,
  User,
  Building2,
  ChevronRight,
  MoreHorizontal,
  Play,
  Pause,
  Check,
  X,
  Flag,
  ArrowUpRight,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import {
  Task,
  TaskStatus,
  TaskType,
  TaskPriority,
  Student,
} from "@/lib/schema";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  getTasksByProvider,
  getTaskSummary,
  createTask,
  updateTask,
  completeTask,
  cancelTask,
  getProviderByUserId,
  getStudentsByProvider,
  updateStudent,
} from "@/lib/db";

// Unified task item type that can be either a manual task or auto-generated from entities
interface UnifiedTaskItem {
  id: string;
  type: "manual" | "studentApproval";
  taskType: TaskType;
  title: string;
  description?: string;
  status: TaskStatus | string;
  priority: TaskPriority;
  relatedEntityId?: string;
  relatedEntityName?: string;
  createdAt?: Date;
  dueDate?: string;
  // For manual tasks
  task?: Task;
  // For student approvals
  student?: Student;
}

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  StudentApproval: "Student Approval",
  StudentTermination: "Student Termination",
  StudentTransfer: "Student Transfer",
  MaintenanceApproval: "Maintenance Approval",
  PaymentVerification: "Payment Verification",
  DocumentReview: "Document Review",
  RoomAllocation: "Room Allocation",
  ContractRenewal: "Contract Renewal",
  ComplaintResolution: "Complaint Resolution",
  Other: "Other",
};

const TASK_TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  StudentApproval: <User className="w-4 h-4" />,
  StudentTermination: <XCircle className="w-4 h-4" />,
  StudentTransfer: <ArrowUpRight className="w-4 h-4" />,
  MaintenanceApproval: <Building2 className="w-4 h-4" />,
  PaymentVerification: <CheckCircle2 className="w-4 h-4" />,
  DocumentReview: <ClipboardList className="w-4 h-4" />,
  RoomAllocation: <Building2 className="w-4 h-4" />,
  ContractRenewal: <Calendar className="w-4 h-4" />,
  ComplaintResolution: <AlertCircle className="w-4 h-4" />,
  Other: <ClipboardList className="w-4 h-4" />,
};

function TasksContent() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [typeFilter, setTypeFilter] = useState<TaskType | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "All">("All");
  const [activeTab, setActiveTab] = useState("pending");
  
  // Summary stats
  const [summary, setSummary] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
    pendingStudents: 0,
  });

  // Create task dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    taskType: "Other" as TaskType,
    title: "",
    description: "",
    priority: "Medium" as TaskPriority,
    dueDate: "",
  });

  // Complete/Cancel task dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"complete" | "cancel">("complete");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [resolution, setResolution] = useState("");
  const [processing, setProcessing] = useState(false);

  // Student approval dialog
  const [studentActionOpen, setStudentActionOpen] = useState(false);
  const [studentAction, setStudentAction] = useState<"approve" | "reject">("approve");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingStudent, setProcessingStudent] = useState(false);

  const fetchData = async () => {
    const uid = user?.userId || user?.uid;
    if (!uid) return;

    try {
      const provider = await getProviderByUserId(uid);
      if (provider) {
        setProviderId(provider.providerId);
        
        // Fetch tasks, summary, and pending students
        const [tasksData, summaryData, studentsData] = await Promise.all([
          getTasksByProvider(provider.providerId),
          getTaskSummary(provider.providerId),
          getStudentsByProvider(provider.providerId),
        ]);
        
        // Filter for pending students only
        const pending = studentsData.filter(s => s.status === "Pending");
        setPendingStudents(pending);
        
        setTasks(tasksData);
        setSummary({ ...summaryData, pendingStudents: pending.length });
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    // Tab filter
    if (activeTab === "pending" && task.status !== "Pending") return false;
    if (activeTab === "inProgress" && task.status !== "InProgress") return false;
    if (activeTab === "completed" && task.status !== "Completed") return false;
    if (activeTab === "cancelled" && task.status !== "Cancelled") return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !task.title.toLowerCase().includes(query) &&
        !task.description?.toLowerCase().includes(query) &&
        !task.relatedEntityName?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Type filter
    if (typeFilter !== "All" && task.taskType !== typeFilter) return false;

    // Priority filter
    if (priorityFilter !== "All" && task.priority !== priorityFilter) return false;

    return true;
  });

  const handleCreateTask = async () => {
    if (!providerId || !newTask.title) return;

    setCreating(true);
    try {
      const userName = user?.firstNames && user?.surname 
        ? `${user.firstNames} ${user.surname}` 
        : user?.email || "Unknown";

      await createTask({
        providerId,
        taskType: newTask.taskType,
        title: newTask.title,
        description: newTask.description || undefined,
        status: "Pending",
        priority: newTask.priority,
        dueDate: newTask.dueDate || undefined,
        createdByUserId: user?.userId || user?.uid || "",
        createdByName: userName,
      });

      // Refresh all data
      await fetchData();

      toast.success("Task created successfully");
      setCreateDialogOpen(false);
      setNewTask({
        taskType: "Other",
        title: "",
        description: "",
        priority: "Medium",
        dueDate: "",
      });
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleStartTask = async (task: Task) => {
    try {
      await updateTask(task.taskId, { status: "InProgress" });
      
      // Refresh all data
      await fetchData();

      toast.success("Task started");
    } catch (error) {
      console.error("Error starting task:", error);
      toast.error("Failed to start task");
    }
  };

  const handleOpenActionDialog = (task: Task, action: "complete" | "cancel") => {
    setSelectedTask(task);
    setActionType(action);
    setResolution("");
    setActionDialogOpen(true);
  };

  const handleTaskAction = async () => {
    if (!selectedTask || !resolution) return;

    setProcessing(true);
    try {
      const userName = user?.firstNames && user?.surname 
        ? `${user.firstNames} ${user.surname}` 
        : user?.email || "Unknown";

      if (actionType === "complete") {
        await completeTask(
          selectedTask.taskId,
          resolution,
          user?.userId || user?.uid || "",
          userName
        );
        toast.success("Task completed");
      } else {
        await cancelTask(
          selectedTask.taskId,
          resolution,
          user?.userId || user?.uid || "",
          userName
        );
        toast.success("Task cancelled");
      }

      // Refresh tasks
      // Refresh all data
      await fetchData();

      setActionDialogOpen(false);
      setSelectedTask(null);
      setResolution("");
    } catch (error) {
      console.error("Error processing task:", error);
      toast.error(`Failed to ${actionType} task`);
    } finally {
      setProcessing(false);
    }
  };

  // Student approval handlers
  const handleOpenStudentAction = (student: Student, action: "approve" | "reject") => {
    setSelectedStudent(student);
    setStudentAction(action);
    setRejectionReason("");
    setStudentActionOpen(true);
  };

  const handleStudentAction = async () => {
    if (!selectedStudent) return;
    if (studentAction === "reject" && !rejectionReason) return;

    setProcessingStudent(true);
    try {
      if (studentAction === "approve") {
        await updateStudent(selectedStudent.studentId, { status: "Approved" });
        toast.success(`${selectedStudent.firstNames} ${selectedStudent.surname} approved`);
      } else {
        await updateStudent(selectedStudent.studentId, { 
          status: "Rejected",
          rejectionReason: rejectionReason,
        });
        toast.success(`${selectedStudent.firstNames} ${selectedStudent.surname} rejected`);
      }

      // Refresh all data
      await fetchData();

      setStudentActionOpen(false);
      setSelectedStudent(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error processing student:", error);
      toast.error(`Failed to ${studentAction} student`);
    } finally {
      setProcessingStudent(false);
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    const styles: Record<TaskStatus, string> = {
      Pending: "bg-amber-100 text-amber-800",
      InProgress: "bg-blue-100 text-blue-800",
      Completed: "bg-green-100 text-green-800",
      Cancelled: "bg-gray-100 text-gray-800",
      Deferred: "bg-purple-100 text-purple-800",
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    const styles: Record<TaskPriority, string> = {
      Low: "bg-gray-100 text-gray-600",
      Medium: "bg-blue-100 text-blue-600",
      High: "bg-orange-100 text-orange-600",
      Urgent: "bg-red-100 text-red-600",
    };
    const icons: Record<TaskPriority, React.ReactNode> = {
      Low: <Flag className="w-3 h-3" />,
      Medium: <Flag className="w-3 h-3" />,
      High: <Flag className="w-3 h-3 fill-current" />,
      Urgent: <AlertCircle className="w-3 h-3" />,
    };
    return (
      <Badge className={`${styles[priority]} flex items-center gap-1`}>
        {icons[priority]}
        {priority}
      </Badge>
    );
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === "Completed" || task.status === "Cancelled") {
      return false;
    }
    return task.dueDate < new Date().toISOString().split("T")[0];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No due date";
    return new Date(dateString).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-7 h-7 text-amber-500" />
                Manager Tasks
              </h1>
              <p className="text-gray-500 mt-1">
                Track and manage operational tasks for your properties
              </p>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Student Approvals</p>
                    <p className="text-2xl font-bold text-purple-600">{summary.pendingStudents}</p>
                  </div>
                  <User className="w-8 h-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pending Tasks</p>
                    <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600">{summary.inProgress}</p>
                  </div>
                  <Play className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-gray-400">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Cancelled</p>
                    <p className="text-2xl font-bold text-gray-600">{summary.cancelled}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-gray-400 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{summary.overdue}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TaskType | "All")}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Task Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Types</SelectItem>
                    {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TaskPriority | "All")}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Priorities</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="studentApprovals" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Student Approvals ({summary.pendingStudents})
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending ({summary.pending})
              </TabsTrigger>
              <TabsTrigger value="inProgress" className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                In Progress ({summary.inProgress})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed ({summary.completed})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Cancelled ({summary.cancelled})
              </TabsTrigger>
            </TabsList>

            {/* Student Approvals Tab */}
            <TabsContent value="studentApprovals">
              <Card>
                <CardContent className="p-0">
                  {pendingStudents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No pending student approvals</p>
                      <p className="text-sm">All students have been processed</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {pendingStudents.map((student) => (
                        <div
                          key={student.studentId}
                          className="p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                                <User className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-gray-900">
                                    {student.firstNames} {student.surname}
                                  </h3>
                                  <Badge className="bg-amber-100 text-amber-800">
                                    Pending Approval
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  Student Approval Request
                                  {student.institution && <span> • {student.institution}</span>}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                  <span>ID: {student.idNumber}</span>
                                  {student.studentNumber && <span>Student #: {student.studentNumber}</span>}
                                  {student.funded && <Badge className="bg-green-100 text-green-700 text-xs">NSFAS Funded</Badge>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() => handleOpenStudentAction(student, "approve")}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => handleOpenStudentAction(student, "reject")}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                              <Link href={`/students/${student.studentId}`}>
                                <Button size="sm" variant="ghost">
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Task List */}
            <Card>
              <CardContent className="p-0">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No tasks found</p>
                    <p className="text-sm">
                      {activeTab === "pending" 
                        ? "Create a new task to get started" 
                        : "No tasks in this category"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.taskId}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          isOverdue(task) ? "bg-red-50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${
                              isOverdue(task) 
                                ? "bg-red-100 text-red-600" 
                                : "bg-amber-100 text-amber-600"
                            }`}>
                              {TASK_TYPE_ICONS[task.taskType]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900">
                                  {task.title}
                                </h3>
                                {isOverdue(task) && (
                                  <Badge className="bg-red-100 text-red-800 text-xs">
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {TASK_TYPE_LABELS[task.taskType]}
                                {task.relatedEntityName && (
                                  <span> • {task.relatedEntityName}</span>
                                )}
                              </p>
                              {task.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(task.dueDate)}
                                </span>
                                {task.assignedToName && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    {task.assignedToName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getPriorityBadge(task.priority)}
                            {getStatusBadge(task.status)}
                            {(task.status === "Pending" || task.status === "InProgress") && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {task.status === "Pending" && (
                                    <DropdownMenuItem onClick={() => handleStartTask(task)}>
                                      <Play className="w-4 h-4 mr-2" />
                                      Start Task
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => handleOpenActionDialog(task, "complete")}
                                    className="text-green-600"
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Complete
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleOpenActionDialog(task, "cancel")}
                                    className="text-red-600"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                        {task.resolution && (
                          <div className="mt-3 p-3 bg-gray-100 rounded-lg text-sm">
                            <p className="font-medium text-gray-700">Resolution:</p>
                            <p className="text-gray-600">{task.resolution}</p>
                            {task.resolvedByName && (
                              <p className="text-gray-500 text-xs mt-1">
                                By {task.resolvedByName}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Tabs>

          {/* Create Task Dialog */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Task
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Task Type *</Label>
                  <Select
                    value={newTask.taskType}
                    onValueChange={(v) => setNewTask({ ...newTask, taskType: v as TaskType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Enter task description (optional)"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(v) => setNewTask({ ...newTask, priority: v as TaskPriority })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={creating || !newTask.title}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Task"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Complete/Cancel Task Dialog */}
          <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {actionType === "complete" ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Complete Task
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      Cancel Task
                    </>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {selectedTask && (
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <p className="font-medium">{selectedTask.title}</p>
                    <p className="text-sm text-gray-500">
                      {TASK_TYPE_LABELS[selectedTask.taskType]}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Resolution Notes *</Label>
                  <Textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder={
                      actionType === "complete"
                        ? "Describe how the task was completed..."
                        : "Provide reason for cancellation..."
                    }
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setActionDialogOpen(false)}
                  disabled={processing}
                >
                  Back
                </Button>
                <Button
                  onClick={handleTaskAction}
                  disabled={processing || !resolution}
                  className={
                    actionType === "complete"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : actionType === "complete" ? (
                    "Complete Task"
                  ) : (
                    "Cancel Task"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Student Approval Dialog */}
          <Dialog open={studentActionOpen} onOpenChange={setStudentActionOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {studentAction === "approve" ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Approve Student
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      Reject Student
                    </>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {selectedStudent && (
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <p className="font-medium">{selectedStudent.firstNames} {selectedStudent.surname}</p>
                    <p className="text-sm text-gray-500">
                      ID: {selectedStudent.idNumber}
                      {selectedStudent.institution && ` • ${selectedStudent.institution}`}
                    </p>
                  </div>
                )}
                {studentAction === "approve" ? (
                  <p className="text-sm text-gray-600">
                    Are you sure you want to approve this student? They will be able to proceed with accommodation assignment.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <Label>Rejection Reason *</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Provide reason for rejection..."
                      rows={4}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setStudentActionOpen(false)}
                  disabled={processingStudent}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStudentAction}
                  disabled={processingStudent || (studentAction === "reject" && !rejectionReason)}
                  className={
                    studentAction === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {processingStudent ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : studentAction === "approve" ? (
                    "Approve Student"
                  ) : (
                    "Reject Student"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <TasksContent />
    </ProtectedRoute>
  );
}
