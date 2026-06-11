# agents-sdk Process Runtime Spec

## Context

- `packages/agents-sdk` currently mixes the shared adapter contract with a
  Codex-specific SDK adapter and a static Codex model catalog.
- Core already owns downstream API keys, profile routing, upstream accounts,
  instances, scheduling, quota accounting, run persistence, and OpenAI-compatible
  HTTP shaping.
- CLI providers such as Codex, Claude Code, and OpenCode should be isolated
  behind one provider-neutral process runtime so provider-specific output does
  not leak across package boundaries.

## Goal

- Turn `@cli2api/agents-sdk` into the provider-neutral runtime kernel.
- Expose `@cli2api/agents-sdk` through one primary `AgentsSDK` class with
  static factory/helper methods and instance methods for registered providers.
- Add a first real provider package, `@cli2api/agent-codex`, that calls Codex
  through JSONL stdio instead of the in-process Codex SDK adapter.
- Let core map explicit downstream user/session scopes to provider-native
  sessions while keeping default model-serving requests stateless.

## Scope

- In scope:
  - Provider-neutral run, process, model, status, usage, and conversation
    contracts in `packages/agents-sdk`.
  - `AgentsSDK` facade for provider registration, model discovery, run event
    streaming, text-result collection, auth dispatch, and process runner
    factories.
  - JSONL child-process runner with deterministic unit coverage.
  - Codex provider package for auth, model discovery, stateless exec, and resume
    exec command construction plus event normalization.
  - Codex package facade with static provider/auth factories.
  - Core persistence for provider session ids on upstream run sessions.
  - Core run flow updates that pass explicit conversation scopes to providers
    and persist returned provider session ids.
  - Minimal dashboard visibility for provider session and status details.
- Allowed write paths:
  - `packages/agents-sdk/**`
  - `packages/agent-codex/**`
  - `packages/shared/**`
  - `apps/core/**`
  - `apps/dash/**`
  - `docs/**`
  - Root workspace/package/test configuration files

## Non-goals

- No production Claude Code or OpenCode provider in this slice.
- No external third-party SDK documentation or semver compatibility promise.
- No writable agent-serving mode; model-serving stays read-only with no
  request-controlled filesystem expansion.
- No browser-side CLI execution.

## Acceptance Criteria

- [ ] `@cli2api/agents-sdk` exposes provider-neutral `AgentProvider`,
  `AgentProcessRunner`, `AgentRunInput`, model, status, and event contracts.
- [ ] `@cli2api/agents-sdk` exposes `AgentsSDK` as the primary public class,
  including static `create`, `mockProvider`, `processRunner`, `authRunner`,
  `collect`, `toResult`, `runWith`, and `runTextWith` helpers.
- [ ] `AgentsSDK` instances support `use`, `useAuth`, `getProvider`,
  `listModels`, `run`, `runText`, and auth operations without callers
  constructing `AdapterRegistry` directly.
- [ ] The normalized event stream includes `conversation.updated` and
  `status.updated` while preserving existing run/output/usage/failure events.
- [ ] Unit tests cover JSONL chunks, stderr capture, timeout/kill behavior,
  non-zero exits, and bad JSON lines without invoking real CLIs.
- [ ] `@cli2api/agent-codex` can build Codex auth, model discovery, stateless
  exec, and resume exec commands with safe model-serving defaults.
- [ ] `@cli2api/agent-codex` exposes a `CodexAgent` static facade so core can
  register Codex through `CodexAgent.provider()` and `CodexAgent.authProvider()`.
- [ ] Codex model discovery reads `codex debug models` output and returns only
  public slug/name/config fields.
- [ ] Explicit downstream session identity persists a provider session id;
  missing identity stays stateless and uses Codex ephemeral execution.
- [ ] OpenAI-compatible endpoints continue to own HTTP payload shaping in core.
- [ ] Core service wiring uses the `AgentsSDK` facade for provider execution,
  provider-backed model discovery, and upstream auth dispatch.
- [ ] Existing scheduler affinity behavior remains compatible.
- [ ] `pnpm build`, `pnpm test`, `pnpm test:coverage`, `pnpm test:e2e`,
  `pnpm lint`, and `pnpm check:file-size` pass or evidence records why a gate
  could not run.

## Open Questions

- None. The first slice intentionally limits production provider work to Codex.
