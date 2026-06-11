import type { AgentAuthProvider, AgentProvider } from "@cli2api/agents-sdk";
import { CodexAuthProvider, type CodexAuthProviderOptions } from "./auth-provider.js";
import { CodexAgentProvider, type CodexAgentProviderOptions } from "./provider.js";

/** Constructor options for `CodexAgent.bundle`. */
export interface CodexAgentBundleOptions {
  /** Options passed to the Codex run provider. */
  provider?: CodexAgentProviderOptions;
  /** Options passed to the Codex auth provider. */
  auth?: CodexAuthProviderOptions;
}

/** Provider bundle returned by `CodexAgent.bundle`. */
export interface CodexAgentBundle {
  /** Run providers to register with `AgentsSDK`. */
  providers: AgentProvider[];
  /** Auth providers to register with `AgentsSDK`. */
  authProviders: AgentAuthProvider[];
}

/** Static facade for constructing Codex agents-sdk integrations. */
export class CodexAgent {
  /** Creates a Codex JSONL run provider. */
  public static provider(options: CodexAgentProviderOptions = {}): CodexAgentProvider {
    return new CodexAgentProvider(options);
  }

  /** Creates a Codex auth provider. */
  public static authProvider(options: CodexAuthProviderOptions = {}): CodexAuthProvider {
    return new CodexAuthProvider(options);
  }

  /** Creates the default Codex provider/auth bundle for `AgentsSDK.create`. */
  public static bundle(options: CodexAgentBundleOptions = {}): CodexAgentBundle {
    return {
      providers: [CodexAgent.provider(options.provider)],
      authProviders: [CodexAgent.authProvider(options.auth)]
    };
  }
}
