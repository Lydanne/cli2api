# Upstream Session Affinity Evidence

This file records verification evidence for automatic upstream session affinity.

## Required Before Handoff

- `pnpm build`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm test:e2e`
- `pnpm lint`
- `pnpm check:file-size`
- `git diff --check`

## Evidence Log

- Added `upstream_run_sessions` persistence and admin APIs:
  - `GET /api/admin/upstream/run-sessions`
  - `DELETE /api/admin/upstream/run-sessions/:id`
- Added automatic affinity normalization from native and OpenAI-compatible run
  requests:
  - `user`
  - `sessionId`
  - `conversationId`
  - `metadata.user`
  - `metadata.sessionId`
  - `metadata.conversationId`
  - missing identity values default to `default`.
- Added sticky-with-overflow scheduling:
  - existing route bindings still narrow candidates when present.
  - healthy pinned sessions reuse their preferred instance.
  - unhealthy pins rebind to another available instance.
  - full but healthy pins can overflow without moving the stored pin.
- Added dashboard session-management route:
  - `#/sessions` lists user, session, profile, instance, run count, last used,
    and reset action.
  - `#/route-bindings` redirects to `#/sessions`.
  - the primary navigation uses Sessions instead of route bindings.
- `pnpm vitest run apps/core/src/upstream.spec.ts`: passed with 1 file and 16
  tests.
- `pnpm build`: passed for shared, agents-sdk, core, and dash.
- `pnpm test`: passed with 12 files and 65 tests.
- `pnpm test:coverage`: passed with statements 83.33%, branches 69.07%,
  functions 89.06%, and lines 83.97%.
- `pnpm test:e2e`: passed with 2 Playwright tests. The command emitted only
  `NO_COLOR` / `FORCE_COLOR` warnings from the web server process.
- `pnpm lint`: passed with zero warnings.
- `pnpm check:file-size`: passed; checked source files are at or below 1300
  lines.
- `git diff --check`: passed.
- `docker compose build api dash`: passed and rebuilt `cli2api-api:local` plus
  `cli2api-dash:local`.
- `docker compose up -d api dash`: recreated and started both containers; the
  api service reached healthy state and dash started.
- Browser verification against `http://127.0.0.1:5173/#/route-bindings`:
  - final URL: `http://127.0.0.1:5173/#/sessions`
  - `会话管理` heading count: 1
  - `nav-sessions` count: 1
  - `nav-routeBindings` count: 0
  - browser console errors: 0
