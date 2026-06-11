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
    upstream_instance_id TEXT,
    status TEXT NOT NULL,
    prompt TEXT NOT NULL,
    output TEXT,
    error_code TEXT,
    error_message TEXT,
    usage_json TEXT NOT NULL DEFAULT '{"inputTokens":0,"outputTokens":0,"totalTokens":0}',
    metadata_json TEXT NOT NULL DEFAULT '{}',
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
  `CREATE TABLE IF NOT EXISTS upstream_accounts (
    id TEXT PRIMARY KEY,
    provider_type TEXT NOT NULL,
    name TEXT NOT NULL,
    auth_state TEXT NOT NULL DEFAULT 'pending',
    auth_home TEXT NOT NULL,
    disabled_at INTEGER,
    last_auth_error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS upstream_auth_sessions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider_type TEXT NOT NULL,
    state TEXT NOT NULL,
    auth_url TEXT,
    user_code TEXT,
    expires_at INTEGER,
    message TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS upstream_instances (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    cwd TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    health_state TEXT NOT NULL DEFAULT 'unknown',
    current_runs INTEGER NOT NULL DEFAULT 0,
    max_concurrent_runs INTEGER NOT NULL DEFAULT 1,
    sandbox TEXT,
    approval_policy TEXT,
    config_json TEXT NOT NULL DEFAULT '{}',
    last_error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS upstream_route_bindings (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS upstream_run_sessions (
    id TEXT PRIMARY KEY,
    api_key_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    upstream_instance_id TEXT NOT NULL,
    provider_session_id TEXT,
    provider_session_updated_at INTEGER,
    provider_session_metadata_json TEXT NOT NULL DEFAULT '{}',
    run_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_runs_api_key ON runs(api_key_id)",
  "CREATE INDEX IF NOT EXISTS idx_run_events_run ON run_events(run_id, seq)",
  "CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix)",
  "CREATE INDEX IF NOT EXISTS idx_upstream_auth_sessions_account ON upstream_auth_sessions(account_id)",
  "CREATE INDEX IF NOT EXISTS idx_upstream_instances_account ON upstream_instances(account_id)",
  "CREATE INDEX IF NOT EXISTS idx_upstream_route_bindings_profile ON upstream_route_bindings(profile_id)",
  "CREATE INDEX IF NOT EXISTS idx_upstream_route_bindings_instance ON upstream_route_bindings(instance_id)",
  "CREATE INDEX IF NOT EXISTS idx_upstream_run_sessions_instance ON upstream_run_sessions(upstream_instance_id)",
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_upstream_run_sessions_scope
   ON upstream_run_sessions(api_key_id, profile_id, user_id, session_id)`
];

/** Applies the MVP SQLite schema. */
export function migrateDatabase(database: CoreDatabase): void {
  const migration = database.sqlite.transaction(() => {
    for (const statement of statements) {
      database.sqlite.prepare(statement).run();
    }
    ensureColumn(database, "runs", "metadata_json", "TEXT NOT NULL DEFAULT '{}'");
    ensureColumn(database, "runs", "upstream_instance_id", "TEXT");
    ensureColumn(database, "upstream_run_sessions", "provider_session_id", "TEXT");
    ensureColumn(database, "upstream_run_sessions", "provider_session_updated_at", "INTEGER");
    ensureColumn(database, "upstream_run_sessions", "provider_session_metadata_json", "TEXT NOT NULL DEFAULT '{}'");
  });
  migration();
}

function ensureColumn(database: CoreDatabase, table: string, column: string, definition: string): void {
  const columns = database.sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((entry) => entry.name === column)) {
    database.sqlite.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}
