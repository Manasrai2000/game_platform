"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, ApiUser, StudentJourneyResponse, BACKEND_BASE_URL } from "@/lib/api";
import {
  School,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  LogOut,
  Gamepad2,
  Play,
  CheckCircle2,
  Lock,
  X,
  Maximize2,
  RefreshCw,
  Edit3,
  Check,
  AlertCircle,
  Loader2,
  Zap,
  ArrowLeft,
} from "lucide-react";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Journey state
  const [journeyData, setJourneyData] = useState<StudentJourneyResponse | null>(null);
  const [loadingJourney, setLoadingJourney] = useState(true);
  const [isPlayingGame, setIsPlayingGame] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Profile Update Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    mobileNumber: "",
    schoolName: "",
    city: "",
    state: "",
  });

  const loadJourney = useCallback(async () => {
    setLoadingJourney(true);
    try {
      const res = await api.getMyJourney();
      if (res.success && res.data) {
        setJourneyData(res.data);
      }
    } catch (err) {
      console.error("Failed to load journey:", err);
    } finally {
      setLoadingJourney(false);
    }
  }, []);

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
      loadJourney();
    }
    loadUser();
  }, [router, loadJourney]);

  // Handle postMessage events sent from the sandboxed game iframe
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      if (
        event.data &&
        event.data.type === "EDUCATION_GAME_CHECKPOINT_COMPLETED" &&
        event.data.completedCheckpoint
      ) {
        const { completedCheckpoint, nextCheckpoint, stateData } = event.data;

        try {
          const res = await api.advanceCheckpoint(completedCheckpoint, nextCheckpoint, stateData);
          if (res.success && res.data?.progress) {
            const updatedProg = res.data.progress;
            setToastMessage(`🎉 Stage ${completedCheckpoint} Completed! Resumed progress saved.`);
            // Update local state
            setJourneyData((prev) => {
              if (!prev || !prev.progress) return prev;
              return {
                ...prev,
                progress: {
                  ...prev.progress,
                  currentCheckpoint: updatedProg.currentCheckpoint,
                  maxCompletedCheckpoint: updatedProg.maxCompletedCheckpoint,
                  isCompleted: updatedProg.isCompleted,
                  journeyState: updatedProg.journeyState,
                },
              };
            });
            setTimeout(() => setToastMessage(null), 4000);
          }
        } catch (err) {
          console.error("Failed to advance checkpoint:", err);
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function handleLogout() {
    await api.logout();
    window.location.href = "/login";
  }

  function handleOpenProfileModal() {
    if (!user) return;
    setProfileForm({
      fullName: user.fullName || "",
      mobileNumber: user.mobileNumber || "",
      schoolName: user.schoolName || "",
      city: user.city || "",
      state: user.state || "",
    });
    setProfileError(null);
    setShowProfileModal(true);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);

    try {
      if (!profileForm.fullName.trim()) {
        throw new Error("Full name is required");
      }

      const payload: {
        fullName?: string;
        mobileNumber?: string;
        schoolName?: string;
        city?: string;
        state?: string;
      } = {
        fullName: profileForm.fullName.trim(),
        mobileNumber: profileForm.mobileNumber.trim() || undefined,
        schoolName: profileForm.schoolName.trim() || undefined,
        city: profileForm.city.trim() || undefined,
        state: profileForm.state.trim() || undefined,
      };

      const res = await api.updateMyProfile(payload);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        setShowProfileModal(false);
        setToastMessage("🎉 Profile updated successfully!");
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        throw new Error(res.error?.message || res.message || "Failed to update profile");
      }
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900/10 backdrop-blur-md text-slate-700">
        <div className="flex items-center gap-3 bg-white/90 px-6 py-4 rounded-2xl shadow-xl border border-white/60">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Loading Education Game Portal...</span>
        </div>
      </div>
    );
  }

  const currentCp = journeyData?.progress?.currentCheckpoint || 1;
  const maxCp = journeyData?.progress?.maxCompletedCheckpoint || 0;
  const totalCp = journeyData?.activity?.totalCheckpoints || 3;
  const progressPercent = Math.min(100, Math.round((maxCp / totalCp) * 100));
  const displayClass = user?.classGrade
    ? user.classGrade.toLowerCase().startsWith("class")
      ? user.classGrade
      : `Class ${user.classGrade}`
    : "Class 1";

  return (
    <div className="min-h-screen bg-[url('/dashboard-campus-bg.jpg')] bg-cover bg-center bg-fixed text-slate-900 pb-20 relative">
      {/* Soft ambient overlay to ensure maximum readability while keeping the cartoon school campus scenic */}
      <div className="fixed inset-0 bg-slate-900/15 backdrop-blur-[1.5px] pointer-events-none -z-10" />

      {/* Top Frosted Glass Navigation Bar */}
      <header className="border-b border-white/50 bg-white/75 backdrop-blur-xl sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base block leading-tight">
                Education Game
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Student Learning Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900">{user?.fullName}</p>
              <p className="text-[11px] text-indigo-600 font-semibold">{user?.classGrade || "1"}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-2xl bg-white/80 hover:bg-white text-slate-700 hover:text-rose-600 transition-all cursor-pointer border border-white/80 shadow-xs"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Glassmorphic Dashboard Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/95 backdrop-blur-md border border-emerald-400 text-white text-xs font-bold flex items-center justify-between shadow-xl animate-bounce">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-100 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Big Frosted Glass Shell Container matching the user's reference mockup */}
        <div className="rounded-[32px] sm:rounded-[38px] bg-white/85 backdrop-blur-2xl border border-white/80 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.3)] p-5 sm:p-7 md:p-8 space-y-7">
          {/* ============================================================== */}
          {/* 1. TOP CARD: AVATAR, PROFILE INFO, PROGRESS & UPDATE (COMPACT) */}
          {/* ============================================================== */}
          <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
            {/* Top row: Avatar + Profile Info on Left, Update Profile Button on Right */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* Compact Circular Static Avatar using default_profile.jpeg */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-sky-400 via-indigo-500 to-pink-500 p-[2.5px] shadow-md shadow-indigo-500/20">
                    <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden">
                      <img
                        src="/default_profile.jpeg"
                        alt={user?.fullName || "Student Profile"}
                        className="w-full h-full rounded-full object-cover select-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Student Profile Info */}
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight truncate leading-tight">
                    {user?.fullName || "Student"}
                  </h1>

                  {/* Profile Meta Info Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 border border-indigo-200/80 rounded-lg font-bold text-indigo-900 text-[11px] shadow-xs">
                      <BookOpen className="w-3 h-3 text-indigo-600" />
                      <span>{displayClass}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/95 border border-slate-200/90 rounded-lg font-medium text-slate-700 text-[11px] shadow-xs">
                      <Mail className="w-3 h-3 text-blue-600" />
                      <span className="truncate max-w-[200px]">{user?.email}</span>
                    </span>

                    {user?.schoolName && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/95 border border-slate-200/90 rounded-lg font-medium text-slate-700 text-[11px] shadow-xs">
                        <School className="w-3 h-3 text-purple-600" />
                        <span className="truncate max-w-[180px]">{user.schoolName}</span>
                      </span>
                    )}

                    {user?.mobileNumber && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/95 border border-slate-200/90 rounded-lg font-medium text-slate-700 text-[11px] shadow-xs">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{user.mobileNumber}</span>
                      </span>
                    )}

                    {(user?.city || user?.state) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/95 border border-slate-200/90 rounded-lg font-medium text-slate-700 text-[11px] shadow-xs">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span>{[user.city, user.state].filter(Boolean).join(", ")}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Update Profile Button */}
              <div className="shrink-0">
                <button
                  onClick={handleOpenProfileModal}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-slate-50 text-indigo-700 font-bold border border-indigo-200 hover:border-indigo-300 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Update Profile</span>
                </button>
              </div>
            </div>

            {/* Bottom Progress Bar - Compact & Sleek */}
            <div className="mt-3.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1.5">
                <span>Total Progress: {progressPercent}% Complete</span>
                <span className="text-indigo-600 font-semibold">
                  {maxCp} / {totalCp} Checkpoints
                </span>
              </div>

              {/* Compact Glowing Progress Track */}
              <div className="w-full bg-slate-100 h-2 sm:h-2.5 rounded-full overflow-hidden p-0.5 shadow-inner border border-slate-200/80">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.max(4, progressPercent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 2. CLASS GAME JOURNEY (ACTIVITY GLANCE + CURRICULUM CHECKPOINTS) */}
          {/* ============================================================== */}
          {loadingJourney ? (
            <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-12 text-center text-slate-400">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">Loading your learning checkpoints...</span>
              </div>
            </div>
          ) : journeyData?.hasPackage ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* LEFT SIDE: Active Activity Live Glance Preview */}
              <div
                onClick={() => setIsPlayingGame(true)}
                className="lg:col-span-7 relative overflow-hidden rounded-3xl min-h-[380px] sm:min-h-[440px] flex flex-col justify-between bg-slate-900 select-none group cursor-pointer"
                title="Click to play activity"
              >
                {/* Live Activity HTML Page (Scaled, Blurry, Non-interactive) */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none select-none">
                  {journeyData.activity?.playUrl && (
                    <iframe
                      src={`${BACKEND_BASE_URL}${journeyData.activity.playUrl}?checkpoint=${currentCp}&maxCompleted=${maxCp}`}
                      className="w-[140%] h-[140%] border-0 bg-white origin-top-left scale-[0.714] filter blur-[2px] opacity-85 select-none pointer-events-none"
                      tabIndex={-1}
                      aria-hidden="true"
                      title="Active Activity Live Glance"
                    />
                  )}
                </div>

                {/* Protective Glass & Gradient Overlay */}
                <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[0.5px] pointer-events-none z-10 transition-colors group-hover:bg-slate-900/10" />

                {/* Top Activity Badge on Card */}
                <div className="relative z-20 p-5 sm:p-6 flex items-center justify-between">
                  <div className="px-3.5 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-2 shadow-sm">
                    <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{journeyData.activity?.title || "Active Activity"}</span>
                  </div>
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-400 text-amber-950 shadow-sm">
                    Stage {currentCp}
                  </span>
                </div>

                {/* Childish Rounded Glossy PLAY Button in Center */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
                  <div className="px-8 py-3.5 sm:px-10 sm:py-4 rounded-full bg-gradient-to-b from-amber-300 via-orange-400 to-amber-500 text-white font-black text-base sm:text-lg tracking-wider uppercase shadow-[0_10px_30px_rgba(245,158,11,0.6)] border-3 border-white/80 flex items-center gap-2.5 transform transition-transform duration-200 group-hover:scale-110 active:scale-95">
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white drop-shadow-sm" />
                    <span className="drop-shadow-md">PLAY</span>
                  </div>
                  <span className="mt-2 text-xs font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">
                    Start Your Mission!
                  </span>
                </div>

                {/* Bottom Glance Hint */}
                <div className="relative z-20 p-4 text-center">
                  <span className="text-[11px] text-white/90 font-medium px-3 py-1 rounded-full bg-black/40 backdrop-blur-xs">
                    Live stage glance preview • Click to enter full page
                  </span>
                </div>
              </div>

              {/* RIGHT SIDE: Curriculum Details & Progressive Checkpoints */}
              <div className="lg:col-span-5 bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">     
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                          Checkpoints
                        </h2>
                    </div>
                  </div>

                  {/* Stage Checkpoints */}
                  <div className="mt-5 space-y-3">
                    {Array.from({ length: totalCp }).map((_, idx) => {
                      const stageNum = idx + 1;
                      const isCompleted = stageNum <= maxCp;
                      const isActive = stageNum === currentCp;
                      const isLocked = stageNum > currentCp;

                      return (
                        <div
                          key={stageNum}
                          className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isCompleted
                              ? "bg-emerald-50/70 border-emerald-200"
                              : isActive
                              ? "bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-200/70 shadow-xs"
                              : "bg-slate-50/70 border-slate-200 opacity-60"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black text-slate-800">Stage {stageNum}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {stageNum === 1
                                  ? "Alphabet & Words"
                                  : stageNum === 2
                                  ? "Math & Calculation"
                                  : "Shapes & Logic Quest"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              {isCompleted
                                ? "Completed! Past activities cannot be replayed."
                                : isActive
                                ? "Ready to play! Complete this stage to unlock the next."
                                : "Will unlock automatically after previous stage."}
                            </p>
                          </div>

                          <div className="shrink-0">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Completed</span>
                              </span>
                            ) : isActive ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full animate-pulse">
                                <span>Active Checkpoint</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-full">
                                <Lock className="w-3 h-3" />
                                <span>Locked</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                 <button
                    onClick={() => setIsPlayingGame(true)}
                    className="w-full sm:w-auto mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-102"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play game</span>
                  </button>
                
              </div>
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-8 text-center text-slate-500 text-xs">
              {journeyData?.message || "No game package uploaded for your class yet. Please contact your school administrator."}
            </div>
          )}
        </div>
      </main>

      {/* ============================================================== */}
      {/* PROFILE UPDATE MODAL                                           */}
      {/* ============================================================== */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Update Profile Details</h3>
                  <p className="text-xs text-slate-500">Edit your personal contact info</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs text-slate-900"
                />
              </div>

              {/* Mobile Number & School Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={profileForm.mobileNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, mobileNumber: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    School Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.schoolName}
                    onChange={(e) => setProfileForm({ ...profileForm, schoolName: e.target.value })}
                    placeholder="Enter school name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* City & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    placeholder="Enter city"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    value={profileForm.state}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                    placeholder="Enter state"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Password message note */}
              <div className="pt-2 border-t border-slate-100">
                <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-900">Password changes:</span>
                    <span className="text-[11px] text-amber-800 leading-snug">
                      To change or reset your password, please contact with Admin.
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-5">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  disabled={savingProfile}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL-PAGE GAME ACTIVITY VIEW */}
      {isPlayingGame && journeyData?.activity && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 w-screen h-screen overflow-hidden select-none">
          {/* Top Navigation Bar with Back Button */}
          <header className="h-14 sm:h-16 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between shrink-0 shadow-lg z-20">
            {/* Left: Back to Dashboard Button & Activity Details */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => {
                  setIsPlayingGame(false);
                  loadJourney();
                }}
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-102 active:scale-98 cursor-pointer group"
                title="Back to Student Dashboard"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Dashboard</span>
              </button>

              <div className="h-6 w-px bg-slate-700 hidden sm:block" />

              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 border border-slate-700 hidden sm:flex">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px] sm:max-w-xs md:max-w-md">
                    {journeyData.activity.title}
                  </h1>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="text-indigo-300 font-semibold">Stage {currentCp} of {totalCp}</span>
                    <span>•</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Auto-saving active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Sync / Refresh & Quick Exit */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={loadJourney}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                title="Sync Journey Progress"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sync Progress</span>
              </button>
              <button
                onClick={() => {
                  setIsPlayingGame(false);
                  loadJourney();
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                title="Exit Game"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          </header>

          {/* Full-Page Activity Container */}
          <main className="flex-1 w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] bg-white relative overflow-hidden">
            {toastMessage && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
                <Zap className="w-4 h-4 text-amber-300" />
                <span>{toastMessage}</span>
              </div>
            )}
            <iframe
              src={`${BACKEND_BASE_URL}${journeyData.activity.playUrl}?checkpoint=${currentCp}&maxCompleted=${maxCp}`}
              className="w-full h-full border-0 bg-white"
              allow="autoplay; fullscreen; microphone; camera; display-capture"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-downloads"
              title="Class Game Journey Player"
            />
          </main>
        </div>
      )}
    </div>
  );
}
