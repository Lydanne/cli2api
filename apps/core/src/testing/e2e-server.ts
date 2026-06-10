import { Elysia } from "elysia";
import { node } from "@elysiajs/node";
import type {
  AgentAuthProvider,
  AuthSession,
  RuntimeAuthInput,
  SecretLoginInput,
  StartAuthInput
} from "@cli2api/agents-sdk";
import { createApp } from "../app.js";
import { openCoreDatabase } from "../db/client.js";
import { migrateDatabase } from "../db/migrate.js";
import { createServices } from "../services/index.js";

class E2eCodexAuthProvider implements AgentAuthProvider {
  public readonly type = "codex";

  public async startAuth(input: StartAuthInput): Promise<AuthSession> {
    return {
      id: "e2e-auth-session",
      providerType: "codex",
      accountId: input.accountId,
      state: "waiting_for_browser",
      authHome: input.authHome,
      authUrl: "https://example.com/device",
      userCode: "E2E-1234"
    };
  }

  public async loginWithSecret(input: SecretLoginInput): Promise<AuthSession> {
    return {
      id: "e2e-auth-secret",
      providerType: "codex",
      accountId: input.accountId,
      state: "authenticated",
      authHome: input.authHome
    };
  }

  public async checkRuntime(input: RuntimeAuthInput): Promise<AuthSession> {
    return {
      id: "e2e-auth-status",
      providerType: "codex",
      accountId: input.accountId,
      state: "authenticated",
      authHome: input.authHome
    };
  }

  public async logout(input: RuntimeAuthInput): Promise<AuthSession> {
    return {
      id: "e2e-auth-logout",
      providerType: "codex",
      accountId: input.accountId,
      state: "pending",
      authHome: input.authHome
    };
  }
}

const database = openCoreDatabase(process.env.CLI2API_E2E_DB ?? ":memory:");
migrateDatabase(database);
const services = createServices(database, { authProviders: [new E2eCodexAuthProvider()] });

new Elysia({ adapter: node() }).use(createApp({ database, services })).listen({
  hostname: "127.0.0.1",
  port: 4517
});

console.log("cli2api e2e server listening on http://127.0.0.1:4517");
