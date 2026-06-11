# cli2api

cli2api turns coding-agent CLIs into managed HTTP APIs with a local operations dashboard.

## Stack

- Node.js, pnpm, TypeScript monorepo
- `packages/agents-sdk`: provider-neutral agent facade, process runner, events, and mock provider
- `packages/agent-codex`: Codex CLI provider for auth, model discovery, and JSONL runs
- `apps/core`: Elysia + Drizzle + SQLite backend and management CLI
- `apps/dash`: Vite 8 + Vue + PrimeVue + Tailwind dashboard

## Quick Start

```bash
pnpm install
pnpm build
pnpm --filter @cli2api/core cli migrate
pnpm --filter @cli2api/core cli serve --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000`. The first login creates the administrator
account when the database has no users.

Local service state defaults to `~/.cli2api`: SQLite, Codex auth homes, runtime
workspaces, temporary files, and an optional `.env` file are read from there.

## Docker Compose

```bash
./deploy.sh deploy
./deploy.sh status
```

The Compose deployment builds separate API and dashboard services. API state is
stored in the `cli2api-home` volume with `CLI2API_HOME=~/.cli2api`. Set
`CLI2API_PUBLISHED_PORT` for the API port and `CLI2API_DASH_PUBLISHED_PORT` for
the dashboard port.

By default, the API is available at `http://127.0.0.1:3000` and the dashboard is
available at `http://127.0.0.1:5173`.

## User Guides

- [Guide index](docs/guide/README.md)
- [Quick start](docs/guide/quick-start.md)
- [Client API](docs/guide/client-api.md)
- [Admin dashboard](docs/guide/admin-dashboard.md)
- [Agents SDK](docs/guide/agents-sdk.md)
- [Codex provider](docs/guide/agent-codex.md)
- [Provider development](docs/guide/provider-development.md)
- [Troubleshooting](docs/guide/troubleshooting.md)

## Verification

```bash
pnpm build
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm lint
pnpm check:file-size
```

## Commits

Use Commitizen for Conventional Commit prompts:

```bash
pnpm commit
```

Commit descriptions and bodies should use Chinese while keeping the conventional
prefix, for example `feat(core): 增加运行队列`.

The repository also installs Husky hooks. `commit-msg` runs commitlint, and
`pre-commit` runs lint plus source file-size checks.

See `docs/README.md` for the documentation map.
