"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  StudentListItem,
  ApiUser,
  ClassItem,
  AdminActivityItem,
  BACKEND_BASE_URL,
  StudentFullDetails,
  StudentFilterParams,
} from "@/lib/api";
import {
  Gamepad2,
  Search,
  RotateCcw,
  KeyRound,
  LogOut,
  Laptop,
  CheckCircle2,
  XCircle,
  Users,
  X,
  Sparkles,
  BookOpen,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Menu,
  ShieldCheck,
  CreditCard,
  Layers,
  Upload,
  Play,
  FileArchive,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronDown,
  MoreVertical,
  Clock,
  Calendar,
  ShieldAlert,
  RefreshCw,
  Filter,
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<ApiUser | null>(null);
  const [activeTab, setActiveTab] = useState<"students" | "classes" | "activities">("students");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // --- Students state & pagination ---
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentPage, setStudentPage] = useState(1);
  const [studentLimit, setStudentLimit] = useState(10);
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentTotalPages, setStudentTotalPages] = useState(1);

  // --- Students filter & refresh state ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [showFilterBar, setShowFilterBar] = useState<boolean>(true);

  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Student Modals & Password Visibility state
  const [resetModalStudent, setResetModalStudent] = useState<StudentListItem | null>(null);
  const [passwordModalStudent, setPasswordModalStudent] = useState<StudentListItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Table password reveal & copy state
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Edit Student Modal state
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    classGrade: "",
    schoolName: "",
    city: "",
    state: "",
    password: "",
    isActive: true,
  });
  const [editShowPassword, setEditShowPassword] = useState(false);

  // Action Dropdown state
  const [actionDropdownId, setActionDropdownId] = useState<number | null>(null);

  // View Details Modal state
  const [viewStudent, setViewStudent] = useState<StudentListItem | null>(null);
  const [viewDetailsData, setViewDetailsData] = useState<StudentFullDetails | null>(null);
  const [loadingViewDetails, setLoadingViewDetails] = useState(false);
  const [viewShowPassword, setViewShowPassword] = useState(false);

  // --- Classes state & pagination ---
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classPage, setClassPage] = useState(1);
  const [classLimit, setClassLimit] = useState(10);

  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [classNameInput, setClassNameInput] = useState("");
  const [classOrderInput, setClassOrderInput] = useState(0);

  // --- Activities state & pagination ---
  const [activitiesList, setActivitiesList] = useState<AdminActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityLimit, setActivityLimit] = useState(10);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewActivity, setPreviewActivity] = useState<AdminActivityItem | null>(null);
  const [uploadClassId, setUploadClassId] = useState<number | "">("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCheckpoints, setUploadCheckpoints] = useState(3);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function init() {
      const meRes = await api.getMe();
      if (!meRes.success || !meRes.data?.user || meRes.data.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }
      setAdminUser(meRes.data.user);
      await Promise.all([fetchStudents("", 1, 10), fetchClasses(), fetchActivities()]);
      setLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    function handleClickOutside() {
      setActionDropdownId(null);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  async function fetchStudents(
    searchQuery = search,
    page = studentPage,
    limit = studentLimit,
    status = filterStatus,
    classGrade = filterClass,
    startDate = filterStartDate,
    endDate = filterEndDate
  ) {
    setStudentsLoading(true);
    const res = await api.getStudents({
      search: searchQuery,
      page,
      limit,
      status,
      classGrade,
      startDate,
      endDate,
    });
    if (res.success && res.data?.students) {
      setStudents(res.data.students);
      if (res.data.pagination) {
        setStudentTotal(res.data.pagination.total);
        setStudentTotalPages(res.data.pagination.totalPages);
        setStudentPage(res.data.pagination.page);
        setStudentLimit(res.data.pagination.limit);
      } else {
        setStudentTotal(res.data.students.length);
        setStudentTotalPages(Math.max(1, Math.ceil(res.data.students.length / limit)));
      }
    }
    setStudentsLoading(false);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchStudents(search, studentPage, studentLimit, filterStatus, filterClass, filterStartDate, filterEndDate);
    setTimeout(() => setIsRefreshing(false), 400);
  }

  function handleStatusChange(newStatus: "all" | "active" | "inactive") {
    setFilterStatus(newStatus);
    setStudentPage(1);
    fetchStudents(search, 1, studentLimit, newStatus, filterClass, filterStartDate, filterEndDate);
  }

  function handleClassFilterChange(newClass: string) {
    setFilterClass(newClass);
    setStudentPage(1);
    fetchStudents(search, 1, studentLimit, filterStatus, newClass, filterStartDate, filterEndDate);
  }

  function handleStartDateChange(date: string) {
    setFilterStartDate(date);
    setStudentPage(1);
    fetchStudents(search, 1, studentLimit, filterStatus, filterClass, date, filterEndDate);
  }

  function handleEndDateChange(date: string) {
    setFilterEndDate(date);
    setStudentPage(1);
    fetchStudents(search, 1, studentLimit, filterStatus, filterClass, filterStartDate, date);
  }

  function handleClearFilters() {
    setSearch("");
    setFilterStatus("all");
    setFilterClass("all");
    setFilterStartDate("");
    setFilterEndDate("");
    setStudentPage(1);
    fetchStudents("", 1, studentLimit, "all", "all", "", "");
  }

  async function fetchClasses() {
    setLoadingClasses(true);
    const res = await api.getAllClasses();
    if (res.success && res.data?.classes) {
      setClassesList(res.data.classes);
    }
    setLoadingClasses(false);
  }

  async function fetchActivities() {
    setLoadingActivities(true);
    const res = await api.getAdminActivities();
    if (res.success && res.data?.activities) {
      setActivitiesList(res.data.activities);
    }
    setLoadingActivities(false);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStudentPage(1);
    fetchStudents(search, 1, studentLimit, filterStatus, filterClass, filterStartDate, filterEndDate);
  }

  function handleStudentPageChange(newPage: number) {
    if (newPage < 1 || newPage > studentTotalPages) return;
    setStudentPage(newPage);
    fetchStudents(search, newPage, studentLimit, filterStatus, filterClass, filterStartDate, filterEndDate);
  }

  function handleStudentLimitChange(newLimit: number) {
    setStudentLimit(newLimit);
    setStudentPage(1);
    fetchStudents(search, 1, newLimit, filterStatus, filterClass, filterStartDate, filterEndDate);
  }

  async function handleToggleStatus(student: StudentListItem) {
    const res = await api.toggleStudentStatus(student.id);
    if (res.success) {
      setActionMessage({
        type: "success",
        text: `Student ${student.fullName} ${student.isActive ? "deactivated" : "activated"} successfully`,
      });
      await fetchStudents(search, studentPage, studentLimit, filterStatus, filterClass, filterStartDate, filterEndDate);
    } else {
      setActionMessage({
        type: "error",
        text: res.error?.message || "Failed to update status",
      });
    }
  }

  async function confirmDeviceReset() {
    if (!resetModalStudent) return;
    setSubmitting(true);
    const res = await api.resetStudentDevice(resetModalStudent.id, resetReason || "Admin manual reset");
    setSubmitting(false);
    if (res.success) {
      setActionMessage({
        type: "success",
        text: `Device lock for ${resetModalStudent.fullName} successfully cleared! The student can now bind a new laptop on their next login.`,
      });
      setResetModalStudent(null);
      setResetReason("");
      await fetchStudents(search, studentPage, studentLimit, filterStatus, filterClass, filterStartDate, filterEndDate);
    } else {
      setActionMessage({
        type: "error",
        text: res.error?.message || "Device reset failed",
      });
    }
  }

  async function confirmSetPassword() {
    if (!passwordModalStudent) return;
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    const res = await api.adminSetPassword(passwordModalStudent.id, newPassword);
    setSubmitting(false);
    if (res.success) {
      setActionMessage({
        type: "success",
        text: `Password for ${passwordModalStudent.fullName} updated to "${newPassword}". All active sessions terminated.`,
      });
      setPasswordModalStudent(null);
      setNewPassword("");
      await fetchStudents(search, studentPage, studentLimit, filterStatus, filterClass, filterStartDate, filterEndDate);
    } else {
      setActionMessage({
        type: "error",
        text: res.error?.message || "Password update failed",
      });
    }
  }

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  }

  function togglePasswordVisibility(studentId: number) {
    setVisiblePasswords((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  }

  function copyPassword(studentId: number, pass?: string | null) {
    if (!pass) return;
    navigator.clipboard.writeText(pass);
    setCopiedId(studentId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function openEditStudent(student: StudentListItem) {
    setEditingStudent(student);
    setEditForm({
      fullName: student.fullName || "",
      email: student.email || "",
      mobileNumber: student.mobileNumber || "",
      classGrade: student.classGrade || "",
      schoolName: student.schoolName || "",
      city: student.city || "",
      state: student.state || "",
      password: student.rawPassword || "",
      isActive: student.isActive,
    });
    setEditShowPassword(false);
  }

  async function handleSaveEditStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;
    setSubmitting(true);
    const res = await api.updateStudent(editingStudent.id, {
      fullName: editForm.fullName,
      email: editForm.email,
      mobileNumber: editForm.mobileNumber,
      classGrade: editForm.classGrade,
      schoolName: editForm.schoolName,
      city: editForm.city,
      state: editForm.state,
      password: editForm.password ? editForm.password : undefined,
      isActive: editForm.isActive,
    });
    setSubmitting(false);
    if (res.success) {
      setActionMessage({
        type: "success",
        text: `Student ${editForm.fullName} updated successfully! Class: ${editForm.classGrade}.`,
      });
      setEditingStudent(null);
      await fetchStudents(search, studentPage, studentLimit, filterStatus, filterClass, filterStartDate, filterEndDate);
    } else {
      setActionMessage({
        type: "error",
        text: res.error?.message || "Failed to update student details",
      });
    }
  }

  async function openViewDetails(student: StudentListItem) {
    setViewStudent(student);
    setViewDetailsData(null);
    setViewShowPassword(false);
    setLoadingViewDetails(true);
    const res = await api.getStudentDetails(student.id);
    setLoadingViewDetails(false);
    if (res.success && res.data) {
      setViewDetailsData(res.data);
    }
  }

  // --- Classes CRUD Handlers ---

  function openCreateClassModal() {
    setEditingClass(null);
    setClassNameInput("");
    const nextOrder = classesList.length > 0 ? Math.max(...classesList.map((c) => c.display_order)) + 1 : 1;
    setClassOrderInput(nextOrder);
    setShowClassModal(true);
  }

  function openEditClassModal(cls: ClassItem) {
    setEditingClass(cls);
    setClassNameInput(cls.name);
    setClassOrderInput(cls.display_order);
    setShowClassModal(true);
  }

  async function handleSaveClass(e: React.FormEvent) {
    e.preventDefault();
    if (!classNameInput.trim()) return;

    setSubmitting(true);
    if (editingClass) {
      const res = await api.updateClass(editingClass.id, {
        name: classNameInput.trim(),
        displayOrder: Number(classOrderInput),
      });
      if (res.success) {
        setActionMessage({ type: "success", text: `Class "${classNameInput}" updated successfully!` });
        setShowClassModal(false);
        await fetchClasses();
      } else {
        setActionMessage({ type: "error", text: res.error?.message || "Failed to update class" });
      }
    } else {
      const res = await api.createClass({
        name: classNameInput.trim(),
        displayOrder: Number(classOrderInput),
        isActive: true,
      });
      if (res.success) {
        setActionMessage({ type: "success", text: `Class "${classNameInput}" created successfully!` });
        setShowClassModal(false);
        await fetchClasses();
      } else {
        setActionMessage({ type: "error", text: res.error?.message || "Failed to create class" });
      }
    }
    setSubmitting(false);
  }

  async function handleToggleClassActive(cls: ClassItem) {
    const res = await api.updateClass(cls.id, { isActive: !cls.is_active });
    if (res.success) {
      setActionMessage({
        type: "success",
        text: `Class "${cls.name}" ${cls.is_active ? "disabled" : "enabled"} for dropdown`,
      });
      await fetchClasses();
    }
  }

  async function handleDeleteClass(cls: ClassItem) {
    if (!confirm(`Are you sure you want to delete class "${cls.name}"?`)) return;
    const res = await api.deleteClass(cls.id);
    if (res.success) {
      setActionMessage({ type: "success", text: `Class "${cls.name}" deleted successfully` });
      await fetchClasses();
    } else {
      setActionMessage({ type: "error", text: res.error?.message || "Failed to delete class" });
    }
  }

  async function handleMoveOrder(globalIndex: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? globalIndex - 1 : globalIndex + 1;
    if (targetIndex < 0 || targetIndex >= classesList.length) return;

    const updated = [...classesList];
    const temp = updated[globalIndex];
    updated[globalIndex] = updated[targetIndex];
    updated[targetIndex] = temp;

    const items = updated.map((cls, idx) => ({
      id: cls.id,
      displayOrder: idx + 1,
    }));

    setClassesList(
      updated.map((cls, idx) => ({
        ...cls,
        display_order: idx + 1,
      }))
    );

    const res = await api.reorderClasses(items);
    if (!res.success) {
      setActionMessage({ type: "error", text: "Failed to persist class reordering" });
      await fetchClasses();
    }
  }

  // --- Activities CRUD Handlers ---

  function openUploadActivityModal() {
    setUploadClassId(classesList.length > 0 ? classesList[0].id : "");
    setUploadTitle("");
    setUploadCheckpoints(3);
    setUploadFile(null);
    setShowUploadModal(true);
  }

  async function handleUploadActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadClassId || !uploadFile) {
      alert("Please select a class and upload a ZIP file");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("classId", String(uploadClassId));
    formData.append("title", uploadTitle.trim() || `Class Activity Journey`);
    formData.append("totalCheckpoints", String(uploadCheckpoints));

    const res = await api.uploadActivityPackage(formData);
    setUploading(false);

    if (res.success) {
      setActionMessage({
        type: "success",
        text: res.message || "Activity journey package uploaded successfully!",
      });
      setShowUploadModal(false);
      await fetchActivities();
    } else {
      setActionMessage({
        type: "error",
        text: res.error?.message || "Failed to upload package",
      });
    }
  }

  async function handleDeleteActivity(activity: AdminActivityItem) {
    if (!confirm(`Are you sure you want to delete journey package for "${activity.className}"?`)) {
      return;
    }

    const res = await api.deleteActivityPackage(activity.id);
    if (res.success) {
      setActionMessage({
        type: "success",
        text: `Journey package for ${activity.className} deleted successfully`,
      });
      await fetchActivities();
    } else {
      setActionMessage({
        type: "error",
        text: res.error?.message || "Failed to delete activity",
      });
    }
  }

  async function handleLogout() {
    await api.logout();
    window.location.href = "/login";
  }

  // --- Classes Paginated Slicing ---
  const classTotalPages = Math.max(1, Math.ceil(classesList.length / classLimit));
  const paginatedClasses = classesList.slice(
    (classPage - 1) * classLimit,
    classPage * classLimit
  );

  // --- Activities Paginated Slicing ---
  const activityTotalPages = Math.max(1, Math.ceil(activitiesList.length / activityLimit));
  const paginatedActivities = activitiesList.slice(
    (activityPage - 1) * activityLimit,
    activityPage * activityLimit
  );

  function getPageNumbers(currentPage: number, totalPages: number): number[] {
    const delta = 2;
    const range: number[] = [];
    for (
      let i = Math.max(1, currentPage - delta);
      i <= Math.min(totalPages, currentPage + delta);
      i++
    ) {
      range.push(i);
    }
    return range;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading Education Game Admin Console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 tracking-tight text-sm block leading-tight">
                  Education Game
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
                  Admin Console
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="p-4 space-y-6">
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Main Management
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("students");
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "students"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className={`w-4 h-4 ${activeTab === "students" ? "text-indigo-600" : "text-slate-400"}`} />
                    <span>Students &amp; Devices</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTab === "students"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {studentTotal}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("classes");
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "classes"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className={`w-4 h-4 ${activeTab === "classes" ? "text-indigo-600" : "text-slate-400"}`} />
                    <span>Classes &amp; Order</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTab === "classes"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {classesList.length}
                  </span>
                </button>

                {/* TAB 3: GAME ACTIVITIES (STAGE 2) */}
                <button
                  onClick={() => {
                    setActiveTab("activities");
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "activities"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className={`w-4 h-4 ${activeTab === "activities" ? "text-indigo-600" : "text-slate-400"}`} />
                    <span>Game Activities</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTab === "activities"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {activitiesList.length}
                  </span>
                </button>
              </nav>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Upcoming Modules
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-400 bg-slate-50/70 border border-dashed border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span>Subscriptions</span>
                  </div>
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                    Stage 3
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Admin User & Logout */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                {adminUser?.fullName?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{adminUser?.fullName}</p>
                <p className="text-[10px] text-slate-500 truncate">{adminUser?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0 border border-slate-200 hover:border-rose-200"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs">
              <span className="text-slate-400 font-medium">Admin / </span>
              <span className="text-slate-800 font-bold">
                {activeTab === "students"
                  ? "Students & Device Controls"
                  : activeTab === "classes"
                  ? "Classes & Dropdown Order"
                  : "Class Game Packages & Journeys"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Stage 2 Journey Engine Active</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Action Message Alert */}
          {actionMessage && (
            <div
              className={`mb-6 p-4 rounded-2xl text-xs flex items-center justify-between shadow-xs ${
                actionMessage.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              <span>{actionMessage.text}</span>
              <button
                onClick={() => setActionMessage(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: STUDENTS MANAGEMENT */}
          {activeTab === "students" && (
            <div>
              {/* Header & Controls */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Student Accounts &amp; Device Restrictions
                  </h1>
                  <p className="text-slate-500 text-xs mt-1">
                    Manage student profiles, single-device bindings, and password resets
                  </p>
                </div>

                {/* Search Bar, Refresh & Filters Toggle */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, mobile, city, school..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 shadow-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      Search
                    </button>
                  </form>

                  {/* Refresh Button */}
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing || studentsLoading}
                    title="Refresh student list"
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-xs cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-slate-600 ${
                        isRefreshing || studentsLoading ? "animate-spin text-indigo-600" : ""
                      }`}
                    />
                  </button>

                  {/* Filter Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowFilterBar(!showFilterBar)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      filterStatus !== "all" || filterClass !== "all" || filterStartDate || filterEndDate
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filters</span>
                    {(filterStatus !== "all" || filterClass !== "all" || filterStartDate || filterEndDate) && (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                        {[
                          filterStatus !== "all",
                          filterClass !== "all",
                          Boolean(filterStartDate),
                          Boolean(filterEndDate),
                        ].filter(Boolean).length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Filters Toolbar Card */}
              {showFilterBar && (
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 mb-5 shadow-xs transition-all animate-in fade-in duration-150">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">Status:</span>
                      <select
                        value={filterStatus}
                        onChange={(e) => handleStatusChange(e.target.value as any)}
                        className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
                      >
                        <option value="all">All Accounts (Active &amp; Inactive)</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Deactivated Only</option>
                      </select>
                    </div>

                    {/* Class Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">Class:</span>
                      <select
                        value={filterClass}
                        onChange={(e) => handleClassFilterChange(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer max-w-[150px]"
                      >
                        <option value="all">All Classes</option>
                        {classesList.map((cls) => (
                          <option key={cls.id} value={cls.name}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Date */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">From Date:</span>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
                      />
                    </div>

                    {/* End Date */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">To Date:</span>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
                      />
                    </div>

                    {/* Clear Filters Button */}
                    {(filterStatus !== "all" || filterClass !== "all" || filterStartDate || filterEndDate || search) && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="ml-auto inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 transition-colors cursor-pointer font-semibold"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear Filters</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Students Table Card */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs">
                <div className="overflow-x-auto min-h-[380px] pb-12">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Student Details</th>
                        <th className="py-3.5 px-4 font-semibold">Mobile Number</th>
                        <th className="py-3.5 px-4 font-semibold">Class, School, City &amp; State</th>
                        <th className="py-3.5 px-4 font-semibold">Active Device Binding</th>
                        <th className="py-3.5 px-4 font-semibold">Status</th>
                        <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentsLoading ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                              <span>Loading students...</span>
                            </div>
                          </td>
                        </tr>
                      ) : students.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-500">
                            No students found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        students.map((student, index) => {
                          const isNearBottom = index >= Math.max(1, students.length - 2);
                          return (
                          <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Name & Email */}
                            <td className="py-4 px-4">
                              <div className="font-semibold text-slate-900">{student.fullName}</div>
                              <div className="text-slate-500 text-[11px]">{student.email}</div>
                            </td>

                            {/* Mobile */}
                            <td className="py-4 px-4 text-slate-700 font-mono text-[11px]">
                              {student.mobileNumber || "—"}
                            </td>

                            {/* Class, School, City & State */}
                            <td className="py-4 px-4 text-slate-700">
                              <div className="font-semibold text-indigo-600">{student.classGrade}</div>
                              <div className="text-slate-800 text-[11px] truncate max-w-[200px]">
                                {student.schoolName}
                              </div>
                              {(student.city || student.state) && (
                                <div className="text-slate-500 text-[10px] truncate max-w-[200px]">
                                  {[student.city, student.state].filter(Boolean).join(", ")}
                                </div>
                              )}
                            </td>

                            {/* Device Status */}
                            <td className="py-4 px-4">
                              {student.activeDeviceId ? (
                                <div className="flex items-start gap-2">
                                  <Laptop className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-semibold text-emerald-800 text-[11px]">
                                      {student.activeDeviceLabel}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      IP: {student.activeDeviceBoundIp}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-slate-400 text-[11px] italic">
                                  No device bound yet
                                </div>
                              )}
                            </td>

                            {/* Active Status Toggle */}
                            <td className="py-4 px-4">
                              <button
                                onClick={() => handleToggleStatus(student)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                                  student.isActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                    : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                }`}
                              >
                                {student.isActive ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Active</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3" />
                                    <span>Inactive</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Actions Dropdown */}
                            <td className="py-4 px-4 text-right relative">
                              <div
                                className="relative inline-block text-left"
                                style={{ zIndex: actionDropdownId === student.id ? 60 : 1 }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => setActionDropdownId(actionDropdownId === student.id ? null : student.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                >
                                  <span>Actions</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                </button>

                                {actionDropdownId === student.id && (
                                  <div
                                    className={`absolute right-0 w-48 rounded-2xl bg-white border border-slate-200 shadow-2xl py-1.5 z-60 text-left ${
                                      isNearBottom ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionDropdownId(null);
                                        openViewDetails(student);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                    >
                                      <Eye className="w-4 h-4 text-indigo-500" />
                                      <span>View Details</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionDropdownId(null);
                                        openEditStudent(student);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                    >
                                      <Edit2 className="w-4 h-4 text-indigo-500" />
                                      <span>Edit Profile</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionDropdownId(null);
                                        setPasswordModalStudent(student);
                                        setNewPassword("");
                                        setShowSetPassword(false);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                    >
                                      <KeyRound className="w-4 h-4 text-indigo-500" />
                                      <span>Set Password</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionDropdownId(null);
                                        setResetModalStudent(student);
                                        setResetReason("Student requested device switch");
                                      }}
                                      disabled={!student.activeDeviceId}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
                                    >
                                      <RotateCcw className="w-4 h-4 text-rose-500" />
                                      <span>Reset Device Lock</span>
                                    </button>

                                    <div className="my-1 border-t border-slate-100" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionDropdownId(null);
                                        handleToggleStatus(student);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                      {student.isActive ? (
                                        <>
                                          <XCircle className="w-4 h-4 text-rose-500" />
                                          <span>Deactivate Account</span>
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                          <span>Activate Account</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Students Pagination Bar */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      Showing{" "}
                      <strong className="text-slate-800">
                        {studentTotal === 0 ? 0 : (studentPage - 1) * studentLimit + 1}
                      </strong>{" "}
                      to{" "}
                      <strong className="text-slate-800">
                        {Math.min(studentPage * studentLimit, studentTotal)}
                      </strong>{" "}
                      of <strong className="text-slate-800">{studentTotal}</strong> students
                    </span>
                    <span className="text-slate-300">|</span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span>Rows:</span>
                      <select
                        value={studentLimit}
                        onChange={(e) => handleStudentLimitChange(Number(e.target.value))}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStudentPageChange(studentPage - 1)}
                      disabled={studentPage <= 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    {getPageNumbers(studentPage, studentTotalPages).map((p) => (
                      <button
                        key={p}
                        onClick={() => handleStudentPageChange(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          p === studentPage
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      onClick={() => handleStudentPageChange(studentPage + 1)}
                      disabled={studentPage >= studentTotalPages}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Next Page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLASSES CRUD & ORDER MANAGEMENT */}
          {activeTab === "classes" && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Class List &amp; Registration Dropdown Order
                  </h1>
                  <p className="text-slate-500 text-xs mt-1">
                    Manage which classes appear in the registration dropdown and control their exact display order.
                  </p>
                </div>

                <button
                  onClick={openCreateClassModal}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Class</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4 w-28 font-semibold">Order</th>
                        <th className="py-3.5 px-4 font-semibold">Class / Grade Name</th>
                        <th className="py-3.5 px-4 font-semibold">Dropdown Status</th>
                        <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classesList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500">
                            {loadingClasses ? "Loading classes..." : "No classes defined yet. Click 'Add New Class' above."}
                          </td>
                        </tr>
                      ) : (
                        paginatedClasses.map((cls, idx) => {
                          const globalIdx = (classPage - 1) * classLimit + idx;
                          return (
                            <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Order & Reorder Arrows */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-slate-700 font-semibold w-6">
                                    #{cls.display_order}
                                  </span>
                                  <div className="flex flex-col">
                                    <button
                                      onClick={() => handleMoveOrder(globalIdx, "up")}
                                      disabled={globalIdx === 0}
                                      className="text-slate-400 hover:text-slate-900 disabled:opacity-20 p-0.5 cursor-pointer disabled:cursor-not-allowed"
                                      title="Move Up"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleMoveOrder(globalIdx, "down")}
                                      disabled={globalIdx === classesList.length - 1}
                                      className="text-slate-400 hover:text-slate-900 disabled:opacity-20 p-0.5 cursor-pointer disabled:cursor-not-allowed"
                                      title="Move Down"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* Class Name */}
                              <td className="py-3 px-4 font-semibold text-slate-900 text-sm">
                                {cls.name}
                              </td>

                              {/* Active Status */}
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => handleToggleClassActive(cls)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                                    cls.is_active
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-slate-100 text-slate-500 border border-slate-200"
                                  }`}
                                >
                                  {cls.is_active ? "Active in Dropdown" : "Hidden"}
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => openEditClassModal(cls)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 cursor-pointer transition-colors"
                                    title="Edit Class Name or Order"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClass(cls)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer transition-colors"
                                    title="Delete Class"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Classes Pagination Bar */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      Showing{" "}
                      <strong className="text-slate-800">
                        {classesList.length === 0 ? 0 : (classPage - 1) * classLimit + 1}
                      </strong>{" "}
                      to{" "}
                      <strong className="text-slate-800">
                        {Math.min(classPage * classLimit, classesList.length)}
                      </strong>{" "}
                      of <strong className="text-slate-800">{classesList.length}</strong> classes
                    </span>
                    <span className="text-slate-300">|</span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span>Rows:</span>
                      <select
                        value={classLimit}
                        onChange={(e) => {
                          setClassLimit(Number(e.target.value));
                          setClassPage(1);
                        }}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setClassPage((prev) => Math.max(1, prev - 1))}
                      disabled={classPage <= 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    {getPageNumbers(classPage, classTotalPages).map((p) => (
                      <button
                        key={p}
                        onClick={() => setClassPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          p === classPage
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      onClick={() => setClassPage((prev) => Math.min(classTotalPages, prev + 1))}
                      disabled={classPage >= classTotalPages}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Next Page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GAME ACTIVITIES (STAGE 2) */}
          {activeTab === "activities" && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Class Game Journeys &amp; Packages
                  </h1>
                  <p className="text-slate-500 text-xs mt-1">
                    Manage the all-in-one interactive game journey for each class. Students resume automatically from their last completed checkpoint.
                  </p>
                </div>

                <button
                  onClick={openUploadActivityModal}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Journey Package (.zip)</span>
                </button>
              </div>

              {/* Activities Paginated Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Assigned Class</th>
                        <th className="py-3.5 px-4 font-semibold">Journey Package Title</th>
                        <th className="py-3.5 px-4 font-semibold">Checkpoints / Stages</th>
                        <th className="py-3.5 px-4 font-semibold">Version &amp; Entry</th>
                        <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingActivities ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                              <span>Loading game journeys...</span>
                            </div>
                          </td>
                        </tr>
                      ) : activitiesList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-slate-500">
                            No game packages uploaded yet. Click &apos;Upload Journey Package&apos; above.
                          </td>
                        </tr>
                      ) : (
                        paginatedActivities.map((act) => (
                          <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Class */}
                            <td className="py-4 px-4">
                              <div className="font-bold text-indigo-700 text-sm flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{act.className}</span>
                              </div>
                            </td>

                            {/* Title */}
                            <td className="py-4 px-4 font-medium text-slate-900">
                              <div>{act.title}</div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                storage/{act.storagePath}
                              </div>
                            </td>

                            {/* Checkpoints */}
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span>{act.totalCheckpoints} Progressive Stages</span>
                              </span>
                            </td>

                            {/* Version */}
                            <td className="py-4 px-4 text-slate-600 font-mono text-[11px]">
                              <span className="font-bold text-slate-800">v{act.version}</span>
                              <span className="text-slate-400"> ({act.entryFile})</span>
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setPreviewActivity(act)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer text-xs font-semibold transition-colors"
                                  title="Test & Preview in Sandbox"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteActivity(act)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer transition-colors"
                                  title="Delete Journey Package"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Activities Pagination Bar */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      Showing{" "}
                      <strong className="text-slate-800">
                        {activitiesList.length === 0 ? 0 : (activityPage - 1) * activityLimit + 1}
                      </strong>{" "}
                      to{" "}
                      <strong className="text-slate-800">
                        {Math.min(activityPage * activityLimit, activitiesList.length)}
                      </strong>{" "}
                      of <strong className="text-slate-800">{activitiesList.length}</strong> packages
                    </span>
                    <span className="text-slate-300">|</span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span>Rows:</span>
                      <select
                        value={activityLimit}
                        onChange={(e) => {
                          setActivityLimit(Number(e.target.value));
                          setActivityPage(1);
                        }}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActivityPage((prev) => Math.max(1, prev - 1))}
                      disabled={activityPage <= 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    {getPageNumbers(activityPage, activityTotalPages).map((p) => (
                      <button
                        key={p}
                        onClick={() => setActivityPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          p === activityPage
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      onClick={() => setActivityPage((prev) => Math.min(activityTotalPages, prev + 1))}
                      disabled={activityPage >= activityTotalPages}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Next Page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Upload Journey Package Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Upload Class Journey Package
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Upload a .zip package containing an index.html file with linked checkpoints.
            </p>

            <form onSubmit={handleUploadActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Class</label>
                <select
                  required
                  value={uploadClassId}
                  onChange={(e) => setUploadClassId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                >
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Journey Title</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Class 1 Interactive Learning Journey"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Total Checkpoints</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={uploadCheckpoints}
                  onChange={(e) => setUploadCheckpoints(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ZIP Package File</label>
                <input
                  type="file"
                  accept=".zip"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">Must contain an index.html at root (Max 100MB)</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Extracting &amp; Validating...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Extract &amp; Deploy Package</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Game Preview Sandbox Modal */}
      {previewActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{previewActivity.title}</h3>
                  <p className="text-[10px] text-slate-500">
                    Testing preview for {previewActivity.className} (Sandbox Mode)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewActivity(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-100 p-2">
              <iframe
                src={`${BACKEND_BASE_URL}/activities-storage/${previewActivity.storagePath}/${previewActivity.entryFile}?checkpoint=1&maxCompleted=0`}
                className="w-full h-full border-0 rounded-2xl bg-white shadow-inner"
                sandbox="allow-scripts allow-forms allow-same-origin"
                title={previewActivity.title}
              />
            </div>
          </div>
        </div>
      )}

      {/* Class Create / Edit Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {editingClass ? "Edit Class" : "Add New Class"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              This class will appear in the registration dropdown according to its display order.
            </p>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class / Grade Name</label>
                <input
                  type="text"
                  required
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  placeholder="e.g. Nursery, Class 10, Grade 8"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Order (Rank)</label>
                <input
                  type="number"
                  required
                  value={classOrderInput}
                  onChange={(e) => setClassOrderInput(Number(e.target.value))}
                  placeholder="1, 2, 3..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {submitting ? "Saving..." : "Save Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Device Confirmation Modal */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Reset Single-Device Lock</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              This will revoke the current active device for{" "}
              <strong className="text-slate-900">{resetModalStudent.fullName}</strong> (
              {resetModalStudent.email}) and terminate all active sessions. The student will be able
              to bind their new laptop on their next login.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Reset</label>
              <input
                type="text"
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="e.g. Switched to new laptop / formatted OS"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResetModalStudent(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeviceReset}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {submitting ? "Resetting..." : "Confirm &amp; Unlock Device"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {passwordModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Set Student Password</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Update password for{" "}
              <strong className="text-slate-900">{passwordModalStudent.fullName}</strong>. You can give
              this password directly to the student to sign in.
            </p>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">New Password</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate Strong</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showSetPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter minimum 8 characters"
                  className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setShowSetPassword(!showSetPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded focus:outline-none"
                  tabIndex={-1}
                  title={showSetPassword ? "Hide password" : "Show password"}
                >
                  {showSetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPasswordModalStudent(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmSetPassword}
                disabled={submitting || newPassword.length < 8}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {submitting ? "Updating..." : "Save &amp; Assign Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Full Details Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Student Details</h3>
                <p className="text-xs text-slate-500">
                  Update full profile, change class, or view/update password for{" "}
                  <strong className="text-slate-800">{editingStudent.fullName}</strong>
                </p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="space-y-4">
              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Mobile & Class / Grade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={editForm.mobileNumber}
                    onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class / Grade <span className="text-indigo-600 font-bold">*</span>
                  </label>
                  <select
                    required
                    value={editForm.classGrade}
                    onChange={(e) => setEditForm({ ...editForm, classGrade: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium cursor-pointer"
                  >
                    <option value="" disabled>-- Select Class --</option>
                    {classesList.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* School Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">School Name</label>
                <input
                  type="text"
                  required
                  value={editForm.schoolName}
                  onChange={(e) => setEditForm({ ...editForm, schoolName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* City and State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Password View & Edit */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
                      let pass = "";
                      for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                      setEditForm({ ...editForm, password: pass });
                      setEditShowPassword(true);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate New</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={editShowPassword ? "text" : "password"}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Enter or view password"
                    className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPassword(!editShowPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded focus:outline-none"
                    tabIndex={-1}
                    title={editShowPassword ? "Hide password" : "Show password"}
                  >
                    {editShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  The student's password is shown above. You can view it, copy it, or edit it anytime.
                </p>
              </div>

              {/* Account Status Toggle */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-700">Account Active (Can log in &amp; play)</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? "Saving Changes..." : "Save Student Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal with Last Login & Session Info */}
      {viewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-base">
                  {viewStudent.fullName ? viewStudent.fullName.charAt(0).toUpperCase() : "S"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{viewStudent.fullName}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {viewStudent.classGrade}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        viewStudent.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {viewStudent.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{viewStudent.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewStudent(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingViewDetails ? (
              <div className="py-16 text-center text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Loading student details &amp; session history...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
                {/* 1. Student Profile & Contact Info */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Personal &amp; Academic Info</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Mobile Number</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {viewStudent.mobileNumber || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">School Name</span>
                      <span className="font-semibold text-slate-800">
                        {viewStudent.schoolName || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">City &amp; State</span>
                      <span className="font-semibold text-slate-800">
                        {[viewStudent.city, viewStudent.state].filter(Boolean).join(", ") || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Registration Date</span>
                      <span className="font-semibold text-slate-800">
                        {viewStudent.createdAt
                          ? new Date(viewStudent.createdAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Student Password Card */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Student Password</span>
                    </h4>
                    <span className="text-[10px] text-slate-400">Admin View</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-mono text-xs bg-white text-slate-800 px-3 py-2 rounded-xl border border-slate-200 select-all flex items-center justify-between">
                      <span>
                        {viewShowPassword
                          ? (viewStudent.rawPassword || viewDetailsData?.student?.rawPassword || "—")
                          : (viewStudent.rawPassword || viewDetailsData?.student?.rawPassword ? "••••••••••••" : "—")}
                      </span>
                    </div>
                    {(viewStudent.rawPassword || viewDetailsData?.student?.rawPassword) && (
                      <>
                        <button
                          type="button"
                          onClick={() => setViewShowPassword(!viewShowPassword)}
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {viewShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{viewShowPassword ? "Hide" : "Show"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyPassword(viewStudent.id, viewStudent.rawPassword || viewDetailsData?.student?.rawPassword)}
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-indigo-600 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedId === viewStudent.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === viewStudent.id ? "Copied!" : "Copy"}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. Device Binding Details */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Single-Device Lock Binding</span>
                    </h4>
                    {viewStudent.activeDeviceId && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Hardware Bound
                      </span>
                    )}
                  </div>
                  {viewStudent.activeDeviceId ? (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Device Label</span>
                          <span className="font-semibold text-slate-800">
                            {viewStudent.activeDeviceLabel || "Desktop Device"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Bound IP Address</span>
                          <span className="font-semibold font-mono text-slate-800">
                            {viewStudent.activeDeviceBoundIp || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Bound At</span>
                          <span className="text-slate-700">
                            {viewDetailsData?.activeDevice?.createdAt
                              ? new Date(viewDetailsData.activeDevice.createdAt).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Device Last Seen</span>
                          <span className="text-slate-700">
                            {viewDetailsData?.activeDevice?.lastSeenAt
                              ? new Date(viewDetailsData.activeDevice.lastSeenAt).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic py-1">
                      No device has been bound to this student yet. Device will bind automatically upon first login.
                    </div>
                  )}
                </div>

                {/* 4. Last Login & Active Session Details */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Last Login &amp; Session Details</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Last Login Time</span>
                      <span className="font-semibold text-slate-800">
                        {viewDetailsData?.lastLoginAt
                          ? new Date(viewDetailsData.lastLoginAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Never logged in yet"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Current Session Status</span>
                      {viewDetailsData?.activeSession ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active Session</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">No Active Session</span>
                      )}
                    </div>
                  </div>

                  {viewDetailsData?.activeSession && (
                    <div className="bg-white rounded-xl p-3 border border-slate-200 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Session IP:</span>
                        <span className="font-mono font-medium text-slate-700">{viewDetailsData.activeSession.ipAddress || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">User Agent:</span>
                        <span className="text-slate-700 max-w-[280px] truncate" title={viewDetailsData.activeSession.userAgent || ""}>
                          {viewDetailsData.activeSession.userAgent || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Expires At:</span>
                        <span className="text-slate-700">
                          {new Date(viewDetailsData.activeSession.expiresAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Recent Session History (if multiple) */}
                  {viewDetailsData?.recentSessions && viewDetailsData.recentSessions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <span className="text-slate-500 block text-[11px] font-semibold mb-2">Recent Login History</span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-200">
                              <th className="pb-1.5 font-medium">Login Time</th>
                              <th className="pb-1.5 font-medium">IP Address</th>
                              <th className="pb-1.5 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-600">
                            {viewDetailsData.recentSessions.map((s) => (
                              <tr key={s.id}>
                                <td className="py-1.5 font-mono">
                                  {new Date(s.createdAt).toLocaleString(undefined, {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </td>
                                <td className="py-1.5 font-mono">{s.ipAddress || "—"}</td>
                                <td className="py-1.5">
                                  {s.revokedAt ? (
                                    <span className="text-rose-600 font-medium">Revoked</span>
                                  ) : new Date(s.expiresAt) > new Date() ? (
                                    <span className="text-emerald-600 font-medium">Active</span>
                                  ) : (
                                    <span className="text-slate-400">Expired</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const st = viewStudent;
                    setViewStudent(null);
                    openEditStudent(st);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>

                {viewStudent.activeDeviceId && (
                  <button
                    type="button"
                    onClick={() => {
                      const st = viewStudent;
                      setViewStudent(null);
                      setResetModalStudent(st);
                      setResetReason("Student requested device switch");
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Device</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
