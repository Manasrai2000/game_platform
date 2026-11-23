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
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<ApiUser | null>(null);
  const [activeTab, setActiveTab] = useState<"students" | "classes">("students");

  // Students state
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Student Modals state
  const [resetModalStudent, setResetModalStudent] = useState<StudentListItem | null>(null);
  const [passwordModalStudent, setPasswordModalStudent] = useState<StudentListItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Classes state
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
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
      await Promise.all([fetchStudents(""), fetchClasses()]);
      setLoading(false);
    }
    init();
  }, [router]);

  async function fetchStudents(searchQuery: string) {
    const res = await api.getStudents(searchQuery);
    if (res.success && res.data?.students) {
      setStudents(res.data.students);
    }
  }

  async function fetchClasses() {
    setLoadingClasses(true);
    const res = await api.getAllClasses();
    if (res.success && res.data?.classes) {
      setClassesList(res.data.classes);
    }
    setLoadingClasses(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchStudents(search);
  }

  async function handleToggleStatus(student: StudentListItem) {
    const res = await api.toggleStudentStatus(student.id);
    if (res.success) {
      setActionMessage({
        type: "success",
        text: `Student ${student.fullName} ${student.isActive ? "deactivated" : "activated"} successfully`,
      });
      await fetchStudents(search);
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
      await fetchStudents(search);
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
      await fetchStudents(search);
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
    // default next order
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
      // Update
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
      // Create
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

  async function handleMoveOrder(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= classesList.length) return;

    const updated = [...classesList];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Recalculate display_order 1..N
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading Education Game Admin Console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">Education Game</span>
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Admin Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{adminUser?.fullName}</p>
              <p className="text-[11px] text-slate-400">{adminUser?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-8 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "students"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students & Device Controls ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("classes")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "classes"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Manage Classes & Dropdown Order ({classesList.length})</span>
          </button>
        </div>

        {/* Action Message Alert */}
        {actionMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl text-xs flex items-center justify-between ${
              actionMessage.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: STUDENTS MANAGEMENT */}
        {activeTab === "students" && (
          <div>
            {/* Banner & Search */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Student Accounts & Device Restrictions
                </h1>
                <p className="text-slate-400 text-xs mt-1">
                  Manage student profiles, single-device bindings, and password resets
                </p>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, mobile, city..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Students Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-850/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Student Details</th>
                      <th className="py-3.5 px-4">Mobile / Payment</th>
                      <th className="py-3.5 px-4">Class, School, City & State</th>
                      <th className="py-3.5 px-4">Active Device Binding</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No students found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      students.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Name & Email */}
                          <td className="py-4 px-4">
                            <div className="font-semibold text-white">{student.fullName}</div>
                            <div className="text-slate-400 text-[11px]">{student.email}</div>
                          </td>

                          {/* Mobile */}
                          <td className="py-4 px-4 text-slate-300 font-mono text-[11px]">
                            {student.mobileNumber || "—"}
                          </td>

                          {/* Class, School, City & State */}
                          <td className="py-4 px-4 text-slate-300">
                            <div className="font-semibold text-indigo-300">{student.classGrade}</div>
                            <div className="text-slate-300 text-[11px] truncate max-w-[200px]">
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
                                <Laptop className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-medium text-emerald-300 text-[11px]">
                                    {student.activeDeviceLabel}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    IP: {student.activeDeviceBoundIp}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-500 text-[11px] italic">
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
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
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
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
                                title="Reset Single-Device Lock"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Reset Device</span>
                              </button>

                              {/* Set Password Button */}
                              <button
                                onClick={() => {
                                  setPasswordModalStudent(student);
                                  setNewPassword("");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer text-xs"
                                title="Set or Override Student Password"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
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
            </div>
          </div>
        )}

        {/* TAB 2: CLASSES CRUD & ORDER MANAGEMENT */}
        {activeTab === "classes" && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Class List & Registration Dropdown Order
                </h1>
                <p className="text-slate-400 text-xs mt-1">
                  Manage which classes appear in the registration dropdown and control their exact display order.
                </p>
              </div>

              <button
                onClick={openCreateClassModal}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Class</span>
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-850/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 w-28">Order</th>
                      <th className="py-3.5 px-4">Class / Grade Name</th>
                      <th className="py-3.5 px-4">Dropdown Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {classesList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          {loadingClasses ? "Loading classes..." : "No classes defined yet. Click 'Add New Class' above."}
                        </td>
                      </tr>
                    ) : (
                      classesList.map((cls, idx) => (
                        <tr key={cls.id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Order & Reorder Arrows */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-slate-400 font-semibold w-6">
                                #{cls.display_order}
                              </span>
                              <div className="flex flex-col">
                                <button
                                  onClick={() => handleMoveOrder(idx, "up")}
                                  disabled={idx === 0}
                                  className="text-slate-500 hover:text-white disabled:opacity-20 p-0.5 cursor-pointer disabled:cursor-not-allowed"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleMoveOrder(idx, "down")}
                                  disabled={idx === classesList.length - 1}
                                  className="text-slate-500 hover:text-white disabled:opacity-20 p-0.5 cursor-pointer disabled:cursor-not-allowed"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Class Name */}
                          <td className="py-3 px-4 font-semibold text-white text-sm">
                            {cls.name}
                          </td>

                          {/* Active Status */}
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleClassActive(cls)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                                cls.is_active
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-slate-800 text-slate-400 border border-slate-700"
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
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                                title="Edit Class Name or Order"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteClass(cls)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 cursor-pointer transition-colors"
                                title="Delete Class"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Class Create / Edit Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              {editingClass ? "Edit Class" : "Add New Class"}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              This class will appear in the registration dropdown according to its display order.
            </p>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Class / Grade Name</label>
                <input
                  type="text"
                  required
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  placeholder="e.g. Nursery, Class 10, Grade 8"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Display Order (Rank)</label>
                <input
                  type="number"
                  required
                  value={classOrderInput}
                  onChange={(e) => setClassOrderInput(Number(e.target.value))}
                  placeholder="1, 2, 3..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Reset Single-Device Lock</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              This will revoke the current active device for{" "}
              <strong className="text-white">{resetModalStudent.fullName}</strong> (
              {resetModalStudent.email}) and terminate all active sessions. The student will be able
              to bind their new laptop on their next login.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">Reason for Reset</label>
              <input
                type="text"
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="e.g. Switched to new laptop / formatted OS"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResetModalStudent(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeviceReset}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Resetting..." : "Confirm & Unlock Device"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {passwordModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Set Student Password</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Update password for{" "}
              <strong className="text-white">{passwordModalStudent.fullName}</strong>. You can give
              this password directly to the student to sign in.
            </p>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-400">New Password</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
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
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPasswordModalStudent(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmSetPassword}
                disabled={submitting || newPassword.length < 8}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Save & Assign Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
