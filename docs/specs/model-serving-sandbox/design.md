# Model Serving Sandbox Design

## Product Contract

cli2api exposes a minimal OpenAI-compatible text surface. A downstream API key
may call OpenAI-compatible endpoints and select a public model id. The caller
cannot select or infer local working directories, and downstream prompts must not
turn cli2api into a remote file writer. Upstream accounts and execution
instances are internal scheduling resources.

## CLI2API Home

The core service owns one local home directory:

- Environment variable: `CLI2API_HOME`.
- Local default: `~/.cli2api`.
- Docker Compose default: `~/.cli2api`, mounted at `/root/.cli2api` in the API
  container.

The service reads `${CLI2API_HOME}/.env` when present. Values from the real
process environment override values from this file, so deployment-level secrets
or port overrides still win.

Default paths are derived from `CLI2API_HOME`:

- SQLite: `${CLI2API_HOME}/cli2api.sqlite`.
- Upstream account auth homes: `${CLI2API_HOME}/codex-homes`.
- Runtime workspaces: `${CLI2API_HOME}/runtime-workspaces`.
- Temporary/scratch root: `${CLI2API_HOME}/tmp`.

Every path can still be overridden with its existing specific environment
variable, such as `CLI2API_DB`, `CLI2API_AUTH_HOME_BASE`, or
`CLI2API_RUNTIME_WORKSPACE_BASE`. Compose intentionally does not set those
specific overrides, so container paths stay derived from `CLI2API_HOME`.

## Runtime Workspace Policy

The core service owns one runtime workspace base directory:

- Environment variable: `CLI2API_RUNTIME_WORKSPACE_BASE`.
- Local default: `${CLI2API_HOME}/runtime-workspaces`.

Profiles receive deterministic service-owned workspaces under
`<base>/profiles/<profileId>`. Upstream instances receive deterministic
service-owned workspaces under `<base>/instances/<instanceId>`.

The service creates these directories as empty directories before returning the
profile or instance. Caller/admin payload `cwd` values are ignored for model
serving. The database still stores `cwd` because adapters require a working
directory, but the stored value is internal runtime state.

## Read-only Execution Defaults

Model-serving instances normalize runtime policies:

- `sandbox`: always `read-only`.
- `approvalPolicy`: always `never`.

This keeps the external product from becoming an interactive agent environment.
The runtime working directory is still service-owned and empty, but it is not a
prompt-controlled writable target. Adapter-specific config can still select
model/runtime options, but filesystem and approval policy are not part of the
operator workflow.

The Codex SDK currently uses `sandboxMode` as the thread option name, so the
adapter must pass the normalized sandbox as `sandboxMode`, not `sandbox`.
For defense in depth, the Codex adapter forces `sandboxMode=read-only` and
`approvalPolicy=never` even if an old profile or instance row still contains a
writable or interactive value. The same adapter call must pass the service-owned
`workingDirectory` and no additional writable directories.

The installed `@openai/codex-sdk` exposes `workingDirectory`, `sandboxMode`,
`skipGitRepoCheck`, and `approvalPolicy`. It does not expose Codex CLI
`--ephemeral` or `--ignore-rules`, so this slice cannot claim no Codex session
persistence. A later slice can add direct CLI execution or move to an SDK version
that exposes those flags.

## Dashboard

Dash keeps profile, account, instance, route, key, and run management, but removes
`cwd` fields from profile and instance forms/tables. Operators configure capacity
and routing, not local folders.

The dashboard may still receive `cwd` in API responses for internal diagnostics,
but it does not display it as a normal editable field.

## API Compatibility

The intended external API remains `/v1/models`, `/v1/responses`, and
`/v1/chat/completions`. This slice provides minimal text compatibility: requests
are mapped to one prompt and responses return final text. Native `/api/runs`
stays available for current tests and internal clients, but it follows the same
model-serving workspace policy and cannot expand filesystem access.

Unsupported OpenAI compatibility features, such as full tool/function calling
parity, remain explicit non-goals until their contracts are implemented and
tested.

## Rejected Options

- Keeping a separate agent mode: rejected because the product direction is only
  text-model API service.
- Trusting prompts to avoid file reads: rejected because filesystem isolation
  must be enforced by runtime configuration.
- Allowing admin-entered `cwd` for convenience: rejected because it makes the
  dashboard encourage the wrong product model.
- Keeping `workspace-write` for SDK scratch files: rejected for the public
  model-serving path because downstream clients such as OpenCode should own file
  creation locally.

## Rollback Notes

The schema keeps existing `cwd` columns, so rollback can restore prior admin
payload behavior without a database migration. Existing rows can continue to run,
but new creates/updates after this slice use service-owned workspaces.

Deployments that previously used the Compose `/data` mount keep their old
`cli2api-data` volume until an operator migrates or removes it. The home-aligned
Compose configuration writes new state to `cli2api-home` mounted at
`/root/.cli2api`.
