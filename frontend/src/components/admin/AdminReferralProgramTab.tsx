"use client";

import React, { useState } from "react";
import { api, ReferralSettingsModel, AdminReferralLedgerItem } from "@/lib/api";
import {
  Users,
  Settings,
  CheckCircle2,
  Gift,
  Sparkles,
  Wallet,
  Save,
  Clock,
} from "lucide-react";

interface AdminReferralProgramTabProps {
  settings: ReferralSettingsModel | null;
  ledger: AdminReferralLedgerItem[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onActionMessage: (msg: { type: "success" | "error"; text: string }) => void;
}

export function AdminReferralProgramTab({
  settings,
  ledger,
  loading,
  onRefresh,
  onActionMessage,
}: AdminReferralProgramTabProps) {
  const [isEnabled, setIsEnabled] = useState<boolean>(settings?.is_enabled ?? true);
  const [maxRefs, setMaxRefs] = useState<number>(settings?.max_referrals_per_student ?? 5);
  const [refereeType, setRefereeType] = useState<"FLAT" | "PERCENT">(
    settings?.referee_discount_type ?? "FLAT"
  );
  const [refereeValue, setRefereeValue] = useState<number>(
    settings?.referee_discount_value ?? 200
  );
  const [referrerType, setReferrerType] = useState<"FLAT" | "PERCENT">(
    settings?.referrer_reward_type ?? "FLAT"
  );
  const [referrerValue, setReferrerValue] = useState<number>(
    settings?.referrer_reward_value ?? 800
  );
  const [rewardTrigger, setRewardTrigger] = useState<"ON_SUBSCRIPTION" | "ON_SIGNUP">(
    settings?.reward_trigger ?? "ON_SUBSCRIPTION"
  );
  const [saving, setSaving] = useState(false);

  // Sync local state when settings load
  React.useEffect(() => {
    if (!settings) return;
    setIsEnabled(settings.is_enabled);
    setMaxRefs(settings.max_referrals_per_student);
    setRefereeType(settings.referee_discount_type);
    setRefereeValue(settings.referee_discount_value);
    setReferrerType(settings.referrer_reward_type);
    setReferrerValue(settings.referrer_reward_value);
    setRewardTrigger(settings.reward_trigger);
  }, [settings]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await api.updateAdminReferralSettings({
      isEnabled,
      maxReferralsPerStudent: Number(maxRefs),
      refereeDiscountType: refereeType,
      refereeDiscountValue: Number(refereeValue),
      referrerRewardType: referrerType,
      referrerRewardValue: Number(referrerValue),
      rewardTrigger,
    });
    setSaving(false);

    if (res.success) {
      onActionMessage({
        type: "success",
        text: "Refer & Earn program rules updated! Student dashboards reflect the changes immediately.",
      });
      await onRefresh();
    } else {
      onActionMessage({
        type: "error",
        text: res.error?.message || "Failed to update referral settings",
      });
    }
  }

  const maxPotentialEarn = referrerType === "FLAT" ? referrerValue * maxRefs : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Student Refer &amp; Earn Program Controls
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Control how many friends each student can refer, how much discount the invited friend gets, and how much reward/discount the sender earns.
        </p>
      </div>

      {/* Program Configuration Form */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Global Referral Program Rules</h2>
              <p className="text-[11px] text-slate-500">
                Applies immediately to all student shareable invite links
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600"
            />
            <span className="text-xs font-bold text-slate-800">
              {isEnabled ? "Program Enabled" : "Program Paused"}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Max Referrals Limit */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>1. Max Referrals Allowed</span>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Max friends a student can refer
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                required
                value={maxRefs}
                onChange={(e) => setMaxRefs(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Reward Release Trigger
              </label>
              <select
                value={rewardTrigger}
                onChange={(e) => setRewardTrigger(e.target.value as "ON_SUBSCRIPTION" | "ON_SIGNUP")}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="ON_SUBSCRIPTION">When Friend Subscribes (Recommended)</option>
                <option value="ON_SIGNUP">Immediately on Friend Signup</option>
              </select>
            </div>
          </div>

          {/* 2. New User (Referee) Discount */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900">
              <Gift className="w-4 h-4 text-emerald-600" />
              <span>2. New User (Friend) Discount</span>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                Discount Type
              </label>
              <select
                value={refereeType}
                onChange={(e) => setRefereeType(e.target.value as "FLAT" | "PERCENT")}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="FLAT">Flat Discount (₹ INR)</option>
                <option value="PERCENT">Percentage Discount (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                {refereeType === "FLAT" ? "Discount Amount (₹)" : "Discount Percent (%)"}
              </label>
              <input
                type="number"
                min={0}
                max={refereeType === "PERCENT" ? 95 : 50000}
                required
                value={refereeValue}
                onChange={(e) => setRefereeValue(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-black text-emerald-900"
              />
            </div>
          </div>

          {/* 3. Sender (Referrer) Reward / Discount */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-purple-900">
              <Wallet className="w-4 h-4 text-purple-600" />
              <span>3. Sender (Referrer) Reward</span>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-purple-800 mb-1">
                Reward Type
              </label>
              <select
                value={referrerType}
                onChange={(e) => setReferrerType(e.target.value as "FLAT" | "PERCENT")}
                className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="FLAT">Flat Wallet Discount (₹ INR)</option>
                <option value="PERCENT">Percentage of Plan (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-purple-800 mb-1">
                {referrerType === "FLAT" ? "Wallet Credit per Referral (₹)" : "Credit Percent (%)"}
              </label>
              <input
                type="number"
                min={0}
                max={referrerType === "PERCENT" ? 100 : 50000}
                required
                value={referrerValue}
                onChange={(e) => setReferrerValue(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-sm font-black text-purple-900"
              />
            </div>
          </div>
        </div>

        {/* Live Student UI Preview Banner + Save Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-indigo-800 bg-indigo-50 px-3.5 py-2 rounded-xl border border-indigo-100">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Student Dashboard Banner Preview:{" "}
              <strong>
                Refer and Earn {maxPotentialEarn !== null ? `₹${maxPotentialEarn}` : `${referrerValue}%`}
              </strong>{" "}
              ({referrerType === "FLAT" ? `₹${referrerValue}` : `${referrerValue}%`}/referral • Up to {maxRefs} referrals)
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Rules..." : "Save Referral Rules"}</span>
          </button>
        </div>
      </form>

      {/* Referral Attribution Ledger */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Student Referral Ledger</h3>
            <p className="text-[11px] text-slate-500">
              Live tracking of who invited whom via shareable links
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            Total Records: {ledger.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Sender (Referrer)</th>
                <th className="py-3 px-4 font-semibold">New Friend (Referee)</th>
                <th className="py-3 px-4 font-semibold">Code Used</th>
                <th className="py-3 px-4 font-semibold">Friend Discount</th>
                <th className="py-3 px-4 font-semibold">Sender Reward</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading referral ledger...
                  </td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No student referrals recorded yet.
                  </td>
                </tr>
              ) : (
                ledger.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{row.referrerName}</div>
                      <div className="text-[10px] text-slate-400">{row.referrerEmail}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{row.refereeName}</div>
                      <div className="text-[10px] text-slate-400">{row.refereeEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                      {row.referralCode}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      ₹{row.discountGiven}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      +₹{row.rewardCredited}
                    </td>
                    <td className="py-3.5 px-4">
                      {row.status === "REWARDED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Rewarded</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Registered</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
