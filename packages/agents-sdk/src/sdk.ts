import { randomUUID } from "node:crypto";
import {
  ErrorCode,
  createCli2ApiError,
  normalizeUsage,
  type AdapterProfile,
  type AgentEvent,
  type AgentUsage
} from "@cli2api/shared";
import {
  ChildProcessAuthCommandRunner,
  type AgentAuthCommandRunner,
  type AgentAuthProvider,
  type AuthSession,
  type RuntimeAuthInput,
  type SecretLoginInput,
  type StartAuthInput
} from "./auth.js";
import { collectAgentEvents } from "./collect.js";
import { MockAgentProvider } from "./mock-adapter.js";
import { ChildProcessAgentProcessRunner, type AgentProcessRunner } from "./process-runner.js";
import { AdapterRegistry } from "./registry.js";
import type {
  AgentAttachment,
  AgentConversationInput,
  AgentModelDefinition,
  AgentProvider,
  AgentRunInput
} from "./types.js";

/** Constructor options for the primary agents-sdk facade. */
export interface AgentsSDKOptions {
  /** Providers available for run execution and model discovery. */
  providers?: AgentProvider[];
  /** Auth providers available for account login flows. */
  authProviders?: AgentAuthProvider[];
}

/** Optional model discovery filter. */
export interface AgentsModelFilter {
  /** Provider type to include. */
  type?: string;
}

/** Public run request accepted by `AgentsSDK`. */
export interface AgentsRunRequest {
  /** Optional run id. A UUID is generated when omitted. */
  runId?: string;
  /** Optional provider type override. Defaults to `profile.type`. */
  provider?: string;
  /** Operator-managed adapter profile. */
  profile: AdapterProfile;
  /** User input text after route-specific normalization. */
  input: string;
  /** Optional provider conversation context for explicit downstream sessions. */
  conversation?: AgentConversationInput;
  /** Optional local attachments. */
  attachments?: AgentAttachment[];
  /** Optional JSON schema requested for the final response. */
  outputSchema?: Record<string, unknown>;
}

/** Collected text result returned by `runText` helpers. */
export interface AgentRunResult {
  /** Internal run identifier. */
  runId: string;
  /** Final text output. */
  output: string;
  /** Final normalized usage. */
  usage: AgentUsage;
  /** Full normalized event stream. */
  events: AgentEvent[];
  /** Latest provider conversation mapping, when emitted. */
  conversation?: AgentConversationInput;
}

/** Primary facade for provider-neutral agent execution, discovery, and auth. */
export class AgentsSDK {
  private readonly providers = new AdapterRegistry();

  private readonly authProviders = new Map<string, AgentAuthProvider>();

  /** Creates an agents-sdk facade. Prefer `AgentsSDK.create` for call-site clarity. */
  public constructor(options: AgentsSDKOptions = {}) {
    for (const provider of options.providers ?? []) {
      this.use(provider);
    }
    for (const provider of options.authProviders ?? []) {
      this.useAuth(provider);
    }
  }

  /** Creates an agents-sdk facade. */
  public static create(options: AgentsSDKOptions = {}): AgentsSDK {
    return new AgentsSDK(options);
  }

  /** Returns the provider unchanged while preserving provider type inference. */
  public static defineProvider<TProvider extends AgentProvider>(provider: TProvider): TProvider {
    return provider;
  }

  /** Returns the auth provider unchanged while preserving provider type inference. */
  public static defineAuthProvider<TProvider extends AgentAuthProvider>(provider: TProvider): TProvider {
    return provider;
  }

  /** Creates the deterministic mock provider used by tests and local demos. */
  public static mockProvider(): AgentProvider {
    return new MockAgentProvider();
  }

  /** Creates the default JSONL child-process runner. */
  public static processRunner(): AgentProcessRunner {
    return new ChildProcessAgentProcessRunner();
  }

  /** Creates the default auth child-process runner. */
  public static authRunner(): AgentAuthCommandRunner {
    return new ChildProcessAuthCommandRunner();
  }

  /** Collects an async event stream into an array. */
  public static async collect(events: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
    return collectAgentEvents(events);
  }

  /** Converts a normalized event sequence into a final text result. */
  public static toResult(events: Iterable<AgentEvent>): AgentRunResult {
    const collected = [...events];
    let runId = "";
    let output = "";
    let usage = normalizeUsage(undefined);
    let conversation: AgentConversationInput | undefined;
    for (const event of collected) {
      runId = runId || event.runId;
      if (event.type === "output.delta") {
        output += event.delta;
      }
      if (event.type === "conversation.updated") {
        conversation = {
          scopeId: event.scopeId,
          providerSessionId: event.providerSessionId,
          metadata: event.metadata
        };
      }
      if (event.type === "usage.updated") {
        usage = normalizeUsage(event.usage);
      }
      if (event.type === "run.completed") {
        output = event.output ?? output;
        if (event.usage) {
          usage = normalizeUsage(event.usage);
        }
      }
      if (event.type === "run.failed") {
        throw createCli2ApiError(event.code as ErrorCode, event.message, 500);
      }
    }
    return { runId, output, usage, events: collected, conversation };
  }

  /** Runs one request with a provider without creating an `AgentsSDK` instance. */
  public static runWith(provider: AgentProvider, request: AgentsRunRequest): AsyncIterable<AgentEvent> {
    return provider.run(toAgentRunInput(request));
  }

  /** Runs one request with a provider and collects the final text result. */
  public static async runTextWith(provider: AgentProvider, request: AgentsRunRequest): Promise<AgentRunResult> {
    return AgentsSDK.toResult(await AgentsSDK.collect(AgentsSDK.runWith(provider, request)));
  }

  /** Registers or replaces a run provider. */
  public use(provider: AgentProvider): this {
    this.providers.register(provider);
    return this;
  }

  /** Compatibility alias for provider registration. */
  public register(provider: AgentProvider): this {
    return this.use(provider);
  }

  /** Registers or replaces an auth provider. */
  public useAuth(provider: AgentAuthProvider): this {
    this.authProviders.set(provider.type, provider);
    return this;
  }

  /** Resolves a run provider by type. */
  public getProvider(type: string): AgentProvider {
    return this.providers.get(type);
  }

  /** Compatibility alias for resolving a run provider by type. */
  public get(type: string): AgentProvider {
    return this.getProvider(type);
  }

  /** Resolves an auth provider by type. */
  public getAuthProvider(type: string): AgentAuthProvider {
    const provider = this.authProviders.get(type);
    if (!provider) {
      throw createCli2ApiError(ErrorCode.ADAPTER_UNAVAILABLE, `No auth provider for type "${type}"`, 503);
    }
    return provider;
  }

  /** Lists registered run provider type names. */
  public listProviderTypes(): string[] {
    return this.providers.listTypes();
  }

  /** Compatibility alias for listing registered run provider type names. */
  public listTypes(): string[] {
    return this.listProviderTypes();
  }

  /** Lists model catalog entries exposed by registered providers. */
  public async listModels(filter: AgentsModelFilter = {}): Promise<AgentModelDefinition[]> {
    const models = await this.providers.listModels();
    return filter.type ? models.filter((model) => model.type === filter.type) : models;
  }

  /** Runs one request and streams normalized provider events. */
  public run(request: AgentsRunRequest): AsyncIterable<AgentEvent> {
    return AgentsSDK.runWith(this.getProvider(request.provider ?? request.profile.type), request);
  }

  /** Runs one request and collects the final text result. */
  public async runText(request: AgentsRunRequest): Promise<AgentRunResult> {
    return AgentsSDK.toResult(await AgentsSDK.collect(this.run(request)));
  }

  /** Starts an interactive auth session for one provider type. */
  public startAuth(type: string, input: StartAuthInput): Promise<AuthSession> {
    return this.getAuthProvider(type).startAuth(input);
  }

  /** Logs a provider in with a secret passed through stdin. */
  public loginWithSecret(type: string, input: SecretLoginInput): Promise<AuthSession> {
    return this.getAuthProvider(type).loginWithSecret(input);
  }

  /** Checks runtime auth state for one provider type. */
  public checkAuth(type: string, input: RuntimeAuthInput): Promise<AuthSession> {
    return this.getAuthProvider(type).checkRuntime(input);
  }

  /** Logs out one provider account home. */
  public logout(type: string, input: RuntimeAuthInput): Promise<AuthSession> {
    return this.getAuthProvider(type).logout(input);
  }
}

function toAgentRunInput(request: AgentsRunRequest): AgentRunInput {
  return {
    runId: request.runId ?? randomUUID(),
    prompt: request.input,
    mode: "model",
    profile: request.profile,
    conversation: request.conversation,
    attachments: request.attachments,
    outputSchema: request.outputSchema
  };
}
