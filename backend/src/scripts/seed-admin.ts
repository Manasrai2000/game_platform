import { authRepository } from "../modules/auth/infrastructure/auth-repository";
import { hashPassword } from "../core/security/argon2";
import { pool } from "../core/database/connection";

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@gameplatform.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@Secure123!";
  const adminFullName = process.env.ADMIN_NAME || "System Administrator";

  console.log(`Checking existing admin: ${adminEmail}...`);

  const passwordHash = await hashPassword(adminPassword);

  const existing = await authRepository.findByEmail(adminEmail);
  if (existing) {
    console.log(`ℹ️ Admin already exists with ID: ${existing.id}. Updating password hash...`);
    await authRepository.updateUserPassword(existing.id, passwordHash);
    console.log(`✅ Admin password updated successfully!`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    await pool.end();
    return;
  }

  console.log("Creating new Administrator account...");

  const admin = await authRepository.createUser({
    fullName: adminFullName,
    email: adminEmail,
    mobileNumber: "9999999999",
    classGrade: "STAFF",
    schoolName: "HEADQUARTERS",
    passwordHash,
    role: "ADMIN",
  });

  console.log(`✅ Admin account created successfully!`);
  console.log(`   ID: ${admin.id}`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Role: ${admin.role}`);

  await pool.end();
}

seedAdmin().catch((err) => {
  console.error("❌ Failed to seed admin:", err);
  process.exit(1);
});
