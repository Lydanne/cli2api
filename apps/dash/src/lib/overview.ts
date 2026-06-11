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

/** One row in the dashboard setup progress list. */
export interface SetupProgressStep<RouteName extends string = string> {
  /** Stable step id. */
  key: string;
  /** Human step label. */
  label: string;
  /** Current resource count for the step. */
  count: number;
  /** Whether this setup step is complete. */
  done: boolean;
  /** Dashboard route that configures this step. */
  route: RouteName;
}

/** Derived setup progress state used by the overview onboarding panel. */
export interface SetupProgressState<RouteName extends string = string> {
  /** Ordered setup rows. */
  steps: Array<SetupProgressStep<RouteName>>;
  /** First incomplete setup row, when any row remains unfinished. */
  nextStep: SetupProgressStep<RouteName> | undefined;
  /** Count of completed setup rows. */
  completedSteps: number;
  /** CSS width value for the progress bar. */
  progressPercent: string;
  /** Whether the setup progress panel should be rendered. */
  visible: boolean;
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

/** Builds display state for the overview setup progress panel. */
export function createSetupProgressState<RouteName extends string>(
  steps: Array<SetupProgressStep<RouteName>>
): SetupProgressState<RouteName> {
  const completedSteps = steps.filter((step) => step.done).length;
  const totalSteps = steps.length;
  const nextStep = steps.find((step) => !step.done);

  return {
    steps,
    nextStep,
    completedSteps,
    progressPercent: totalSteps > 0 ? `${(completedSteps / totalSteps) * 100}%` : "100%",
    visible: completedSteps < totalSteps
  };
}
