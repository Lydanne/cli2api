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
- 2026-06-11: Facade RED check
  `pnpm vitest run packages/agents-sdk/src/index.spec.ts
  packages/agent-codex/src/codex-provider.spec.ts` failed as expected because
  `AgentsSDK` and `CodexAgent` static facades were not implemented.
- 2026-06-11: Facade targeted SDK/provider GREEN check
  `pnpm vitest run packages/agents-sdk/src/index.spec.ts
  packages/agent-codex/src/codex-provider.spec.ts` passed: 2 files, 11 tests.
- 2026-06-11: Facade targeted core GREEN check after refreshing package dist
  with `pnpm --filter @cli2api/agent-codex build`:
  `pnpm vitest run apps/core/src/upstream.spec.ts apps/core/src/core.spec.ts`
  passed: 2 files, 32 tests.
- 2026-06-11: Facade usage aggregation RED check
  `pnpm vitest run packages/agents-sdk/src/index.spec.ts` failed as expected
  when a provider emitted `usage.updated` followed by `run.completed` without
  usage; `AgentsSDK.toResult` reset usage to zero.
- 2026-06-11: Facade usage aggregation GREEN check
  `pnpm vitest run packages/agents-sdk/src/index.spec.ts` passed: 1 file,
  6 tests.
- 2026-06-11: Facade `pnpm build` passed for shared, agents-sdk, agent-codex,
  core, and dash.
- 2026-06-11: Facade `pnpm test` passed: 15 test files, 85 tests.
- 2026-06-11: Facade `pnpm test:coverage` passed: statements 83.23%,
  branches 67.54%, functions 88.91%, lines 84.05%.
- 2026-06-11: Facade `pnpm test:e2e` passed: 2 Playwright tests. The web server
  printed the existing `NO_COLOR`/`FORCE_COLOR` warning only.
- 2026-06-11: Facade `pnpm lint` passed with `eslint . --max-warnings 0`.
- 2026-06-11: Facade `pnpm check:file-size` passed; all checked source files
  are at or below 1300 lines.
- 2026-06-11: Facade `git diff --check` passed with no whitespace errors.
- 2026-06-11: Compatibility-removal RED check
  `pnpm vitest run packages/agents-sdk/src/index.spec.ts` failed as expected
  because `AdapterRegistry` was still exported from the package entrypoint.
- 2026-06-11: Compatibility-removal targeted GREEN check
  `pnpm vitest run packages/agents-sdk/src/index.spec.ts
  packages/agent-codex/src/codex-provider.spec.ts` passed: 2 files, 13 tests.
- 2026-06-11: Compatibility-removal `pnpm build` passed for shared,
  agents-sdk, agent-codex, core, and dash.
- 2026-06-11: Compatibility-removal `pnpm test` passed: 15 test files,
  87 tests.
- 2026-06-11: Compatibility-removal `pnpm test:coverage` passed: statements
  83.34%, branches 67.82%, functions 89.39%, lines 84.15%.
- 2026-06-11: Compatibility-removal `pnpm test:e2e` passed: 2 Playwright
  tests. The web server printed the existing `NO_COLOR`/`FORCE_COLOR` warning
  only.
- 2026-06-11: Compatibility-removal `pnpm lint` passed with
  `eslint . --max-warnings 0`.
- 2026-06-11: Compatibility-removal `pnpm check:file-size` passed; all checked
  source files are at or below 1300 lines.
