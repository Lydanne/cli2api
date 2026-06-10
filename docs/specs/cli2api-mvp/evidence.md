# cli2api MVP Evidence

This file records verification evidence for the MVP.

## Required Before Handoff

- `pnpm build`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm test:e2e`
- `pnpm check:file-size`

## Evidence Log

- `pnpm build`: passed.
- `pnpm test`: passed with 6 test files and 24 tests.
- `pnpm test:coverage`: passed with statements 80.48%, branches 64.25%,
  functions 84.61%, and lines 80.64%.
- `pnpm test:e2e`: 2 Playwright E2E tests passed, covering API and dashboard flows.
- `pnpm check:file-size`: all checked source files are <= 1300 lines.

## First-login Admin Evidence

- `pnpm vitest run apps/core/src/core.spec.ts --testNamePattern "bootstraps"`:
  failed first because empty-database login returned 401 instead of creating the
  first admin.
- `pnpm vitest run apps/core/src/core.spec.ts --testNamePattern "bootstraps"`:
  passed after adding empty-user-table bootstrap to `UserService.verifyLogin`.
- `pnpm vitest run apps/core/src/core.spec.ts`: passed with 9 tests, including
  first-login bootstrap and post-bootstrap rejection for a second email.
- `pnpm test:e2e`: passed with no pre-seeded E2E admin user, covering API and
  dashboard login through the bootstrap path.

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
- User-provided `./deploy.sh` output: image built and container started, but
  API health failed because runtime image lacked package-level pnpm
  `node_modules` links for `@elysiajs/node`.
- `./deploy.sh deploy`: after copying package-level pnpm links, API advanced
  past module resolution but failed because `better-sqlite3` native bindings
  were missing in the runtime image.
- `pnpm vitest run apps/core/src/deploy-script.spec.ts`: failed first after
  adding checks for `better-sqlite3` build approval and a dashboard Compose
  service.
- `pnpm vitest run apps/core/src/deploy-script.spec.ts`: passed after adding
  package-level pnpm links, pnpm `onlyBuiltDependencies`, dashboard Nginx config,
  and Compose `dash` service.
- `docker compose -f compose.yaml config`: passed with `api` and `dash` services.
- `./deploy.sh deploy`: passed; built `cli2api-api:local` and
  `cli2api-dash:local`, recreated services, and reported API plus Dashboard
  healthy.
- `./deploy.sh status`: passed; showed `api` and `dash` services healthy.
- `curl -fsS http://127.0.0.1:5173/api/health`: passed and returned
  `{"ok":true,"service":"cli2api-core"}` through the dashboard proxy.

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
