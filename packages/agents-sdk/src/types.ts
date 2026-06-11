import type { AdapterProfile, AgentEvent } from "@cli2api/shared";

/** Runtime mode used by cli2api when calling an agent provider. */
export type AgentRunMode = "model";

/** Provider-native conversation context mapped from a downstream session. */
export interface AgentConversationInput {
  /** Core-owned stable scope id for the downstream session. */
  scopeId: string;
  /** Provider-native session id to resume, when already known. */
  providerSessionId?: string;
  /** Provider-neutral metadata persisted with the conversation mapping. */
  metadata?: Record<string, unknown>;
}

/** Local attachment passed to providers that support multimodal input. */
export interface AgentAttachment {
  /** Attachment type. */
  type: "local_image";
  /** Local path to the attachment file. */
  path: string;
}

/** Input passed to an agent provider for one run. */
export interface AgentRunInput {
  /** Internal run identifier assigned by core. */
  runId: string;
  /** User prompt after route-specific normalization. */
  prompt: string;
  /** Operator-managed adapter profile. */
  profile: AdapterProfile;
  /** cli2api runtime mode. This slice supports only read-only model serving. */
  mode: AgentRunMode;
  /** Optional provider conversation context for explicit downstream sessions. */
  conversation?: AgentConversationInput;
  /** Optional local attachments. */
  attachments?: AgentAttachment[];
  /** Optional JSON schema requested for the final response. */
  outputSchema?: Record<string, unknown>;
}

/** Model entry that an agent provider can expose for profile import. */
export interface AgentModelDefinition {
  /** Public model slug and default profile id. */
  id: string;
  /** Human-readable model display name. */
  name: string;
  /** Adapter implementation type that can run this model. */
  type: AdapterProfile["type"];
  /** Catalog source, usually the provider or adapter family. */
  source: string;
  /** Adapter config stored on imported profiles. */
  config: Record<string, unknown>;
}

/** Provider implementation contract used by core. */
export interface AgentProvider {
  /** Provider type string stored on adapter profiles and upstream instances. */
  readonly type: string;
  /** Runs a prompt and yields normalized events. */
  run(input: AgentRunInput): AsyncIterable<AgentEvent>;
  /** Lists models that can be imported as profiles. */
  listModels?(): Promise<AgentModelDefinition[]> | AgentModelDefinition[];
}

/** Backward-compatible alias for the provider contract. */
export type AgentAdapter = AgentProvider;
