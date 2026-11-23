"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api, ClassItem } from "@/lib/api";
import { getDeviceLabel, getOrCreateDevicePublicKey } from "@/lib/device-binding";
import {
  UserPlus,
  User,
  Mail,
  Phone,
  BookOpen,
  School,
  MapPin,
  Lock,
  ArrowRight,
  ShieldCheck,
  Gamepad2,
  ChevronDown,
  FileText,
  X,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.classGrade) {
      setErrorMessage("Please select your class");
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage("Please read and accept the Terms & Conditions to proceed with registration.");
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
        deviceLabel,
        clientPublicKeySpki,
      });

      if (!res.success) {
        setErrorMessage(res.error?.message || "Registration failed");
        setLoading(false);
        return;
      }

      // Redirect directly to dashboard upon successful registration and binding
      window.location.href = "/dashboard";
    } catch {
      setErrorMessage("An unexpected error occurred. Please ensure backend is running.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
            <Gamepad2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Education Game Registration
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Create your account and bind this machine as your learning device
          </p>
        </div>

        {/* Security Binding Notice */}
        {/* <div className="mb-6 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-200 leading-relaxed">
            <strong>Single-Device Notice:</strong> This machine will be registered as your sole
            authorized device. Simultaneous logins on other computer devices are strictly restricted.
          </div>
        </div> */}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Rohan Sharma"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mobile Number (or OTP purpose)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  name="mobileNumber"
                  required
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Class Dropdown */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Class / Grade
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  name="classGrade"
                  required
                  value={formData.classGrade}
                  onChange={handleChange}
                  disabled={loadingClasses}
                  className={`w-full pl-10 pr-9 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer ${
                    formData.classGrade ? "text-white" : "text-slate-400"
                  }`}
                >
                  <option value="" disabled className="bg-slate-900 text-slate-500">
                    {loadingClasses ? "Loading classes..." : "-- Select Class / Grade --"}
                  </option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.name} className="bg-slate-900 text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">School Name</label>
            <div className="relative">
              <School className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="schoolName"
                required
                value={formData.schoolName}
                onChange={handleChange}
                placeholder="Delhi Public School"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* City and State Fields directly after School Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">City</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="New Delhi"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">State</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Delhi"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="student@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 8 chars"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Terms & Conditions Acceptance Checkbox */}
          <div className="pt-2">
            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="termsCheck"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="termsCheck" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                I have read, understood, and accept the{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer inline-flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Terms &amp; Conditions – Software Usage</span>
                </button>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Binding Device & Creating Account...</span>
            ) : (
              <>
                <span>Complete Registration & Bind Machine</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-slate-400 text-xs">
            Already registered?{" "}
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Sign In here
            </Link>
          </p>
        </div>
      </div>

      {/* Terms & Conditions Full Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Terms &amp; Conditions</h3>
                  <p className="text-[11px] text-slate-400">Software Usage Policy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with full text */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-200">
                <p className="font-semibold text-sm mb-1 text-white">Welcome to Education Game Platform</p>
                <p className="text-[11px]">
                  Please read these Terms &amp; Conditions carefully before using our software. By
                  accessing, registering, or using this software, you agree to follow and comply with the
                  terms mentioned below.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">1. Acceptance of Terms</h4>
                <p>
                  By clicking the &quot;I Agree&quot; or &quot;Accept Terms &amp; Conditions&quot; button, you confirm
                  that you have read, understood, and accepted all the terms and conditions of this software.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">2. User Responsibility</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Users must provide accurate information while registering or using the software.</li>
                  <li>Users are responsible for maintaining the confidentiality of their login credentials.</li>
                  <li>Users must not share their account access with unauthorized persons.</li>
                  <li>Users are responsible for all activities performed through their accounts.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">3. Permitted Use</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>The software must be used only for lawful purposes.</li>
                  <li>
                    Users must not misuse, modify, copy, distribute, or reverse-engineer the software without
                    written permission.
                  </li>
                  <li>Users must not use the software for fraudulent, harmful, or unauthorized activities.</li>
                  <li>Users must respect the intellectual property rights of the software owner.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">4. Account Security</h4>
                <p>
                  Users are responsible for keeping their account information and passwords secure. Please
                  notify the software administrator immediately if you suspect unauthorized access to your account.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">5. Intellectual Property Rights</h4>
                <p>
                  All software content, designs, graphics, logos, features, source code, and other materials are
                  the property of the software owner or its respective licensors. Unauthorized copying,
                  reproduction, or distribution is prohibited.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">6. Privacy and Data Protection</h4>
                <p>
                  User information may be collected and processed to provide and improve software services.
                  Personal information will be handled according to the applicable Privacy Policy and data
                  protection laws.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">7. Software Updates and Changes</h4>
                <p>
                  We reserve the right to update, modify, add, or remove software features at any time to
                  improve functionality, security, or performance.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">8. Service Availability</h4>
                <p>
                  We will make reasonable efforts to keep the software available. However, uninterrupted access
                  cannot be guaranteed. Temporary interruptions may occur due to maintenance, technical issues,
                  or circumstances beyond our control. Any corrections found in the software can be brought into
                  our notice and that will be rectified within 30 days’ time.
                </p>
              </div>

              {/* Hardware specification requirement */}
              <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl">
                <h4 className="font-bold text-white text-sm mb-2 text-indigo-300">
                  9. Configuration requirement to run the software
                </h4>
                <p className="mb-2 text-slate-300">
                  The software requires the following hardware specification for running smoothly:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-700/50">
                    <span className="text-slate-400">1. RAM:</span> 8 GB
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-700/50">
                    <span className="text-slate-400">2. Processor:</span> i5 (10th Generation or higher)
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-700/50">
                    <span className="text-slate-400">3. Hard Drive:</span> Free space 100 GB
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-700/50">
                    <span className="text-slate-400">4. System Type:</span> 64-bit operating system
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-700/50 sm:col-span-2">
                    <span className="text-slate-400">5. Graphic Card:</span> 2 GB
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">10. Limitation of Liability</h4>
                <p>
                  The software owner shall not be responsible for indirect damages, data loss, business
                  interruption, or losses arising from the improper use of the software, to the extent permitted
                  by applicable law.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">11. Suspension or Termination</h4>
                <p>
                  We reserve the right to suspend or terminate user access if a user violates these Terms &amp;
                  Conditions or misuses the software.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">12. Changes to Terms &amp; Conditions</h4>
                <p>
                  We reserve the right to revise these Terms &amp; Conditions whenever necessary. Updated terms will
                  be published within the software or on our website.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">13. Governing Law</h4>
                <p>
                  These Terms &amp; Conditions shall be governed by the applicable laws of the jurisdiction in
                  which the software owner operates.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5 text-indigo-300">14. Contact Information</h4>
                <p>
                  For questions, complaints, or support regarding these Terms &amp; Conditions, please contact our
                  support team through the official website or designated support email.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Please scroll to review all terms
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAcceptedTerms(true);
                    setShowTermsModal(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I Read &amp; Accept Terms</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
