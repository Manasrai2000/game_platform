import { authUseCases } from "../modules/auth/application/auth-use-cases";
import { userController } from "../modules/users/infrastructure/user-controller";
import { deviceLockService } from "../modules/devices/public/device-service";
import { db, pool } from "../core/database/connection";
import { users } from "../core/database/schema/index";
import { eq } from "drizzle-orm";

async function runStage1Verification() {
  console.log("=================================================");
  console.log("🚀 STARTING STAGE 1 END-TO-END VERIFICATION TEST");
  console.log("=================================================\n");

  const testEmail = "rohan.test@student.local";

  // Clean up any previous test user
  const existing = await db.select().from(users).where(eq(users.email, testEmail));
  if (existing.length > 0) {
    await db.delete(users).where(eq(users.email, testEmail));
    console.log("🧹 Cleaned up existing test student.");
  }

  // -------------------------------------------------------------------------
  // STEP 1: Student Registration (First-Device Binding)
  // -------------------------------------------------------------------------
  console.log("📝 1. Testing Student Registration...");
  const regResult = await authUseCases.register(
    {
      fullName: "Rohan Sharma",
      email: testEmail,
      mobileNumber: "9876543210",
      classGrade: "Class 10",
      schoolName: "Delhi Public School",
      city: "New Delhi",
      state: "Delhi",
      password: "StudentPassword123!",
      deviceLabel: "Chrome 146 on MacBook Pro (Laptop 1)",
    },
    "192.168.1.10",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
  );

  console.log("   ✅ Registration successful!");
  console.log("   Student ID:", regResult.user.id);
  console.log("   Bound Device Token (Hex):", regResult.rawDeviceToken?.slice(0, 16) + "...");

  const laptop1Token = regResult.rawDeviceToken!;

  // -------------------------------------------------------------------------
  // STEP 2: Login from Authorized Laptop 1 (Should Succeed)
  // -------------------------------------------------------------------------
  console.log("\n💻 2. Testing Login from Authorized Laptop 1...");
  const login1 = await authUseCases.login(
    {
      email: testEmail,
      password: "StudentPassword123!",
      deviceLabel: "Chrome 146 on MacBook Pro (Laptop 1)",
    },
    laptop1Token,
    "192.168.1.10",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
  );
  console.log("   ✅ Login successful from Laptop 1! Session ID created.");

  // -------------------------------------------------------------------------
  // STEP 3: Login from Unauthorized Laptop 2 (Must be BLOCKED with 403)
  // -------------------------------------------------------------------------
  console.log("\n🚫 3. Testing Login from Unauthorized Laptop 2 (No Token / Different Device)...");
  try {
    await authUseCases.login(
      {
        email: testEmail,
        password: "StudentPassword123!",
        deviceLabel: "Edge on Windows 11 (Friend's Laptop 2)",
      },
      undefined, // No valid device cookie token!
      "103.45.67.89",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    );
    console.error("   ❌ ERROR: Unauthorized login was NOT blocked!");
    process.exit(1);
  } catch (err: any) {
    if (err.code === "DEVICE_LOCKED") {
      console.log("   ✅ SUCCESS: Single-device lock intercepted unauthorized login!");
      console.log("   Exact error returned:", `"${err.message}"`);
    } else {
      console.error("   ❌ Unexpected error:", err);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // STEP 4: Admin views student and performs 1-Click "Reset Device"
  // -------------------------------------------------------------------------
  console.log("\n🛠️  4. Testing Admin Device Reset...");
  const adminId = 1; // Seeded Admin
  await deviceLockService.adminRevoke(
    adminId,
    regResult.user.id,
    "Student switched to a new computer",
    "127.0.0.1"
  );
  console.log("   ✅ Admin successfully revoked active device & invalidated previous sessions!");

  // -------------------------------------------------------------------------
  // STEP 5: Laptop 2 Login After Admin Reset (Should now BIND Laptop 2)
  // -------------------------------------------------------------------------
  console.log("\n🔄 5. Testing Laptop 2 Login After Admin Reset...");
  const login2 = await authUseCases.login(
    {
      email: testEmail,
      password: "StudentPassword123!",
      deviceLabel: "Edge on Windows 11 (New Laptop 2)",
    },
    undefined, // Laptop 2 binds fresh
    "103.45.67.89",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  );

  console.log("   ✅ Laptop 2 bound successfully as the new authorized device!");
  console.log("   New Device Token:", login2.rawDeviceToken?.slice(0, 16) + "...");

  // -------------------------------------------------------------------------
  // STEP 6: Old Laptop 1 Now Tries to Login (Must now be BLOCKED)
  // -------------------------------------------------------------------------
  console.log("\n🔒 6. Verifying that Old Laptop 1 is now BLOCKED...");
  try {
    await authUseCases.login(
      {
        email: testEmail,
        password: "StudentPassword123!",
        deviceLabel: "Chrome 146 on MacBook Pro (Old Laptop 1)",
      },
      laptop1Token, // Old revoked token
      "192.168.1.10",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
    );
    console.error("   ❌ ERROR: Old laptop was NOT blocked!");
    process.exit(1);
  } catch (err: any) {
    if (err.code === "DEVICE_LOCKED") {
      console.log("   ✅ SUCCESS: Old laptop is strictly blocked!");
      console.log("   Exact error returned:", `"${err.message}"`);
    } else {
      console.error("   ❌ Unexpected error:", err);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // STEP 7: Admin Sets / Resets Student Password
  // -------------------------------------------------------------------------
  console.log("\n🔑 7. Testing Admin Password Override...");
  const newPass = "NewStudentPass2026!";
  await authUseCases.adminSetPassword(adminId, regResult.user.id, newPass, "127.0.0.1");
  console.log(`   ✅ Admin updated student password to "${newPass}".`);

  // Verify login with new password
  const loginNewPass = await authUseCases.login(
    {
      email: testEmail,
      password: newPass,
      deviceLabel: "Edge on Windows 11 (New Laptop 2)",
    },
    login2.rawDeviceToken!,
    "103.45.67.89",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  );
  console.log("   ✅ Login successful with new Admin-assigned password!");

  console.log("\n=================================================");
  console.log("🎉 ALL STAGE 1 VERIFICATION TESTS PASSED (7/7)!");
  console.log("=================================================");

  await pool.end();
}

runStage1Verification().catch(async (err) => {
  console.error("❌ Test failed:", err);
  await pool.end();
  process.exit(1);
});
