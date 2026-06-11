# agents-sdk Process Runtime Evidence

## Required Verification

- `pnpm build`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm test:e2e`
- `pnpm lint`
- `pnpm check:file-size`

## Evidence Log

- 2026-06-11: Baseline `pnpm test` before implementation passed: 13 test
  files, 75 tests.
- 2026-06-11: RED check for new process/provider/session tests failed for the
  expected missing runtime symbols and provider-session fields.
- 2026-06-11: Targeted implementation check passed:
  `pnpm vitest run packages/agents-sdk/src/process-runner.spec.ts
  packages/agents-sdk/src/index.spec.ts
  packages/agent-codex/src/codex-provider.spec.ts
  packages/agent-codex/src/auth-provider.spec.ts apps/core/src/upstream.spec.ts
  apps/core/src/core.spec.ts apps/dash/src/lib/dashboard-state.spec.ts
  apps/dash/src/lib/api.spec.ts` returned 8 files and 61 tests passing.
- 2026-06-11: `pnpm build` passed for shared, agents-sdk, agent-codex, core,
  and dash.
- 2026-06-11: `pnpm test` passed: 15 test files, 82 tests.
- 2026-06-11: `pnpm test:coverage` passed: statements 83.19%, branches
  66.76%, functions 89.17%, lines 83.96%.
- 2026-06-11: `pnpm test:e2e` passed: 2 Playwright tests. The web server
  printed the existing `NO_COLOR`/`FORCE_COLOR` warning only.
- 2026-06-11: `pnpm lint` passed with `eslint . --max-warnings 0`.
- 2026-06-11: `pnpm check:file-size` passed; all checked source files are at or
  below 1300 lines.
- 2026-06-11: Review-fix RED check
  `pnpm vitest run apps/core/src/upstream.spec.ts
  packages/agent-codex/src/codex-provider.spec.ts` failed as expected:
  unhealthy rebind still passed the old provider session id, saturated overflow
  still received the pinned conversation, and Codex model discovery still
  returned hidden/API-unsupported models.
- 2026-06-11: Review-fix targeted GREEN check
  `pnpm vitest run apps/core/src/upstream.spec.ts
  packages/agent-codex/src/codex-provider.spec.ts` passed: 2 files, 21 tests.
- 2026-06-11: Review-fix test-file split check
  `pnpm vitest run apps/core/src/upstream.spec.ts` passed: 1 file, 17 tests.
  `wc -l apps/core/src/upstream.spec.ts
  apps/core/src/testing/upstream-harness.ts` reported 865 and 197 lines.
- 2026-06-11: Review-fix `pnpm build` passed for shared, agents-sdk,
  agent-codex, core, and dash.
- 2026-06-11: Review-fix `pnpm test` passed: 15 test files, 82 tests.
- 2026-06-11: Review-fix `pnpm test:coverage` passed: statements 83.26%,
  branches 67.05%, functions 89.17%, lines 84.03%.
- 2026-06-11: Review-fix `pnpm test:e2e` passed: 2 Playwright tests. The web
  server printed the existing `NO_COLOR`/`FORCE_COLOR` warning only.
- 2026-06-11: Review-fix `pnpm lint` passed with
  `eslint . --max-warnings 0`.
- 2026-06-11: Review-fix `pnpm check:file-size` passed; all checked source
  files are at or below 1300 lines.
