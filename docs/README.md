# cli2api Documentation

cli2api turns coding-agent CLIs into managed HTTP APIs with a local operations dashboard.

## Quick Start

```bash
pnpm install
pnpm build
pnpm --filter @cli2api/core cli migrate
pnpm --filter @cli2api/core cli serve --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` for the dashboard after `apps/dash` is built. The
first login creates the administrator account when the database has no users.

Local service state defaults to `~/.cli2api`. The core service also reads an
optional `~/.cli2api/.env` before applying process environment overrides.

## Documentation Map

- `docs/guide/`: user-facing setup, operations, client API, SDK, and provider guides.
- `docs/specs/`: specifications, architecture decisions, tasks, and evidence.
- `docs/devs/`: developer-facing architecture, testing, and extension notes.
- `docs/devs/deployment.md`: Docker Compose and `deploy.sh` operations.

## User Guides

- [Guide index](guide/README.md): recommended reading order and current boundaries.
- [Quick start](guide/quick-start.md): local and Docker first-run setup.
- [Client API](guide/client-api.md): OpenAI-compatible requests and native run events.
- [Admin dashboard](guide/admin-dashboard.md): accounts, instances, profiles, keys, sessions, and runs.
- [Agents SDK](guide/agents-sdk.md): public facade for provider-neutral CLI agent usage.
- [Codex provider](guide/agent-codex.md): Codex CLI provider behavior and safe defaults.
- [Provider development](guide/provider-development.md): custom provider package conventions.
- [Troubleshooting](guide/troubleshooting.md): common setup, routing, auth, and streaming issues.

## MVP Scope

- Minimal text-model API through `/v1/responses` and `/v1/chat/completions`.
- Multi-user downstream API keys with quotas.
- Public model profiles routed to service-owned upstream account capacity.
- Sub2API-style management dashboard for operators.
