import http from "http";
import { db, pool } from "../core/database/connection";
import { users, referral_settings } from "../core/database/schema/index";
import { eq } from "drizzle-orm";
import { hashPassword } from "../core/security/argon2";

function httpReq(
  path: string,
  method: string,
  body?: unknown,
  cookie?: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders; json: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 4000,
        path: `/api/v1${path}`,
        method,
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode || 500,
              headers: res.headers,
              json: JSON.parse(data),
            });
          } catch {
            resolve({
              status: res.statusCode || 500,
              headers: res.headers,
              json: { raw: data },
            });
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runE2ETest() {
  console.log("=========================================================");
  console.log("🧪 E2E VERIFICATION: DEMO, PAYWALL, TRACKING & REFERRALS");
  console.log("=========================================================");

  const ts = Date.now();
  const testEmail = `e2e_monetize_${ts}@test.local`;
  const referrerEmail = `e2e_referrer_${ts}@test.local`;
  const password = "TestPassword123!";
  const passwordHash = await hashPassword(password);

  // 1. Insert Referrer & Test Student directly (bypassing OTP email send)
  const [refRes] = await db.insert(users).values({
    email: referrerEmail,
    password_hash: passwordHash,
    full_name: "Referrer Friend",
    mobile_number: "9999999991",
    class_grade: "Class 1",
    school_name: "Test Academy",
    city: "Delhi",
    state: "Delhi",
    role: "STUDENT",
    referral_code: `REF${ts}`.slice(0, 14).toUpperCase(),
    is_active: true,
    email_verified_at: new Date(),
  });
  const referrerId = Number(refRes.insertId);
  const [referrerRow] = await db.select().from(users).where(eq(users.id, referrerId));

  const [stuRes] = await db.insert(users).values({
    email: testEmail,
    password_hash: passwordHash,
    full_name: "Test Student",
    mobile_number: "9999999992",
    class_grade: "Class 1",
    school_name: "Test Academy",
    city: "Delhi",
    state: "Delhi",
    role: "STUDENT",
    referral_code: `STU${ts}`.slice(0, 14).toUpperCase(),
    is_active: true,
    email_verified_at: new Date(),
  });
  const studentId = Number(stuRes.insertId);
  const [studentRow] = await db.select().from(users).where(eq(users.id, studentId));

  try {
    // 2. Login as Test Student
    console.log("1️⃣ Logging in test student...");
    const login = await httpReq("/auth/login", "POST", {
      email: testEmail,
      password,
      deviceLabel: "E2E Desktop",
    });
    if (login.status !== 200) throw new Error("Login failed: " + JSON.stringify(login.json));
    const cookie = (login.headers["set-cookie"] || [])
      .map((c) => c.split(";")[0])
      .join("; ");
    console.log("   ✅ Student logged in & device bound");

    // 3. Verify initial journey & tracking status (Stage 1 = Demo)
    console.log("2️⃣ Checking initial tracking status (before Demo)...");
    const journeyInit = await httpReq("/activities/my-journey", "GET", undefined, cookie);
    if (!journeyInit.json.data?.hasPackage) {
      throw new Error("Expected Class 1 activity package to exist");
    }
    const trackInit = await httpReq("/tracking/user-activity-status", "GET", undefined, cookie);
    if (
      trackInit.status !== 200 ||
      trackInit.json.data.access.hasActiveSubscription !== false ||
      trackInit.json.data.activity.canProceed !== true ||
      trackInit.json.data.activity.isDemoCompleted !== false
    ) {
      throw new Error("Unexpected initial tracking status: " + JSON.stringify(trackInit.json));
    }
    console.log("   ✅ Demo mode verified: canProceed=true, hasActiveSubscription=false");

    // 4. Complete Demo Stage 1
    console.log("3️⃣ Completing Demo Stage 1...");
    const adv1 = await httpReq(
      "/activities/my-journey/checkpoint",
      "POST",
      { completedCheckpoint: 1, nextCheckpoint: 2, stateData: { demoCleared: true } },
      cookie
    );
    if (
      adv1.status !== 200 ||
      adv1.json.data.demoCompleted !== true ||
      adv1.json.data.subscriptionRequired !== true
    ) {
      throw new Error("Expected subscriptionRequired=true after Stage 1: " + JSON.stringify(adv1.json));
    }
    console.log("   ✅ Stage 1 completed! Backend flagged subscriptionRequired=true");

    // 5. Verify Tracking API now blocks progression
    console.log("4️⃣ Verifying Tracking API blocks Stage 2 without subscription...");
    const trackBlocked = await httpReq("/tracking/user-activity-status", "GET", undefined, cookie);
    if (
      trackBlocked.json.data.activity.canProceed !== false ||
      trackBlocked.json.data.activity.lockReason !== "SUBSCRIPTION_REQUIRED"
    ) {
      throw new Error("Expected SUBSCRIPTION_REQUIRED lock: " + JSON.stringify(trackBlocked.json));
    }
    console.log("   ✅ Tracking API returned lockReason='SUBSCRIPTION_REQUIRED'");

    // 6. Verify attempting Stage 2 API directly throws 403 Forbidden
    const adv2Fail = await httpReq(
      "/activities/my-journey/checkpoint",
      "POST",
      { completedCheckpoint: 2, nextCheckpoint: 3 },
      cookie
    );
    if (adv2Fail.status !== 403) {
      throw new Error(`Expected 403 Forbidden for Stage 2 without sub, got ${adv2Fail.status}`);
    }
    console.log("   ✅ Direct Stage 2 API bypass blocked with HTTP 403 Forbidden");

    // 7. Test Self-Referral Rejection & Valid Referral Acceptance
    console.log("5️⃣ Testing Referral Validation (Self-referral block & valid friend code)...");
    const selfRef = await httpReq(
      "/referrals/validate",
      "POST",
      { code: studentRow.referral_code, planPriceInr: 999 },
      cookie
    );
    if (selfRef.status === 200) throw new Error("Self-referral should have been blocked!");
    console.log("   ✅ Self-referral rejected cleanly");

    const [activeRefSettings] = await db.select().from(referral_settings).limit(1);
    const expectedDiscount =
      activeRefSettings?.referee_discount_type === "PERCENT"
        ? Math.round((999 * (activeRefSettings?.referee_discount_value || 0)) / 100)
        : activeRefSettings?.referee_discount_value || 200;
    const expectedReward =
      activeRefSettings?.referrer_reward_type === "PERCENT"
        ? Math.round((999 * (activeRefSettings?.referrer_reward_value || 0)) / 100)
        : activeRefSettings?.referrer_reward_value || 100;

    const validRef = await httpReq(
      "/referrals/validate",
      "POST",
      { code: referrerRow.referral_code, planPriceInr: 999 },
      cookie
    );
    if (validRef.status !== 200 || validRef.json.data.discountAmount !== expectedDiscount) {
      throw new Error("Valid referral failed: " + JSON.stringify(validRef.json));
    }
    console.log(`   ✅ Valid referral applied! Discount: ₹${validRef.json.data.discountAmount}`);

    // 8. Create Order & Verify Payment
    console.log("6️⃣ Creating Order & Verifying Sandbox Payment...");
    const orderRes = await httpReq(
      "/payments/create-order",
      "POST",
      { planCode: "ANNUAL_CLASS_PASS", referralCode: referrerRow.referral_code },
      cookie
    );
    if (orderRes.status !== 201 || orderRes.json.data.finalAmount !== 999 - expectedDiscount) {
      throw new Error("Order creation failed or wrong discount: " + JSON.stringify(orderRes.json));
    }
    console.log(`   ✅ Order created: ₹${orderRes.json.data.baseAmount} - ₹${orderRes.json.data.discountAmount} = ₹${orderRes.json.data.finalAmount}`);

    const gatewayOrderId = orderRes.json.data.gatewayOrderId;
    const payId = `pay_e2e_${ts}`;
    const verifyRes = await httpReq(
      "/payments/verify",
      "POST",
      {
        gatewayOrderId,
        gatewayPaymentId: payId,
        signature: `sandbox_sig_${gatewayOrderId}_${payId}`,
      },
      cookie
    );
    if (verifyRes.status !== 200 || !verifyRes.json.data.unlocked) {
      throw new Error("Payment verification failed: " + JSON.stringify(verifyRes.json));
    }
    console.log("   ✅ Payment verified & subscription activated!");

    // 9. Verify Referrer Wallet Credited (+expectedReward)
    const [updatedReferrer] = await db.select().from(users).where(eq(users.id, referrerId));
    if (updatedReferrer.reward_wallet_balance !== expectedReward) {
      throw new Error(`Expected referrer wallet balance ${expectedReward}, got ${updatedReferrer.reward_wallet_balance}`);
    }
    console.log(`   ✅ Referrer wallet credited with ₹${expectedReward}!`);

    // 10. Verify Tracking API now unlocks Stage 2 and Stage 2 advancement succeeds
    console.log("7️⃣ Verifying Stage 2 unlocks and advances cleanly...");
    const trackUnlocked = await httpReq("/tracking/user-activity-status", "GET", undefined, cookie);
    if (
      !trackUnlocked.json.data.access.hasActiveSubscription ||
      !trackUnlocked.json.data.activity.canProceed
    ) {
      throw new Error("Expected unlocked status after payment: " + JSON.stringify(trackUnlocked.json));
    }
    const adv2Success = await httpReq(
      "/activities/my-journey/checkpoint",
      "POST",
      { completedCheckpoint: 2, nextCheckpoint: 3 },
      cookie
    );
    if (adv2Success.status !== 200 || adv2Success.json.data.subscriptionRequired !== false) {
      throw new Error("Stage 2 advancement failed after payment: " + JSON.stringify(adv2Success.json));
    }
    console.log("   ✅ Stage 2 unlocked and advanced cleanly after subscription!");
    console.log("=========================================================");
    console.log("🎉 ALL E2E TESTS PASSED SUCCESSFULLY!");
    console.log("=========================================================");
  } finally {
    // Cleanup temporary test users (cascades to sessions, devices, orders, subs, referrals, tracking)
    await db.delete(users).where(eq(users.id, studentId));
    await db.delete(users).where(eq(users.id, referrerId));
    await pool.end();
  }
}

runE2ETest().catch((err) => {
  console.error("❌ E2E Test Failed:", err);
  process.exit(1);
});
