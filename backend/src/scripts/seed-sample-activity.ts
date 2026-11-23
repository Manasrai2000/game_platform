import fs from "fs";
import path from "path";
import { classesRepository } from "../modules/classes/infrastructure/classes-repository";
import { activityStorageService } from "../modules/activities/infrastructure/activity-storage-service";
import { activitiesRepository } from "../modules/activities/infrastructure/activities-repository";

async function main() {
  const allClasses = await classesRepository.listAll();
  console.log(`Found ${allClasses.length} classes.`);

  const zipPath = path.resolve(__dirname, "../../sample_activity/sample_class_journey.zip");
  if (!fs.existsSync(zipPath)) {
    throw new Error("Sample ZIP file not found at " + zipPath);
  }
  const zipBuffer = fs.readFileSync(zipPath);

  // Seed for Class 1 or first active class
  const targetClass = allClasses.find((c) => c.name.toLowerCase().includes("class 1")) || allClasses[0];
  if (!targetClass) {
    console.log("No class found to seed activity.");
    process.exit(1);
  }

  console.log(`Seeding sample journey package for: ${targetClass.name} (ID: ${targetClass.id})...`);
  const extracted = await activityStorageService.extractPackage(zipBuffer, targetClass.id);

  const activity = await activitiesRepository.upsertClassActivity({
    classId: targetClass.id,
    title: `${targetClass.name} Interactive Learning Journey`,
    description: `Complete curriculum journey for ${targetClass.name} students with progressive level unlocks.`,
    storagePath: extracted.storagePath,
    entryFile: extracted.entryFile,
    totalCheckpoints: 3,
  });

  console.log("✅ Activity package seeded successfully:", activity);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to seed sample activity:", err);
  process.exit(1);
});
