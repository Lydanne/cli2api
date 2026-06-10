# cli2api MVP Design

## Architecture

The MVP is a TypeScript monorepo. `packages/shared` defines stable events, errors, and API DTOs. `packages/agents-sdk` owns adapter interfaces and the Codex SDK integration. `apps/core` owns persistence, auth, quotas, HTTP routes, and CLI commands. `apps/dash` consumes the admin API as an operator console.

## Adapter Model

Adapter profiles are persisted records. Each profile binds an adapter type, model/config defaults, environment variables, sandbox settings, approval policy, and a fixed `cwd`. Runtime requests choose a profile by `model` or explicit `profileId`, but cannot override filesystem access.

The Codex adapter uses `@openai/codex-sdk` by default. A mock adapter is included so tests and demos do not require live Codex credentials.

## API Model

Native API:

- `POST /api/runs`: create a run from a prompt and profile.
- `GET /api/runs/:id`: fetch run state and final output.
- `GET /api/runs/:id/events`: fetch normalized events as JSON or SSE.

Compatibility API:

- `GET /v1/models`: returns enabled profile ids.
- `POST /v1/responses`: maps input to a run and returns final text or SSE.
- `POST /v1/chat/completions`: maps messages to a run and returns final text or SSE.

## Persistence

SQLite stores users, sessions, API keys, adapter profiles, runs, run events, and usage buckets. Drizzle schema definitions are the TypeScript source of truth; migrations are applied by the core CLI.

## Rejected Options

- Raw `codex exec --json` first: rejected because the official SDK already wraps the CLI and provides a Node-friendly interface.
- Request-provided `cwd`: rejected because it expands filesystem access beyond operator-approved adapter profiles.
- Full billing in MVP: rejected to keep the first release focused on controlled execution and observability.
