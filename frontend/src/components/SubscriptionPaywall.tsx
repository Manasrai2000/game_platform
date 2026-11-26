"use client";

import React, { useEffect, useState } from "react";
import { api, SubscriptionPlan, CreateOrderResponse } from "@/lib/api";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Gift,
  ShieldCheck,
  Trophy,
  CreditCard,
  Loader2,
  Tag,
  AlertCircle,
  Copy,
  Check,
  Smartphone,
  Lock,
} from "lucide-react";

interface SubscriptionPaywallProps {
  studentName: string;
  classGrade: string;
  isDemoCompleted: boolean;
  myReferralCode?: string | null;
  referredByCode?: string | null;
  rewardWalletBalance?: number;
  onClose: () => void;
  onSubscriptionActivated: () => void;
}

function loadRazorpayCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function SubscriptionPaywall({
  studentName,
  classGrade,
  isDemoCompleted,
  myReferralCode,
  referredByCode,
  rewardWalletBalance = 0,
  onClose,
  onSubscriptionActivated,
}: SubscriptionPaywallProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>("ANNUAL_CLASS_PASS");
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Referral code input & wallet toggle
  const [referralInput, setReferralInput] = useState(referredByCode || "");
  const [useWallet, setUseWallet] = useState(rewardWalletBalance > 0);
  const [validatingRef, setValidatingRef] = useState(false);
  const [appliedReferral, setAppliedReferral] = useState<{
    code: string;
    referrerName: string;
    discountAmount: number;
    discountPercent: number;
    discountFlatInr: number;
  } | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);

  // Payment / Checkout state
  const [processingOrder, setProcessingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [sandboxOrder, setSandboxOrder] = useState<CreateOrderResponse | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Copy referral code helper
  const [copiedOwnCode, setCopiedOwnCode] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingPlans(true);
      const res = await api.getPlans();
      if (res.success && res.data?.plans) {
        setPlans(res.data.plans);
        if (res.data.plans.length > 0) {
          setSelectedPlanCode(res.data.plans[0].code);
          // Auto-apply referredByCode if student registered via a shareable referral link
          if (referredByCode) {
            const valRes = await api.validateReferral(
              referredByCode,
              res.data.plans[0].price_inr
            );
            if (valRes.success && valRes.data) {
              setAppliedReferral({
                code: valRes.data.referralCode,
                referrerName: valRes.data.referrerName,
                discountAmount: valRes.data.discountAmount,
                discountPercent: valRes.data.discountPercent,
                discountFlatInr: valRes.data.discountFlatInr || 0,
              });
            }
          }
        }
      }
      setLoadingPlans(false);
    }
    load();
    api.trackEvent("PAYWALL_MODAL_VIEWED", null, { isDemoCompleted });
  }, [isDemoCompleted, referredByCode]);

  const selectedPlan = plans.find((p) => p.code === selectedPlanCode) || plans[0];

  const basePrice = selectedPlan ? selectedPlan.price_inr : 999;
  const discountAmount = appliedReferral
    ? appliedReferral.discountFlatInr > 0
      ? Math.min(appliedReferral.discountFlatInr, basePrice - 1)
      : Math.round((basePrice * appliedReferral.discountPercent) / 100)
    : 0;
  const amountAfterCode = Math.max(basePrice - discountAmount, 1);
  const walletDiscount =
    useWallet && rewardWalletBalance > 0 && amountAfterCode > 1
      ? Math.min(rewardWalletBalance, amountAfterCode - 1)
      : 0;
  const finalAmount = Math.max(amountAfterCode - walletDiscount, 1);

  async function handleApplyReferral() {
    if (!referralInput.trim()) return;
    setValidatingRef(true);
    setReferralError(null);
    const res = await api.validateReferral(referralInput.trim(), basePrice);
    if (res.success && res.data) {
      setAppliedReferral({
        code: res.data.referralCode,
        referrerName: res.data.referrerName,
        discountAmount: res.data.discountAmount,
        discountPercent: res.data.discountPercent,
        discountFlatInr: res.data.discountFlatInr || 0,
      });
      api.trackEvent("REFERRAL_APPLIED", null, { code: res.data.referralCode });
    } else {
      setAppliedReferral(null);
      setReferralError(res.error?.message || "Invalid referral code");
    }
    setValidatingRef(false);
  }

  async function handleProceedToPay() {
    if (!selectedPlan) return;
    setProcessingOrder(true);
    setCheckoutError(null);

    const res = await api.createOrder(
      selectedPlan.code,
      appliedReferral ? appliedReferral.code : undefined,
      useWallet
    );

    if (!res.success || !res.data) {
      setCheckoutError(res.error?.message || "Failed to initialize payment order");
      setProcessingOrder(false);
      return;
    }

    const orderData = res.data;
    if (orderData.gatewayMode === "SANDBOX" || !orderData.razorpayKeyId) {
      setSandboxOrder(orderData);
      setProcessingOrder(false);
      return;
    }

    // Real Razorpay Standard Checkout Flow
    const loaded = await loadRazorpayCheckoutScript();
    const RazorpayConstructor = (window as unknown as { Razorpay?: any }).Razorpay;

    if (!loaded || !RazorpayConstructor) {
      setCheckoutError("Unable to load Razorpay Checkout. Please check your internet connection.");
      setProcessingOrder(false);
      return;
    }

    const rzpOptions = {
      key: orderData.razorpayKeyId,
      amount: orderData.finalAmount * 100, // in paise
      currency: orderData.currency || "INR",
      name: "Education Game Platform",
      description: `${orderData.plan.title} (${classGrade})`,
      order_id: orderData.gatewayOrderId,
      prefill: {
        name: studentName,
      },
      theme: {
        color: "#4f46e5",
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setVerifyingPayment(true);
        setCheckoutError(null);
        const verifyRes = await api.verifyPayment(
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature
        );

        if (verifyRes.success && verifyRes.data?.unlocked) {
          setPaymentSuccess(true);
          setProcessingOrder(false);
          setTimeout(() => {
            onSubscriptionActivated();
          }, 1800);
        } else {
          setCheckoutError(verifyRes.error?.message || "Payment verification failed");
          setProcessingOrder(false);
        }
        setVerifyingPayment(false);
      },
      modal: {
        ondismiss: () => {
          setProcessingOrder(false);
        },
      },
    };

    const rzpInstance = new RazorpayConstructor(rzpOptions);
    rzpInstance.on("payment.failed", (errResp: { error?: { description?: string } }) => {
      setCheckoutError(
        errResp?.error?.description || "Payment was unsuccessful. Please try again."
      );
      setProcessingOrder(false);
    });
    rzpInstance.open();
  }

  async function handleCompleteSandboxPayment(method: "UPI" | "CARD") {
    if (!sandboxOrder) return;
    setVerifyingPayment(true);
    setCheckoutError(null);

    const simulatedPaymentId = `pay_${method.toLowerCase()}_${Date.now()}`;
    const simulatedSignature = `sandbox_sig_${sandboxOrder.gatewayOrderId}_${simulatedPaymentId}`;

    const res = await api.verifyPayment(
      sandboxOrder.gatewayOrderId,
      simulatedPaymentId,
      simulatedSignature
    );

    if (res.success && res.data?.unlocked) {
      setPaymentSuccess(true);
      setSandboxOrder(null);
      setTimeout(() => {
        onSubscriptionActivated();
      }, 1800);
    } else {
      setCheckoutError(res.error?.message || "Payment verification failed");
    }
    setVerifyingPayment(false);
  }

  function handleCopyMyCode() {
    if (!myReferralCode) return;
    navigator.clipboard.writeText(myReferralCode);
    setCopiedOwnCode(true);
    setTimeout(() => setCopiedOwnCode(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 h-16 px-4 sm:px-8 bg-slate-950/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer border border-white/10"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-300" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>256-Bit Encrypted Checkout</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {paymentSuccess ? (
          <div className="max-w-lg mx-auto bg-white/10 backdrop-blur-xl border border-emerald-400/30 rounded-3xl p-8 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Subscription Activated! 🎉
            </h2>
            <p className="text-sm text-indigo-100 mb-6">
              Welcome to Premium Learning, {studentName}! All stages for {classGrade} are now unlocked.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Unlocking your next stage...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Hero Banner */}
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold tracking-wide uppercase mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isDemoCompleted
                    ? "🎉 Congratulations! Demo Activity Completed"
                    : "Upgrade to Full Curriculum Access"}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-3">
                Unlock Complete <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">{classGrade}</span> Adventures
              </h1>
              <p className="text-sm sm:text-base text-indigo-100/80 max-w-2xl mx-auto">
                {isDemoCompleted
                  ? `Great job completing the Demo Stage, ${studentName}! Unlock all premium stages, interactive puzzles, and earn your official Certificate of Mastery.`
                  : `Get unlimited access to all curriculum checkpoints, auto-resume progress tracking, and rewards for ${classGrade}.`}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT SIDE: Benefits & Student's Own Referral Code */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-7 space-y-5">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>What&apos;s Included in Premium</span>
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">All Curriculum Stages Unlocked</p>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Seamless access to Stage 2, Stage 3, and all upcoming interactive challenges.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Auto-Resume & Secure Device Lock</p>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Your progress is safely saved at every checkpoint with strict single-device protection.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">100% Ad-Free Safe Workspace</p>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Distraction-free educational environment built specifically for students.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Invite Banner */}
                {myReferralCode && (
                  <div className="bg-gradient-to-br from-indigo-600/30 to-purple-600/30 backdrop-blur-xl border border-indigo-400/30 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-indigo-200 font-bold text-xs uppercase tracking-wider">
                        <Gift className="w-4 h-4 text-amber-300" />
                        <span>Refer & Earn Rewards</span>
                      </div>
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        Wallet: ₹{rewardWalletBalance}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mb-3 leading-relaxed">
                      Share your personal referral code with classmates! They get <strong>10% instant discount</strong> and you earn <strong>₹100 wallet credit</strong> per subscription.
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-white/15 font-mono text-sm font-bold tracking-widest text-amber-300">
                        {myReferralCode}
                      </div>
                      <button
                        onClick={handleCopyMyCode}
                        className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-indigo-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copiedOwnCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT SIDE: Plan Selection, Referral Input & Checkout */}
              <div className="lg:col-span-7 bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl">
                <h2 className="text-xl font-extrabold text-slate-900 mb-1">
                  Select Your Subscription Plan
                </h2>
                <p className="text-xs text-slate-500 mb-6">
                  Instant activation right after payment verification
                </p>

                {loadingPlans ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    <span className="text-sm font-medium">Loading available plans...</span>
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    {plans.map((plan) => {
                      const isSelected = plan.code === selectedPlanCode;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlanCode(plan.code)}
                          className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-4 ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50/70 ring-4 ring-indigo-600/10"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm sm:text-base font-extrabold text-slate-900">
                                  {plan.title}
                                </span>
                                {plan.badge && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                    {plan.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xl sm:text-2xl font-black text-slate-900">
                              ₹{plan.price_inr}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-400">
                              {plan.duration_days} Days
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Referral Code Input */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6">
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Have a Coupon Code or Friend&apos;s Referral Code?</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={referralInput}
                      onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                      placeholder="e.g. SCHOOL2026 or MANAS112"
                      disabled={!!appliedReferral || validatingRef}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold uppercase tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    {appliedReferral ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedReferral(null);
                          setReferralInput("");
                          setReferralError(null);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyReferral}
                        disabled={validatingRef || !referralInput.trim()}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        {validatingRef ? "Checking..." : "Apply"}
                      </button>
                    )}
                  </div>

                  {appliedReferral && (
                    <div className="mt-2.5 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Applied!{" "}
                        {appliedReferral.discountFlatInr > 0
                          ? `Flat ₹${appliedReferral.discountFlatInr} OFF`
                          : `${appliedReferral.discountPercent}% Discount`}{" "}
                        (-₹{discountAmount}) via {appliedReferral.referrerName}
                      </span>
                    </div>
                  )}

                  {referralError && (
                    <div className="mt-2.5 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>{referralError}</span>
                    </div>
                  )}
                </div>

                {/* Wallet Balance Redemption Toggle */}
                {rewardWalletBalance > 0 && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 mb-4 flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-emerald-900">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(e) => setUseWallet(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span>Use Referral Wallet Balance (Available: ₹{rewardWalletBalance})</span>
                    </label>
                    {walletDiscount > 0 && (
                      <span className="text-xs font-extrabold text-emerald-700">
                        -₹{walletDiscount}
                      </span>
                    )}
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="space-y-2 border-t border-slate-100 pt-4 mb-6 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Plan Subtotal</span>
                    <span className="font-semibold">₹{basePrice}</span>
                  </div>
                  {appliedReferral && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Code Discount ({appliedReferral.code})</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}
                  {walletDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Referral Wallet Redeemed</span>
                      <span>-₹{walletDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                    <span>Total Payable</span>
                    <span>₹{finalAmount}</span>
                  </div>
                </div>

                {checkoutError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                <button
                  onClick={handleProceedToPay}
                  disabled={processingOrder || loadingPlans || !selectedPlan}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                >
                  {processingOrder ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Secure Order...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Pay ₹{finalAmount} & Unlock Full Journey</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* SANDBOX / GATEWAY PAYMENT SIMULATOR MODAL */}
      {sandboxOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {sandboxOrder.gatewayMode} CHECKOUT
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  Education Game Platform
                </h3>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-indigo-600">
                  ₹{sandboxOrder.finalAmount}
                </div>
                <div className="text-[10px] text-slate-400">
                  Order #{sandboxOrder.orderId}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5">
              Select a payment method to complete your <strong>{sandboxOrder.plan.title}</strong> purchase and unlock all stages immediately:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleCompleteSandboxPayment("UPI")}
                disabled={verifyingPayment}
                className="w-full p-4 rounded-2xl border-2 border-indigo-600 bg-indigo-50/70 hover:bg-indigo-100/70 text-left flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      UPI (GPay / PhonePe / Paytm)
                    </div>
                    <div className="text-[11px] text-slate-500">Instant verified payment</div>
                  </div>
                </div>
                {verifyingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <span className="text-xs font-bold text-indigo-600">Pay Now →</span>
                )}
              </button>

              <button
                onClick={() => handleCompleteSandboxPayment("CARD")}
                disabled={verifyingPayment}
                className="w-full p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-left flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Credit / Debit Card / NetBanking
                    </div>
                    <div className="text-[11px] text-slate-500">Visa, Mastercard, RuPay</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600">Pay Now →</span>
              </button>
            </div>

            <button
              onClick={() => setSandboxOrder(null)}
              disabled={verifyingPayment}
              className="w-full mt-5 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
