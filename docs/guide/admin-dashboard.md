# Admin Dashboard Guide

本页说明管理员如何通过 dashboard 把上游 CLI 账号变成可供下游调用的 model API。

## 首次登录

启动服务后打开 dashboard：

- 本地单进程默认：`http://127.0.0.1:3000`
- Docker Compose 默认 dashboard：`http://127.0.0.1:5173`

当数据库没有用户时，首次登录填写的邮箱和密码会创建管理员账号。之后需要用该账号登录。

## 上游账号

进入 `上游账号` 页面，创建 Codex 账号：

- `id`: 稳定账号 id，例如 `codex-main`。
- `providerType`: 当前生产 provider 使用 `codex`。
- `name`: 页面展示名称。

创建后执行网页认证：

1. 点击认证操作。
2. 打开返回的 `authUrl`。
3. 输入页面显示的 `userCode`。
4. 回到 dashboard 刷新认证状态。
5. 状态为 `authenticated` 后，账号才能绑定实例。

账号认证状态和 auth home 属于服务端运行状态。不要把 auth home 暴露给下游 API 用户。

## 实例池

进入 `实例池` 创建可调度实例：

- `accountId`: 已认证上游账号。
- `type`: provider 类型，例如 `codex`。
- `name`: 实例展示名。
- `maxConcurrentRuns`: 最大并发运行数。
- `config`: provider 非敏感配置，例如 `{ "model": "gpt-5.5" }`。

实例的工作目录由服务端分配。即使请求或后台表单传入 `cwd`、sandbox、approval policy，model serving 仍使用服务端安全策略：只读 sandbox、`approvalPolicy=never`、不增加额外目录。

## Profiles

Profile 是下游看到的 model id。下游请求里的 `model` 或 native `profileId` 会映射到 profile。

常见方式：

- 在 `Profiles` 页面导入 provider-backed models。
- 手动创建 profile。

Codex model discovery 来自 `codex debug models`，cli2api 只保留 slug/name/config，并过滤隐藏或 API 不支持的条目。

Profile 关键字段：

- `id`: 下游 model id。
- `type`: provider 类型。
- `name`: 展示名。
- `enabled`: 是否对下游可见。
- `config`: provider 非敏感配置。

## API Keys

进入 `API Keys` 页面创建下游 token。创建结果只会显示一次 token；之后只保存 prefix 和 hash，不保存明文 token。

可配置限制：

- `maxConcurrentRuns`
- `rpmLimit`
- `dailyRunLimit`
- `monthlyTokenLimit`

交付给下游用户时，只给：

- Base URL
- Bearer token
- Model id

## Runs 和 Events

`Runs` 页面显示每次调用的状态、profile、输出、错误和 usage。事件列表包含 provider 归一化事件，例如：

- `run.started`
- `conversation.updated`
- `status.updated`
- `output.delta`
- `usage.updated`
- `run.completed`
- `run.failed`

## Sessions

`Sessions` 页面显示自动创建的 downstream session affinity：

- `apiKeyId`
- `profileId`
- `userId`
- `sessionId`
- `upstreamInstanceId`
- `providerSessionId`
- `runCount`

provider-native session 是实例本地状态。pinned 实例满载时，临时 overflow run 不会复用 pinned provider session。pinned 实例不健康并发生 rebind 时，旧 provider session 映射会被清空，再由新实例创建新的 provider session。

## Route Bindings

Route binding 可以把某个 profile 固定到某个上游实例。适用于：

- 灰度某个账号。
- 把不同 model id 固定到不同实例。
- 临时隔离某个 profile 的运行容量。

如果没有显式 route binding，调度器会在匹配 provider type 的健康实例里选择可用容量。
