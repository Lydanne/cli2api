/** Runtime configuration for the core server. */
export interface CoreConfig {
  /** HTTP host. */
  host: string;
  /** HTTP port. */
  port: number;
  /** SQLite database path. */
  databasePath: string;
}

/** Loads core configuration from environment variables and overrides. */
export function loadConfig(overrides: Partial<CoreConfig> = {}): CoreConfig {
  return {
    host: overrides.host ?? process.env.CLI2API_HOST ?? "127.0.0.1",
    port: overrides.port ?? Number(process.env.CLI2API_PORT ?? 3000),
    databasePath: overrides.databasePath ?? process.env.CLI2API_DB ?? "data/cli2api.sqlite"
  };
}
