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
  UserPlus,
  Users,
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
import { StaffOnboardingModal } from "@/components/staff";

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

// Task List Card Component
interface TaskListCardProps {
  tasks: Task[];
  activeTab: string;
  isOverdue: (task: Task) => boolean;
  formatDate: (dateString?: string) => string;
  TASK_TYPE_ICONS: Record<TaskType, React.ReactNode>;
  TASK_TYPE_LABELS: Record<TaskType, string>;
  getPriorityBadge: (priority: TaskPriority) => React.ReactNode;
  getStatusBadge: (status: TaskStatus) => React.ReactNode;
  handleStartTask: (task: Task) => void;
  handleOpenActionDialog: (task: Task, action: "complete" | "cancel") => void;
}

function TaskListCard({
  tasks,
  activeTab,
  isOverdue,
  formatDate,
  TASK_TYPE_ICONS,
  TASK_TYPE_LABELS,
  getPriorityBadge,
  getStatusBadge,
  handleStartTask,
  handleOpenActionDialog,
}: TaskListCardProps) {
  return (
    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
              <ClipboardList className="w-10 h-10 text-amber-400" />
            </div>
            <p className="font-semibold text-slate-700 text-lg">No tasks found</p>
            <p className="text-slate-500 mt-1">
              {activeTab === "pending" 
                ? "Create a new task to get started" 
                : "No tasks in this category"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <div
                key={task.taskId}
                className={`p-5 transition-all duration-200 group ${
                  isOverdue(task) 
                    ? "bg-gradient-to-r from-red-50/80 to-transparent hover:from-red-100/80" 
                    : "hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-transparent"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200 ${
                      isOverdue(task) 
                        ? "bg-gradient-to-br from-red-100 to-red-200 text-red-600" 
                        : "bg-gradient-to-br from-amber-100 to-orange-200 text-amber-600"
                    }`}>
                      {TASK_TYPE_ICONS[task.taskType]}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-800">
                          {task.title}
                        </h3>
                        {isOverdue(task) && (
                          <Badge className="bg-gradient-to-r from-red-100 to-rose-100 text-red-700 text-xs border-0 shadow-sm">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1.5">
                        {TASK_TYPE_LABELS[task.taskType]}
                        {task.relatedEntityName && (
                          <span className="text-slate-400"> • {task.relatedEntityName}</span>
                        )}
                      </p>
                      {task.description && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(task.dueDate)}
                        </span>
                        {task.assignedToName && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md">
                            <User className="w-3.5 h-3.5" />
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
                          <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-xl">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          {task.status === "Pending" && (
                            <DropdownMenuItem onClick={() => handleStartTask(task)} className="rounded-lg">
                              <Play className="w-4 h-4 mr-2" />
                              Start Task
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleOpenActionDialog(task, "complete")}
                            className="text-emerald-600 rounded-lg"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Complete
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleOpenActionDialog(task, "cancel")}
                            className="text-red-600 rounded-lg"
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
                  <div className="mt-4 ml-16 p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50">
                    <p className="font-medium text-slate-700 text-sm">Resolution:</p>
                    <p className="text-slate-600 text-sm mt-1">{task.resolution}</p>
                    {task.resolvedByName && (
                      <p className="text-slate-400 text-xs mt-2">
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
  );
}

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
  const [providerName, setProviderName] = useState("");
  
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
        setProviderName(provider.companyName || "");
        
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
        <DashboardHeader />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 animate-pulse" />
                <Loader2 className="w-8 h-8 animate-spin text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-slate-500 font-medium animate-pulse">Loading tasks...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      <DashboardHeader />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Manager Tasks
                </h1>
              </div>
              <p className="text-slate-500 ml-14">
                Track and manage operational tasks for your properties
              </p>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200/50 transition-all duration-200 hover:shadow-xl hover:shadow-amber-200/50 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-purple-100/50 hover:shadow-lg hover:shadow-purple-100 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-200/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between relative">
                  <div>
                    <p className="text-xs font-medium text-purple-600/70 uppercase tracking-wide">Student Approvals</p>
                    <p className="text-3xl font-bold text-purple-700 mt-1">{summary.pendingStudents}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-orange-100/50 hover:shadow-lg hover:shadow-amber-100 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-200/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between relative">
                  <div>
                    <p className="text-xs font-medium text-amber-600/70 uppercase tracking-wide">Pending Tasks</p>
                    <p className="text-3xl font-bold text-amber-700 mt-1">{summary.pending}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-lg hover:shadow-blue-100 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-200/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between relative">
                  <div>
                    <p className="text-xs font-medium text-blue-600/70 uppercase tracking-wide">In Progress</p>
                    <p className="text-3xl font-bold text-blue-700 mt-1">{summary.inProgress}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <Play className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-green-100/50 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-200/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between relative">
                  <div>
                    <p className="text-xs font-medium text-emerald-600/70 uppercase tracking-wide">Completed</p>
                    <p className="text-3xl font-bold text-emerald-700 mt-1">{summary.completed}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100/50 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-slate-200/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between relative">
                  <div>
                    <p className="text-xs font-medium text-slate-500/70 uppercase tracking-wide">Cancelled</p>
                    <p className="text-3xl font-bold text-slate-600 mt-1">{summary.cancelled}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-500/10 group-hover:bg-slate-500/20 transition-colors">
                    <XCircle className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-red-50 to-rose-100/50 hover:shadow-lg hover:shadow-red-100 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-200/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between relative">
                  <div>
                    <p className="text-xs font-medium text-red-600/70 uppercase tracking-wide">Overdue</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{summary.overdue}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6 border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 h-11 border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 rounded-xl bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TaskType | "All")}>
                  <SelectTrigger className="w-48 h-11 border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white transition-all">
                    <SelectValue placeholder="Task Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="All">All Types</SelectItem>
                    {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TaskPriority | "All")}>
                  <SelectTrigger className="w-44 h-11 border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white transition-all">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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
            <TabsList className="mb-6 p-1.5 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm h-auto flex-wrap gap-1">
              <TabsTrigger 
                value="studentApprovals" 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-200 transition-all duration-200"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Student Approvals</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-white/20 data-[state=inactive]:bg-purple-100 data-[state=inactive]:text-purple-700">{summary.pendingStudents}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="pending" 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-200 transition-all duration-200"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Pending</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-white/20 data-[state=inactive]:bg-amber-100 data-[state=inactive]:text-amber-700">{summary.pending}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="inProgress" 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-200 transition-all duration-200"
              >
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">In Progress</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-white/20 data-[state=inactive]:bg-blue-100 data-[state=inactive]:text-blue-700">{summary.inProgress}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="completed" 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-200 transition-all duration-200"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="hidden sm:inline">Completed</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-white/20 data-[state=inactive]:bg-emerald-100 data-[state=inactive]:text-emerald-700">{summary.completed}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="cancelled" 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-500 data-[state=active]:to-slate-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-slate-200 transition-all duration-200"
              >
                <XCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Cancelled</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-white/20 data-[state=inactive]:bg-slate-100 data-[state=inactive]:text-slate-700">{summary.cancelled}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="staff" 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-200 transition-all duration-200"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Staff</span>
              </TabsTrigger>
            </TabsList>

            {/* Student Approvals Tab */}
            <TabsContent value="studentApprovals">
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  {pendingStudents.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                        <User className="w-10 h-10 text-purple-400" />
                      </div>
                      <p className="font-semibold text-slate-700 text-lg">No pending student approvals</p>
                      <p className="text-slate-500 mt-1">All students have been processed</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {pendingStudents.map((student) => (
                        <div
                          key={student.studentId}
                          className="p-5 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-transparent transition-all duration-200 group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-3">
                                  <h3 className="font-semibold text-slate-800">
                                    {student.firstNames} {student.surname}
                                  </h3>
                                  <Badge className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-0 shadow-sm">
                                    Pending Approval
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-500 mt-1.5">
                                  Student Approval Request
                                  {student.institution && <span className="text-slate-400"> • {student.institution}</span>}
                                </p>
                                <div className="flex items-center gap-4 mt-2.5 text-sm text-slate-500">
                                  <span className="px-2 py-0.5 bg-slate-100 rounded-md">ID: {student.idNumber}</span>
                                  {student.studentNumber && <span className="px-2 py-0.5 bg-slate-100 rounded-md">Student #: {student.studentNumber}</span>}
                                  {student.funded && <Badge className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 text-xs border-0">NSFAS Funded</Badge>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-0 shadow-sm hover:shadow-md transition-all"
                                onClick={() => handleOpenStudentAction(student, "approve")}
                              >
                                <Check className="w-4 h-4 mr-1.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all"
                                onClick={() => handleOpenStudentAction(student, "reject")}
                              >
                                <X className="w-4 h-4 mr-1.5" />
                                Reject
                              </Button>
                              <Link href={`/students/${student.studentId}`}>
                                <Button size="sm" variant="ghost" className="hover:bg-slate-100 rounded-xl">
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

            {/* Staff Tab */}
            <TabsContent value="staff">
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-transparent">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-800">Staff Management</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Onboard and manage staff members for your organization
                    </p>
                  </div>
                  {providerId && providerName && (
                    <StaffOnboardingModal
                      providerId={providerId}
                      providerName={providerName}
                      onUserCreated={() => toast.success("Staff member added to onboarding queue")}
                    />
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                      <Users className="w-10 h-10 text-indigo-400" />
                    </div>
                    <p className="font-semibold text-slate-700 text-lg">Staff Onboarding</p>
                    <p className="text-slate-500 mt-1">
                      Click &quot;Add Staff Member&quot; to onboard new team members.
                    </p>
                    <p className="text-xs text-slate-400 mt-3">
                      New staff accounts will be created and activated automatically.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Task List */}
            <TabsContent value="pending" className="mt-0">
              <TaskListCard tasks={filteredTasks} activeTab={activeTab} isOverdue={isOverdue} formatDate={formatDate} TASK_TYPE_ICONS={TASK_TYPE_ICONS} TASK_TYPE_LABELS={TASK_TYPE_LABELS} getPriorityBadge={getPriorityBadge} getStatusBadge={getStatusBadge} handleStartTask={handleStartTask} handleOpenActionDialog={handleOpenActionDialog} />
            </TabsContent>
            <TabsContent value="inProgress" className="mt-0">
              <TaskListCard tasks={filteredTasks} activeTab={activeTab} isOverdue={isOverdue} formatDate={formatDate} TASK_TYPE_ICONS={TASK_TYPE_ICONS} TASK_TYPE_LABELS={TASK_TYPE_LABELS} getPriorityBadge={getPriorityBadge} getStatusBadge={getStatusBadge} handleStartTask={handleStartTask} handleOpenActionDialog={handleOpenActionDialog} />
            </TabsContent>
            <TabsContent value="completed" className="mt-0">
              <TaskListCard tasks={filteredTasks} activeTab={activeTab} isOverdue={isOverdue} formatDate={formatDate} TASK_TYPE_ICONS={TASK_TYPE_ICONS} TASK_TYPE_LABELS={TASK_TYPE_LABELS} getPriorityBadge={getPriorityBadge} getStatusBadge={getStatusBadge} handleStartTask={handleStartTask} handleOpenActionDialog={handleOpenActionDialog} />
            </TabsContent>
            <TabsContent value="cancelled" className="mt-0">
              <TaskListCard tasks={filteredTasks} activeTab={activeTab} isOverdue={isOverdue} formatDate={formatDate} TASK_TYPE_ICONS={TASK_TYPE_ICONS} TASK_TYPE_LABELS={TASK_TYPE_LABELS} getPriorityBadge={getPriorityBadge} getStatusBadge={getStatusBadge} handleStartTask={handleStartTask} handleOpenActionDialog={handleOpenActionDialog} />
            </TabsContent>
          </Tabs>

          {/* Create Task Dialog */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="max-w-lg rounded-2xl border-0 shadow-2xl">
              <DialogHeader className="pb-4 border-b border-slate-100">
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-semibold text-slate-800">Create New Task</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-5">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Task Type *</Label>
                  <Select
                    value={newTask.taskType}
                    onValueChange={(v) => setNewTask({ ...newTask, taskType: v as TaskType })}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:border-amber-400 focus:ring-amber-400/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Title *</Label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title"
                    className="h-11 rounded-xl border-slate-200 focus:border-amber-400 focus:ring-amber-400/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Description</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Enter task description (optional)"
                    rows={3}
                    className="rounded-xl border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(v) => setNewTask({ ...newTask, priority: v as TaskPriority })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:border-amber-400 focus:ring-amber-400/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Due Date</Label>
                    <Input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="h-11 rounded-xl border-slate-200 focus:border-amber-400 focus:ring-amber-400/20"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-4 border-t border-slate-100 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={creating}
                  className="rounded-xl border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={creating || !newTask.title}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200/50"
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
            <DialogContent className="max-w-md rounded-2xl border-0 shadow-2xl">
              <DialogHeader className="pb-4 border-b border-slate-100">
                <DialogTitle className="flex items-center gap-3">
                  {actionType === "complete" ? (
                    <>
                      <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-200">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-semibold text-slate-800">Complete Task</span>
                    </>
                  ) : (
                    <>
                      <div className="p-2 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 shadow-lg shadow-red-200">
                        <XCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-semibold text-slate-800">Cancel Task</span>
                    </>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-5">
                {selectedTask && (
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50">
                    <p className="font-semibold text-slate-800">{selectedTask.title}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {TASK_TYPE_LABELS[selectedTask.taskType]}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Resolution Notes *</Label>
                  <Textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder={
                      actionType === "complete"
                        ? "Describe how the task was completed..."
                        : "Provide reason for cancellation..."
                    }
                    rows={4}
                    className="rounded-xl border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 resize-none"
                  />
                </div>
              </div>
              <DialogFooter className="pt-4 border-t border-slate-100 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setActionDialogOpen(false)}
                  disabled={processing}
                  className="rounded-xl border-slate-200 hover:bg-slate-50"
                >
                  Back
                </Button>
                <Button
                  onClick={handleTaskAction}
                  disabled={processing || !resolution}
                  className={
                    actionType === "complete"
                      ? "rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-200/50"
                      : "rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-200/50"
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
            <DialogContent className="max-w-md rounded-2xl border-0 shadow-2xl">
              <DialogHeader className="pb-4 border-b border-slate-100">
                <DialogTitle className="flex items-center gap-3">
                  {studentAction === "approve" ? (
                    <>
                      <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-200">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-semibold text-slate-800">Approve Student</span>
                    </>
                  ) : (
                    <>
                      <div className="p-2 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 shadow-lg shadow-red-200">
                        <XCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-semibold text-slate-800">Reject Student</span>
                    </>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-5">
                {selectedStudent && (
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50">
                    <p className="font-semibold text-slate-800">{selectedStudent.firstNames} {selectedStudent.surname}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      ID: {selectedStudent.idNumber}
                      {selectedStudent.institution && ` • ${selectedStudent.institution}`}
                    </p>
                  </div>
                )}
                {studentAction === "approve" ? (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200/50">
                    <p className="text-sm text-emerald-700">
                      Are you sure you want to approve this student? They will be able to proceed with accommodation assignment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Rejection Reason *</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Provide reason for rejection..."
                      rows={4}
                      className="rounded-xl border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 resize-none"
                    />
                  </div>
                )}
              </div>
              <DialogFooter className="pt-4 border-t border-slate-100 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStudentActionOpen(false)}
                  disabled={processingStudent}
                  className="rounded-xl border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStudentAction}
                  disabled={processingStudent || (studentAction === "reject" && !rejectionReason)}
                  className={
                    studentAction === "approve"
                      ? "rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-200/50"
                      : "rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-200/50"
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
