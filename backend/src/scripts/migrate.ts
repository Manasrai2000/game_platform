import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { env } from "../core/config/env";
import path from "path";

async function runMigration() {
  console.log(`Connecting to MySQL at ${env.DB_HOST}:${env.DB_PORT}...`);

  // 1. Connect without database to ensure DB exists
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });

  console.log(`Ensuring database '${env.DB_NAME}' exists...`);
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await connection.end();
  console.log(`✅ Database '${env.DB_NAME}' is ready.`);

  // 2. Connect with pool to the target database and run migrations
  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  const db = drizzle(pool);

  console.log("Applying Drizzle migrations from ./drizzle...");
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });

  console.log("✅ All database migrations applied successfully!");
  await pool.end();
}

runMigration().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
