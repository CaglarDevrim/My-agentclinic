import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

const migrationsDirectory = fileURLToPath(
  new URL("./migrations/", import.meta.url),
);

export function migrateDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = new Set(
    db
      .prepare("SELECT filename FROM schema_migrations")
      .all()
      .map((row) => (row as { filename: string }).filename),
  );

  const migrations = readdirSync(migrationsDirectory)
    .filter((filename) => /^\d+_.+\.sql$/.test(filename))
    .sort();

  const applyMigration = db.transaction((filename: string) => {
    db.exec(readFileSync(`${migrationsDirectory}/${filename}`, "utf8"));
    db.prepare("INSERT INTO schema_migrations (filename) VALUES (?)").run(
      filename,
    );
  });

  for (const filename of migrations) {
    if (!applied.has(filename)) {
      applyMigration(filename);
    }
  }
}
