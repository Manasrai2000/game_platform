"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, StudentListItem, ApiUser, ClassItem } from "@/lib/api";
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
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<ApiUser | null>(null);
  const [activeTab, setActiveTab] = useState<"students" | "classes">("students");
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

  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Student Modals state
  const [resetModalStudent, setResetModalStudent] = useState<StudentListItem | null>(null);
  const [passwordModalStudent, setPasswordModalStudent] = useState<StudentListItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // --- Classes state & pagination ---
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classPage, setClassPage] = useState(1);
  const [classLimit, setClassLimit] = useState(10);

  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [classNameInput, setClassNameInput] = useState("");
  const [classOrderInput, setClassOrderInput] = useState(0);

  useEffect(() => {
    async function init() {
      const meRes = await api.getMe();
      if (!meRes.success || !meRes.data?.user || meRes.data.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }
      setAdminUser(meRes.data.user);
      await Promise.all([fetchStudents("", 1, 10), fetchClasses()]);
      setLoading(false);
    }
    init();
  }, [router]);

  async function fetchStudents(searchQuery = search, page = studentPage, limit = studentLimit) {
    setStudentsLoading(true);
    const res = await api.getStudents(searchQuery, page, limit);
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

  async function fetchClasses() {
    setLoadingClasses(true);
    const res = await api.getAllClasses();
    if (res.success && res.data?.classes) {
      setClassesList(res.data.classes);
    }
    setLoadingClasses(false);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStudentPage(1);
    fetchStudents(search, 1, studentLimit);
  }

  function handleStudentPageChange(newPage: number) {
    if (newPage < 1 || newPage > studentTotalPages) return;
    setStudentPage(newPage);
    fetchStudents(search, newPage, studentLimit);
  }

  function handleStudentLimitChange(newLimit: number) {
    setStudentLimit(newLimit);
    setStudentPage(1);
    fetchStudents(search, 1, newLimit);
  }

  async function handleToggleStatus(student: StudentListItem) {
    const res = await api.toggleStudentStatus(student.id);
    if (res.success) {
      setActionMessage({
        type: "success",
        text: `Student ${student.fullName} ${student.isActive ? "deactivated" : "activated"} successfully`,
      });
      await fetchStudents(search, studentPage, studentLimit);
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
      await fetchStudents(search, studentPage, studentLimit);
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
      await fetchStudents(search, studentPage, studentLimit);
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
              </nav>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Upcoming Modules
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-400 bg-slate-50/70 border border-dashed border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span>Game Activities</span>
                  </div>
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                    Stage 2
                  </span>
                </div>

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
                {activeTab === "students" ? "Students & Device Controls" : "Classes & Dropdown Order"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Single-Device Lock Active</span>
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
              {/* Header & Search */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Student Accounts &amp; Device Restrictions
                  </h1>
                  <p className="text-slate-500 text-xs mt-1">
                    Manage student profiles, single-device bindings, and password resets
                  </p>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, mobile, city, school..."
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    Search
                  </button>
                </form>
              </div>

              {/* Students Table Card */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Student Details</th>
                        <th className="py-3.5 px-4 font-semibold">Mobile / Payment</th>
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
                        students.map((student) => (
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

                            {/* Action Buttons */}
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Reset Device Button */}
                                <button
                                  onClick={() => {
                                    setResetModalStudent(student);
                                    setResetReason("Student requested device switch");
                                  }}
                                  disabled={!student.activeDeviceId}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer text-xs"
                                  title="Reset Single-Device Lock"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Reset Device</span>
                                </button>

                                {/* Set Password Button */}
                                <button
                                  onClick={() => {
                                    setPasswordModalStudent(student);
                                    setNewPassword("");
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer text-xs font-medium"
                                  title="Set or Override Student Password"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Set Password</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
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
        </main>
      </div>

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
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter minimum 8 characters"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
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
    </div>
  );
}
