"use client";

import React, { useState } from "react";
import { api, AdminPromoCodeItem } from "@/lib/api";
import {
  Gift,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Clock,
  Tag,
  X,
  Sparkles,
} from "lucide-react";

interface AdminReferralsTabProps {
  codesList: AdminPromoCodeItem[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onActionMessage: (msg: { type: "success" | "error"; text: string }) => void;
}

export function AdminReferralsTab({
  codesList,
  loading,
  onRefresh,
  onActionMessage,
}: AdminReferralsTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<AdminPromoCodeItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [expiresAtDate, setExpiresAtDate] = useState<string>("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  function getDefaultExpiryDateString(daysFromNow = 30) {
    const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  }

  function openCreateModal() {
    setEditingCode(null);
    setCode("");
    setLabel("School Special Offer");
    setDiscountType("PERCENT");
    setDiscountValue(15);
    setExpiresAtDate(getDefaultExpiryDateString(30));
    setMaxUses("");
    setIsActive(true);
    setShowModal(true);
  }

  function openEditModal(item: AdminPromoCodeItem) {
    setEditingCode(item);
    setCode(item.code);
    setLabel(item.label);
    if (item.discount_flat_inr > 0) {
      setDiscountType("FLAT");
      setDiscountValue(item.discount_flat_inr);
    } else {
      setDiscountType("PERCENT");
      setDiscountValue(item.discount_percent);
    }
    setExpiresAtDate(new Date(item.expires_at).toISOString().split("T")[0]);
    setMaxUses(item.max_uses !== null ? String(item.max_uses) : "");
    setIsActive(item.is_active);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      label: label.trim(),
      discountPercent: discountType === "PERCENT" ? Number(discountValue) : 0,
      discountFlatInr: discountType === "FLAT" ? Number(discountValue) : 0,
      maxUses: maxUses.trim() ? Number(maxUses) : null,
      expiresAt: expiresAtDate,
      isActive,
    };

    const res = editingCode
      ? await api.updateAdminPromoCode(editingCode.id, payload)
      : await api.createAdminPromoCode({
          ...payload,
          code: code.trim() || undefined,
        });

    setSaving(false);

    if (res.success) {
      onActionMessage({
        type: "success",
        text: editingCode
          ? `Coupon code "${editingCode.code}" updated!`
          : `Coupon code "${res.data?.code?.code || code}" generated successfully!`,
      });
      setShowModal(false);
      await onRefresh();
    } else {
      onActionMessage({
        type: "error",
        text: res.error?.message || "Failed to save coupon code",
      });
    }
  }

  async function handleDelete(item: AdminPromoCodeItem) {
    if (!confirm(`Delete coupon code "${item.code}"?`)) return;
    const res = await api.deleteAdminPromoCode(item.id);
    if (res.success) {
      onActionMessage({
        type: "success",
        text: `Coupon code "${item.code}" deleted.`,
      });
      await onRefresh();
    } else {
      onActionMessage({
        type: "error",
        text: res.error?.message || "Failed to delete coupon code",
      });
    }
  }

  async function handleToggleActive(item: AdminPromoCodeItem) {
    const res = await api.updateAdminPromoCode(item.id, { isActive: !item.is_active });
    if (res.success) {
      await onRefresh();
    }
  }

  function handleCopy(item: AdminPromoCodeItem) {
    navigator.clipboard.writeText(item.code);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Admin Coupon Codes &amp; Expiration Controls
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Generate custom or automatic discount coupon codes with discount rates, max usage caps, and strict expiration periods.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Coupon Code</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Coupon Code</th>
                <th className="py-3.5 px-4 font-semibold">Campaign / Label</th>
                <th className="py-3.5 px-4 font-semibold">Discount Value</th>
                <th className="py-3.5 px-4 font-semibold">Usage</th>
                <th className="py-3.5 px-4 font-semibold">Expiration Period</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading coupon codes...
                  </td>
                </tr>
              ) : codesList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No admin coupon codes generated yet. Click &quot;Generate Coupon Code&quot; above.
                  </td>
                </tr>
              ) : (
                codesList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-purple-50 border border-purple-200 font-mono font-black text-purple-800 text-xs tracking-wider">
                          {item.code}
                        </span>
                        <button
                          onClick={() => handleCopy(item)}
                          className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                          title="Copy Code"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-900">{item.label}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                        <Tag className="w-3 h-3" />
                        <span>
                          {item.discount_flat_inr > 0
                            ? `₹${item.discount_flat_inr} OFF`
                            : `${item.discount_percent}% OFF`}
                        </span>
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-700">
                      {item.used_count} / {item.max_uses !== null ? item.max_uses : "∞"}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(item.expires_at).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })}
                        </span>
                      </div>
                      {item.isExpired && (
                        <span className="text-[10px] font-bold text-rose-600 block mt-0.5">
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {item.isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Expired
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                            item.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {item.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Paused</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer text-xs font-semibold"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                          title="Delete Code"
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

      {/* Generate / Edit Referral Code Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingCode ? `Edit Coupon Code: ${editingCode.code}` : "Generate Coupon Code"}
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
              {!editingCode && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Code (Leave blank to Auto-Generate)
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SCHOOL2026 (or leave blank)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono uppercase text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campaign / Partner Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. DPS School Partner Promo"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FLAT")}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  >
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {discountType === "PERCENT" ? "Discount (%)" : "Discount (₹ INR)"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={discountType === "PERCENT" ? 95 : 10000}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiration Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expiresAtDate}
                    onChange={(e) => setExpiresAtDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Uses (Optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="promoActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <label htmlFor="promoActiveCheck" className="text-xs font-medium text-slate-700">
                  Code is active immediately
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
                  <span>{saving ? "Saving..." : editingCode ? "Update Code" : "Generate Code"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
