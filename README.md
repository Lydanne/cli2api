# cli2api

cli2api turns coding-agent CLIs into managed HTTP APIs with a local operations dashboard.

## Stack

- Node.js, pnpm, TypeScript monorepo
- `packages/agents-sdk`: CLI adapter abstraction and Codex SDK integration
- `apps/core`: Elysia + Drizzle + SQLite backend and management CLI
- `apps/dash`: Vite 8 + Vue + PrimeVue + Tailwind dashboard

## Quick Start

```bash
pnpm install
pnpm build
pnpm --filter @cli2api/core cli migrate
pnpm --filter @cli2api/core cli admin create --email admin@example.com --password change-me
pnpm --filter @cli2api/core cli serve --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000`.

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

The repository also installs Husky hooks. `commit-msg` runs commitlint, and
`pre-commit` runs lint plus source file-size checks.

See `docs/README.md` for the documentation map.
