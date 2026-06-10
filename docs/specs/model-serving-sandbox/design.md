# Model Serving Sandbox Design

## Product Contract

cli2api exposes a model-serving surface. A downstream API key may call
OpenAI-compatible endpoints and select a public model id. The caller cannot
select or infer local working directories. Upstream accounts and execution
instances are internal scheduling resources.

## Runtime Workspace Policy

The core service owns one runtime workspace base directory:

- Environment variable: `CLI2API_RUNTIME_WORKSPACE_BASE`.
- Docker default: `/data/runtime-workspaces`.
- Local default: `data/runtime-workspaces`.

Profiles receive deterministic service-owned workspaces under
`<base>/profiles/<profileId>`. Upstream instances receive deterministic
service-owned workspaces under `<base>/instances/<instanceId>`.

The service creates these directories as empty directories before returning the
profile or instance. Caller/admin payload `cwd` values are ignored for model
serving. The database still stores `cwd` because adapters require a working
directory, but the stored value is internal runtime state.

## Safe Execution Defaults

Model-serving instances normalize runtime policies:

- `sandbox`: always `read-only`.
- `approvalPolicy`: always `never`.

This keeps the external product from becoming an interactive agent environment.
Adapter-specific config can still select model/runtime options, but filesystem
and approval policy are not part of the operator workflow.

## Dashboard

Dash keeps profile, account, instance, route, key, and run management, but removes
`cwd` fields from profile and instance forms/tables. Operators configure capacity
and routing, not local folders.

The dashboard may still receive `cwd` in API responses for internal diagnostics,
but it does not display it as a normal editable field.

## API Compatibility

The intended external API remains `/v1/models`, `/v1/responses`, and
`/v1/chat/completions`. Native `/api/runs` stays available for current tests and
internal clients, but it follows the same model-serving workspace policy and
cannot expand filesystem access.

## Rejected Options

- Keeping a separate agent mode: rejected because the product direction is only
  base-model API service.
- Trusting prompts to avoid file reads: rejected because filesystem isolation
  must be enforced by runtime configuration.
- Allowing admin-entered `cwd` for convenience: rejected because it makes the
  dashboard encourage the wrong product model.

## Rollback Notes

The schema keeps existing `cwd` columns, so rollback can restore prior admin
payload behavior without a database migration. Existing rows can continue to run,
but new creates/updates after this slice use service-owned workspaces.
