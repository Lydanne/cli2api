import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

/** Runtime configuration for the core server. */
export interface CoreConfig {
  /** Root directory for local cli2api state, config, auth homes, and scratch data. */
  homeDir: string;
  /** Optional dotenv file read before resolving config values. */
  envFilePath: string;
  /** HTTP host. */
  host: string;
  /** HTTP port. */
  port: number;
  /** SQLite database path. */
  databasePath: string;
  /** Base directory for per-account upstream auth homes. */
  authHomeBase: string;
  /** Base directory for service-owned model-serving runtime workspaces. */
  runtimeWorkspaceBase: string;
  /** Base directory for service-owned temporary files. */
  tempDir: string;
}

/** Loads core configuration from environment variables and overrides. */
export function loadConfig(overrides: Partial<CoreConfig> = {}): CoreConfig {
  const initialHome = resolveHome(overrides.homeDir ?? process.env.CLI2API_HOME ?? join(homedir(), ".cli2api"));
  const envFilePath = resolve(overrides.envFilePath ?? process.env.CLI2API_ENV_FILE ?? join(initialHome, ".env"));
  const fileEnv = readDotEnv(envFilePath);
  const env = { ...fileEnv, ...process.env };
  const homeDir = resolveHome(overrides.homeDir ?? env.CLI2API_HOME ?? initialHome);

  return {
    homeDir,
    envFilePath,
    host: overrides.host ?? env.CLI2API_HOST ?? "127.0.0.1",
    port: overrides.port ?? Number(env.CLI2API_PORT ?? 3000),
    databasePath: resolvePath(overrides.databasePath ?? env.CLI2API_DB ?? "cli2api.sqlite", homeDir),
    authHomeBase: resolvePath(overrides.authHomeBase ?? env.CLI2API_AUTH_HOME_BASE ?? "codex-homes", homeDir),
    runtimeWorkspaceBase:
      resolvePath(overrides.runtimeWorkspaceBase ?? env.CLI2API_RUNTIME_WORKSPACE_BASE ?? "runtime-workspaces", homeDir),
    tempDir: resolvePath(overrides.tempDir ?? env.CLI2API_TEMP_DIR ?? "tmp", homeDir)
  };
}

function resolveHome(path: string): string {
  return resolve(path.replace(/^~(?=$|\/)/u, homedir()));
}

function resolvePath(path: string, baseDir: string): string {
  if (path === ":memory:") {
    return path;
  }
  const expanded = path.replace(/^~(?=$|\/)/u, homedir());
  return resolve(expanded.startsWith("/") ? expanded : join(baseDir, expanded));
}

function readDotEnv(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }
  const values: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    values[key] = unquoteEnvValue(rawValue);
  }
  return values;
}

function unquoteEnvValue(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
