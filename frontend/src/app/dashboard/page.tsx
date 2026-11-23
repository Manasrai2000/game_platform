"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, ApiUser, StudentJourneyResponse } from "@/lib/api";
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
  Play,
  CheckCircle2,
  Lock,
  X,
  Maximize2,
  RefreshCw,
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

  const currentCp = journeyData?.progress?.currentCheckpoint || 1;
  const maxCp = journeyData?.progress?.maxCompletedCheckpoint || 0;
  const totalCp = journeyData?.activity?.totalCheckpoints || 3;
  const progressPercent = Math.min(100, Math.round((maxCp / totalCp) * 100));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base block leading-tight">
                Education Game
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
                Student Learning Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-900">{user?.fullName}</p>
              <p className="text-[11px] text-slate-500 font-medium">Class: {user?.classGrade}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-bounce">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100/80 rounded-3xl p-8 mb-8 shadow-xs relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/80 text-indigo-700 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Student Learning Workspace</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                Welcome back, {user?.fullName}!
              </h1>
              <p className="text-slate-600 text-sm max-w-xl leading-relaxed">
                Your learning journey is active for <strong>{user?.classGrade}</strong>. Continue your journey from where you left off.
              </p>
            </div>

            {journeyData?.hasPackage && (
              <button
                onClick={() => setIsPlayingGame(true)}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2.5 cursor-pointer shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {maxCp === 0 ? "Start Game Journey" : `Resume Journey (Stage ${currentCp})`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* FEATURED: CLASS GAME JOURNEY (STAGE 2) */}
        <div className="mb-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {user?.classGrade} Curriculum
                    </span>
                    <span className="text-xs text-slate-400">• Single Continuous Journey</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {journeyData?.activity?.title || `${user?.classGrade} Interactive Journey`}
                  </h2>
                </div>
              </div>

              {journeyData?.hasPackage && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Progress:</span>
                  <span className="text-xs font-extrabold text-indigo-600">{progressPercent}%</span>
                </div>
              )}
            </div>

            {loadingJourney ? (
              <div className="py-12 text-center text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Loading your learning checkpoints...</span>
                </div>
              </div>
            ) : journeyData?.hasPackage ? (
              <div className="mt-6 space-y-6">
                {/* Progress Bar */}
                <div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Completed <strong>{maxCp}</strong> of <strong>{totalCp}</strong> checkpoints.
                  </p>
                </div>

                {/* Progressive Stage Stepper */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Array.from({ length: totalCp }).map((_, idx) => {
                    const stageNum = idx + 1;
                    const isCompleted = stageNum <= maxCp;
                    const isActive = stageNum === currentCp;
                    const isLocked = stageNum > currentCp;

                    return (
                      <div
                        key={stageNum}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCompleted
                            ? "bg-emerald-50/50 border-emerald-200"
                            : isActive
                            ? "bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-100"
                            : "bg-slate-50/60 border-slate-200 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">Stage {stageNum}</span>
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Completed</span>
                            </span>
                          ) : isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full animate-pulse">
                              <span>Active Checkpoint</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                              <Lock className="w-3 h-3" />
                              <span>Locked</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-slate-900 mb-1">
                          {stageNum === 1
                            ? "Alphabet & Words"
                            : stageNum === 2
                            ? "Math & Calculation"
                            : "Shapes & Logic Quest"}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          {isCompleted
                            ? "Completed! Past activities cannot be replayed."
                            : isActive
                            ? "Ready to play! Complete this to unlock next stage."
                            : "Will unlock automatically after previous stage."}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Big Action Bar */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">Auto-Resume Enabled:</span> You will continue automatically from Stage {currentCp}.
                  </div>
                  <button
                    onClick={() => setIsPlayingGame(true)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Game Player</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                {journeyData?.message || "No game package uploaded for your class yet. Please contact your school administrator."}
              </div>
            )}
          </div>
        </div>

        {/* Security & Student Profile Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security & Device Binding Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Single-Device Lock</h3>
                <span className="text-[11px] text-emerald-600 font-semibold">Active &amp; Bound</span>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-700">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Laptop className="w-4 h-4 text-indigo-600" />
                <span>Authorized Machine: Current Laptop</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Logins from other laptops or browsers are blocked. If you switch computers, contact
                your school admin to reset your device lock.
              </p>
            </div>
          </div>

          {/* Student Profile Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
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
        </div>
      </main>

      {/* FULLSCREEN GAME PLAYER MODAL */}
      {isPlayingGame && journeyData?.activity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Player Topbar */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {journeyData.activity.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>Current: Stage {currentCp} of {totalCp}</span>
                    <span>•</span>
                    <span className="text-indigo-600 font-semibold">Auto-saving checkpoints</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadJourney}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Refresh State"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlayingGame(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>Exit Game</span>
                </button>
              </div>
            </div>

            {/* Sandbox iframe Container */}
            <div className="flex-1 bg-slate-100 p-2 sm:p-3 relative">
              <iframe
                src={`http://localhost:4000${journeyData.activity.playUrl}?checkpoint=${currentCp}&maxCompleted=${maxCp}`}
                className="w-full h-full border-0 rounded-2xl bg-white shadow-inner"
                sandbox="allow-scripts allow-forms allow-same-origin"
                title="Class Game Journey Player"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
