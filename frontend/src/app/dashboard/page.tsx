"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiUser } from "@/lib/api";
import {
  Laptop,
  ShieldCheck,
  User,
  School,
  BookOpen,
  Phone,
  Mail,
  LogOut,
  Sparkles,
  Layers,
} from "lucide-react";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const res = await api.getMe();
      if (!res.success || !res.data?.user) {
        router.push("/login");
        return;
      }
      if (res.data.user.role === "ADMIN") {
        router.push("/admin");
        return;
      }
      setUser(res.data.user);
      setLoading(false);
    }
    loadUser();
  }, [router]);

  async function handleLogout() {
    await api.logout();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading student portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-bold text-white tracking-tight">LMS Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{user?.fullName}</p>
              <p className="text-[11px] text-slate-400">{user?.classGrade}</p>
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
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900/80 to-purple-950/60 border border-indigo-500/20 rounded-3xl p-8 mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Student Learning Workspace</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.fullName}!
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              You are signed in to your subscription LMS. Your session is protected by
              single-device hardware attestation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Security & Device Binding Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Single-Device Lock</h3>
                <span className="text-[11px] text-emerald-400 font-medium">Device Bound & Active</span>
              </div>
            </div>

            <div className="space-y-3 bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-slate-400">
                <Laptop className="w-4 h-4 text-indigo-400" />
                <span>Authorized Machine: Current Laptop</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Logins from other laptops or browsers are blocked. If you switch computers, contact
                your Admin to reset your lock.
              </p>
            </div>
          </div>

          {/* Student Profile Info */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Student Profile</h3>
                <span className="text-[11px] text-slate-400">Personal Details</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-slate-500" />
                <span>{user?.email}</span>
              </div>
              {user?.mobileNumber && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span>{user.mobileNumber}</span>
                </div>
              )}
              {user?.classGrade && (
                <div className="flex items-center gap-2 text-slate-300">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <span>{user.classGrade}</span>
                </div>
              )}
              {user?.schoolName && (
                <div className="flex items-center gap-2 text-slate-300">
                  <School className="w-4 h-4 text-slate-500" />
                  <span>{user.schoolName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Learning Activities (Stage 2 placeholder) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Learning Activities</h3>
                <span className="text-[11px] text-purple-400 font-medium">Stage 2 Deliverable</span>
              </div>
            </div>

            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
              Interactive HTML/JS exercises, progress tracking, and subscription packages will be
              accessible here once Stage 2 modules are enabled.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
