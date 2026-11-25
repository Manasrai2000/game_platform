"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api, ClassItem } from "@/lib/api";
import { getDeviceLabel, getOrCreateDevicePublicKey } from "@/lib/device-binding";
import {
  User,
  Mail,
  Phone,
  BookOpen,
  School,
  MapPin,
  Lock,
  ArrowRight,
  Gamepad2,
  ChevronDown,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  X,
  RotateCcw,
} from "lucide-react";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    mobileNumber: "",
    classGrade: "",
    schoolName: "",
    city: "",
    state: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Verification Modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await api.getActiveClasses();
        if (res.success && res.data?.classes) {
          setClassesList(res.data.classes);
        }
      } catch (err) {
        console.error("Failed to load classes:", err);
      } finally {
        setLoadingClasses(false);
      }
    }
    loadClasses();
  }, []);

  // Timer for OTP countdown
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const interval = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCountdown]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  // Step 1: Validate form and send OTP code to email
  async function handleInitialSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.classGrade) {
      setErrorMessage("Please select your class");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters");
      return;
    }

    setSendingOtp(true);

    try {
      const otpRes = await api.sendRegistrationOtp({
        email: formData.email,
        fullName: formData.fullName,
      });

      if (!otpRes.success) {
        setErrorMessage(otpRes.error?.message || "Failed to send verification code");
        setSendingOtp(false);
        return;
      }

      setOtpCode("");
      setOtpError(null);
      setOtpSuccessMsg(`Verification code sent to ${formData.email}`);
      setOtpCountdown(45);
      setShowOtpModal(true);
    } catch {
      setErrorMessage("Unable to send verification code. Please check your internet connection.");
    } finally {
      setSendingOtp(false);
    }
  }

  // Resend OTP code
  async function handleResendOtp() {
    if (otpCountdown > 0 || sendingOtp) return;
    setSendingOtp(true);
    setOtpError(null);

    try {
      const res = await api.sendRegistrationOtp({
        email: formData.email,
        fullName: formData.fullName,
      });

      if (res.success) {
        setOtpSuccessMsg(`A new code was sent to ${formData.email}`);
        setOtpCountdown(45);
      } else {
        setOtpError(res.error?.message || "Failed to resend code");
      }
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  // Step 2: Submit Registration with OTP
  async function handleFinalRegister(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null);

    if (otpCode.trim().length !== 6) {
      setOtpError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);

    try {
      const deviceLabel = getDeviceLabel();
      const clientPublicKeySpki = await getOrCreateDevicePublicKey();

      const res = await api.register({
        fullName: formData.fullName,
        mobileNumber: formData.mobileNumber,
        classGrade: formData.classGrade,
        schoolName: formData.schoolName,
        city: formData.city,
        state: formData.state,
        email: formData.email,
        password: formData.password,
        otp: otpCode.trim(),
        deviceLabel,
        clientPublicKeySpki,
      });

      if (!res.success) {
        setOtpError(res.error?.message || "Registration failed. Please check your code.");
        setLoading(false);
        return;
      }

      // Redirect directly to dashboard upon successful registration and device binding
      window.location.href = "/dashboard";
    } catch {
      setOtpError("An unexpected error occurred. Please ensure backend is running.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-4 shadow-sm">
            <Gamepad2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Education Game Registration
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Create your account and bind this machine as your learning device
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleInitialSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Rohan Sharma"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number (or OTP purpose)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  name="mobileNumber"
                  required
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Class Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Class / Grade
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  name="classGrade"
                  required
                  value={formData.classGrade}
                  onChange={handleChange}
                  disabled={loadingClasses}
                  className={`w-full pl-10 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all appearance-none cursor-pointer ${
                    formData.classGrade ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  <option value="" disabled className="text-slate-400">
                    {loadingClasses ? "Loading classes..." : "-- Select Class / Grade --"}
                  </option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.name} className="text-slate-900">
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">School Name</label>
            <div className="relative">
              <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="schoolName"
                required
                value={formData.schoolName}
                onChange={handleChange}
                placeholder="Delhi Public School"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          {/* City and State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="New Delhi"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">State</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Delhi"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="student@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 8 chars"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-md focus:outline-none transition-colors"
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-md focus:outline-none transition-colors"
                  tabIndex={-1}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={sendingOtp || loading}
            className="w-full mt-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {sendingOtp ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending Verification Code to Email...</span>
              </>
            ) : (
              <>
                <span>Complete Registration &amp; Bind Device</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-slate-500 text-xs">
            Already registered?{" "}
            <Link
              href="/login"
              className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
              Sign In here
            </Link>
          </p>
        </div>
      </div>

      {/* Email OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <Mail className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Verify Your Email</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                We sent a 6-digit verification code to <br />
                <strong className="text-slate-800 font-semibold">{formData.email}</strong>.
                Enter the code below to complete registration and activate your account.
              </p>
            </div>

            {otpError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center font-medium">
                {otpError}
              </div>
            )}

            {otpSuccessMsg && !otpError && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs text-center font-medium">
                {otpSuccessMsg}
              </div>
            )}

            <form onSubmit={handleFinalRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 text-center mb-2">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "");
                    setOtpCode(cleaned);
                    if (otpError) setOtpError(null);
                  }}
                  placeholder="123456"
                  className="w-full text-center font-mono text-3xl font-bold tracking-[0.4em] py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-normal placeholder:text-xl"
                />
              </div>

              {/* Resend Timer / Action */}
              <div className="text-center text-xs text-slate-500 py-1">
                {otpCountdown > 0 ? (
                  <span>
                    Resend code in <strong className="text-indigo-600 font-mono">{otpCountdown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={sendingOtp}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center justify-center gap-1 mx-auto disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{sendingOtp ? "Sending code..." : "Resend Verification Code"}</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Code &amp; Activating Account...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify &amp; Activate Account</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-medium"
                >
                  Change Email Address / Edit Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
