# Deployment

cli2api includes a root Docker Compose package for local private deployments.

## Compose Services

`compose.yaml` defines two services:

- `api`: builds the root `Dockerfile` `runtime` target, runs
  `apps/core/dist/server.js`, uses `CLI2API_HOME=~/.cli2api`, stores SQLite
  data, Codex account auth homes, runtime workspaces, and temporary files in the
  `cli2api-home` volume mounted at `/root/.cli2api`, exposes
  `http://127.0.0.1:3000`, and checks
  `/api/health`.
- `dash`: builds the `dash-runtime` target, serves `apps/dash/dist` through
  Nginx, exposes `http://127.0.0.1:5173`, and proxies `/api/` and `/v1/` to the
  API service for same-origin browser calls.

Set `CLI2API_PUBLISHED_PORT` and `CLI2API_DASH_PUBLISHED_PORT` to change host
ports:

```bash
CLI2API_PUBLISHED_PORT=8080 CLI2API_DASH_PUBLISHED_PORT=8081 ./deploy.sh deploy
```

The core service reads `${CLI2API_HOME}/.env` when present. Local development
and Compose both use `CLI2API_HOME=~/.cli2api`; inside the API container this
expands to `/root/.cli2api`, which is backed by the persistent `cli2api-home`
volume:

- SQLite: `${CLI2API_HOME}/cli2api.sqlite`
- Upstream account auth homes: `${CLI2API_HOME}/codex-homes`
- Runtime workspaces: `${CLI2API_HOME}/runtime-workspaces`
- Temporary files: `${CLI2API_HOME}/tmp`

Specific environment variables still override individual paths:
`CLI2API_DB`, `CLI2API_AUTH_HOME_BASE`, `CLI2API_RUNTIME_WORKSPACE_BASE`, and
`CLI2API_TEMP_DIR`. Process environment values override values from
`${CLI2API_HOME}/.env`.

Deployments created before the Compose home alignment may still have data in the
old `cli2api-data` volume mounted at `/data`. That volume is not automatically
migrated into `cli2api-home`; copy or export the SQLite database and Codex auth
homes before switching an existing deployment.

## Operations

```bash
./deploy.sh deploy
./deploy.sh build
./deploy.sh up
./deploy.sh down
./deploy.sh restart
./deploy.sh status
./deploy.sh logs
./deploy.sh test
./deploy.sh help
```

`deploy` is the default command. It builds both images, recreates both services,
and waits until API and dashboard health checks pass. `status` prints Compose
service state plus API and dashboard health. `test` runs the local `pnpm test`
suite.

## First Admin

After the services are healthy, open `http://127.0.0.1:5173`. If the database
has no users, the first login email and password create the administrator
account and start the admin session.

For scripted deployments, you can still pre-create an admin user inside the API
container:

```bash
docker compose -f compose.yaml exec api \
  node apps/core/dist/cli.js admin create \
  --email admin@example.com \
  --password change-me
```

The CLI uses the same `CLI2API_HOME=~/.cli2api` environment as the running
server, so the admin is stored in the Compose volume.

## Codex Account Pool

Use the dashboard `上游账号` page to create a Codex upstream account. Click
`网页认证`, open the returned auth URL, enter the displayed user code, and then
click `刷新认证` until the account becomes `authenticated`.

After authentication, open `实例池`, bind the account, set the concurrency limit,
and create an instance. The API service assigns a service-owned runtime
workspace automatically and runs Codex with `read-only` plus
`approvalPolicy=never`, so downstream prompts cannot create files in the service
workspace. Runs that target a matching model profile are scheduled onto enabled,
authenticated instances and record the selected `upstreamInstanceId`.
