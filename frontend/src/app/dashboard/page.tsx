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
  MapPin,
  LogOut,
  Sparkles,
  Gamepad2,
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
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading Education Game portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-base">
              Education Game
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-900">{user?.fullName}</p>
              <p className="text-[11px] text-slate-500 font-medium">{user?.classGrade}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
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
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100/80 rounded-3xl p-8 mb-8 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/80 text-indigo-700 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Student Learning Workspace</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
              Welcome back, {user?.fullName}!
            </h1>
            <p className="text-slate-600 text-sm max-w-xl leading-relaxed">
              You are signed in to Education Game. Your session is protected by
              single-device hardware attestation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Security & Device Binding Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Single-Device Lock</h3>
                <span className="text-[11px] text-emerald-600 font-semibold">Device Bound &amp; Active</span>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-700">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Laptop className="w-4 h-4 text-indigo-600" />
                <span>Authorized Machine: Current Laptop</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Logins from other laptops or browsers are blocked. If you switch computers, contact
                your Admin to reset your lock.
              </p>
            </div>
          </div>

          {/* Student Profile Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Student Profile</h3>
                <span className="text-[11px] text-slate-500">Personal Details</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{user?.email}</span>
              </div>
              {user?.mobileNumber && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{user.mobileNumber}</span>
                </div>
              )}
              {user?.classGrade && (
                <div className="flex items-center gap-2 text-slate-700">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span>{user.classGrade}</span>
                </div>
              )}
              {user?.schoolName && (
                <div className="flex items-center gap-2 text-slate-700">
                  <School className="w-4 h-4 text-slate-400" />
                  <span>{user.schoolName}</span>
                </div>
              )}
              {(user?.city || user?.state) && (
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{[user.city, user.state].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Educational Games (Stage 2 placeholder) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Educational Games</h3>
                <span className="text-[11px] text-purple-600 font-semibold">Stage 2 Deliverable</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 leading-relaxed">
              Interactive HTML/JS educational games, progress tracking, and activity packages will be
              accessible here once Stage 2 modules are enabled.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
