# Upstream Account Pool Tasks

## Phase 1: Agents SDK Auth Foundation

- [x] Add provider-neutral auth types to `packages/agents-sdk`.
- [x] Add a testable auth command runner boundary.
- [x] Implement Codex auth provider command construction and output parsing.
- [x] Export auth contracts from `@cli2api/agents-sdk`.
- [x] Add unit tests without invoking real Codex auth.

## Phase 2: Core Account Pool

- [ ] Add shared DTOs and error codes for upstream auth and scheduling.
- [ ] Add SQLite tables and migrations for upstream accounts, auth sessions, and
  instances.
- [ ] Add services for account persistence and auth session lifecycle.
- [ ] Add admin APIs for account creation, auth start/status/cancel, logout, and
  instance CRUD.
- [ ] Add scheduler service and record `upstreamInstanceId` on runs.

## Phase 3: Dashboard Chinese-first Operations UI

- [ ] Add dashboard i18n with `zh-CN` default and `en-US` fallback.
- [ ] Replace MVP English copy with Chinese primary labels.
- [ ] Add upstream account auth flow pages.
- [ ] Add instance pool and route management pages.
- [ ] Expand runs, API keys, and users pages for production operations.

## Phase 4: Deployment And Evidence

- [ ] Persist `/data/codex-homes` in Compose deployment.
- [ ] Document Codex browser/device auth from the dashboard.
- [ ] Run build, unit, coverage, E2E, lint, and file-size checks.
- [ ] Verify dashboard language switching and auth flow with mocked Codex auth.

## Allowed Write Areas

- `packages/agents-sdk/**`
- `packages/shared/**`
- `apps/core/**`
- `apps/dash/**`
- `docs/**`
- Root workspace and test configuration files

## Required Commands

```bash
pnpm build
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm lint
pnpm check:file-size
```
