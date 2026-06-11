# Provider Development Guide

本指南说明如何为 agents-sdk 接入新的 CLI provider，例如 Claude Code、OpenCode 或其他命令行 agent。

## 包结构建议

每个真实 provider 独立成包：

```text
packages/agent-<name>/
  package.json
  tsconfig.json
  src/
    index.ts
    <name>-agent.ts
    provider.ts
    auth-provider.ts
    *.spec.ts
```

当前已实现：

- `packages/agent-codex`

预留但尚未实现生产包：

- `packages/agent-claude-code`
- `packages/agent-opencode`

不要在 `packages/agents-sdk` 里写 provider-specific 逻辑。`agents-sdk` 只放 provider-neutral 契约和通用 runner。

## 实现 AgentProvider

```ts
import type { AgentProvider, AgentRunInput } from "@cli2api/agents-sdk";
import type { AgentEvent } from "@cli2api/shared";

export class MyAgentProvider implements AgentProvider {
  public readonly type = "my-agent";

  public async *run(input: AgentRunInput): AsyncIterable<AgentEvent> {
    yield { type: "run.started", runId: input.runId };
    yield { type: "output.delta", runId: input.runId, delta: "hello" };
    yield {
      type: "run.completed",
      runId: input.runId,
      output: "hello",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
    };
  }

  public listModels() {
    return [
      {
        id: "my-model",
        name: "My Model",
        type: this.type,
        source: this.type,
        config: { model: "my-model" }
      }
    ];
  }
}
```

## 使用 JSONL 子进程 runner

CLI provider 应通过 `AgentProcessRunner` 管理子进程，而不是在 core 里解析 provider 输出。

```ts
import {
  ChildProcessAgentProcessRunner,
  type AgentProcessRunner
} from "@cli2api/agents-sdk";

export class MyAgentProvider {
  private readonly runner: AgentProcessRunner;

  public constructor(options: { runner?: AgentProcessRunner } = {}) {
    this.runner = options.runner ?? new ChildProcessAgentProcessRunner();
  }
}
```

runner 会输出：

- `json`: 解析后的 stdout JSONL。
- `stderr`: stderr chunk。
- `error`: bad JSON 或 spawn failure。
- `exit`: exit code、signal、stderr、timeout 状态。

provider 负责把 provider-specific JSON 转成 `AgentEvent`。

## Auth provider

如果 provider 需要登录，实现 `AgentAuthProvider`：

```ts
import type {
  AgentAuthProvider,
  AuthSession,
  RuntimeAuthInput,
  SecretLoginInput,
  StartAuthInput
} from "@cli2api/agents-sdk";

export class MyAuthProvider implements AgentAuthProvider {
  public readonly type = "my-agent";

  public async startAuth(input: StartAuthInput): Promise<AuthSession> {
    return {
      id: "session-id",
      providerType: this.type,
      accountId: input.accountId,
      state: "waiting_for_browser",
      authHome: input.authHome,
      authUrl: "https://example.com/device",
      userCode: "ABCD-1234"
    };
  }

  public async loginWithSecret(input: SecretLoginInput): Promise<AuthSession> {
    return {
      id: "secret-session",
      providerType: this.type,
      accountId: input.accountId,
      state: "authenticated",
      authHome: input.authHome
    };
  }

  public async checkRuntime(input: RuntimeAuthInput): Promise<AuthSession> {
    return {
      id: "status-session",
      providerType: this.type,
      accountId: input.accountId,
      state: "authenticated",
      authHome: input.authHome
    };
  }

  public async logout(input: RuntimeAuthInput): Promise<AuthSession> {
    return {
      id: "logout-session",
      providerType: this.type,
      accountId: input.accountId,
      state: "pending",
      authHome: input.authHome
    };
  }
}
```

Secrets 必须通过 stdin 传给 CLI，不要放到命令行参数、日志、事件或 metadata。

## Static facade

每个 provider 包应提供一个静态 facade，类似 `CodexAgent`：

```ts
export class MyAgent {
  public static provider(options = {}) {
    return new MyAgentProvider(options);
  }

  public static authProvider(options = {}) {
    return new MyAuthProvider(options);
  }

  public static bundle(options = {}) {
    return {
      providers: [MyAgent.provider(options.provider)],
      authProviders: [MyAgent.authProvider(options.auth)]
    };
  }
}
```

core 或其他宿主可以这样装配：

```ts
const my = MyAgent.bundle();
const agents = AgentsSDK.create({
  providers: [...my.providers],
  authProviders: [...my.authProviders]
});
```

## 测试要求

- 单元测试不能调用真实 CLI。
- 用 fake `AgentProcessRunner` 注入 JSONL、stderr、error、exit 事件。
- 覆盖命令构造、坏 JSON、非零退出、timeout、model discovery 和 event normalization。
- 覆盖 auth command 构造，确保 secret 不出现在 args。
- 对 core 集成使用 fake provider，保持 E2E 不依赖真实上游账号。

## 安全边界

provider 不能接受请求覆盖：

- `cwd`
- sandbox
- approval policy
- extra directory
- auth home

这些字段只能来自 core 管理的 profile、account 和 instance。
