# Troubleshooting

## 下游请求返回 401

检查：

- `Authorization: Bearer <token>` 是否存在。
- token 是否是创建时返回的完整明文。后台不会再次显示完整 token。
- API key 是否被 revoke 或删除。

## `/v1/models` 没有期望的 model

检查：

- 管理员是否创建或导入了 profile。
- profile 是否 `enabled=true`。
- Codex model discovery 是否过滤掉了隐藏或 API 不支持模型。

## 请求返回 `PROFILE_NOT_FOUND`

下游请求里的 `model` 或 native `profileId` 必须等于 profile id，不是 provider 原始模型名，除非管理员把 profile id 设置成同名。

## 请求返回 `UPSTREAM_UNAVAILABLE`

检查：

- 是否存在 type 匹配的 upstream instance。
- instance 是否 enabled。
- 绑定账号是否 authenticated。
- instance health 是否为 `unknown` 或 `healthy`。
- `currentRuns` 是否已经达到 `maxConcurrentRuns`。
- route binding 是否把 profile 绑定到了不可用实例。

## Codex 账号认证失败

检查：

- 是否按 device auth 页面输入了正确 user code。
- 是否点击了刷新认证状态。
- Docker 镜像中是否有 `ca-certificates`。
- 服务端 auth home 是否存在。

本地和 Docker Compose 默认使用 `CLI2API_HOME=~/.cli2api` 派生状态路径。Compose 容器内等价于 `/root/.cli2api`，并由 `cli2api-home` volume 持久化。

## Docker 升级后账号路径不对

早期部署可能使用过 `/data/codex-homes`。当前服务启动时会把 SQLite 中旧的 `/data/codex-homes/*` auth home 行重写到当前 `CLI2API_AUTH_HOME_BASE`，但不会复制 token 文件。升级前需要手动迁移旧 volume 中的认证文件。

## 默认请求似乎没有上下文

这是预期行为。没有显式传入 `user`、`sessionId` 或 `conversationId` 时，Codex provider 使用 `--ephemeral`，避免所有默认请求共享同一个上游上下文。

需要连续上下文时，在每次请求里传：

```json
{
  "user": "user-1",
  "metadata": {
    "sessionId": "chat-1"
  }
}
```

或 native API：

```json
{
  "user": "user-1",
  "sessionId": "chat-1"
}
```

## SSE 客户端没有收到多段 token

当前 OpenAI-compatible streaming 是最小兼容形态，会把已完成 run 的输出作为 SSE payload 返回，并以 `[DONE]` 结束。它不是 provider token-by-token 透传。

## 管理后台能打开但 API 请求跨域失败

`/v1/*` 返回 OpenAI-compatible CORS headers。Dashboard 的 same-origin 代理由 Compose `dash` 服务处理。如果自定义代理或域名，确认 `/api/` 和 `/v1/` 都转发到 API 服务。

## 验证命令

开发或排查后可运行：

```bash
pnpm build
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm lint
pnpm check:file-size
```
