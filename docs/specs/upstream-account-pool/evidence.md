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
