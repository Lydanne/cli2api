# @cli2api/agents-sdk Guide

`@cli2api/agents-sdk` 是 provider-neutral 核心库。它不依赖 HTTP、SQLite、dashboard 或 OpenAI payload；它只负责统一 provider 契约、进程运行、事件归一化、模型发现和认证分发。

## 主要入口

推荐使用 `AgentsSDK` 主类：

```ts
import { AgentsSDK } from "@cli2api/agents-sdk";

const agents = AgentsSDK.create({
  providers: [AgentsSDK.mockProvider()],
  authProviders: []
});
```

低层类型仍然导出给 provider 作者使用，例如 `AgentProvider`、`AgentRunInput`、`AgentProcessRunner`、`AgentAuthProvider`。

## 运行一个 provider

```ts
import { AgentsSDK } from "@cli2api/agents-sdk";

const agents = AgentsSDK.create({
  providers: [AgentsSDK.mockProvider()]
});

const result = await agents.runText({
  runId: "run-1",
  profile: {
    id: "mock",
    type: "mock",
    name: "Mock",
    cwd: process.cwd(),
    enabled: true
  },
  input: "hello"
});

console.log(result.output);
```

`runText` 会收集事件并返回：

- `runId`
- `output`
- `usage`
- `events`
- `conversation`

如果需要流式事件，用 `run`：

```ts
for await (const event of agents.run({
  profile,
  input: "hello"
})) {
  console.log(event.type);
}
```

## 静态工具方法

`AgentsSDK` 提供静态方法，适合测试、脚本和 provider 包：

```ts
const provider = AgentsSDK.defineProvider(AgentsSDK.mockProvider());

const result = await AgentsSDK.runTextWith(provider, {
  profile,
  input: "hello"
});
```

常用静态方法：

- `AgentsSDK.create(options)`
- `AgentsSDK.defineProvider(provider)`
- `AgentsSDK.defineAuthProvider(provider)`
- `AgentsSDK.mockProvider()`
- `AgentsSDK.processRunner()`
- `AgentsSDK.authRunner()`
- `AgentsSDK.collect(events)`
- `AgentsSDK.toResult(events)`
- `AgentsSDK.runWith(provider, request)`
- `AgentsSDK.runTextWith(provider, request)`

## 注册 provider

```ts
agents.use(provider);
agents.useAuth(authProvider);

const provider = agents.getProvider("codex");
const authProvider = agents.getAuthProvider("codex");
```

`use` 和 `useAuth` 会按 provider `type` 替换已有实现。这样可以在测试中注入 fake provider，也可以在生产服务里装配 Codex、Claude Code、OpenCode 等 provider。

## 模型发现

```ts
const allModels = await agents.listModels();
const codexModels = await agents.listModels({ type: "codex" });
```

每个模型条目是 provider-neutral 的 `AgentModelDefinition`：

```ts
{
  id: "gpt-5.5",
  name: "GPT-5.5",
  type: "codex",
  source: "codex",
  config: { model: "gpt-5.5" }
}
```

## Auth 分发

```ts
const session = await agents.startAuth("codex", {
  accountId: "codex-main",
  authHome: "/service/codex-homes/codex-main",
  method: "device"
});
```

Auth 方法：

- `startAuth(type, input)`
- `loginWithSecret(type, input)`
- `checkAuth(type, input)`
- `logout(type, input)`

Secrets 只能通过 `stdin` 交给 provider CLI，不能放进命令参数。

## 事件契约

provider 必须输出归一化 `AgentEvent`：

- `run.started`
- `conversation.updated`
- `status.updated`
- `item.completed`
- `output.delta`
- `usage.updated`
- `run.completed`
- `run.failed`

`AgentsSDK.toResult` 会按事件聚合文本、usage 和最新 conversation。若 provider 先发 `usage.updated`，最后 `run.completed` 未携带 usage，已有 usage 会保留。

## 公共边界

包入口不导出旧 adapter 兼容符号。调用方应使用：

- `AgentsSDK.create()` 管理 provider 注册。
- `AgentsSDK.mockProvider()` 创建测试 provider。
- `AgentsSDK.collect()` 收集事件流。
- `AgentProvider` 实现 provider 契约。
