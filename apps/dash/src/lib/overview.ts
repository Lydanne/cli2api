/** Minimal profile shape used by overview aggregation. */
export interface OverviewProfile {
  /** Profile id. */
  id: string;
  /** Adapter type. */
  type: string;
  /** Whether the profile is selectable by downstream requests. */
  enabled: boolean;
}

/** Minimal API key shape used by overview aggregation. */
export interface OverviewApiKey {
  /** Numeric enabled flag from core. */
  enabled: number;
}

/** Minimal run shape used by overview aggregation. */
export interface OverviewRun {
  /** Run status. */
  status: string;
}

/** Overview source data from dashboard API calls. */
export interface OverviewInput {
  /** Adapter profiles. */
  profiles: OverviewProfile[];
  /** Downstream API keys. */
  apiKeys: OverviewApiKey[];
  /** Recent runs. */
  runs: OverviewRun[];
}

/** Operator overview counters rendered on the dashboard. */
export interface OverviewSummary {
  /** Count of enabled adapter profiles. */
  enabledProfiles: number;
  /** Count of active downstream API keys. */
  activeApiKeys: number;
  /** Count of currently running runs. */
  runningRuns: number;
  /** Count of failed runs. */
  failedRuns: number;
  /** Count of completed runs. */
  completedRuns: number;
}

/** Builds dashboard overview counters from API records. */
export function summarizeOverview(input: OverviewInput): OverviewSummary {
  return {
    enabledProfiles: input.profiles.filter((profile) => profile.enabled).length,
    activeApiKeys: input.apiKeys.filter((key) => key.enabled === 1).length,
    runningRuns: input.runs.filter((run) => run.status === "running").length,
    failedRuns: input.runs.filter((run) => run.status === "failed").length,
    completedRuns: input.runs.filter((run) => run.status === "completed").length
  };
}
