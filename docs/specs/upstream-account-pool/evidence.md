# Upstream Account Pool Evidence

This file records verification evidence for the upstream account pool and
Chinese-first dashboard work.

## Required Before Handoff

- `pnpm build`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm test:e2e`
- `pnpm lint`
- `pnpm check:file-size`

## Evidence Log

- `pnpm vitest run packages/agents-sdk/src/auth.spec.ts`: failed first because
  `CodexAuthProvider` was not implemented or exported.
- `pnpm vitest run packages/agents-sdk/src/auth.spec.ts`: passed after adding
  provider-neutral auth types, a command runner boundary, and Codex auth provider
  command construction/output parsing.
- `pnpm --filter @cli2api/agents-sdk test`: initially failed because the package
  script ran Vitest from the package cwd while root Vitest includes were
  workspace-relative.
- `pnpm --filter @cli2api/agents-sdk test`: passed after making the package
  script use the repository root and explicit agents-sdk spec files.
- `pnpm build`: passed.
- `pnpm test`: passed with 7 test files and 27 tests.
- `pnpm test:coverage`: passed with statements 77.48%, branches 61.06%,
  functions 81.75%, and lines 77.92%.
- `pnpm test:e2e`: passed with 2 Playwright tests.
- `pnpm lint`: passed.
- `pnpm check:file-size`: all checked source files are <= 1300 lines.
- `git diff --check`: passed.
- `pnpm vitest run apps/core/src/upstream.spec.ts`: failed first because
  upstream admin routes were not implemented and returned 404.
- `pnpm vitest run apps/core/src/upstream.spec.ts`: passed after adding shared
  upstream DTOs/errors, SQLite tables, `UpstreamService`, admin routes, scheduler
  selection, capacity handling, and `upstreamInstanceId` run recording.
- `pnpm vitest run apps/dash/src/lib/api.spec.ts`: failed first because the
  dashboard API facade did not expose upstream account/session/instance methods.
- `pnpm vitest run apps/dash/src/lib/api.spec.ts`: passed after adding upstream
  facade methods and lazy Treaty client resolution.
- `pnpm test:e2e`: passed after adding Chinese-first dashboard copy, locale
  switching, upstream account auth UI, instance creation UI, and run instance
  display. The E2E server uses a fake Codex auth provider and does not start
  real Codex authentication.
- `pnpm vitest run apps/core/src/upstream.spec.ts`: failed first for unsafe
  account `authHome` input because the service accepted a path outside the
  configured base directory.
- `pnpm vitest run apps/core/src/upstream.spec.ts`: passed after rejecting
  `authHome` values outside `CLI2API_AUTH_HOME_BASE`.
- `pnpm vitest run apps/core/src/config.spec.ts`: failed first because
  `loadConfig` did not expose `CLI2API_AUTH_HOME_BASE`.
- `pnpm vitest run apps/core/src/config.spec.ts`: passed after adding the config
  field and passing it into server/CLI service creation.
- `pnpm build`: passed; shared, agents-sdk, core, and dashboard production build
  completed.
- `pnpm test`: passed with 9 test files and 35 tests.
- `pnpm test:coverage`: passed with statements 80.13%, branches 64.61%,
  functions 85.56%, and lines 80.43%.
- `pnpm test:e2e`: passed with 2 Playwright tests. The only output warnings were
  `NO_COLOR` being ignored because `FORCE_COLOR` was set.
- `pnpm lint`: passed.
- `pnpm check:file-size`: all checked source files are <= 1300 lines.
- `git diff --check`: passed.
