import { ErrorCode, createCli2ApiError } from "@cli2api/shared";
import type { AgentAdapter } from "./types.js";

/** In-memory registry for adapter implementations available to core. */
export class AdapterRegistry {
  private readonly adapters = new Map<string, AgentAdapter>();

  /** Registers or replaces an adapter by its `type`. */
  public register(adapter: AgentAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  /** Resolves an adapter by type or throws a stable adapter error. */
  public get(type: string): AgentAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw createCli2ApiError(
        ErrorCode.ADAPTER_UNAVAILABLE,
        `No adapter registered for type "${type}"`,
        503
      );
    }
    return adapter;
  }

  /** Lists registered adapter type names. */
  public listTypes(): string[] {
    return [...this.adapters.keys()].sort();
  }
}
