import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Admin or operator account allowed to access the dashboard. */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  disabledAt: integer("disabled_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});

/** Cookie-backed admin session. */
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull()
});

/** Downstream API key stored as prefix plus hash. */
export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  enabled: integer("enabled").notNull().default(1),
  maxConcurrentRuns: integer("max_concurrent_runs").notNull().default(2),
  rpmLimit: integer("rpm_limit").notNull().default(60),
  dailyRunLimit: integer("daily_run_limit").notNull().default(1000),
  monthlyTokenLimit: integer("monthly_token_limit").notNull().default(1000000),
  createdAt: integer("created_at").notNull(),
  revokedAt: integer("revoked_at")
});

/** Operator-managed upstream adapter profile. */
export const adapterProfiles = sqliteTable("adapter_profiles", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  cwd: text("cwd").notNull(),
  enabled: integer("enabled").notNull().default(1),
  sandbox: text("sandbox"),
  approvalPolicy: text("approval_policy"),
  envJson: text("env_json").notNull().default("{}"),
  configJson: text("config_json").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});

/** Stored run created through native or compatibility APIs. */
export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  apiKeyId: text("api_key_id").notNull(),
  profileId: text("profile_id").notNull(),
  upstreamInstanceId: text("upstream_instance_id"),
  status: text("status").notNull(),
  prompt: text("prompt").notNull(),
  output: text("output"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  usageJson: text("usage_json").notNull().default("{\"inputTokens\":0,\"outputTokens\":0,\"totalTokens\":0}"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
  durationMs: integer("duration_ms")
});

/** Normalized event emitted during an adapter run. */
export const runEvents = sqliteTable("run_events", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  seq: integer("seq").notNull(),
  type: text("type").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: integer("created_at").notNull()
});

/** Aggregated usage bucket used for quota checks and dashboard metrics. */
export const usageBuckets = sqliteTable("usage_buckets", {
  id: text("id").primaryKey(),
  apiKeyId: text("api_key_id").notNull(),
  bucketType: text("bucket_type").notNull(),
  bucketKey: text("bucket_key").notNull(),
  runCount: integer("run_count").notNull().default(0),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  updatedAt: integer("updated_at").notNull()
});

/** Authenticated upstream provider account. */
export const upstreamAccounts = sqliteTable("upstream_accounts", {
  id: text("id").primaryKey(),
  providerType: text("provider_type").notNull(),
  name: text("name").notNull(),
  authState: text("auth_state").notNull().default("pending"),
  authHome: text("auth_home").notNull(),
  disabledAt: integer("disabled_at"),
  lastAuthError: text("last_auth_error"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});

/** Backend-managed upstream authentication session. */
export const upstreamAuthSessions = sqliteTable("upstream_auth_sessions", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerType: text("provider_type").notNull(),
  state: text("state").notNull(),
  authUrl: text("auth_url"),
  userCode: text("user_code"),
  expiresAt: integer("expires_at"),
  message: text("message"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});

/** Runnable upstream adapter instance bound to one upstream account. */
export const upstreamInstances = sqliteTable("upstream_instances", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  cwd: text("cwd").notNull(),
  enabled: integer("enabled").notNull().default(1),
  healthState: text("health_state").notNull().default("unknown"),
  currentRuns: integer("current_runs").notNull().default(0),
  maxConcurrentRuns: integer("max_concurrent_runs").notNull().default(1),
  sandbox: text("sandbox"),
  approvalPolicy: text("approval_policy"),
  configJson: text("config_json").notNull().default("{}"),
  lastError: text("last_error"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});

/** Explicit binding from one public profile to one upstream instance. */
export const upstreamRouteBindings = sqliteTable("upstream_route_bindings", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  instanceId: text("instance_id").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});

/** Drizzle schema object used when creating typed database clients. */
export const schema = {
  users,
  sessions,
  apiKeys,
  adapterProfiles,
  runs,
  runEvents,
  usageBuckets,
  upstreamAccounts,
  upstreamAuthSessions,
  upstreamInstances,
  upstreamRouteBindings
};
