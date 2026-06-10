import type { AdapterType } from "@cli2api/shared";

/** Model entry that an agent adapter can expose for one-click profile import. */
export interface AgentModelDefinition {
  /** Public model slug and default profile id. */
  id: string;
  /** Human-readable model display name. */
  name: string;
  /** Adapter implementation type that can run this model. */
  type: AdapterType;
  /** Catalog source, usually the provider or adapter family. */
  source: string;
  /** Adapter config stored on imported profiles. */
  config: Record<string, unknown>;
}

/** Static model catalog extracted from the bundled Codex CLI model list. */
export const AGENT_MODEL_CATALOG: readonly AgentModelDefinition[] = [
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    type: "codex",
    source: "codex",
    config: { model: "gpt-5.5" }
  },
  {
    id: "gpt-5.4",
    name: "GPT-5.4",
    type: "codex",
    source: "codex",
    config: { model: "gpt-5.4" }
  },
  {
    id: "gpt-5.4-mini",
    name: "GPT-5.4-Mini",
    type: "codex",
    source: "codex",
    config: { model: "gpt-5.4-mini" }
  }
] as const;

/** Lists model catalog entries, optionally filtered by adapter type. */
export function listAgentModels(type?: AdapterType): AgentModelDefinition[] {
  return AGENT_MODEL_CATALOG.filter((model) => !type || model.type === type).map((model) => ({
    ...model,
    config: { ...model.config }
  }));
}
