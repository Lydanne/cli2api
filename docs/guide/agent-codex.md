# @cli2api/agent-codex Guide

`@cli2api/agent-codex` 是 Codex CLI provider 包。它把 Codex CLI 封装成 agents-sdk provider，并提供认证 provider。

## 推荐入口

使用 `CodexAgent` 静态 facade：

```ts
import { AgentsSDK } from "@cli2api/agents-sdk";
import { CodexAgent } from "@cli2api/agent-codex";

const codex = CodexAgent.bundle();

const agents = AgentsSDK.create({
  providers: [AgentsSDK.mockProvider(), ...codex.providers],
  authProviders: codex.authProviders
});
```

也可以分别创建：

```ts
const provider = CodexAgent.provider();
const authProvider = CodexAgent.authProvider();
```

底层类 `CodexAgentProvider` 和 `CodexAuthProvider` 仍然导出，便于测试和高级定制。

## 运行策略

Codex provider 使用 JSONL stdio 子进程：

- 新会话或 stateless: `codex exec --json`
- 已有 provider session: `codex exec resume <providerSessionId> --json`
- 模型发现: `codex debug models`
- 设备登录: `codex login --device-auth`
- secret 登录: `codex login --with-api-key` 或 `codex login --with-access-token`
- 状态检查: `codex login status`
- 登出: `codex logout`

model-serving run 固定安全参数：

- `--cd <instance cwd>`
- `--sandbox read-only`
- `--ask-for-approval never`
- `--skip-git-repo-check`
- `--ignore-user-config`
- `--ignore-rules`

无显式 conversation 时追加 `--ephemeral`。provider 不传 `--add-dir`，也不允许请求覆盖工作目录、sandbox 或 approval policy。

## Codex provider 示例

```ts
import { AgentsSDK } from "@cli2api/agents-sdk";
import { CodexAgent } from "@cli2api/agent-codex";

const agents = AgentsSDK.create({
  providers: [CodexAgent.provider()],
  authProviders: [CodexAgent.authProvider()]
});

const result = await agents.runText({
  profile: {
    id: "gpt-5.5",
    type: "codex",
    name: "GPT-5.5",
    cwd: "/srv/cli2api/runtime-workspaces/instances/inst-1",
    enabled: true,
    env: {
      CODEX_HOME: "/srv/cli2api/codex-homes/codex-main"
    },
    config: {
      model: "gpt-5.5"
    }
  },
  input: "只回答一句话：什么是 cli2api？"
});

console.log(result.output);
```

在 core 服务里，`cwd` 和 `CODEX_HOME` 由账号池和实例池生成；下游请求不能提供这些字段。

## 认证示例

```ts
const session = await agents.startAuth("codex", {
  accountId: "codex-main",
  authHome: "/srv/cli2api/codex-homes/codex-main",
  method: "device"
});

console.log(session.authUrl, session.userCode);
```

当用户在浏览器完成设备码认证后，轮询：

```ts
const status = await agents.checkAuth("codex", {
  accountId: "codex-main",
  authHome: "/srv/cli2api/codex-homes/codex-main"
});
```

## 模型发现

```ts
const models = await agents.listModels({ type: "codex" });
```

Codex provider 读取 `codex debug models`，只返回 provider-neutral 字段：

- `id`
- `name`
- `type`
- `source`
- `config`

它会过滤隐藏模型和 API 不支持模型，不会暴露 raw instructions、prompt 或 provider 内部字段。

## Conversation 行为

当 `AgentsRunRequest.conversation.providerSessionId` 存在时，Codex provider 使用 `codex exec resume`。

当只有 `conversation.scopeId` 时，provider 会运行非 ephemeral 的新 Codex session，并在 Codex JSONL 中发现 thread/session id 后发出 `conversation.updated`。

当没有 `conversation` 时，provider 使用 `--ephemeral`，避免默认请求共享上游上下文。
