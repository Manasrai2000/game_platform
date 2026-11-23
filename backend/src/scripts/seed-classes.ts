import { db, pool } from "../core/database/connection";
import { classes } from "../core/database/schema/index";
import { count } from "drizzle-orm";

const defaultClasses = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];

async function seedClasses() {
  console.log("Checking classes table...");
  const [res] = await db.select({ total: count() }).from(classes);

  if (res.total > 0) {
    console.log(`ℹ️ Classes already seeded (${res.total} existing records).`);
    await pool.end();
    return;
  }

  console.log("Seeding default classes in display order...");
  for (let i = 0; i < defaultClasses.length; i++) {
    await db.insert(classes).values({
      name: defaultClasses[i],
      display_order: i + 1,
      is_active: true,
    });
  }

  console.log(`✅ Seeded ${defaultClasses.length} default classes successfully!`);
  await pool.end();
}

seedClasses().catch((err) => {
  console.error("❌ Failed to seed classes:", err);
  process.exit(1);
});
