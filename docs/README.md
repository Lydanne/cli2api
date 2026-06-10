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

## Documentation Map

- `docs/specs/`: specifications, architecture decisions, tasks, and evidence.
- `docs/devs/`: developer-facing architecture, testing, and extension notes.
- `docs/devs/deployment.md`: Docker Compose and `deploy.sh` operations.

## MVP Scope

- Base-model style API through `/v1/responses` and `/v1/chat/completions`.
- Multi-user downstream API keys with quotas.
- Public model profiles routed to service-owned upstream account capacity.
- Sub2API-style management dashboard for operators.
