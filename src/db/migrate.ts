import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { ClinicDatabase } from "./index.js";

const migrationsDirectory = fileURLToPath(new URL("./migrations/", import.meta.url));

export async function migrateDatabase(db: ClinicDatabase): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const appliedResult = await db.execute("SELECT filename FROM schema_migrations");
  const applied = new Set(appliedResult.rows.map((row) => String(row.filename)));
  const migrations = readdirSync(migrationsDirectory).filter((filename) => /^\d+_.+\.sql$/.test(filename)).sort();

  for (const filename of migrations) {
    if (applied.has(filename)) continue;
    const migrationSql = readFileSync(`${migrationsDirectory}/${filename}`, "utf8");
    const trustedFilename = filename.replaceAll("'", "''");
    await db.executeMultiple(`
      BEGIN IMMEDIATE;
      ${migrationSql}
      INSERT INTO schema_migrations (filename) VALUES ('${trustedFilename}');
      COMMIT;
    `);
  }
}
