# Model Serving Sandbox Spec

## Context

- cli2api will be provided externally as a minimal OpenAI-compatible text API,
  not as a remote agent workspace.
- Downstream callers should only choose a model, send text, and receive text.
  Local file reads and writes remain the downstream client's responsibility.
- Upstream Codex accounts and instances are internal capacity. They must not
  expose local project files, host paths, or operator workspaces to callers.
- The current admin flows still accept `cwd` when creating profiles and upstream
  instances, which makes the product look and behave like an agent workspace.
- The service needs a single home directory for local config, `.env`, auth
  homes, temporary files, and scratch runtime workspaces.

## Goal

- Make text-model serving the only product mode for OpenAI-compatible endpoints.
- Ensure profile and instance working directories are service-owned empty runtime
  workspaces.
- Force model-serving execution to a read-only sandbox with non-interactive
  approval handling.
- Remove dashboard controls that invite operators to bind real local folders.
- Keep OpenAI-compatible APIs as the intended downstream surface.
- Use `~/.cli2api` as the default local service home.

## Scope

- In scope:
  - Service-owned runtime workspace base configuration.
  - `CLI2API_HOME` and `~/.cli2api/.env` loading.
  - Backend normalization of profile and upstream instance `cwd`.
  - Read-only sandbox and non-interactive approval policy defaults for
    model-serving profiles and instances.
  - Dashboard form/table changes that hide `cwd` from normal operations.
  - Tests proving request/admin payloads cannot override runtime workspaces.
- Allowed write paths:
  - `apps/core/**`, `apps/dash/**`, `packages/shared/**`, `docs/**`, root
    deployment files, and tests.

## Non-goals

- No agent mode.
- No caller-supplied files, project checkout mounting, or workspace browsing.
- No service-side file creation or patch application for downstream prompts.
- No public exposure of Codex auth homes, runtime workspace paths, shell logs, or
  local file events.
- No full OpenAI tool/function calling parity in this slice.
- No distributed sandboxing beyond the current single-node Docker deployment.

## Acceptance Criteria

- [x] Admin-created profiles ignore supplied `cwd` and use a service-owned
  runtime workspace path.
- [x] Admin-created profiles use `read-only` sandbox and `approvalPolicy=never`
  even when payloads request writable or interactive policies.
- [x] Admin-created and updated upstream instances ignore supplied `cwd`, unsafe
  sandbox, and interactive approval policy values, and normalize to `read-only`
  plus `approvalPolicy=never`.
- [x] Runtime execution uses empty service-owned workspace paths under a
  configured base directory.
- [x] Codex SDK execution receives `sandboxMode=read-only`,
  `approvalPolicy=never`, and the service-owned working directory.
- [x] Local defaults derive database, auth homes, runtime workspaces, and tmp
  paths from `~/.cli2api`.
- [x] Compose deployment keeps database, auth homes, runtime workspaces, and tmp
  paths derived from container `CLI2API_HOME=~/.cli2api`.
- [x] `loadConfig()` reads `~/.cli2api/.env` when present, with real
  environment variables taking precedence.
- [x] Dashboard profile and instance pages no longer let operators type or edit
  `cwd`.
- [x] Tests cover `cwd` override attempts for profiles, upstream instances, and
  downstream run payloads.
- [x] `pnpm test`, `pnpm test:coverage`, `pnpm test:e2e`, `pnpm lint`, and
  `pnpm check:file-size` pass.

## Open Questions

- The currently used `@openai/codex-sdk` version exposes sandbox and approval
  options, but not Codex CLI `--ephemeral` or `--ignore-rules`. A later slice
  should either adopt SDK support for those flags or add a direct CLI adapter
  before claiming no session persistence.
- Full OpenAI tool calling remains future work. Until then, the compatibility
  surface is minimal text input/output.
