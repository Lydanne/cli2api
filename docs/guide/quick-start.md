# Quick Start

本指南用于把 cli2api 在本机跑起来，并完成一次最小调用。

## 环境要求

- Node.js `>=22.12.0`
- pnpm `10.22.0`
- 如果使用 Codex provider，需要可用的 Codex CLI 认证流程。仓库通过 `@openai/codex-sdk` 提供 bundled Codex CLI shim。

## 本地启动

```bash
pnpm install
pnpm build
pnpm --filter @cli2api/core cli migrate
pnpm --filter @cli2api/core cli serve --host 127.0.0.1 --port 3000
```

打开 `http://127.0.0.1:3000`。当数据库没有用户时，第一次登录会创建管理员账号。

本地服务状态默认在 `~/.cli2api` 下，包括 SQLite、上游账号认证目录、运行工作区、临时文件和可选 `.env`。这些是服务端运行状态，不是下游 API 调用方需要配置的内容。

## Docker Compose 启动

```bash
./deploy.sh deploy
./deploy.sh status
```

默认地址：

- API: `http://127.0.0.1:3000`
- Dashboard: `http://127.0.0.1:5173`

修改端口：

```bash
CLI2API_PUBLISHED_PORT=8080 CLI2API_DASH_PUBLISHED_PORT=8081 ./deploy.sh deploy
```

更多部署细节见 [../devs/deployment.md](../devs/deployment.md)。

## 首次配置流程

1. 打开 dashboard 并创建管理员。
2. 在 `上游账号` 创建 Codex 账号。
3. 点击网页认证，按页面提示打开认证 URL 并输入 user code。
4. 刷新认证状态直到账号变为 `authenticated`。
5. 在 `实例池` 创建一个绑定该账号的实例。
6. 在 `Profiles` 导入或创建可对外暴露的 model profile。
7. 在 `API Keys` 创建下游调用 token。
8. 把 base URL、Bearer token、model id 给下游调用方。

## 最小 API 调用

```bash
curl http://127.0.0.1:3000/v1/responses \
  -H "Authorization: Bearer $CLI2API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "input": "用一句话介绍 cli2api"
  }'
```

返回体是 OpenAI-compatible Responses 风格，核心字段是 `id`、`status`、`model`、`output_text` 和 `usage`。
