import http from "http";
import { db, pool } from "../core/database/connection";
import { users, classes, class_activities, plans, promo_referral_codes } from "../core/database/schema/index";
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

async function runAdminControlsE2E() {
  console.log("==============================================================");
  console.log("🧪 E2E VERIFICATION: ADMIN CONTROLS (DEMO, CLASS PLANS, PROMO)");
  console.log("==============================================================");

  const ts = Date.now();
  const password = "AdminTestPassword123!";
  const passwordHash = await hashPassword(password);

  // Create temp Admin & temp Student
  const [adminIns] = await db.insert(users).values({
    email: `e2e_admin_${ts}@test.local`,
    password_hash: passwordHash,
    full_name: "E2E Admin",
    mobile_number: "9999999981",
    class_grade: "Class 1",
    school_name: "Admin HQ",
    role: "ADMIN",
    is_active: true,
    email_verified_at: new Date(),
  });
  const adminId = Number(adminIns.insertId);

  const [stuIns] = await db.insert(users).values({
    email: `e2e_stu_${ts}@test.local`,
    password_hash: passwordHash,
    full_name: "E2E Student",
    mobile_number: "9999999982",
    class_grade: "Class 1",
    school_name: "Test School",
    role: "STUDENT",
    referral_code: `STUE2E${ts}`.slice(0, 14).toUpperCase(),
    is_active: true,
    email_verified_at: new Date(),
  });
  const stuId = Number(stuIns.insertId);

  let createdPlanId: number | null = null;
  let activePromoId: number | null = null;
  let expiredPromoId: number | null = null;
  let originalDemoCount = 1;
  let class1ActivityId: number | null = null;

  try {
    // 1. Login Admin & Student
    const adminLogin = await httpReq("/auth/login", "POST", {
      email: `e2e_admin_${ts}@test.local`,
      password,
      deviceLabel: "Admin Browser",
    });
    const adminCookie = (adminLogin.headers["set-cookie"] || [])
      .map((c) => c.split(";")[0])
      .join("; ");

    const stuLogin = await httpReq("/auth/login", "POST", {
      email: `e2e_stu_${ts}@test.local`,
      password,
      deviceLabel: "Student Browser",
    });
    const stuCookie = (stuLogin.headers["set-cookie"] || [])
      .map((c) => c.split(";")[0])
      .join("; ");

    // 2. Test Activity Demo vs Premium Update
    console.log("1️⃣ Testing Admin Demo/Premium Activity Configuration...");
    const [cls1] = await db.select().from(classes).where(eq(classes.name, "Class 1")).limit(1);
    if (!cls1) throw new Error("Class 1 not found");
    const [act1] = await db
      .select()
      .from(class_activities)
      .where(eq(class_activities.class_id, cls1.id))
      .limit(1);
    if (!act1) throw new Error("Class 1 activity not found");

    class1ActivityId = act1.id;
    originalDemoCount = act1.demo_checkpoints_count;

    const patchAct = await httpReq(
      `/activities/admin/${act1.id}`,
      "PATCH",
      { demoCheckpointsCount: 2, totalCheckpoints: act1.total_checkpoints },
      adminCookie
    );
    if (patchAct.status !== 200 || patchAct.json.data.activity.demo_checkpoints_count !== 2) {
      throw new Error("Failed to update demoCheckpointsCount: " + JSON.stringify(patchAct.json));
    }
    console.log("   ✅ Admin updated Class 1 Demo Checkpoints to 2 (and restored to original later)");

    // 3. Test Class-Wise Subscription Plans
    console.log("2️⃣ Testing Admin Class-Wise Subscription Plan & Pricing...");
    const createPlan = await httpReq(
      "/payments/admin/plans",
      "POST",
      {
        classId: cls1.id,
        title: "Class 1 Special Pass",
        priceInr: 799,
        durationDays: 365,
        badge: "CLASS 1 ONLY",
      },
      adminCookie
    );
    if (createPlan.status !== 201) {
      throw new Error("Create plan failed: " + JSON.stringify(createPlan.json));
    }
    createdPlanId = createPlan.json.data.plan.id;

    // Update price from 799 -> 849
    const updatePlan = await httpReq(
      `/payments/admin/plans/${createdPlanId}`,
      "PUT",
      { priceInr: 849 },
      adminCookie
    );
    if (updatePlan.status !== 200 || updatePlan.json.data.plan.price_inr !== 849) {
      throw new Error("Update plan price failed: " + JSON.stringify(updatePlan.json));
    }

    // Student fetches plans -> should see Class 1 Special Pass at ₹849!
    const stuPlans = await httpReq("/payments/plans", "GET", undefined, stuCookie);
    if (
      stuPlans.status !== 200 ||
      !stuPlans.json.data.plans.some((p: any) => p.id === createdPlanId && p.price_inr === 849)
    ) {
      throw new Error("Student did not receive Class 1 specific plan at ₹849: " + JSON.stringify(stuPlans.json));
    }
    console.log("   ✅ Class-Wise Plan (₹849) created, updated & served dynamically to Class 1 student!");

    // 4. Test Admin Referral Code Generation + Expiration Validation
    console.log("3️⃣ Testing Admin Referral Code Generation & Expiration Period...");
    const tomorrow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const createActivePromo = await httpReq(
      "/referrals/admin/codes",
      "POST",
      {
        code: `VALID20_${ts}`.slice(0, 18),
        label: "Valid 20% Promo",
        discountPercent: 20,
        expiresAt: tomorrow,
        maxUses: 10,
      },
      adminCookie
    );
    if (createActivePromo.status !== 201) {
      throw new Error("Active promo creation failed: " + JSON.stringify(createActivePromo.json));
    }
    activePromoId = createActivePromo.json.data.code.id;

    const createExpiredPromo = await httpReq(
      "/referrals/admin/codes",
      "POST",
      {
        code: `EXP20_${ts}`.slice(0, 18),
        label: "Expired Promo",
        discountPercent: 20,
        expiresAt: yesterday,
      },
      adminCookie
    );
    if (createExpiredPromo.status !== 201) {
      throw new Error("Expired promo creation failed: " + JSON.stringify(createExpiredPromo.json));
    }
    expiredPromoId = createExpiredPromo.json.data.code.id;

    // Student validates active promo -> gets 20% off ₹849 (= ₹170)
    const valActive = await httpReq(
      "/referrals/validate",
      "POST",
      { code: createActivePromo.json.data.code.code, planPriceInr: 849 },
      stuCookie
    );
    if (valActive.status !== 200 || valActive.json.data.discountPercent !== 20) {
      throw new Error("Active promo validation failed: " + JSON.stringify(valActive.json));
    }
    console.log(`   ✅ Active Promo validated cleanly! 20% OFF = ₹${valActive.json.data.discountAmount}`);

    // Student validates expired promo -> rejected!
    const valExpired = await httpReq(
      "/referrals/validate",
      "POST",
      { code: createExpiredPromo.json.data.code.code, planPriceInr: 849 },
      stuCookie
    );
    if (valExpired.status === 200) {
      throw new Error("Expired promo should have been rejected!");
    }
    console.log("   ✅ Expired Promo rejected cleanly:", valExpired.json.error?.message);

    console.log("==============================================================");
    console.log("🎉 ALL ADMIN CONTROL E2E TESTS PASSED!");
    console.log("==============================================================");
  } finally {
    // Restore and cleanup
    if (class1ActivityId) {
      await db
        .update(class_activities)
        .set({ demo_checkpoints_count: originalDemoCount })
        .where(eq(class_activities.id, class1ActivityId));
    }
    if (createdPlanId) {
      await httpReq(`/payments/admin/plans/${createdPlanId}`, "DELETE", undefined, undefined).catch(() => {});
      await db.delete(plans).where(eq(plans.id, createdPlanId));
    }
    if (activePromoId || expiredPromoId) {
      if (activePromoId) await db.delete(promo_referral_codes).where(eq(promo_referral_codes.id, activePromoId));
      if (expiredPromoId) await db.delete(promo_referral_codes).where(eq(promo_referral_codes.id, expiredPromoId));
    }
    await db.delete(users).where(eq(users.id, adminId));
    await db.delete(users).where(eq(users.id, stuId));
    await pool.end();
  }
}

runAdminControlsE2E().catch((err) => {
  console.error("❌ Admin Controls E2E Failed:", err);
  process.exit(1);
});
