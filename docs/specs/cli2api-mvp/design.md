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

Downstream native run reads are scoped to the authenticated API key that created
the run. Cross-key reads return the same not-found style error as missing runs so
run ids are not exposed across tenants.

Admin API:

- `GET /api/admin/runs`: list stored run state for operators.
- `GET /api/admin/runs/:id/events`: fetch stored run events through the admin session.
- `GET /api/admin/usage`: list usage buckets for operator quota inspection.
- `POST /api/admin/api-keys/:id/revoke`: revoke a downstream API key.

Compatibility API:

- `GET /v1/models`: returns enabled profile ids.
- `POST /v1/responses`: maps input to a run and returns final text or SSE.
- `POST /v1/chat/completions`: maps messages to a run and returns final text or SSE.

## Persistence

SQLite stores users, sessions, API keys, adapter profiles, runs, run events, and usage buckets. Drizzle schema definitions are the TypeScript source of truth; migrations are applied by the core CLI.

Quota failures are recorded as failed runs when the request has a valid API key,
prompt, and adapter profile. The failed run stores the stable error code and a
`run.failed` event so operators can audit why a downstream request was blocked.

## Deployment

The local deployment package uses Docker Compose with one `api` service. The
image builds all pnpm workspaces, includes `apps/dash/dist`, and runs the core
server with `CLI2API_DASH_DIST` pointing at the built dashboard assets. SQLite
data is stored in a named Compose volume mounted at `/data`.

The root `deploy.sh` helper wraps common Compose operations. `deploy` builds the
image, recreates services, and waits for `/api/health`. `status` prints Compose
state and the API health response. `test` stays repo-native and runs `pnpm test`
instead of invoking Docker so it remains useful during local development.

## Rejected Options

- Raw `codex exec --json` first: rejected because the official SDK already wraps the CLI and provides a Node-friendly interface.
- Request-provided `cwd`: rejected because it expands filesystem access beyond operator-approved adapter profiles.
- Full billing in MVP: rejected to keep the first release focused on controlled execution and observability.
