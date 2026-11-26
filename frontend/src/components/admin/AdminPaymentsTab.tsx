"use client";

import React, { useState } from "react";
import {
  AdminPaymentOrderItem,
  AdminPaymentsSummary,
  ClassItem,
  PaginationMeta,
} from "@/lib/api";
import {
  IndianRupee,
  Crown,
  Tag,
  Calendar,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
} from "lucide-react";

interface AdminPaymentsTabProps {
  orders: AdminPaymentOrderItem[];
  summary: AdminPaymentsSummary;
  pagination: PaginationMeta;
  classesList: ClassItem[];
  loading: boolean;
  onFilterChange: (filters: {
    search?: string;
    status?: "ALL" | "PAID" | "PENDING" | "FAILED";
    classGrade?: string;
    gateway?: "ALL" | "RAZORPAY" | "SANDBOX";
    startDate?: string;
    endDate?: string;
    page?: number;
  }) => Promise<void>;
}

export function AdminPaymentsTab({
  orders,
  summary,
  pagination,
  classesList,
  loading,
  onFilterChange,
}: AdminPaymentsTabProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "PAID" | "PENDING" | "FAILED">("PAID");
  const [classGrade, setClassGrade] = useState("all");
  const [gateway, setGateway] = useState<"ALL" | "RAZORPAY" | "SANDBOX">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function applyFilters(overrides?: Partial<{
    search: string;
    status: "ALL" | "PAID" | "PENDING" | "FAILED";
    classGrade: string;
    gateway: "ALL" | "RAZORPAY" | "SANDBOX";
    startDate: string;
    endDate: string;
    page: number;
  }>) {
    const next = {
      search: overrides?.search ?? search,
      status: overrides?.status ?? status,
      classGrade: overrides?.classGrade ?? classGrade,
      gateway: overrides?.gateway ?? gateway,
      startDate: overrides?.startDate ?? startDate,
      endDate: overrides?.endDate ?? endDate,
      page: overrides?.page ?? 1,
    };
    await onFilterChange(next);
  }

  function handleResetFilters() {
    setSearch("");
    setStatus("PAID");
    setClassGrade("all");
    setGateway("ALL");
    setStartDate("");
    setEndDate("");
    applyFilters({
      search: "",
      status: "PAID",
      classGrade: "all",
      gateway: "ALL",
      startDate: "",
      endDate: "",
      page: 1,
    });
  }

  function handleExportCsv() {
    const headers = [
      "Order ID",
      "Date",
      "Student Name",
      "Email",
      "Mobile",
      "Student Class",
      "Plan",
      "Class Price (INR)",
      "Code Discount (INR)",
      "Wallet Discount (INR)",
      "Net Paid (INR)",
      "Code Used",
      "Gateway",
      "Gateway Order ID",
      "Gateway Payment ID",
      "Status",
    ];

    const escapeCsv = (val: unknown) => {
      const s = String(val ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };

    const csvRows = [
      headers.join(","),
      ...orders.map((o) =>
        [
          o.id,
          new Date(o.createdAt).toLocaleString(),
          o.studentName,
          o.studentEmail,
          o.studentMobile,
          o.studentClassGrade,
          o.planTitle || o.planCode || "Plan",
          o.baseAmount,
          o.discountAmount,
          o.walletDiscountUsed,
          o.finalAmount,
          o.referralCodeUsed || "",
          o.gateway,
          o.gatewayOrderId,
          o.gatewayPaymentId || "",
          o.status,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payments-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const totalStudents = summary.activePremiumStudentsCount + summary.freeStudentsCount;
  const premiumPercent =
    totalStudents > 0 ? Math.round((summary.activePremiumStudentsCount / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Payments &amp; Revenue Ledger
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Track incoming student payments, class plan pricing, coupon/referral discounts, and conversion metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyFilters({ page: pagination.page })}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={orders.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Revenue Collected
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            ₹{summary.totalRevenueInr.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            From <strong className="text-slate-700">{summary.paidOrdersCount}</strong> successful payments
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Today &amp; This Month
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            ₹{summary.thisMonthRevenueInr.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Today&apos;s collection:{" "}
            <strong className="text-emerald-700">₹{summary.todayRevenueInr.toLocaleString("en-IN")}</strong>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Discounts Given
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            ₹{summary.totalDiscountGivenInr.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Gross MRP: <strong className="text-slate-700">₹{summary.totalBaseAmountInr.toLocaleString("en-IN")}</strong>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Premium vs Free
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700">
              {summary.activePremiumStudentsCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              / {summary.freeStudentsCount} Free
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            <strong className="text-violet-700">{premiumPercent}%</strong> paid conversion across students
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Quick Pills */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl gap-1">
            {(
              [
                { value: "PAID", label: "Paid Only" },
                { value: "ALL", label: "All Attempts" },
                { value: "PENDING", label: "Pending" },
                { value: "FAILED", label: "Failed" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setStatus(opt.value);
                  applyFilters({ status: opt.value, page: 1 });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  status === opt.value
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters({ page: 1 });
            }}
            className="flex items-center gap-2 flex-1 max-w-md"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, email, coupon, pay_id..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600">Class:</span>
            <select
              value={classGrade}
              onChange={(e) => {
                setClassGrade(e.target.value);
                applyFilters({ classGrade: e.target.value, page: 1 });
              }}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium cursor-pointer"
            >
              <option value="all">All Classes</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600">Gateway:</span>
            <select
              value={gateway}
              onChange={(e) => {
                const val = e.target.value as "ALL" | "RAZORPAY" | "SANDBOX";
                setGateway(val);
                applyFilters({ gateway: val, page: 1 });
              }}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium cursor-pointer"
            >
              <option value="ALL">All Gateways</option>
              <option value="RAZORPAY">Razorpay</option>
              <option value="SANDBOX">Sandbox</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                applyFilters({ startDate: e.target.value, page: 1 });
              }}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                applyFilters({ endDate: e.target.value, page: 1 });
              }}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium cursor-pointer"
            />
          </div>

          {(search || status !== "PAID" || classGrade !== "all" || gateway !== "ALL" || startDate || endDate) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 cursor-pointer font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Date &amp; Time</th>
                <th className="py-3.5 px-4 font-semibold">Student</th>
                <th className="py-3.5 px-4 font-semibold">Plan &amp; Class MRP</th>
                <th className="py-3.5 px-4 font-semibold">Discount &amp; Code</th>
                <th className="py-3.5 px-4 font-semibold">Net Paid</th>
                <th className="py-3.5 px-4 font-semibold">Gateway &amp; Payment ID</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading payment ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No payments found matching the selected filters.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const totalSavings = order.discountAmount + order.walletDiscountUsed;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        <div className="font-medium text-slate-800">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{order.studentName}</div>
                        <div className="text-[11px] text-slate-500">{order.studentEmail}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                          <span className="text-indigo-600 font-semibold">{order.studentClassGrade}</span>
                          {order.studentMobile && (
                            <span className="text-slate-400 font-mono">• {order.studentMobile}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {order.planTitle || order.planCode || "Subscription"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Class Price:{" "}
                          <strong className="text-slate-800">
                            ₹{order.baseAmount.toLocaleString("en-IN")}
                          </strong>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {totalSavings > 0 ? (
                          <div className="space-y-1">
                            <div className="text-amber-700 font-semibold">
                              -₹{totalSavings.toLocaleString("en-IN")}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              {order.referralCodeUsed && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold">
                                  {order.referralCodeUsed} (-₹{order.discountAmount})
                                </span>
                              )}
                              {order.walletDiscountUsed > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                                  Wallet -₹{order.walletDiscountUsed}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No discount</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg font-extrabold text-xs ${
                            order.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          ₹{order.finalAmount.toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                            order.gateway === "RAZORPAY"
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {order.gateway}
                        </span>
                        <div
                          className="text-[10px] font-mono text-slate-500 mt-1 max-w-[160px] truncate"
                          title={order.gatewayPaymentId || order.gatewayOrderId}
                        >
                          {order.gatewayPaymentId || order.gatewayOrderId}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {order.status === "PAID" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            Paid
                          </span>
                        ) : order.status === "PENDING" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing page <strong>{pagination.page}</strong> of{" "}
            <strong>{pagination.totalPages}</strong> ({pagination.total} orders)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => applyFilters({ page: pagination.page - 1 })}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => applyFilters({ page: pagination.page + 1 })}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
