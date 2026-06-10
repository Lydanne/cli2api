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

- `pnpm --filter @cli2api/agents-sdk test`: failed first because the default
  Codex auth executable was the bare `codex` command, which is not present on the
  Compose API image `PATH`.
- `pnpm --filter @cli2api/agents-sdk test`: passed after resolving the bundled
  `@openai/codex-sdk` CLI shim before falling back to `codex`.
- `pnpm build`: passed after the bundled Codex CLI resolver change.
- `docker compose -f compose.yaml build api`: passed and rebuilt
  `cli2api-api:local`.
- `docker run --rm --entrypoint node cli2api-api:local ...`: passed; the runtime
  `CodexAuthProvider` resolved
  `/app/node_modules/.pnpm/@openai+codex-sdk@0.139.0/node_modules/@openai/codex-sdk/node_modules/.bin/codex`
  and that executable had execute permissions.
- `docker run --rm --entrypoint node cli2api-api:local ...`: passed when invoking
  the resolved executable with `--version`, returning `codex-cli 0.139.0`.
- `pnpm test`: passed with 11 test files and 50 tests.
- `pnpm test:coverage`: passed; global coverage is 85.15% statements, 67.21%
  branches, 91.07% functions, and 85.62% lines.
- `pnpm test:e2e`: passed with 2 Playwright tests.
- `pnpm check:file-size`: passed; all checked source files are <= 1300 lines.
- `pnpm build`: passed for shared, agents-sdk, core, and dash.
- `pnpm lint`: passed with zero warnings.
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
- `./deploy.sh build`: passed; Docker Compose built `cli2api-api:local` and
  `cli2api-dash:local`, and the API runtime image created `/data/codex-homes`.
- `pnpm vitest run apps/core/src/upstream.spec.ts`: failed first because
  account logout, instance update/disable, and route binding admin APIs returned
  404.
- `pnpm vitest run apps/core/src/upstream.spec.ts`: passed after adding logout,
  instance update/disable, route binding CRUD, and scheduler route-binding
  selection.
- `pnpm vitest run apps/dash/src/lib/api.spec.ts`: failed first because the
  dashboard facade did not expose logout, instance update/disable, route binding,
  or user creation methods.
- `pnpm vitest run apps/dash/src/lib/api.spec.ts`: passed after adding facade
  methods and Treaty client mappings.
- `pnpm test:e2e`: failed first after the dashboard route-management expansion
  because the `Server` icon import was missing and the dashboard crashed after
  login.
- `pnpm test:e2e`: passed after restoring the `Server` icon import.
- `pnpm build`: passed after adding route bindings and dashboard management
  controls.
- `pnpm test`: passed with 9 test files and 38 tests.
- `pnpm test:coverage`: passed with statements 80.48%, branches 65.28%,
  functions 87.21%, and lines 81.29%.
- `pnpm test:e2e`: passed with 2 Playwright tests. The only output warnings were
  `NO_COLOR` being ignored because `FORCE_COLOR` was set.
- `pnpm lint`: passed.
- `pnpm check:file-size`: all checked source files are <= 1300 lines.
- `git diff --check`: passed.
- `pnpm test:e2e`: failed first while adding dashboard URL navigation because
  clicking `路由绑定` left the page at `/` instead of `#/route-bindings`.
- `pnpm vitest run apps/dash/src/router.spec.ts`: failed first because
  `apps/dash/src/router.ts` did not exist.
- `pnpm vitest run apps/dash/src/router.spec.ts`: then failed because
  `createWebHashHistory()` touched browser `location` in the Node test
  environment.
- `pnpm vitest run apps/dash/src/router.spec.ts`: passed after moving the shared
  Vue Router route table behind `createDashboardRouter(history)` so tests can
  use memory history while production uses `createWebHashHistory()`.
- `pnpm add --filter @cli2api/dash vue-router@^4.6.3`: selected the Vue Router
  v4 stable line so the dashboard does not raise the repository's documented
  Node engine floor.
- `pnpm test:e2e`: passed after moving the dashboard to Vue Router hash-history
  navigation, restoring the existing admin session on boot, and updating E2E
  selectors for PrimeVue `Select` and `DataTable` controls.
- `pnpm build`: passed after replacing the main dashboard surface with PrimeVue
  `Toolbar`, `Card`, `DataTable`, `Column`, `Select`, `InputText`, `Button`,
  `Tag`, and `Message`. Vite reported the expected large-chunk warning for the
  PrimeVue bundle.
- `pnpm test`: passed with 9 test files and 38 tests.
- `pnpm test:coverage`: passed with statements 80.48%, branches 65.28%,
  functions 87.21%, and lines 81.29%.
- `pnpm test:e2e`: passed with 2 Playwright tests after tightening the run
  status locator to the row containing `hello dashboard e2e`.
- `pnpm test`: passed after adding the Vue Router unit test, with 10 test files
  and 39 tests.
- `pnpm test:coverage`: passed with statements 80.48%, branches 65.28%,
  functions 87.21%, and lines 81.29%.
- `pnpm lint`: passed.
- `pnpm check:file-size`: all checked source files are <= 1300 lines.
- `git diff --check`: passed.
- `./deploy.sh deploy`: failed first after adding `vue-router` because the
  Docker build context still included workspace-level `node_modules` shims, and
  `apps/dash/node_modules/.bin/vite` pointed at a stale pnpm virtual-store path.
- `docker compose -f compose.yaml build dash`: passed after adding
  `apps/*/node_modules` and `packages/*/node_modules` to `.dockerignore`.
- `./deploy.sh deploy`: passed; Compose rebuilt `cli2api-api:local` and
  `cli2api-dash:local`, recreated both services, and reported API plus
  Dashboard health checks healthy.
- Browser verification against `http://127.0.0.1:5173/#/route-bindings` passed
  after `./deploy.sh deploy`: refresh preserved the Vue Router `路由绑定` page
  and the DOM exposed PrimeVue card, table, and toolbar components.
