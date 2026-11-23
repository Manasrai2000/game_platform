import fs from "fs";
import path from "path";
import { db, pool } from "../core/database/connection";
import { users } from "../core/database/schema/index";
import { eq } from "drizzle-orm";
import { seedAdmin } from "./seed-admin";
import { seedClasses, TARGET_CLASSES } from "./seed-classes";
import { activityStorageService } from "../modules/activities/infrastructure/activity-storage-service";
import { activitiesRepository } from "../modules/activities/infrastructure/activities-repository";
import { classesRepository } from "../modules/classes/infrastructure/classes-repository";

async function main() {
  console.log("=================================================");
  console.log("🌱 STARTING SERVER PRODUCTION SEEDER");
  console.log("=================================================\n");

  // 1. Ensure Storage Directories Exist
  console.log("📁 1. Ensuring Storage Directories Exist...");
  const storageDir = path.resolve(__dirname, "../../storage/activities");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
    console.log(`   ✓ Created storage directory: ${storageDir}`);
  } else {
    console.log(`   ✓ Storage directory ready: ${storageDir}`);
  }

  // 2. Seed Exact Classes from Curriculum Image
  console.log("\n🏫 2. Seeding Exact Curriculum Classes (Pre-Primary to Class 8)...");
  await seedClasses();

  // 3. Seed Default Administrator Account
  console.log("\n🔑 3. Verifying / Seeding Administrator Account...");
  await seedAdmin();

  // 4. Ensure ZERO Dummy Students Exist (Per Client Directive)
  console.log("\n🧹 4. Ensuring Clean Student Database (Zero Dummy Students)...");
  const deletedStudents = await db.delete(users).where(eq(users.role, "STUDENT"));
  console.log("   ✅ All test student accounts cleared. Total dummy students: 0.");

  // 5. Seed Default Class 1 Journey Game Package
  console.log("\n🎮 5. Seeding Default Educational Game Package (Class 1)...");
  const zipPath = path.resolve(__dirname, "../../sample_activity/sample_class_journey.zip");
  if (fs.existsSync(zipPath)) {
    const zipBuffer = fs.readFileSync(zipPath);
    const allClasses = await classesRepository.listAll();
    const class1 = allClasses.find((c) => c.name.toLowerCase().includes("class 1"));

    if (class1) {
      const extracted = await activityStorageService.extractPackage(zipBuffer, class1.id);
      await activitiesRepository.upsertClassActivity({
        classId: class1.id,
        title: "Class 1 Interactive Learning Journey",
        description: "Curriculum-aligned multi-stage learning expedition for Class 1.",
        storagePath: extracted.storagePath,
        entryFile: extracted.entryFile,
        totalCheckpoints: 3,
      });
      console.log(`   ✅ Game Journey seeded for ${class1.name} (3 Checkpoints)`);
    }
  } else {
    console.log("   ℹ️ Sample zip not found, skipping default activity seed.");
  }

  console.log("\n=================================================");
  console.log("🎉 SERVER PRODUCTION SEED COMPLETED SUCCESSFULLY!");
  console.log("=================================================");
  console.log("\n📋 Summary:");
  console.log(`   • Total Classes Seeded: ${TARGET_CLASSES.length}`);
  console.log(`     ${TARGET_CLASSES.join(", ")}`);
  console.log(`   • Total Student Accounts: 0 (Pure clean state)`);
  console.log(`   • Default Admin Email: admin@gameplatform.local`);
  console.log(`   • Default Admin Password: Admin@Secure123!`);
  console.log(`   • Ready for live student registrations & school onboarding.\n`);
}

main()
  .catch((err) => {
    console.error("❌ Master seed failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
