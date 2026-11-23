import { db, pool } from "../core/database/connection";
import { classes } from "../core/database/schema/index";
import { eq, inArray, notInArray } from "drizzle-orm";

export const TARGET_CLASSES = [
  "Pre-Primary",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
];

export async function seedClasses(): Promise<void> {
  console.log("🏫 Seeding exact classes from curriculum specification...");

  // 1. Fetch current classes
  const existing = await db.select().from(classes);
  const existingMap = new Map(existing.map((c) => [c.name.toLowerCase().trim(), c]));

  // 2. Insert or update the 9 target classes in exact display order
  for (let i = 0; i < TARGET_CLASSES.length; i++) {
    const className = TARGET_CLASSES[i];
    const order = i + 1;
    const match = existingMap.get(className.toLowerCase());

    if (match) {
      await db
        .update(classes)
        .set({ display_order: order, is_active: true })
        .where(eq(classes.id, match.id));
      console.log(`   ✓ Updated #${order}: ${className}`);
    } else {
      await db.insert(classes).values({
        name: className,
        display_order: order,
        is_active: true,
      });
      console.log(`   + Created #${order}: ${className}`);
    }
  }

  // 3. Remove/deactivate any unused classes (e.g. Nursery, Class 9-12)
  const obsolete = existing.filter(
    (c) => !TARGET_CLASSES.some((t) => t.toLowerCase() === c.name.toLowerCase().trim())
  );

  for (const obs of obsolete) {
    try {
      await db.delete(classes).where(eq(classes.id, obs.id));
      console.log(`   - Removed obsolete class: ${obs.name}`);
    } catch {
      await db
        .update(classes)
        .set({ is_active: false })
        .where(eq(classes.id, obs.id));
      console.log(`   ~ Deactivated obsolete class: ${obs.name}`);
    }
  }

  console.log(`✅ Classes successfully synchronized (${TARGET_CLASSES.length} active classes).`);
}

if (require.main === module) {
  seedClasses()
    .catch((err) => {
      console.error("❌ Failed to seed classes:", err);
      process.exit(1);
    })
    .finally(() => pool.end());
}
