# agents-sdk Process Runtime Tasks

## Phase 1: Spec And Tests

- [x] Add this spec packet under `docs/specs/agents-sdk-process-runtime`.
- [x] Add failing unit tests for the JSONL process runner.
- [x] Add failing provider tests for Codex command construction, model
  discovery, stateless exec, resume exec, and event normalization.
- [x] Add failing core tests for explicit provider session persistence and
  default stateless execution.

## Phase 2: agents-sdk Kernel

- [x] Replace adapter-specific run contracts with provider-neutral contracts.
- [x] Add `AgentProcessRunner` and a child-process JSONL implementation.
- [x] Update the mock provider to emit normalized conversation/status events.
- [x] Keep compatibility exports only where needed by existing code.

## Phase 3: Codex Provider Package

- [x] Create `packages/agent-codex`.
- [x] Move Codex auth provider into the Codex package while preserving public
  exports for core.
- [x] Implement Codex model discovery from `codex debug models`.
- [x] Implement Codex JSONL run/resume command construction and event
  normalization.

## Phase 4: Core And Dashboard

- [x] Register mock and Codex providers in `createServices`.
- [x] Persist provider session fields on upstream run sessions.
- [x] Pass explicit conversation scopes into provider runs.
- [x] Update admin DTOs and dashboard sessions/runs views with provider session
  and status details.
- [x] Keep `/v1/*` payload shaping in core.

## Phase 5: Verification

- [x] Run targeted package/core/dashboard tests during implementation.
- [x] Run `pnpm build`.
- [x] Run `pnpm test`.
- [x] Run `pnpm test:coverage`.
- [x] Run `pnpm test:e2e`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm check:file-size`.
- [x] Update `evidence.md` with commands and outcomes.

## Phase 6: Review Fixes

- [x] Add regression tests for provider session reuse across unhealthy rebind
  and saturated pinned-instance overflow.
- [x] Keep provider-native session ids scoped to the selected upstream
  instance; clear stale ids on rebind and skip pinned provider sessions during
  overflow.
- [x] Filter Codex `debug models` output so hidden or API-unsupported entries
  are not exposed through provider-backed model discovery.
- [x] Move the upstream integration-test harness out of
  `apps/core/src/upstream.spec.ts` so the touched spec file stays below 1000
  lines.
- [x] Re-run full repository verification after the review fixes.

## Allowed Write Areas

- `packages/agents-sdk/**`
- `packages/agent-codex/**`
- `packages/shared/**`
- `apps/core/**`
- `apps/dash/**`
- `docs/**`
- Root workspace/package/test configuration files
