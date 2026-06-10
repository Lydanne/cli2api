# Testing Guide

## Commands

```bash
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm lint
pnpm check:file-size
```

## Coverage Gate

Coverage thresholds are 60% for lines, functions, statements, and branches. The gate is intentionally modest for MVP but mandatory.

## E2E Scope

Playwright covers the operator-critical backend flow:

- first-login admin bootstrap and login
- create API key
- create adapter profile
- trigger a run
- read run events

The mock adapter keeps E2E deterministic and avoids live Codex credentials.

## Commit Gate

Use `pnpm commit` to create Conventional Commit messages through Commitizen.
Direct `git commit` is also allowed, but `commit-msg` runs commitlint and rejects
messages that do not match the conventional format.

The pre-commit hook runs:

```bash
pnpm lint
pnpm check:file-size
```
