# Deployment

cli2api includes a root Docker Compose package for local private deployments.

## Compose Service

`compose.yaml` defines one `api` service:

- builds the root `Dockerfile`
- runs `apps/core/dist/server.js`
- serves built dashboard assets from `/app/apps/dash/dist`
- stores SQLite data in the `cli2api-data` volume mounted at `/data`
- exposes `http://127.0.0.1:3000` by default
- checks health with `/api/health`

Set `CLI2API_PUBLISHED_PORT` to change the host port:

```bash
CLI2API_PUBLISHED_PORT=8080 ./deploy.sh deploy
```

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

`deploy` is the default command. It builds the image, recreates the API service,
and waits until `/api/health` is healthy. `status` prints Compose service state
and the API health response. `test` runs the local `pnpm test` suite.

## First Admin

After the service is healthy, create the first admin user inside the API
container:

```bash
docker compose -f compose.yaml exec api \
  node apps/core/dist/cli.js admin create \
  --email admin@example.com \
  --password change-me
```

The CLI uses the same `CLI2API_DB=/data/cli2api.sqlite` environment as the
running server, so the admin is stored in the Compose volume.
