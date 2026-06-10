# Deployment

cli2api includes a root Docker Compose package for local private deployments.

## Compose Services

`compose.yaml` defines two services:

- `api`: builds the root `Dockerfile` `runtime` target, runs
  `apps/core/dist/server.js`, stores SQLite data in the `cli2api-data` volume,
  stores Codex account auth homes under `/data/codex-homes`, exposes
  `http://127.0.0.1:3000`, and checks `/api/health`.
- `dash`: builds the `dash-runtime` target, serves `apps/dash/dist` through
  Nginx, exposes `http://127.0.0.1:5173`, and proxies `/api/` and `/v1/` to the
  API service for same-origin browser calls.

Set `CLI2API_PUBLISHED_PORT` and `CLI2API_DASH_PUBLISHED_PORT` to change host
ports:

```bash
CLI2API_PUBLISHED_PORT=8080 CLI2API_DASH_PUBLISHED_PORT=8081 ./deploy.sh deploy
```

Set `CLI2API_AUTH_HOME_BASE` if the API container should use a different
per-account Codex auth directory. The default is `/data/codex-homes`, which is
inside the persistent `cli2api-data` Compose volume.

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

The CLI uses the same `CLI2API_DB=/data/cli2api.sqlite` environment as the
running server, so the admin is stored in the Compose volume.

## Codex Account Pool

Use the dashboard `上游账号` page to create a Codex upstream account. Click
`网页认证`, open the returned auth URL, enter the displayed user code, and then
click `刷新认证` until the account becomes `authenticated`.

After authentication, open `实例池`, bind the account, set the concurrency limit,
and create an instance. The API service assigns a service-owned empty runtime
workspace automatically. Runs that target a matching model profile are scheduled
onto enabled, authenticated instances and record the selected
`upstreamInstanceId`.
