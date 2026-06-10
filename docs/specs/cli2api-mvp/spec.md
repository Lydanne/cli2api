# cli2api MVP Spec

## Context

- The repository starts as a minimal Node project.
- The first product goal is a local, private control plane that exposes Codex CLI as managed HTTP APIs.
- The implementation must support future CLI adapters without coupling callers to Codex-specific event shapes.

## Goal

- Provide a runnable pnpm monorepo with `agents-sdk`, `core`, `dash`, and `shared` workspaces.
- Let an operator create users, API keys, and adapter profiles.
- Let downstream API keys call native run APIs and minimal OpenAI-compatible endpoints.
- Record runs, events, usage, and quota failures in SQLite.

## Scope

- In scope:
  - Codex SDK-backed adapter plus a mock adapter for tests and local smoke flows.
  - Elysia server on Node using SQLite through Drizzle.
  - Cookie-session admin API and bearer-token downstream API.
  - First-login admin bootstrap when the user table is empty.
  - Quota checks for concurrent runs, requests per minute, daily runs, and monthly tokens.
  - Vite/Vue dashboard for overview, runs, API keys, users, and adapter profiles.
  - Docker Compose packaging and a root `deploy.sh` helper for local operations.
- Allowed write paths:
  - `packages/**`, `apps/**`, `docs/**`, `.agents/**`, root workspace config, and root tests/config.
- Read-only context:
  - `LICENSE` and existing git history.

## Non-goals

- No payment, recharge, balance, or pricing model in MVP.
- No upstream account pool scheduling.
- No distributed multi-instance quota consistency.
- No full OpenAI tool/function calling parity.
- No request-controlled working directory.

## Acceptance Criteria

- [ ] `pnpm install` installs the workspace.
- [x] `pnpm build` type-checks and builds every package.
- [x] `pnpm test` passes unit tests.
- [x] `pnpm test:coverage` enforces at least 60% coverage.
- [x] `pnpm test:e2e` covers login, API key creation, adapter profile creation, run creation, and event viewing.
- [x] `/api/runs`, `/v1/responses`, and `/v1/chat/completions` all map to the same internal run service.
- [x] API key quota failures return stable machine-readable errors and write run or usage evidence where applicable.
- [x] No request payload can override adapter profile `cwd`.
- [x] Downstream API keys can only read runs and events created by the same key.
- [x] Admin dashboard users can inspect stored run events without needing the downstream key token.
- [x] The first login against an empty user table creates an admin account and starts an admin session.
- [x] Operators can revoke API keys and inspect usage buckets from the dashboard.
- [x] `docker compose` can build and run API plus dashboard services with persistent SQLite storage.
- [x] `./deploy.sh` supports `deploy`, `build`, `up`, `down`, `restart`, `status`, `logs`, `test`, and `help`.

## Open Questions

- None blocking MVP implementation. Later releases can decide account-pool scheduling and billing.
