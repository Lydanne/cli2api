import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { schema } from "./schema.js";

/** Core database handle containing the raw SQLite client and Drizzle client. */
export interface CoreDatabase {
  /** Raw better-sqlite3 database for migrations and focused aggregate queries. */
  sqlite: Database.Database;
  /** Drizzle database client for typed table operations. */
  db: ReturnType<typeof drizzle<typeof schema>>;
}

/** Opens a SQLite database file and enables pragmatic defaults. */
export function openCoreDatabase(path: string): CoreDatabase {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return { sqlite, db: drizzle(sqlite, { schema }) };
}
