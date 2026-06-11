# OpenAI Compatible Surface Design

## Source Alignment

The official OpenAI API reference exposes model, Responses, Chat Completions,
legacy Completions, files, batches, images, audio, embeddings, moderation,
fine-tuning, vector stores, realtime, Assistants/Threads, and organization
families. The `openai-openapi` repository also publishes a machine-readable
`openapi.yaml` used as a path inventory.

cli2api will not claim product-family support it cannot provide. This slice
implements text-run mappings and registers explicit unsupported responses for
the largest unsupported families so OpenAI-compatible clients receive stable
machine-readable errors.

## Text Endpoint Mapping

- `GET /v1/models`: existing list of enabled profiles.
- `GET /v1/models/:model`: resolves one enabled profile and returns a model
  object.
- `POST /v1/responses`: creates an internal run from `input`.
- `GET /v1/responses/:response_id`: resolves a stored run owned by the bearer
  key and returns the same Responses payload shape used by create.
- `GET /v1/responses/:response_id/input_items`: returns an OpenAI list object
  with one message-like item containing the stored prompt.
- `POST /v1/chat/completions`: creates an internal run from `messages`.
- `GET /v1/chat/completions/:completion_id`: resolves a stored run owned by the
  bearer key and returns the same Chat Completions payload shape used by create.
- `GET /v1/chat/completions/:completion_id/messages`: returns an OpenAI list
  object with one user message containing the stored prompt.
- `POST /v1/completions`: maps the legacy `prompt` field to one internal run and
  returns a legacy completion payload.

Create endpoints keep existing `user` and `metadata.sessionId` /
`metadata.conversationId` behavior so upstream session affinity remains
compatible with prior OpenAI-compatible requests.

## Error Shape

`/v1` endpoints return errors shaped like:

```json
{
  "error": {
    "message": "Run not found: abc",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_request"
  }
}
```

`Cli2ApiError` codes remain the internal source of truth. The `/v1` serializer
normalizes codes to lowercase and maps unsupported compatibility families to
`unsupported_endpoint`.

## Unsupported Families

Unsupported route handlers still require bearer auth, then return `501` with
`unsupported_endpoint`. This avoids leaking endpoint availability to unauthenticated
callers and keeps SDK failures deterministic.

Covered unsupported families in this slice:

- Embeddings and moderations.
- Images, audio, files, uploads, batches, fine-tuning, vector stores.
- Assistants, threads, containers, conversations, evals, realtime, videos,
  skills, ChatKit, and organization/admin endpoints.

## Rejected Options

- Returning 404 for every unimplemented OpenAI path: rejected because SDKs and
  operators cannot distinguish a typo from an intentionally unsupported family.
- Claiming stub success for files, images, audio, or vector stores: rejected
  because cli2api has no storage or multimodal backend for those contracts.
- Implementing all OpenAPI paths in one slice: rejected because many families
  require new storage, async queues, realtime transports, or organization
  authorization models.

## Rollback Notes

The slice adds HTTP routes and helpers only. No database migration is required.
Rollback can remove the new `/v1` routes and helper functions without touching
stored run/profile data.
