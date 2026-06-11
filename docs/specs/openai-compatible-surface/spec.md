# OpenAI Compatible Surface Spec

## Context

- cli2api exposes downstream APIs under `/v1` so OpenAI-compatible clients can
  call local model-serving capacity with cli2api API keys.
- The current implementation supports only `GET /v1/models`,
  `POST /v1/responses`, and `POST /v1/chat/completions`.
- Operators now copy `/v1` as the client base URL from the dashboard, so common
  OpenAI SDK probes and adjacent endpoints should return useful, predictable
  responses instead of accidental 404s.
- The official OpenAI API reference and OpenAPI description include many product
  families. cli2api can only execute text-generation runs today.

## Goal

- Broaden `/v1` compatibility for text-generation clients while preserving the
  model-serving safety boundary.
- Return OpenAI-shaped payloads and errors for `/v1` endpoints.
- Make unsupported OpenAI product families explicit and machine-readable.

## Scope

- In scope:
  - `GET /v1/models` and `GET /v1/models/:model`.
  - `POST /v1/responses`, `GET /v1/responses/:response_id`, and
    `GET /v1/responses/:response_id/input_items`.
  - `POST /v1/chat/completions`, `GET /v1/chat/completions/:completion_id`, and
    `GET /v1/chat/completions/:completion_id/messages`.
  - Legacy `POST /v1/completions` mapped to the same internal run service.
  - OpenAI-shaped error responses for `/v1` failures.
  - Explicit `unsupported_endpoint` responses for OpenAI families that have no
    cli2api backend capability in this slice.
  - Tests proving successful mappings, retrieve/list behavior, ownership checks,
    and unsupported endpoint shape.
- Out of scope:
  - File storage, uploads, vector stores, images, audio, realtime, fine-tuning,
    evals, organization admin APIs, Assistants/Threads state, or batch queues.
  - Full Responses API tool calling, structured output parity, multimodal input,
    background jobs, webhooks, or realtime streaming.
  - Changing native `/api/runs` contracts.

## Acceptance Criteria

- [x] `/v1/models/:model` returns an enabled profile as an OpenAI model object
  and returns an OpenAI-shaped 404 for unknown or disabled models.
- [x] `/v1/responses/:response_id` returns the stored run for the owning API key
  in Responses payload shape.
- [x] `/v1/responses/:response_id/input_items` returns a list containing the
  original text input for the owning API key.
- [x] `/v1/chat/completions/:completion_id` returns the stored run in Chat
  Completions payload shape.
- [x] `/v1/chat/completions/:completion_id/messages` returns a list containing
  the stored prompt as a user message.
- [x] `/v1/completions` creates a run from `prompt` and returns a legacy
  completion payload.
- [x] Missing/invalid bearer tokens and missing resources under `/v1` use
  OpenAI-shaped error bodies.
- [x] Unsupported OpenAI endpoint families return `501` with
  `error.code="unsupported_endpoint"` after API key authentication.
- [x] Existing session-affinity metadata behavior for OpenAI-compatible requests
  remains unchanged.

## Open Questions

- None blocking this compatibility slice.
