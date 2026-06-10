# Upstream Session Affinity Tasks

## Phase 1: Core Contract And Persistence

- [x] Add shared run-session response types and request identity fields.
- [x] Add `upstream_run_sessions` schema and migration SQL.
- [x] Add core tests for automatic session creation, sticky reuse, multiple
  sessions per user, and reset behavior.

## Phase 2: Scheduler Affinity

- [x] Extend `RunService` to normalize `user` and session ids from native and
  OpenAI-compatible requests.
- [x] Extend `UpstreamService.selectForProfile` to accept optional session
  affinity input.
- [x] Implement rendezvous-hash initial assignment and sticky-with-overflow
  reuse.
- [x] Keep existing route-binding narrowing compatible.

## Phase 3: Admin API And Dashboard

- [x] Add admin APIs for listing and deleting auto-created run sessions.
- [x] Add dashboard API/state methods for session management.
- [x] Replace the route-binding navigation item with a Sessions page.
- [x] Redirect `#/route-bindings` to `#/sessions`.
- [x] Update overview copy/metrics from routed models to active sessions.

## Phase 4: Verification

- [x] Update E2E flow to verify session auto-creation and reset visibility.
- [x] Run `pnpm build`.
- [x] Run `pnpm test`.
- [x] Run `pnpm test:coverage`.
- [x] Run `pnpm test:e2e`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm check:file-size`.
- [x] Run `git diff --check`.

## Allowed Write Areas

- `packages/shared/**`
- `apps/core/**`
- `apps/dash/**`
- `docs/specs/upstream-session-affinity/**`
- Existing E2E tests
