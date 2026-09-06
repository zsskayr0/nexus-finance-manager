import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { MIGRATIONS_DIR } from "./config.js";

/**
 * Runner de migration bem simples: cada arquivo `NNNN_nome.sql` em
 * `migrations/` é aplicado uma vez só, em ordem numérica, dentro de uma
 * transação. Mesma disciplina já usada no Desktop (Tauri): uma migration
 * NUNCA muda de conteúdo depois de aplicada — sempre um arquivo novo.
 */
export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    (db.prepare("SELECT version FROM _migrations").all() as Array<{ version: number }>).map((r) => r.version),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const version = Number(file.slice(0, 4));
    if (!Number.isFinite(version) || applied.has(version)) continue;

    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (version, name) VALUES (?, ?)").run(version, file);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    console.log(`[migrate] aplicada: ${file}`);
  }
}
