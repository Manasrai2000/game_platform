"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiUser, SupportTicketItem, TicketCategory } from "@/lib/api";
import {
  LifeBuoy,
  Send,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Gamepad2,
  User,
  Mail,
  Phone,
  MessageSquare,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: "LOGIN_DEVICE_LOCK", label: "Login / Single-Device Lock Reset" },
  { value: "PASSWORD_RESET", label: "Password Reset Request" },
  { value: "REGISTRATION_OTP", label: "Registration / Email OTP Issue" },
  { value: "PAYMENT_SUBSCRIPTION", label: "Payment / Subscription / Referral" },
  { value: "ACTIVITY_BUG", label: "Game / Activity Technical Problem" },
  { value: "OTHER", label: "Other Query" },
];

export default function HelpdeskPage() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<"submit" | "track">("submit");

  // Submit Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [category, setCategory] = useState<TicketCategory>("OTHER");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<SupportTicketItem | null>(null);
  const [copiedTicketNo, setCopiedTicketNo] = useState(false);

  // Student My Tickets State
  const [myTickets, setMyTickets] = useState<SupportTicketItem[]>([]);
  const [loadingMyTickets, setLoadingMyTickets] = useState(false);

  // Public Guest Track State
  const [trackTicketNo, setTrackTicketNo] = useState("");
  const [trackEmail, setTrackEmail] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackedTicket, setTrackedTicket] = useState<SupportTicketItem | null>(null);

  useEffect(() => {
    async function init() {
      const me = await api.getMe();
      if (me.success && me.data?.user) {
        setUser(me.data.user);
        setName(me.data.user.fullName || "");
        setEmail(me.data.user.email || "");
        setMobile(me.data.user.mobileNumber || "");
        loadMyTickets();
      }
      setCheckingAuth(false);
    }
    init();
  }, []);

  async function loadMyTickets() {
    setLoadingMyTickets(true);
    const res = await api.getMyHelpdeskTickets();
    if (res.success && res.data?.tickets) {
      setMyTickets(res.data.tickets);
    }
    setLoadingMyTickets(false);
  }

  async function handleSubmitTicket(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const res = await api.submitHelpdeskTicket({
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim() || undefined,
      category,
      subject: subject.trim(),
      description: description.trim(),
    });

    setSubmitting(false);

    if (res.success && res.data?.ticket) {
      setCreatedTicket(res.data.ticket);
      setSubject("");
      setDescription("");
      if (user) {
        loadMyTickets();
      }
    } else {
      setSubmitError(res.error?.message || "Failed to submit support ticket.");
    }
  }

  async function handleTrackGuest(e: React.FormEvent) {
    e.preventDefault();
    setTracking(true);
    setTrackError(null);
    setTrackedTicket(null);

    const res = await api.trackHelpdeskTicket(trackTicketNo.trim(), trackEmail.trim());
    setTracking(false);

    if (res.success && res.data?.ticket) {
      setTrackedTicket(res.data.ticket);
    } else {
      setTrackError(res.error?.message || "Ticket not found.");
    }
  }

  function handleCopyTicketNumber(tktNo: string) {
    navigator.clipboard.writeText(tktNo);
    setCopiedTicketNo(true);
    setTimeout(() => setCopiedTicketNo(false), 2000);
  }

  function renderStatusBadge(status: SupportTicketItem["status"]) {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Resolved</span>
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            <span>In Progress</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <AlertCircle className="w-3 h-3" />
            <span>Open (Pending Admin)</span>
          </span>
        );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={user ? (user.role === "ADMIN" ? "/admin" : "/dashboard") : "/"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{user ? "Back to Dashboard" : "Home"}</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 text-sm hidden sm:inline">
                Education Game Helpdesk
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {checkingAuth ? null : user ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Registered: {user.fullName}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3 shadow-xs">
            <LifeBuoy className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Contact Admin &amp; Support Helpdesk
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 max-w-xl mx-auto">
            Having trouble logging in, resetting your password, unlocking your device, or facing an issue in a game? Submit a ticket below—both registered students and guests can get help!
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex p-1.5 rounded-2xl bg-slate-200/70 border border-slate-200 max-w-md mx-auto mb-8">
          <button
            onClick={() => setActiveTab("submit")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "submit"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit a Problem</span>
          </button>
          <button
            onClick={() => setActiveTab("track")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "track"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>
              {user ? `My Tickets (${myTickets.length})` : "Track Ticket Status"}
            </span>
          </button>
        </div>

        {activeTab === "submit" ? (
          createdTicket ? (
            <div className="bg-white border border-emerald-200 rounded-3xl p-8 text-center shadow-lg">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Support Ticket Submitted!
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
                Your problem has been sent directly to the Admin Priority Queue. Save your Ticket Number below to check resolution status anytime:
              </p>

              <div className="my-6 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-mono text-xl font-black text-indigo-700 tracking-wider">
                  {createdTicket.ticket_number}
                </span>
                <button
                  onClick={() => handleCopyTicketNumber(createdTicket.ticket_number)}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 cursor-pointer"
                  title="Copy Ticket Number"
                >
                  {copiedTicketNo ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setTrackTicketNo(createdTicket.ticket_number);
                    setTrackEmail(createdTicket.requester_email);
                    setTrackedTicket(createdTicket);
                    setCreatedTicket(null);
                    setActiveTab("track");
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  View Ticket Status
                </button>
                <button
                  onClick={() => setCreatedTicket(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Submit Another Issue
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              {submitError && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Your Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        readOnly={!!user}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 ${
                          user ? "bg-slate-50 text-slate-600" : "bg-white"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        readOnly={!!user}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 ${
                          user ? "bg-slate-50 text-slate-600" : "bg-white"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mobile Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="10-digit mobile"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Problem Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as TicketCategory)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Subject / Issue Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Need device lock reset for my new laptop"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Describe Your Problem <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please explain the problem you are facing in detail..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Ticket...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Request to Admin</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )
        ) : (
          /* TRACK TICKET STATUS TAB */
          <div className="space-y-6">
            {/* Guest Lookup Form (or manual lookup) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Lookup Ticket by Ticket Number &amp; Email
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Check live resolution status and Admin replies without signing in
              </p>

              <form onSubmit={handleTrackGuest} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <input
                  type="text"
                  required
                  value={trackTicketNo}
                  onChange={(e) => setTrackTicketNo(e.target.value.toUpperCase())}
                  placeholder="Ticket # (e.g. TKT-48219)"
                  className="sm:col-span-4 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase"
                />
                <input
                  type="email"
                  required
                  value={trackEmail}
                  onChange={(e) => setTrackEmail(e.target.value)}
                  placeholder="Email used while submitting"
                  className="sm:col-span-5 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
                <button
                  type="submit"
                  disabled={tracking}
                  className="sm:col-span-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {tracking ? "Checking..." : "Check Status"}
                </button>
              </form>

              {trackError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {trackError}
                </div>
              )}

              {trackedTicket && (
                <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-indigo-700 text-sm">
                        {trackedTicket.ticket_number}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        Submitted {new Date(trackedTicket.created_at).toLocaleString()}
                      </span>
                    </div>
                    {renderStatusBadge(trackedTicket.status)}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{trackedTicket.subject}</h4>
                  <p className="text-xs text-slate-600">{trackedTicket.description}</p>
                  {trackedTicket.admin_reply ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                      <strong className="block mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Admin Response:
                      </strong>
                      <span>{trackedTicket.admin_reply}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">
                      Waiting for admin review.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Logged-in Student Tickets List */}
            {user && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Your Submitted Tickets</h3>
                  <button
                    onClick={loadMyTickets}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>

                {loadingMyTickets ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Loading your tickets...
                  </div>
                ) : myTickets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    You have not submitted any helpdesk tickets yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myTickets.map((t) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-indigo-700">
                              {t.ticket_number}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(t.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {renderStatusBadge(t.status)}
                        </div>
                        <p className="text-xs font-bold text-slate-900">{t.subject}</p>
                        <p className="text-xs text-slate-600">{t.description}</p>
                        {t.admin_reply && (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                            <strong className="block mb-0.5">Admin Reply:</strong>
                            {t.admin_reply}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
