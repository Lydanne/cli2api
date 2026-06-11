import { ErrorCode, createCli2ApiError } from "@cli2api/shared";
import type { AgentModelDefinition, AgentProvider } from "./types.js";

/** In-memory registry for provider implementations available to core. */
export class AdapterRegistry {
  private readonly providers = new Map<string, AgentProvider>();

  /** Registers or replaces a provider by its `type`. */
  public register(provider: AgentProvider): void {
    this.providers.set(provider.type, provider);
  }

  /** Resolves a provider by type or throws a stable adapter error. */
  public get(type: string): AgentProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw createCli2ApiError(
        ErrorCode.ADAPTER_UNAVAILABLE,
        `No adapter registered for type "${type}"`,
        503
      );
    }
    return provider;
  }

  /** Lists registered provider type names. */
  public listTypes(): string[] {
    return [...this.providers.keys()].sort();
  }

  /** Lists all model catalog entries exposed by registered providers. */
  public async listModels(): Promise<AgentModelDefinition[]> {
    const models = await Promise.all(
      [...this.providers.values()].map(async (provider) => provider.listModels?.() ?? [])
    );
    return models.flat();
  }
}
