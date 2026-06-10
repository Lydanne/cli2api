# Model Serving Sandbox Spec

## Context

- cli2api will be provided externally as a base-model-compatible API, not as a
  remote agent workspace.
- Downstream callers should only choose a model, send text, and receive text.
- Upstream Codex accounts and instances are internal capacity. They must not
  expose local project files, host paths, or operator workspaces to callers.
- The current admin flows still accept `cwd` when creating profiles and upstream
  instances, which makes the product look and behave like an agent workspace.
- The service needs a single home directory for local config, `.env`, auth
  homes, temporary files, and scratch runtime workspaces.

## Goal

- Make base-model serving the only product mode.
- Ensure profile and instance working directories are service-owned empty runtime
  workspaces.
- Remove dashboard controls that invite operators to bind real local folders.
- Keep OpenAI-compatible APIs as the intended downstream surface.
- Use `~/.cli2api` as the default local service home.

## Scope

- In scope:
  - Service-owned runtime workspace base configuration.
  - `CLI2API_HOME` and `~/.cli2api/.env` loading.
  - Backend normalization of profile and upstream instance `cwd`.
  - Safe default sandbox and approval policies for model-serving instances.
  - Dashboard form/table changes that hide `cwd` from normal operations.
  - Tests proving request/admin payloads cannot override runtime workspaces.
- Allowed write paths:
  - `apps/core/**`, `apps/dash/**`, `packages/shared/**`, `docs/**`, root
    deployment files, and tests.

## Non-goals

- No agent mode.
- No caller-supplied files, project checkout mounting, or workspace browsing.
- No public exposure of Codex auth homes, runtime workspace paths, shell logs, or
  local file events.
- No distributed sandboxing beyond the current single-node Docker deployment.

## Acceptance Criteria

- [x] Admin-created profiles ignore supplied `cwd` and use a service-owned
  runtime workspace path.
- [x] Admin-created and updated upstream instances ignore supplied `cwd`, unsafe
  sandbox, and interactive approval policy values.
- [x] Runtime execution uses empty service-owned workspace paths under a
  configured base directory.
- [x] Local defaults derive database, auth homes, runtime workspaces, and tmp
  paths from `~/.cli2api`.
- [x] `loadConfig()` reads `~/.cli2api/.env` when present, with real
  environment variables taking precedence.
- [x] Dashboard profile and instance pages no longer let operators type or edit
  `cwd`.
- [x] Tests cover `cwd` override attempts for profiles, upstream instances, and
  downstream run payloads.
- [x] `pnpm test`, `pnpm test:coverage`, `pnpm test:e2e`, `pnpm lint`, and
  `pnpm check:file-size` pass.

## Open Questions

- None for this slice. Future hardening can add per-run temporary directory
  cleanup and stronger OS/container sandboxing.
