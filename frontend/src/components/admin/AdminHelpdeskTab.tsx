"use client";

import React, { useState } from "react";
import {
  api,
  SupportTicketItem,
  HelpdeskSummary,
  TicketStatus,
  TicketPriority,
} from "@/lib/api";
import {
  LifeBuoy,
  Search,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  MessageSquare,
  X,
  RefreshCw,
} from "lucide-react";

interface AdminHelpdeskTabProps {
  tickets: SupportTicketItem[];
  summary: HelpdeskSummary;
  loading: boolean;
  onRefresh: (filters?: {
    status?: string;
    userType?: "all" | "registered" | "guest";
    category?: string;
    search?: string;
  }) => Promise<void>;
  onActionMessage: (msg: { type: "success" | "error"; text: string }) => void;
}

export function AdminHelpdeskTab({
  tickets,
  summary,
  loading,
  onRefresh,
  onActionMessage,
}: AdminHelpdeskTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<"all" | "registered" | "guest">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Resolve / Reply Modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [modalStatus, setModalStatus] = useState<TicketStatus>("RESOLVED");
  const [modalPriority, setModalPriority] = useState<TicketPriority>("MEDIUM");
  const [modalReply, setModalReply] = useState("");
  const [saving, setSaving] = useState(false);

  function openManageModal(ticket: SupportTicketItem) {
    setSelectedTicket(ticket);
    setModalStatus(ticket.isUnresolved ? "RESOLVED" : ticket.status);
    setModalPriority(ticket.priority);
    setModalReply(ticket.admin_reply || "");
  }

  async function applyFilters(
    nextStatus = statusFilter,
    nextUserType = userTypeFilter,
    nextSearch = searchQuery
  ) {
    await onRefresh({
      status: nextStatus,
      userType: nextUserType,
      search: nextSearch,
    });
  }

  async function handleSaveUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket) return;
    setSaving(true);

    const res = await api.updateAdminHelpdeskTicket(selectedTicket.id, {
      status: modalStatus,
      priority: modalPriority,
      adminReply: modalReply,
    });

    setSaving(false);

    if (res.success) {
      onActionMessage({
        type: "success",
        text: `Ticket ${selectedTicket.ticket_number} updated (${modalStatus})!`,
      });
      setSelectedTicket(null);
      await applyFilters();
    } else {
      onActionMessage({
        type: "error",
        text: res.error?.message || "Failed to update ticket",
      });
    }
  }

  function formatAge(hours: number): string {
    if (hours < 1) return "Just now";
    if (hours < 24) return `${Math.round(hours)}h ago`;
    const days = Math.floor(hours / 24);
    const remHours = Math.round(hours % 24);
    return `${days}d ${remHours}h ago`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Helpdesk &amp; Priority Support Queue
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Unresolved and late/overdue tickets automatically sort to the top so older issues are resolved first.
          </p>
        </div>

        <button
          onClick={() => applyFilters()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* SLA KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <LifeBuoy className="w-4 h-4 text-indigo-600" />
            <span>Unresolved (Open)</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{summary.totalOpen}</div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-700">
            <Flame className="w-4 h-4 text-rose-600" />
            <span>Late / Critical (&gt;48h)</span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">
            {summary.lateCriticalCount}
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Aging (&gt;24h)</span>
          </div>
          <div className="text-2xl font-black text-amber-800 mt-1">
            {summary.agingHighCount}
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Resolved Tickets</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{summary.resolvedCount}</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              applyFilters(statusFilter, userTypeFilter, e.target.value);
            }}
            placeholder="Search ticket #, email, name, or problem subject..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            applyFilters(e.target.value, userTypeFilter, searchQuery);
          }}
          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700"
        >
          <option value="all">Priority Queue (All)</option>
          <option value="unresolved">Unresolved Only</option>
          <option value="OPEN">Open Only</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        <select
          value={userTypeFilter}
          onChange={(e) => {
            const val = e.target.value as "all" | "registered" | "guest";
            setUserTypeFilter(val);
            applyFilters(statusFilter, val, searchQuery);
          }}
          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700"
        >
          <option value="all">All Users (Registered + Guests)</option>
          <option value="registered">Registered Students</option>
          <option value="guest">Non-Registered Guests</option>
        </select>
      </div>

      {/* Priority Queue Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">SLA Priority &amp; Age</th>
                <th className="py-3.5 px-4 font-semibold">Ticket &amp; Problem</th>
                <th className="py-3.5 px-4 font-semibold">Requester</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Loading support queue...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    No support tickets found matching your filters.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    className={`transition-colors ${
                      t.slaTier === "LATE_CRITICAL"
                        ? "bg-rose-50/40 hover:bg-rose-50/70"
                        : t.slaTier === "AGING_HIGH"
                        ? "bg-amber-50/30 hover:bg-amber-50/60"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* SLA Priority & Age */}
                    <td className="py-4 px-4 align-top">
                      {t.slaTier === "LATE_CRITICAL" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                          <Flame className="w-3 h-3 text-rose-600" />
                          <span>LATE • {formatAge(t.ageHours)}</span>
                        </span>
                      ) : t.slaTier === "AGING_HIGH" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>AGING • {formatAge(t.ageHours)}</span>
                        </span>
                      ) : t.slaTier === "RESOLVED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <Clock className="w-3 h-3" />
                          <span>{formatAge(t.ageHours)}</span>
                        </span>
                      )}
                      <div className="text-[10px] font-bold text-slate-400 mt-1">
                        Priority: {t.priority}
                      </div>
                    </td>

                    {/* Ticket & Problem */}
                    <td className="py-4 px-4 align-top max-w-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-black text-indigo-700">
                          {t.ticket_number}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                          {t.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900">{t.subject}</div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {t.description}
                      </p>
                    </td>

                    {/* Requester */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-bold text-slate-900">{t.requester_name}</div>
                      <div className="text-[11px] text-slate-500">{t.requester_email}</div>
                      {t.is_registered_user ? (
                        <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <UserCheck className="w-3 h-3" />
                          <span>
                            Registered {t.studentClassGrade ? `(${t.studentClassGrade})` : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <UserX className="w-3 h-3" />
                          <span>Non-Registered Guest</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 align-top">
                      {t.status === "RESOLVED" || t.status === "CLOSED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Resolved
                        </span>
                      ) : t.status === "IN_PROGRESS" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Open
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 text-right align-top">
                      <button
                        onClick={() => openManageModal(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{t.isUnresolved ? "Resolve / Reply" : "View / Edit"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve / Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="font-mono font-black text-indigo-700 text-xs">
                  {selectedTicket.ticket_number}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedTicket.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 mb-4">
              <div className="flex items-center justify-between text-slate-500">
                <span>
                  From: <strong className="text-slate-900">{selectedTicket.requester_name}</strong> ({selectedTicket.requester_email})
                </span>
                <span>{formatAge(selectedTicket.ageHours)}</span>
              </div>
              {selectedTicket.requester_mobile && (
                <div className="text-slate-500">Mobile: {selectedTicket.requester_mobile}</div>
              )}
              <div className="pt-2 border-t border-slate-200 text-slate-800 whitespace-pre-wrap">
                {selectedTicket.description}
              </div>
            </div>

            <form onSubmit={handleSaveUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resolution Status
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as TicketStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    <option value="OPEN">Open (Unresolved)</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ticket Priority
                  </label>
                  <select
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Resolution / Reply Message
                </label>
                <textarea
                  rows={4}
                  value={modalReply}
                  onChange={(e) => setModalReply(e.target.value)}
                  placeholder="Write solution or note for the user (this will be emailed and visible in ticket tracking)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update & Send Reply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
