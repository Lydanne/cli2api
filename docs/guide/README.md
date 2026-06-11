# cli2api User Guide

本目录是 cli2api 当前已落地能力的用户侧使用文档。规格、历史计划和实现证据仍放在 `docs/specs/`；开发者架构和部署细节仍放在 `docs/devs/`。

## 你是哪类用户

- 下游 API 调用方：只需要服务地址、Bearer token 和 model id。阅读 [client-api.md](client-api.md)。
- 平台管理员：需要创建账号池、实例、模型 profile、API key 和查看运行记录。阅读 [admin-dashboard.md](admin-dashboard.md)。
- SDK 使用者：需要在 TypeScript 里统一调用 CLI provider。阅读 [agents-sdk.md](agents-sdk.md)。
- Codex provider 使用者：需要把 Codex CLI 接入 `AgentsSDK`。阅读 [agent-codex.md](agent-codex.md)。
- provider 开发者：需要接入 Claude Code、OpenCode 或其他 CLI。阅读 [provider-development.md](provider-development.md)。

## 推荐阅读顺序

1. [quick-start.md](quick-start.md): 本地启动或 Docker Compose 启动。
2. [admin-dashboard.md](admin-dashboard.md): 完成首次管理员登录、Codex 账号认证、实例和 profile 准备。
3. [client-api.md](client-api.md): 用 OpenAI-compatible API 或 native run API 发起请求。
4. [agents-sdk.md](agents-sdk.md): 直接在代码里使用统一 SDK facade。
5. [agent-codex.md](agent-codex.md): Codex provider 的命令策略和认证方式。
6. [provider-development.md](provider-development.md): 自定义 CLI provider 的契约。
7. [troubleshooting.md](troubleshooting.md): 常见问题排查。

## 当前边界

- 已实现 provider: mock、Codex。
- 已预留但未实现生产包: Claude Code、OpenCode。
- 对外 HTTP 兼容面以 `/v1/responses`、`/v1/chat/completions`、`/v1/completions` 和 `/v1/models` 为主。
- 模型运行模式是只读 model serving。请求不能覆盖 `cwd`、sandbox、approval policy 或额外目录。
- 只有显式传入 `user`、`sessionId` 或 `conversationId` 的请求会映射 provider-native session；默认请求是 stateless。
