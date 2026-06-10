# cli2api MVP Evidence

This file records verification evidence for the MVP.

## Required Before Handoff

- `pnpm build`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm test:e2e`
- `pnpm check:file-size`

## Evidence Log

- `pnpm build`: passed after TypeScript package export fixes.
- `pnpm test`: 5 test files passed, 18 tests passed.
- `pnpm test:coverage`: passed with statements 76%, branches 62.01%, functions 82.4%, lines 76.45%.
- `pnpm test:e2e`: 2 Playwright E2E tests passed, covering API and dashboard flows.
- `pnpm check:file-size`: all checked source files are <= 1300 lines.

## MVP Hardening Evidence

- `pnpm vitest run apps/core/src/core.spec.ts apps/dash/src/lib/api.spec.ts`:
  failed first with 4 expected failures covering missing quota evidence,
  cross-key run reads, missing admin usage API, and dashboard facade still using
  downstream event reads.
- `pnpm vitest run apps/core/src/core.spec.ts apps/dash/src/lib/api.spec.ts`:
  passed after implementing run ownership checks, quota failed-run evidence,
  admin events/usage/revoke APIs, and the dashboard API facade.
- `pnpm build`: passed after TypeScript and Vue integration.
- `pnpm test:e2e`: passed with 2 Playwright tests, including dashboard event
  viewing and API key revocation.
- `pnpm test`: passed with 5 test files and 20 tests.
- `pnpm test:coverage`: passed with statements 78.71%, branches 63.18%,
  functions 82.17%, and lines 79.09%.
- `pnpm lint`: passed.
- `pnpm check:file-size`: all checked source files are <= 1300 lines.

## Docker Compose Deployment Evidence

- `pnpm vitest run apps/core/src/deploy-script.spec.ts`: failed first because
  root `deploy.sh` did not exist.
- `pnpm vitest run apps/core/src/deploy-script.spec.ts`: passed after adding
  root `deploy.sh`.
- `./deploy.sh help`: passed and printed the documented command list.
- `bash -n deploy.sh`: passed.
- `docker compose -f compose.yaml config`: failed first because the healthcheck
  command needed explicit string quoting.
- `docker compose -f compose.yaml config`: passed after quoting the healthcheck
  command.
- `./deploy.sh build`: not completed because Docker daemon was not running:
  `Cannot connect to the Docker daemon at unix:///Users/x-lyda/.docker/run/docker.sock`.
- `pnpm build`: passed.
- `pnpm test`: passed with 6 test files and 21 tests.
- `./deploy.sh test`: passed and ran `pnpm test` with 6 test files and 21 tests.
- `pnpm test:coverage`: passed with statements 78.71%, branches 63.18%,
  functions 82.17%, and lines 79.09%.
- `pnpm test:e2e`: passed with 2 Playwright tests.
- `pnpm lint`: passed.
- `pnpm check:file-size`: all checked source files are <= 1300 lines.
