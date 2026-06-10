import type { CoreDatabase } from "./client.js";

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    disabled_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    max_concurrent_runs INTEGER NOT NULL DEFAULT 2,
    rpm_limit INTEGER NOT NULL DEFAULT 60,
    daily_run_limit INTEGER NOT NULL DEFAULT 1000,
    monthly_token_limit INTEGER NOT NULL DEFAULT 1000000,
    created_at INTEGER NOT NULL,
    revoked_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS adapter_profiles (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    cwd TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    sandbox TEXT,
    approval_policy TEXT,
    env_json TEXT NOT NULL DEFAULT '{}',
    config_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    api_key_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    status TEXT NOT NULL,
    prompt TEXT NOT NULL,
    output TEXT,
    error_code TEXT,
    error_message TEXT,
    usage_json TEXT NOT NULL DEFAULT '{"inputTokens":0,"outputTokens":0,"totalTokens":0}',
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    duration_ms INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS run_events (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS usage_buckets (
    id TEXT PRIMARY KEY,
    api_key_id TEXT NOT NULL,
    bucket_type TEXT NOT NULL,
    bucket_key TEXT NOT NULL,
    run_count INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    UNIQUE(api_key_id, bucket_type, bucket_key)
  )`,
  "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_runs_api_key ON runs(api_key_id)",
  "CREATE INDEX IF NOT EXISTS idx_run_events_run ON run_events(run_id, seq)",
  "CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix)"
];

/** Applies the MVP SQLite schema. */
export function migrateDatabase(database: CoreDatabase): void {
  const migration = database.sqlite.transaction(() => {
    for (const statement of statements) {
      database.sqlite.prepare(statement).run();
    }
  });
  migration();
}
