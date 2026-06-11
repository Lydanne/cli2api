# Client API Guide

本页面面向下游 API 调用方。你只需要三项信息：

- Base URL，例如 `http://127.0.0.1:3000`
- Bearer token，由管理员在 dashboard 创建
- Model id，对应管理员暴露的 profile id

不要把 `CLI2API_HOME`、`~/.cli2api`、Codex auth home 或 runtime workspace 配给下游调用方；这些是服务端运行状态。

## 认证

所有下游接口使用 Bearer token：

```http
Authorization: Bearer <token>
```

也兼容部分 OpenAI 客户端常见 header，但推荐使用标准 `Authorization`。

## 列出模型

```bash
curl http://127.0.0.1:3000/v1/models \
  -H "Authorization: Bearer $CLI2API_TOKEN"
```

返回：

```json
{
  "object": "list",
  "data": [
    {
      "object": "model",
      "id": "gpt-5.5",
      "created": 0,
      "owned_by": "cli2api",
      "permission": [],
      "permissions": []
    }
  ]
}
```

## Responses API

```bash
curl http://127.0.0.1:3000/v1/responses \
  -H "Authorization: Bearer $CLI2API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "input": "写一个 TypeScript hello world"
  }'
```

常用请求字段：

- `model`: profile id。
- `input`: 字符串，或可被转换为文本的数组/对象。
- `stream`: `true` 时返回 SSE。
- `user`: 下游用户 id，用于显式 session affinity。
- `sessionId` / `conversationId`: 下游会话 id。
- `metadata.sessionId` / `metadata.conversationId`: OpenAI-compatible 客户端可用的会话字段。

返回：

```json
{
  "id": "run-id",
  "object": "response",
  "status": "completed",
  "model": "gpt-5.5",
  "output_text": "text",
  "usage": {
    "prompt_tokens": 1,
    "completion_tokens": 2,
    "total_tokens": 3
  }
}
```

## Chat Completions API

```bash
curl http://127.0.0.1:3000/v1/chat/completions \
  -H "Authorization: Bearer $CLI2API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "messages": [
      { "role": "user", "content": "解释一下 session affinity" }
    ]
  }'
```

返回：

```json
{
  "id": "run-id",
  "object": "chat.completion",
  "created": 0,
  "model": "gpt-5.5",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "text"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 1,
    "completion_tokens": 2,
    "total_tokens": 3
  }
}
```

## Legacy Completions API

```bash
curl http://127.0.0.1:3000/v1/completions \
  -H "Authorization: Bearer $CLI2API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "prompt": "hello"
  }'
```

该接口用于兼容旧客户端。新接入优先使用 Responses 或 Chat Completions。

## Native Run API

Native API 直接暴露 cli2api 的 run 模型：

```bash
curl http://127.0.0.1:3000/api/runs \
  -H "Authorization: Bearer $CLI2API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "gpt-5.5",
    "prompt": "hello",
    "user": "user-1",
    "sessionId": "chat-1"
  }'
```

查看 run：

```bash
curl http://127.0.0.1:3000/api/runs/<run-id> \
  -H "Authorization: Bearer $CLI2API_TOKEN"
```

查看事件：

```bash
curl http://127.0.0.1:3000/api/runs/<run-id>/events \
  -H "Authorization: Bearer $CLI2API_TOKEN"
```

SSE：

```bash
curl http://127.0.0.1:3000/api/runs/<run-id>/events \
  -H "Authorization: Bearer $CLI2API_TOKEN" \
  -H "Accept: text/event-stream"
```

## Session 行为

只有显式传入下列字段之一时，cli2api 才会把下游会话映射到 provider-native session：

- `user`
- `sessionId`
- `conversationId`
- `metadata.user`
- `metadata.sessionId`
- `metadata.conversationId`

没有显式身份时，请求仍会被记录在默认 affinity scope，但 provider 不会收到 conversation 对象。Codex provider 会使用 `--ephemeral`，避免默认请求共享上游上下文。
