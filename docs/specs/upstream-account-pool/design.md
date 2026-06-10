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

## Scheduling

The first scheduler is single-process and SQLite-backed. It filters instances by
profile binding, enabled flag, account authenticated state, health, and available
concurrency. It chooses least-busy first, with stable id ordering as a tie
breaker. If no instance is available, the API returns a stable
`UPSTREAM_UNAVAILABLE` error.

Runs will store the selected `upstreamInstanceId`. Failure events include the
instance id when available, and repeated failures can mark an instance degraded.

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

Compose sets `CLI2API_HOME=/data`, so account auth homes live under
`/data/codex-homes/<accountId>` inside the existing data volume. The dashboard
service remains stateless. The API service owns auth jobs and Codex CLI
invocation. The Docker build context excludes root and workspace `node_modules`
directories so local pnpm shims do not overwrite the container's fresh
frozen-lockfile install.

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
