import { db, pool } from "../core/database/connection";
import { plans, users } from "../core/database/schema/index";
import { eq, isNull } from "drizzle-orm";

function generateCodeFromName(name: string, id: number): string {
  const clean = (name || "STU").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 5) || "STU";
  return `${clean}${100 + id}`;
}

async function seedPlansAndReferrals() {
  console.log("🚀 Seeding subscription plans and user referral codes...");

  const defaultPlans = [
    {
      code: "ANNUAL_CLASS_PASS",
      title: "Full Academic Year Pass",
      description: "Complete access to all Class Stages, Interactive Missions, Auto-Resume, and Mastery Certificate for 1 full year.",
      price_inr: 999,
      duration_days: 365,
      badge: "BEST VALUE",
      is_active: true,
    },
    {
      code: "HALF_YEAR_PASS",
      title: "6-Month Term Pass",
      description: "Full access to all Class Curriculum Checkpoints and progress tracking for 6 months.",
      price_inr: 599,
      duration_days: 180,
      badge: "POPULAR",
      is_active: true,
    },
  ];

  for (const plan of defaultPlans) {
    const existing = await db
      .select()
      .from(plans)
      .where(eq(plans.code, plan.code))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(plans).values(plan);
      console.log(`   ✅ Created plan: ${plan.title} (₹${plan.price_inr})`);
    } else {
      console.log(`   ⏭️ Plan already exists: ${plan.title}`);
    }
  }

  // Backfill referral codes for existing users
  const usersWithoutCode = await db
    .select()
    .from(users)
    .where(isNull(users.referral_code));

  for (const u of usersWithoutCode) {
    const code = generateCodeFromName(u.full_name, u.id);
    await db
      .update(users)
      .set({ referral_code: code })
      .where(eq(users.id, u.id));
    console.log(`   ✅ Assigned referral code ${code} to user ${u.email}`);
  }

  console.log("🎉 Plans & referral codes seeded successfully!");
  await pool.end();
}

seedPlansAndReferrals().catch(async (err) => {
  console.error("❌ Seeding failed:", err);
  await pool.end();
  process.exit(1);
});
