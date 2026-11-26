"use client";

import React, { useEffect, useState } from "react";
import { api, ReferralStatsResponse } from "@/lib/api";
import {
  ArrowLeft,
  Gift,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  UserPlus,
  Users,
  Wallet,
  Sparkles,
  Loader2,
  MessageCircle,
  HelpCircle,
} from "lucide-react";

interface ReferAndEarnViewProps {
  onClose: () => void;
  onGoToPaywall?: () => void;
}

export function ReferAndEarnView({ onClose, onGoToPaywall }: ReferAndEarnViewProps) {
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReferralsList, setShowReferralsList] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await api.getMyReferralStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const shareUrl = stats?.referralCode
    ? `${origin}/register?ref=${stats.referralCode}`
    : `${origin}/register`;

  const maxRefs = stats?.settings.maxReferralsPerStudent ?? 5;
  const rewardVal = stats?.settings.referrerRewardValue ?? 800;
  const rewardType = stats?.settings.referrerRewardType ?? "FLAT";
  const refereeDiscountVal = stats?.settings.refereeDiscountValue ?? 200;
  const refereeDiscountType = stats?.settings.refereeDiscountType ?? "FLAT";
  const maxEarnable =
    stats?.settings.maxEarnableAmount || (rewardType === "FLAT" ? rewardVal * maxRefs : 4000);

  const refereeDiscountText =
    refereeDiscountType === "PERCENT" ? `${refereeDiscountVal}% OFF` : `₹${refereeDiscountVal} OFF`;
  const referrerRewardText =
    rewardType === "PERCENT" ? `${rewardVal}%` : `₹${rewardVal}`;

  function handleShareWhatsApp() {
    if (!stats?.referralCode) return;
    const message =
      `Hey! Join me on Education Game Platform 🎮✨\n` +
      `Register using my invite link to get *${refereeDiscountText}* on your class subscription!\n\n` +
      `👉 Register here: ${shareUrl}\n` +
      `(Referral Code: ${stats.referralCode})`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  async function handleShareOrCopyLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Education Game Platform!",
          text: `Register using my referral link & get ${refereeDiscountText}!`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  function handleCopyCode() {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(stats.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-purple-50 via-indigo-50/70 to-white text-slate-900">
      {/* Top Navigation Bar (Matching Reference Mockup) */}
      <header className="sticky top-0 z-20 h-16 px-4 sm:px-8 bg-white/80 backdrop-blur-md border-b border-purple-100 flex items-center justify-between">
        <button
          onClick={() => {
            if (showReferralsList) {
              setShowReferralsList(false);
            } else {
              onClose();
            }
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{showReferralsList ? "Back to Invite" : "Back to Dashboard"}</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowReferralsList(!showReferralsList)}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-xs ${
              showReferralsList
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white hover:bg-purple-50 text-slate-800 border-slate-300"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              Your Referrals ({stats?.totalInvited ?? 0}/{maxRefs})
            </span>
          </button>

          <button
            onClick={() => setShowReferralsList(false)}
            title="How Refer & Earn Works"
            className="p-2 rounded-full border border-slate-300 bg-white text-slate-600 hover:text-indigo-600 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="flex items-center gap-3 text-indigo-700 font-semibold text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading Refer &amp; Earn details...</span>
          </div>
        </div>
      ) : !stats?.settings.isEnabled ? (
        <div className="max-w-lg mx-auto mt-16 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-lg">
          <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Referral Program Paused</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            The student referral program is temporarily paused by your school administrator.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      ) : showReferralsList ? (
        /* SUB-VIEW: YOUR REFERRALS & WALLET HISTORY */
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-xs">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Friends Invited</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats.totalInvited}{" "}
                <span className="text-xs font-semibold text-slate-400">/ {maxRefs} limit</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-xs">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Successful Rewards</span>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {stats.totalConverted}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl p-5 shadow-md">
              <div className="text-xs font-semibold text-indigo-100 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-amber-300" />
                <span>Your Referral Wallet</span>
              </div>
              <div className="text-2xl font-black mt-1">₹{stats.rewardWalletBalance}</div>
              {stats.rewardWalletBalance > 0 && onGoToPaywall && (
                <button
                  onClick={onGoToPaywall}
                  className="mt-2 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                >
                  Use as Discount →
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Referred Friends Activity ({stats.history.length})
              </h3>
              <span className="text-xs text-slate-500">
                Total Earned: <strong className="text-emerald-700">₹{stats.totalEarned}</strong>
              </span>
            </div>

            {stats.history.length === 0 ? (
              <div className="p-10 text-center">
                <UserPlus className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No referrals yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Share your link with classmates so they get {refereeDiscountText} and you earn {referrerRewardText}!
                </p>
                <button
                  onClick={() => setShowReferralsList(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                >
                  Invite Friends Now
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.history.map((item) => (
                  <div
                    key={item.id}
                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.refereeName}</p>
                      <p className="text-[11px] text-slate-400">
                        Joined {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {item.status === "REWARDED" ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Rewarded +₹{item.rewardCredited}</span>
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          Registered (Awaiting Subscription)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      ) : (
        /* MAIN REFER & EARN HERO SCREEN (Matching Reference Image) */
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-10 text-center">
          {/* Hero Heading */}
          <h1 className="text-2xl sm:text-3xl font-black text-indigo-700 tracking-tight">
            Refer and Earn{" "}
            {rewardType === "FLAT" ? `₹${maxEarnable}` : `${rewardVal}% Rewards`}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-2">
            {referrerRewardText}/referral &nbsp;|&nbsp; Up to {maxRefs} referrals
          </p>

          {/* Festive Gift Box Illustration Card */}
          <div className="relative my-7 flex items-center justify-center">
            <div className="w-44 h-44 rounded-full bg-gradient-to-tr from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center shadow-inner relative">
              <div className="w-28 h-28 rounded-3xl bg-white/90 border border-purple-200 shadow-lg flex items-center justify-center transform -rotate-3">
                <Gift className="w-16 h-16 text-indigo-600" />
              </div>
              {/* Floating badges */}
              <div className="absolute -top-1 right-4 px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-md animate-bounce">
                ₹
              </div>
              <div className="absolute bottom-3 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white font-bold text-[10px] shadow-md">
                {refereeDiscountText} Friend
              </div>
            </div>
          </div>

          {/* Live Student Referral Counter Banner */}
          <div className="mb-6 inline-flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-2xl bg-white border border-purple-200 shadow-xs text-xs">
            <span className="font-bold text-slate-700">
              Referred:{" "}
              <span className="text-indigo-700 font-black">
                {stats.totalInvited} / {maxRefs}
              </span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-bold text-slate-700">
              Wallet Balance:{" "}
              <span className="text-emerald-600 font-black">₹{stats.rewardWalletBalance}</span>
            </span>
          </div>

          {/* How It Works Card (3 Steps matching Reference Mockup) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm text-left mb-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-extrabold text-slate-900">How it works?</h2>
              <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Both Earn Discounts!</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-indigo-600 mb-2">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Share invite</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Send your unique link</span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-indigo-600 mb-2">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Your friend signs up</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Gets {refereeDiscountText}</span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-emerald-600 mb-2">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Get {referrerRewardText} reward</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Use as discount</span>
              </div>
            </div>

            {/* Copyable Referral Code & Shareable URL Preview */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Your Invite Code
                </span>
                <span className="font-mono font-black text-indigo-700 text-sm tracking-wider">
                  {stats.referralCode}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Primary Share Actions (WhatsApp + Share Link matching Mockup) */}
          <div className="space-y-3">
            <button
              onClick={handleShareWhatsApp}
              className="w-full py-4 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white font-black text-sm tracking-wide uppercase shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>SHARE VIA WHATSAPP</span>
            </button>

            <button
              onClick={handleShareOrCopyLink}
              className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 font-bold text-xs tracking-wider uppercase shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">INVITE LINK COPIED TO CLIPBOARD!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>SHARE LINK</span>
                </>
              )}
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
