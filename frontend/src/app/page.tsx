"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Laptop,
  ShieldCheck,
  ArrowRight,
  Gamepad2,
  Users,
  Lock,
  LayoutDashboard,
} from "lucide-react";
import { api, ApiUser } from "@/lib/api";

export default function Home() {
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getMe().then((res) => {
      if (isMounted && res.success && res.data?.user) {
        setUser(res.data.user);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const dashboardHref = user?.role === "ADMIN" ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">
              Education Game
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden sm:inline-block text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  Hi, <strong className="text-slate-800">{user.fullName.split(" ")[0]}</strong>
                </span>
                <Link
                  href={dashboardHref}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 text-center my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Stage 1 Security & Architecture Active</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
          Next-Generation{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700">
            Education Game Platform
          </span>{" "}
          with Single-Device Lock
        </h1>

        <p className="text-slate-600 text-base max-w-2xl mx-auto mb-10 leading-relaxed">
          High-performance interactive learning platform designed exclusively for school students on desktop
          and laptop browsers. Enforces atomic device binding, credential-sharing prevention, and instant Admin
          governance.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          {user ? (
            <Link
              href={dashboardHref}
              className="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to {user.role === "ADMIN" ? "Admin Panel" : "Student Dashboard"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
              >
                <span>Student Registration</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl text-sm transition-all border border-slate-300 shadow-sm flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>Sign In to Platform</span>
              </Link>
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="p-3 w-fit rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-4 shadow-sm">
              <Laptop className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Desktop & Laptop Only</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Enforced at request headers and client viewport. Tablets and smartphones are cleanly
              gated to ensure an optimal interactive experience for school curriculum games.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="p-3 w-fit rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 mb-4 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Single-Device Lock</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Enforced directly inside MySQL 8 via virtual generated columns and WebCrypto non-extractable
              keys. Prevents concurrent account sharing.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="p-3 w-fit rounded-xl bg-purple-50 border border-purple-100 text-purple-600 mb-4 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Admin Governance</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Admins can log in from any device, view registered students with active device binding
              data, manage classes and dropdown order, reset device locks, and override passwords.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        <p>Education Game Platform &copy; 2026. Built with Clean Architecture &amp; Next.js.</p>
      </footer>
    </div>
  );
}
