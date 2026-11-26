"use client";

import React, { useState } from "react";
import { api, AdminPlanItem, ClassItem } from "@/lib/api";
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  BookOpen,
  Calendar,
  Sparkles,
  X,
} from "lucide-react";

interface AdminPlansTabProps {
  plansList: AdminPlanItem[];
  classesList: ClassItem[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onActionMessage: (msg: { type: "success" | "error"; text: string }) => void;
}

export function AdminPlansTab({
  plansList,
  classesList,
  loading,
  onRefresh,
  onActionMessage,
}: AdminPlansTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlanItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [classId, setClassId] = useState<string>("GLOBAL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceInr, setPriceInr] = useState<number>(999);
  const [durationDays, setDurationDays] = useState<number>(365);
  const [badge, setBadge] = useState("BEST VALUE");
  const [isActive, setIsActive] = useState(true);

  function openCreateModal() {
    setEditingPlan(null);
    setClassId(classesList.length > 0 ? String(classesList[0].id) : "GLOBAL");
    setTitle("Annual Class Subscription");
    setDescription("Full access to all curriculum stages, checkpoints, and rewards.");
    setPriceInr(999);
    setDurationDays(365);
    setBadge("BEST VALUE");
    setIsActive(true);
    setShowModal(true);
  }

  function openEditModal(plan: AdminPlanItem) {
    setEditingPlan(plan);
    setClassId(plan.classId ? String(plan.classId) : "GLOBAL");
    setTitle(plan.title);
    setDescription(plan.description || "");
    setPriceInr(plan.priceInr);
    setDurationDays(plan.durationDays);
    setBadge(plan.badge || "");
    setIsActive(plan.isActive);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const parsedClassId = classId === "GLOBAL" ? null : Number(classId);

    const res = editingPlan
      ? await api.updateAdminPlan(editingPlan.id, {
          classId: parsedClassId,
          title: title.trim(),
          description: description.trim(),
          priceInr: Number(priceInr),
          durationDays: Number(durationDays),
          badge: badge.trim() || null,
          isActive,
        })
      : await api.createAdminPlan({
          classId: parsedClassId,
          title: title.trim(),
          description: description.trim(),
          priceInr: Number(priceInr),
          durationDays: Number(durationDays),
          badge: badge.trim() || undefined,
          isActive,
        });

    setSaving(false);

    if (res.success) {
      onActionMessage({
        type: "success",
        text: editingPlan
          ? `Subscription plan "${title}" updated successfully!`
          : `New subscription plan "${title}" created successfully!`,
      });
      setShowModal(false);
      await onRefresh();
    } else {
      onActionMessage({
        type: "error",
        text: res.error?.message || "Failed to save subscription plan",
      });
    }
  }

  async function handleDelete(plan: AdminPlanItem) {
    if (!confirm(`Delete subscription plan "${plan.title}" (${plan.className})?`)) return;
    const res = await api.deleteAdminPlan(plan.id);
    if (res.success) {
      onActionMessage({
        type: "success",
        text: `Subscription plan "${plan.title}" deleted.`,
      });
      await onRefresh();
    } else {
      onActionMessage({
        type: "error",
        text: res.error?.message || "Failed to delete plan (it may have active orders)",
      });
    }
  }

  async function handleToggleActive(plan: AdminPlanItem) {
    const res = await api.updateAdminPlan(plan.id, { isActive: !plan.isActive });
    if (res.success) {
      await onRefresh();
    } else {
      onActionMessage({
        type: "error",
        text: res.error?.message || "Failed to update plan status",
      });
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Class-Wise Subscription Plans &amp; Pricing
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Configure separate subscription pricing and validity durations for each class. Students see plans tailored to their class.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Class Subscription Plan</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Target Class</th>
                <th className="py-3.5 px-4 font-semibold">Plan Details</th>
                <th className="py-3.5 px-4 font-semibold">Price (INR)</th>
                <th className="py-3.5 px-4 font-semibold">Validity</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading subscription plans...
                  </td>
                </tr>
              ) : plansList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No subscription plans configured yet. Click &quot;Add Class Subscription Plan&quot; to create one.
                  </td>
                </tr>
              ) : (
                plansList.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs ${
                          plan.classId
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{plan.className}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{plan.title}</span>
                        {plan.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {plan.description || "—"}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">Code: {plan.code}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-base font-black text-slate-900">₹{plan.priceInr}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{plan.durationDays} Days</span>
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleActive(plan)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                          plan.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {plan.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(plan)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer text-xs font-semibold"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(plan)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                          title="Delete Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingPlan ? "Edit Subscription Plan" : "Create Class Subscription Plan"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Class
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                >
                  <option value="GLOBAL">All Classes (Global Default)</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plan Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Class 1 Annual Pass"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price (₹ INR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={priceInr}
                    onChange={(e) => setPriceInr(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration (Days) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Highlight Badge (Optional)
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. BEST VALUE, POPULAR"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="planActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <label htmlFor="planActiveCheck" className="text-xs font-medium text-slate-700">
                  Plan is active and visible to students
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
