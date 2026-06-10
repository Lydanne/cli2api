# Model Serving Sandbox Evidence

## 2026-06-10 Compose CLI2API Home Alignment

- `pnpm test apps/core/src/deploy-script.spec.ts`: failed first because
  Compose and Dockerfile still forced `/data` path overrides.
- `pnpm test apps/core/src/deploy-script.spec.ts`: passed after setting
  Compose and Dockerfile to `CLI2API_HOME=~/.cli2api`, removing individual
  `/data` path overrides, and mounting `cli2api-home` at `/root/.cli2api`.
- `docker compose -f compose.yaml config`: confirmed the API service keeps
  `CLI2API_HOME=~/.cli2api`, does not set `CLI2API_DB`,
  `CLI2API_AUTH_HOME_BASE`, `CLI2API_RUNTIME_WORKSPACE_BASE`, or
  `CLI2API_TEMP_DIR`, and mounts `cli2api-home` to `/root/.cli2api`.
- `pnpm test`: passed with 11 test files and 51 tests.
- `pnpm test:coverage`: passed; global coverage is 85.15% statements, 67.21%
  branches, 91.07% functions, and 85.62% lines.
- `pnpm test:e2e`: passed with 2 Playwright tests.
- `pnpm check:file-size`: passed; all checked source files are <= 1300 lines.
- `pnpm build`: passed for shared, agents-sdk, core, and dash.
- `pnpm lint`: passed with zero warnings.
- `docker compose -f compose.yaml build api`: passed and rebuilt the API image.
- `docker run --rm --entrypoint node cli2api-api:local ... loadConfig()`:
  confirmed runtime expansion to `/root/.cli2api`, with SQLite at
  `/root/.cli2api/cli2api.sqlite`, Codex auth homes at
  `/root/.cli2api/codex-homes`, runtime workspaces at
  `/root/.cli2api/runtime-workspaces`, and temp files at
  `/root/.cli2api/tmp`.

## 2026-06-10 Read-only Text Serving Update

- `pnpm --filter @cli2api/agents-sdk test`: first failed as expected because
  the Codex adapter passed ignored `sandbox` plus profile-provided
  `approvalPolicy`; after implementation it passed with 2 files and 8 tests.
- `pnpm test apps/core/src/core.spec.ts apps/core/src/upstream.spec.ts`: first
  failed as expected because profiles and upstream instances still normalized to
  `workspace-write`; after implementation it passed with 2 files and 20 tests.
- `pnpm test`: passed with 11 test files and 49 tests.
- `pnpm build`: passed for shared, agents-sdk, core, and dash.
- `pnpm test:coverage`: passed; global coverage is 85.15% statements, 67.35%
  branches, 91.04% functions, and 85.62% lines.
- `pnpm lint`: passed with zero warnings.
- `pnpm check:file-size`: passed; all checked source files are <= 1300 lines.
- `pnpm test:e2e`: passed with 2 Playwright tests. The API E2E now verifies
  profile policy is `read-only` with `approvalPolicy=never`.

## 2026-06-10 CLI2API Home Update

- `pnpm build`: passed for shared, agents-sdk, core, and dash after deriving
  local state paths from `CLI2API_HOME`.
- `pnpm test`: passed with 11 test files and 48 tests. Config tests cover
  `CLI2API_HOME`, `${CLI2API_HOME}/.env`, process environment precedence, and
  tmp/runtime/auth path derivation.
- `pnpm test:coverage`: passed; global coverage is 85.15% statements, 67.35%
  branches, 91.04% functions, and 85.62% lines.
- `pnpm lint`: passed with zero warnings.
- `pnpm check:file-size`: passed; all checked source files are <= 1300 lines.
- `pnpm test:e2e`: passed with 2 Playwright tests. The API E2E verifies that a
  submitted profile `cwd` is replaced by a runtime workspace and model-serving
  policies use `workspace-write` with `approvalPolicy=never`.
- `./deploy.sh deploy && ./deploy.sh status`: passed; API and dashboard
  containers were rebuilt. A follow-up `./deploy.sh status` reported both
  containers healthy, with API health returning `{"ok":true,"service":"cli2api-core"}`.

## Initial Sandbox Update

- `pnpm build`: passed for shared, agents-sdk, core, and dash after adding the
  runtime workspace service and removing dashboard cwd controls.
- `pnpm test`: passed with 11 test files and 46 tests.
- `pnpm test:coverage`: passed; global coverage remained above 60%.
- `pnpm lint`: passed with zero warnings.
- `pnpm check:file-size`: passed; all checked source files are <= 1300 lines.
- `pnpm test:e2e`: passed with 2 Playwright tests. The API E2E verifies that a
  submitted profile `cwd` is replaced by a runtime workspace and safe policies.
- `./deploy.sh deploy && ./deploy.sh status`: passed; API and dashboard
  containers were rebuilt and reported healthy.
- Browser verification against `http://127.0.0.1:5173/#/instances`: the deployed
  instance page has no `instance-cwd` control and no visible `工作目录` text.
