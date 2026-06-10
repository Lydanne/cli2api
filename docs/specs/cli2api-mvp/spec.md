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
  - Quota checks for concurrent runs, requests per minute, daily runs, and monthly tokens.
  - Vite/Vue dashboard for overview, runs, API keys, users, and adapter profiles.
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
- [ ] `pnpm build` type-checks and builds every package.
- [ ] `pnpm test` passes unit tests.
- [ ] `pnpm test:coverage` enforces at least 60% coverage.
- [ ] `pnpm test:e2e` covers login, API key creation, adapter profile creation, run creation, and event viewing.
- [ ] `/api/runs`, `/v1/responses`, and `/v1/chat/completions` all map to the same internal run service.
- [ ] API key quota failures return stable machine-readable errors and write run or usage evidence where applicable.
- [ ] No request payload can override adapter profile `cwd`.

## Open Questions

- None blocking MVP implementation. Later releases can decide account-pool scheduling and billing.
