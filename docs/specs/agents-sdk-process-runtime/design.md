# agents-sdk Process Runtime Design

## Architecture

`packages/agents-sdk` becomes the shared runtime kernel. It defines provider
contracts, process command/result types, normalized events, and a mock provider
used by tests. It does not know about Elysia routes, SQLite, dashboard state, or
OpenAI HTTP response shapes.

`packages/agent-codex` implements the first real provider. It owns Codex CLI
path resolution, auth command construction, model discovery, run command
construction, and JSONL event normalization. Core registers this provider
through the existing service graph.

Core remains the orchestrator. It resolves the downstream model/profile,
selects an upstream instance, creates the run row, invokes the provider, stores
events, updates quota, releases the instance, and serializes native or
OpenAI-compatible responses.

## Public Contracts

- `AgentProvider`: provider type, `run`, `listModels`, and optional auth
  operations.
- `AgentProcessRunner`: testable process boundary that streams parsed JSONL
  records and captures stderr/exit state.
- `AgentRunInput`: run id, prompt, profile, `mode: "model"`, optional
  conversation scope/provider session id, optional attachments, and optional
  output schema.
- `AgentEvent`: existing run/output/usage/failure events plus
  `conversation.updated` and `status.updated`.

Provider-specific raw JSONL records stay inside provider packages. Core and
dashboard only consume normalized events and DTOs from `@cli2api/shared`.

## Conversation Mapping

Core treats downstream identity as explicit only when the request provides
`user`, `sessionId`, or `conversationId` directly or through metadata. Explicit
identity creates or reads an `upstream_run_sessions` row. That row stores:

- scheduler affinity fields already present today.
- `provider_session_id`, nullable.
- `provider_session_updated_at`, nullable timestamp.
- `provider_session_metadata_json`, provider-neutral JSON metadata.

When a provider emits `conversation.updated`, core updates the row. On later
requests for the same scope, core passes the stored provider session id to the
provider only when the selected upstream instance is the same instance that owns
the stored provider session.

Provider-native session ids are instance-local state because each upstream
instance can use a different account home. If the pinned instance is healthy but
saturated, core may run the request on an overflow instance without moving the
persistent pin; that overflow run must not receive or update the pinned
provider session. If the pin is unhealthy or missing and core rebinds the
downstream session to a new instance, the old provider session mapping is
cleared before the new provider run starts.

Default requests without explicit identity still use scheduler affinity scope
`default/default` for backward compatibility, but they do not receive a provider
conversation object and Codex runs with `--ephemeral`.

## Codex Provider

Codex run commands use:

- `codex exec --json` for new stateless or first explicit-session turns.
- `codex exec resume <providerSessionId> --json` when core has a stored provider
  session id.
- `--cd <instance cwd>`, `--sandbox read-only`, `--ask-for-approval never`,
  `--skip-git-repo-check`, `--ignore-user-config`, and `--ignore-rules` for all
  model-serving runs.
- `--ephemeral` only when no explicit conversation scope is supplied.
- `--model <profile.config.model>` when a model override exists.

The provider never passes `--add-dir` and never accepts request-controlled cwd,
sandbox, or approval policy.

Model discovery runs `codex debug models` and maps `models[].slug` plus
`display_name` to `AgentModelDefinition`. Large prompt/instruction fields and
provider internals are dropped.

## Dashboard

The dashboard keeps its existing page structure. Sessions/Runs/Instances expose
provider session ids and status details when returned by the admin API. This
slice avoids a dashboard redesign.

## Rejected Options

- Keeping the Codex SDK adapter as the primary runtime: rejected because the
  framework needs one CLI process standard shared by Codex, Claude Code, and
  OpenCode.
- Parsing provider output in core: rejected because provider-specific event
  shapes would leak past package boundaries.
- Forcing every request into a persistent provider session: rejected because
  default OpenAI-style model calls should not silently share upstream context.

## Rollback Notes

The old profile, run, and upstream instance tables remain. The new provider
session columns are nullable, so rollback can ignore them. A compatibility
`CodexAdapter` export may remain temporarily while core switches to provider
registration.
