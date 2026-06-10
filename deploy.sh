#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"
SERVICE_NAME="${SERVICE_NAME:-api}"
PUBLISHED_PORT="${CLI2API_PUBLISHED_PORT:-3000}"
API_HEALTH_URL="${CLI2API_API_HEALTH_URL:-http://127.0.0.1:${PUBLISHED_PORT}/api/health}"

usage() {
  cat <<'USAGE'
Usage: ./deploy.sh [command]

Commands:
  deploy    Build runtime service images, recreate services, and wait for health. Default.
  build     Build the cli2api runtime image with bundled frontend assets.
  up        Start all Compose services in detached mode.
  down      Stop and remove Compose services.
  restart   Restart the API service and wait for health.
  status    Show Compose service status and API health.
  logs      Follow API logs.
  test      Run the pnpm test suite.
  help      Show this help.
USAGE
}

compose() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required but was not found in PATH" >&2
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "docker compose is required but is not available" >&2
    exit 1
  fi
}

fetch_health() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "${API_HEALTH_URL}"
    return
  fi

  node -e "fetch(process.argv[1]).then(async r => { if (!r.ok) process.exit(1); console.log(await r.text()); }).catch(() => process.exit(1));" "${API_HEALTH_URL}"
}

wait_for_health() {
  local attempts="${CLI2API_HEALTH_ATTEMPTS:-30}"
  local delay="${CLI2API_HEALTH_DELAY:-2}"

  echo "Waiting for API health at ${API_HEALTH_URL}"
  for attempt in $(seq 1 "${attempts}"); do
    if fetch_health >/dev/null 2>&1; then
      echo "API is healthy"
      return
    fi
    echo "Health check ${attempt}/${attempts} failed; retrying in ${delay}s..."
    sleep "${delay}"
  done

  echo "API did not become healthy at ${API_HEALTH_URL}" >&2
  compose logs --tail=80 "${SERVICE_NAME}" >&2 || true
  exit 1
}

cmd_deploy() {
  require_docker
  compose build "${SERVICE_NAME}"
  compose up -d --force-recreate "${SERVICE_NAME}"
  wait_for_health
}

cmd_build() {
  require_docker
  compose build "${SERVICE_NAME}"
}

cmd_up() {
  require_docker
  compose up -d
}

cmd_down() {
  require_docker
  compose down
}

cmd_restart() {
  require_docker
  compose restart "${SERVICE_NAME}"
  wait_for_health
}

cmd_status() {
  require_docker
  compose ps
  echo
  echo "API health:"
  fetch_health || {
    echo "API health check failed at ${API_HEALTH_URL}" >&2
    exit 1
  }
  echo
}

cmd_logs() {
  require_docker
  compose logs -f "${SERVICE_NAME}"
}

cmd_test() {
  pnpm test
}

command="${1:-deploy}"
case "${command}" in
  deploy)
    cmd_deploy
    ;;
  build)
    cmd_build
    ;;
  up)
    cmd_up
    ;;
  down)
    cmd_down
    ;;
  restart)
    cmd_restart
    ;;
  status)
    cmd_status
    ;;
  logs)
    cmd_logs
    ;;
  test)
    cmd_test
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    echo "Unknown command: ${command}" >&2
    usage >&2
    exit 1
    ;;
esac
