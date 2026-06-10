# Upstream Account Pool Tasks

## Phase 1: Agents SDK Auth Foundation

- [x] Add provider-neutral auth types to `packages/agents-sdk`.
- [x] Add a testable auth command runner boundary.
- [x] Implement Codex auth provider command construction and output parsing.
- [x] Export auth contracts from `@cli2api/agents-sdk`.
- [x] Add unit tests without invoking real Codex auth.

## Phase 2: Core Account Pool

- [x] Add shared DTOs and error codes for upstream auth and scheduling.
- [x] Add SQLite tables and migrations for upstream accounts, auth sessions, and
  instances.
- [x] Add services for account persistence and auth session lifecycle.
- [x] Add admin APIs for account creation, auth start/status/cancel, and
  instance create/list.
- [x] Add scheduler service and record `upstreamInstanceId` on runs.
- [x] Add logout, instance update/disable, and explicit route-assignment APIs.

## Phase 3: Dashboard Chinese-first Operations UI

- [x] Add dashboard i18n with `zh-CN` default and `en-US` fallback.
- [x] Replace MVP English copy with Chinese primary labels.
- [x] Add upstream account auth flow pages.
- [x] Add instance pool page.
- [x] Add route management page.
- [x] Expand API keys and users pages for production operations.
- [x] Replace bespoke dashboard forms/tables with PrimeVue controls for the main
  management surface.
- [x] Add Vue Router hash-history dashboard navigation so direct links and
  refresh keep the selected page.
- [x] Restore an existing admin session during dashboard boot.

## Phase 4: Deployment And Evidence

- [x] Persist `/data/codex-homes` in Compose deployment.
- [x] Document Codex browser/device auth from the dashboard.
- [x] Run build, unit, coverage, E2E, lint, and file-size checks.
- [x] Verify dashboard language switching and auth flow with mocked Codex auth.
- [x] Rebuild and redeploy Compose services after dashboard UI changes.
- [x] Exclude workspace `node_modules` directories from Docker build context.

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
