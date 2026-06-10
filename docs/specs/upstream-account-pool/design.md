# Upstream Account Pool Design

## Domain Model

An upstream account represents one authenticated provider identity, such as a
Codex login stored in a dedicated `CODEX_HOME`. An upstream instance represents a
runnable execution slot bound to one account, one adapter type, service-owned
empty runtime workspace, safe execution policy, model/config overrides, health
state, and concurrency limit.

Adapter profiles become external routing contracts. A downstream client selects
a profile as a model. The scheduler maps that profile to one or more upstream
instances and chooses an available instance for each run.

For Codex profiles, `profile.id` remains the OpenAI-compatible model id exposed
to downstream clients, while `profile.config.model` is the upstream Codex model
name passed to the Codex SDK. When the dashboard imports SDK models, it creates
profiles whose id and `config.model` both equal the SDK model slug.

## Agents SDK Auth Contract

`packages/agents-sdk` owns provider-neutral authentication contracts:

- `AgentAuthProvider`: starts auth, logs in with secrets, checks runtime auth,
  and logs out. Core owns long-running auth job cancellation.
- `AuthSession`: state returned to core and dashboard, including optional
  browser URL, user code, expiry, and message. It never contains raw tokens.
- `AgentAuthCommandRunner`: testable process boundary used by provider
  implementations so unit tests never invoke real Codex auth.

The Codex auth provider runs `codex login --device-auth`,
`codex login --with-api-key`, `codex login --with-access-token`,
`codex login status`, and `codex logout` with a provider-specific environment.
Every account receives an isolated `CODEX_HOME`, so multiple Codex accounts can
coexist in the same deployment.

Core creates each account auth home before it is persisted, and the Codex auth
provider also ensures the home exists before invoking the CLI. This keeps
existing accounts and custom auth-home inputs compatible with Codex CLI versions
that reject missing `CODEX_HOME` directories.

Device auth is a long-running Codex CLI process: it prints the browser URL and
user code, then waits while the operator completes login. The provider therefore
captures output until those browser instructions are available and returns a
`waiting_for_browser` session immediately. The later status poll remains the
source of truth for whether the account is authenticated. A status response that
only says the CLI is not logged in is treated as `pending`, even when the Codex
CLI exits non-zero, so operators do not see a failure while device auth is still
waiting for browser completion.

By default, the provider resolves the Codex CLI shim bundled under
`@openai/codex-sdk` before falling back to a `codex` executable on `PATH`.
Container deployments therefore use the locked workspace dependency instead of
requiring a separate global Codex CLI install. Tests and custom deployments may
still pass an explicit executable path through provider construction.

## Agents SDK Model Catalog

`packages/agents-sdk` also owns a provider-neutral model catalog:

- `AgentModelDefinition`: model slug, display name, adapter type, source, and
  adapter config.
- `listAgentModels()`: returns catalog entries without exposing provider
  prompts, credentials, or other large upstream metadata.

The initial Codex catalog is extracted from the bundled Codex CLI's
`codex debug models` output and stores only public slug/display fields. Core does
not run provider network calls during import.

## Backend APIs

Core will persist:

- `upstream_accounts`: account metadata, provider type, auth state, auth home,
  timestamps, disabled state, and last auth error.
- `upstream_auth_sessions`: active or historical auth jobs, state, URL/code,
  expiry, and non-secret log snippets.
- `upstream_instances`: runnable slots bound to accounts, health state,
  concurrency limit, current concurrency, config, and last error.
- profile-instance bindings or routing config.

Admin APIs will expose account creation, auth start/poll/cancel, instance
create/update/disable, routing assignment, health checks, and run inspection.

Profile import APIs expose:

- `GET /api/admin/agent-models`: lists the SDK model catalog visible to the
  dashboard.
- `POST /api/admin/profiles/import-agent-models`: creates one enabled adapter
  profile per missing catalog entry, skips existing profile ids, and returns
  both created and skipped entries.

## Scheduling

The first scheduler is single-process and SQLite-backed. It filters instances by
profile binding, enabled flag, account authenticated state, health, and available
concurrency. It chooses least-busy first, with stable id ordering as a tie
breaker. If no instance is available, the API returns a stable
`UPSTREAM_UNAVAILABLE` error.

Creating an instance requires an authenticated account, so newly-created enabled
instances start as `healthy`. Existing enabled instances left in `unknown` from
earlier versions are normalized to `healthy` when their account is authenticated,
which keeps the dashboard from showing a healthy executor as unknown. Explicit
`degraded` and `disabled` states remain operator-controlled.

Runs will store the selected `upstreamInstanceId`. Failure events include the
instance id when available, and repeated failures can mark an instance degraded.
When the selected profile includes `config.model`, the Codex adapter passes it
as the SDK thread `model` option in addition to preserving the config object for
Codex CLI config overrides.

## Dashboard

The dashboard becomes Chinese-first:

- Default locale: `zh-CN`.
- Optional locale: `en-US`.
- Locale switch in the header, persisted in `localStorage`.
- Page navigation is defined in a Vue Router instance that uses hash history,
  which keeps direct links refresh-safe without requiring additional Nginx or
  core fallback routes.
- API field names and error codes stay stable; UI maps them to localized copy.

New operator surfaces:

- Overview: account health, available instances, running count, failed count.
- Upstream accounts: create account, start Codex browser/device auth, copy/open
  auth URL, enter or view user code when present, poll auth state, logout.
- Instances: bind account, configure type/name/concurrency, enable/disable, and
  inspect health and recent errors.
- Profiles: create public model profiles, enter the upstream Codex model name,
  inspect stored upstream model config, delete unused profiles, and import all
  missing SDK catalog models with one action.
- Routes: bind external profiles to instance pools.
- Runs: show selected instance, duration, status, error, and events.
- API keys/users: richer create, revoke, disable, reset, and quota controls.

## Security

- Downstream API keys remain prefix plus hash only.
- Upstream secrets are not returned to dashboard and are never written to logs.
- API-key/access-token login sends secrets over authenticated admin APIs and
  passes them to Codex on stdin only.
- `CODEX_HOME` must be rooted under an operator-approved base directory.
- Request and admin payloads cannot override an instance or profile `cwd`;
  runtime workspaces are service-owned.

## Deployment

Compose sets `CLI2API_HOME=~/.cli2api`, so account auth homes live under
`/root/.cli2api/codex-homes/<accountId>` inside the API container's persistent
home volume. The dashboard service remains stateless. The API service owns auth jobs and Codex CLI
invocation. The runtime image copies the root and package-level `node_modules`
trees needed for `@openai/codex-sdk` and its bundled Codex CLI shim. The Docker
build context excludes root and workspace `node_modules` directories so local
pnpm shims do not overwrite the container's fresh frozen-lockfile install. The
runtime image installs `ca-certificates` because the bundled Codex CLI performs
HTTPS requests through the system trust store, while Node's built-in fetch can
still work without that package.

## Rejected Options

- Browser-side Codex SDK auth: rejected because the browser cannot safely own
  local `CODEX_HOME`, CLI execution, or secret handling.
- Storing Codex tokens in SQLite: rejected because the Codex CLI already owns its
  auth store under `CODEX_HOME`.
- Treating adapter profiles as accounts forever: rejected because profiles are
  public routing contracts while accounts are private upstream identities.

## Rollback Notes

The first implementation step only adds `agents-sdk` auth contracts and Codex
auth provider code. If the later core scheduler is delayed, existing profile
based run execution can continue unchanged.
