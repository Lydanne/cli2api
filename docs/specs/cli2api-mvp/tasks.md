# cli2api MVP Tasks

- [x] Create repo standards, skills, and docs.
- [x] Add pnpm workspace, TypeScript, Vitest, and Playwright configuration.
- [x] Implement shared event, error, and DTO contracts.
- [x] Implement adapter SDK with mock and Codex adapters.
- [x] Implement core SQLite schema, migration, auth, quotas, run service, routes, and CLI.
- [x] Implement dashboard views and API client.
- [x] Add unit tests and E2E tests.
- [x] Run build, unit tests, coverage, E2E, and file-size checks.

## MVP Hardening Slice

- [x] Add failing tests for downstream run ownership isolation.
- [x] Add failed-run/event evidence for quota failures.
- [x] Add admin APIs for run events, usage buckets, and API key revoke.
- [x] Add dashboard event viewing, usage display, and API key revoke controls.
- [x] Run targeted and full verification commands.

## Docker Compose Deployment Slice

- [x] Add failing deploy helper tests.
- [x] Add Dockerfile, `.dockerignore`, and Compose service definition.
- [x] Add root `deploy.sh` with documented operational commands.
- [x] Update docs and evidence for deployment commands.
- [x] Run targeted deploy helper tests plus build, unit, coverage, E2E, lint, and file-size checks.

## Allowed Write Areas

- `.agents/**`
- `docs/**`
- `packages/**`
- `apps/**`
- Root workspace and test configuration files

## Required Commands

```bash
pnpm build
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm check:file-size
```
