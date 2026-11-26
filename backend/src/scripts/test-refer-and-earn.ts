import http from "http";
import { db, pool } from "../core/database/connection";
import { users } from "../core/database/schema/index";
import { eq } from "drizzle-orm";
import { hashPassword } from "../core/security/argon2";
import { referralsService } from "../modules/referrals/referrals-service";

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

async function runReferAndEarnE2E() {
  console.log("===============================================================");
  console.log("🧪 E2E VERIFICATION: REFER & EARN + ADMIN CONTROLS + WALLET");
  console.log("===============================================================");

  const ts = Date.now();
  const password = "ReferTestPassword123!";
  const passwordHash = await hashPassword(password);

  // Create Admin, Sender (Referrer), & New Friend (Referee)
  const [adminIns] = await db.insert(users).values({
    email: `ref_admin_${ts}@test.local`,
    password_hash: passwordHash,
    full_name: "Ref Admin",
    mobile_number: "9999999971",
    class_grade: "Class 1",
    school_name: "Admin School",
    role: "ADMIN",
    is_active: true,
    email_verified_at: new Date(),
  });
  const adminId = Number(adminIns.insertId);

  const senderRefCode = `SNDR${ts}`.slice(0, 12).toUpperCase();
  const [senderIns] = await db.insert(users).values({
    email: `ref_sender_${ts}@test.local`,
    password_hash: passwordHash,
    full_name: "Sender Student",
    mobile_number: "9999999972",
    class_grade: "Class 1",
    school_name: "Demo School",
    role: "STUDENT",
    referral_code: senderRefCode,
    is_active: true,
    email_verified_at: new Date(),
  });
  const senderId = Number(senderIns.insertId);

  const [friendIns] = await db.insert(users).values({
    email: `ref_friend_${ts}@test.local`,
    password_hash: passwordHash,
    full_name: "Friend Student",
    mobile_number: "9999999973",
    class_grade: "Class 1",
    school_name: "Demo School",
    role: "STUDENT",
    referral_code: `FRND${ts}`.slice(0, 12).toUpperCase(),
    referred_by_code: senderRefCode,
    is_active: true,
    email_verified_at: new Date(),
  });
  const friendId = Number(friendIns.insertId);

  try {
    // Login Admin, Sender, and Friend
    const adminLogin = await httpReq("/auth/login", "POST", {
      email: `ref_admin_${ts}@test.local`,
      password,
      deviceLabel: "Admin Browser",
    });
    const adminCookie = (adminLogin.headers["set-cookie"] || [])
      .map((c) => c.split(";")[0])
      .join("; ");

    const senderLogin = await httpReq("/auth/login", "POST", {
      email: `ref_sender_${ts}@test.local`,
      password,
      deviceLabel: "Sender Browser",
    });
    const senderCookie = (senderLogin.headers["set-cookie"] || [])
      .map((c) => c.split(";")[0])
      .join("; ");

    const friendLogin = await httpReq("/auth/login", "POST", {
      email: `ref_friend_${ts}@test.local`,
      password,
      deviceLabel: "Friend Browser",
    });
    const friendCookie = (friendLogin.headers["set-cookie"] || [])
      .map((c) => c.split(";")[0])
      .join("; ");

    // 1. Admin configures Refer & Earn rules (Max 5, Friend ₹200 OFF, Sender ₹800 Wallet)
    console.log("1️⃣ Admin configuring Refer & Earn rules...");
    const updateRes = await httpReq(
      "/referrals/admin/settings",
      "PUT",
      {
        isEnabled: true,
        maxReferralsPerStudent: 5,
        refereeDiscountType: "FLAT",
        refereeDiscountValue: 200,
        referrerRewardType: "FLAT",
        referrerRewardValue: 800,
        rewardTrigger: "ON_SUBSCRIPTION",
      },
      adminCookie
    );
    if (updateRes.status !== 200 || updateRes.json.data.settings.referrer_reward_value !== 800) {
      throw new Error("Admin settings update failed: " + JSON.stringify(updateRes.json));
    }
    console.log("   ✅ Admin rules saved: Max 5 | Friend ₹200 OFF | Sender ₹800 Credit");

    // 2. Public invite URL lookup (/register?ref=CODE)
    console.log("2️⃣ Testing public invite URL validation...");
    const pubInfo = await httpReq(`/referrals/public-info/${senderRefCode}`, "GET");
    if (
      pubInfo.status !== 200 ||
      !pubInfo.json.data.valid ||
      pubInfo.json.data.discountValue !== 200
    ) {
      throw new Error("Public referral info failed: " + JSON.stringify(pubInfo.json));
    }
    console.log(
      `   ✅ Public invite verified: ${pubInfo.json.data.referrerName} -> ₹${pubInfo.json.data.discountValue} OFF`
    );

    // 3. Attribute registration referral & check Sender stats before subscription
    console.log("3️⃣ Attributing friend registration & checking Sender stats...");
    await referralsService.attributeRegistrationReferral(friendId, senderRefCode);
    const statsBefore = await httpReq("/referrals/my-stats", "GET", undefined, senderCookie);
    if (
      statsBefore.status !== 200 ||
      statsBefore.json.data.totalInvited !== 1 ||
      statsBefore.json.data.totalConverted !== 0 ||
      statsBefore.json.data.rewardWalletBalance !== 0
    ) {
      throw new Error("Sender stats before purchase unexpected: " + JSON.stringify(statsBefore.json));
    }
    console.log("   ✅ Sender sees friend as REGISTERED (1/5 invited, ₹0 wallet pending sub)");

    // 4. Friend creates order -> auto-applies referred_by_code (₹999 - ₹200 = ₹799) & pays
    console.log("4️⃣ Friend subscribing via auto-applied referral discount...");
    const friendOrder = await httpReq(
      "/payments/create-order",
      "POST",
      { planCode: "ANNUAL_CLASS_PASS" },
      friendCookie
    );
    if (friendOrder.status !== 201 || friendOrder.json.data.discountAmount !== 200) {
      throw new Error("Friend did not receive auto ₹200 referral discount: " + JSON.stringify(friendOrder.json));
    }
    const fOrdId = friendOrder.json.data.gatewayOrderId;
    const fPayId = `pay_frnd_${ts}`;
    const friendVerify = await httpReq(
      "/payments/verify",
      "POST",
      {
        gatewayOrderId: fOrdId,
        gatewayPaymentId: fPayId,
        signature: `sandbox_sig_${fOrdId}_${fPayId}`,
      },
      friendCookie
    );
    if (friendVerify.status !== 200) {
      throw new Error("Friend verify failed: " + JSON.stringify(friendVerify.json));
    }
    console.log(
      `   ✅ Friend paid ₹${friendOrder.json.data.finalAmount} (₹200 Discount applied!)`
    );

    // 5. Sender checks stats -> sees ₹800 wallet balance & 1/5 rewarded
    console.log("5️⃣ Verifying Sender earned ₹800 wallet credit...");
    const statsAfter = await httpReq("/referrals/my-stats", "GET", undefined, senderCookie);
    if (
      statsAfter.json.data.totalConverted !== 1 ||
      statsAfter.json.data.rewardWalletBalance !== 800
    ) {
      throw new Error("Sender wallet credit failed: " + JSON.stringify(statsAfter.json));
    }
    console.log("   ✅ Sender Wallet credited +₹800 & Converted count = 1!");

    // 6. Sender redeems wallet balance at checkout (₹999 - ₹800 = ₹199)
    console.log("6️⃣ Sender redeeming ₹800 Referral Wallet at checkout...");
    const senderOrder = await httpReq(
      "/payments/create-order",
      "POST",
      { planCode: "ANNUAL_CLASS_PASS", useWallet: true },
      senderCookie
    );
    if (
      senderOrder.status !== 201 ||
      senderOrder.json.data.walletDiscountUsed !== 800 ||
      senderOrder.json.data.finalAmount !== 199
    ) {
      throw new Error("Sender wallet redemption failed: " + JSON.stringify(senderOrder.json));
    }
    const sOrdId = senderOrder.json.data.gatewayOrderId;
    const sPayId = `pay_sndr_${ts}`;
    await httpReq(
      "/payments/verify",
      "POST",
      {
        gatewayOrderId: sOrdId,
        gatewayPaymentId: sPayId,
        signature: `sandbox_sig_${sOrdId}_${sPayId}`,
      },
      senderCookie
    );
    const statsAfterRedeem = await httpReq("/referrals/my-stats", "GET", undefined, senderCookie);
    if (statsAfterRedeem.json.data.rewardWalletBalance !== 0) {
      throw new Error("Sender wallet was not deducted after payment!");
    }
    console.log("   ✅ Sender redeemed ₹800 wallet discount -> paid ₹199! Wallet balance now ₹0.");

    // 7. Admin checks Referral Ledger
    console.log("7️⃣ Verifying Admin Referral Ledger...");
    const adminLedger = await httpReq("/referrals/admin/settings", "GET", undefined, adminCookie);
    const found = adminLedger.json.data.ledger.find(
      (r: any) => r.referralCode === senderRefCode && r.status === "REWARDED"
    );
    if (!found) {
      throw new Error("Referral record missing from Admin Ledger!");
    }
    console.log("   ✅ Admin Ledger accurately shows Sender -> Friend -> REWARDED (+₹800)!");
    console.log("===============================================================");
    console.log("🎉 ALL REFER & EARN E2E TESTS PASSED!");
    console.log("===============================================================");
  } finally {
    await db.delete(users).where(eq(users.id, adminId));
    await db.delete(users).where(eq(users.id, senderId));
    await db.delete(users).where(eq(users.id, friendId));
    await pool.end();
  }
}

runReferAndEarnE2E().catch((err) => {
  console.error("❌ Refer & Earn E2E Failed:", err);
  process.exit(1);
});
