import { authRepository } from "../modules/auth/infrastructure/auth-repository";
import { hashPassword } from "../core/security/argon2";
import { pool } from "../core/database/connection";

export async function seedAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@gameplatform.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@Secure123!";
  const adminFullName = process.env.ADMIN_NAME || "System Administrator";

  console.log(`Checking existing admin: ${adminEmail}...`);

  const passwordHash = await hashPassword(adminPassword);

  const existing = await authRepository.findByEmail(adminEmail);
  if (existing) {
    console.log(`ℹ️ Admin already exists with ID: ${existing.id}. Updating password hash...`);
    await authRepository.updateUserPassword(existing.id, passwordHash, adminPassword);
    console.log(`✅ Admin password verified and up-to-date.`);
    console.log(`   Email: ${adminEmail}`);
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
    rawPassword: adminPassword,
    role: "ADMIN",
  });

  console.log(`✅ Admin account created successfully!`);
  console.log(`   ID: ${admin.id}`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Role: ${admin.role}`);
}

if (require.main === module) {
  seedAdmin()
    .catch((err) => {
      console.error("❌ Failed to seed admin:", err);
      process.exit(1);
    })
    .finally(() => pool.end());
}
