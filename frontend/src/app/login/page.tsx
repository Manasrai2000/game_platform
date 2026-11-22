"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getDeviceLabel, getOrCreateDevicePublicKey } from "@/lib/device-binding";
import { ShieldAlert, Lock, Mail, ArrowRight, Laptop, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeviceLocked, setIsDeviceLocked] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setIsDeviceLocked(false);

    try {
      const deviceLabel = getDeviceLabel();
      const clientPublicKeySpki = await getOrCreateDevicePublicKey();

      const res = await api.login({
        email,
        password,
        deviceLabel,
        clientPublicKeySpki,
      });

      if (!res.success) {
        if (res.error?.code === "DEVICE_LOCKED") {
          setIsDeviceLocked(true);
          setErrorMessage(res.error.message);
        } else {
          setErrorMessage(res.error?.message || "Login failed. Please check your credentials.");
        }
        setLoading(false);
        return;
      }

      if (res.data?.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please check if backend is running.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to LMS</h1>
          <p className="text-slate-400 text-sm mt-1">
            Access your courses from your authorized laptop
          </p>
        </div>

        {/* Device Locked Error Banner */}
        {isDeviceLocked && (
          <div className="mb-6 p-4 bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl text-left">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-rose-200 font-semibold text-sm leading-snug">
                  {errorMessage}
                </p>
                <p className="text-rose-300/80 text-xs mt-2 leading-relaxed">
                  This student account is securely locked to another laptop or browser. Please contact
                  your school or platform administrator to request a device reset.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* General Error Banner */}
        {!isDeviceLocked && errorMessage && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <span className="text-[11px] text-slate-400">Contact Admin to reset</span>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center gap-2.5 text-slate-400 text-xs">
            <Laptop className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Single-device lock active. Current laptop binding verified.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span>Verifying Device & Signing In...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-slate-400 text-xs">
            New Student?{" "}
            <Link
              href="/register"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Register your account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
