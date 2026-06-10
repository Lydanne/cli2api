#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"
API_SERVICE_NAME="${API_SERVICE_NAME:-api}"
PUBLISHED_PORT="${CLI2API_PUBLISHED_PORT:-3000}"
DASH_PUBLISHED_PORT="${CLI2API_DASH_PUBLISHED_PORT:-5173}"
API_HEALTH_URL="${CLI2API_API_HEALTH_URL:-http://127.0.0.1:${PUBLISHED_PORT}/api/health}"
DASH_HEALTH_URL="${CLI2API_DASH_HEALTH_URL:-http://127.0.0.1:${DASH_PUBLISHED_PORT}/}"

usage() {
  cat <<'USAGE'
Usage: ./deploy.sh [command]

Commands:
  deploy    Build runtime service images, recreate services, and wait for health. Default.
  build     Build the cli2api API and dashboard images.
  up        Start all Compose services in detached mode.
  down      Stop and remove Compose services.
  restart   Restart the API service and wait for health.
  status    Show Compose service status plus API and dashboard health.
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

fetch_url() {
  local url="$1"
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "${url}"
    return
  fi

  node -e "fetch(process.argv[1]).then(async r => { if (!r.ok) process.exit(1); console.log(await r.text()); }).catch(() => process.exit(1));" "${url}"
}

wait_for_health() {
  local name="$1"
  local url="$2"
  local attempts="${CLI2API_HEALTH_ATTEMPTS:-30}"
  local delay="${CLI2API_HEALTH_DELAY:-2}"

  echo "Waiting for ${name} health at ${url}"
  for attempt in $(seq 1 "${attempts}"); do
    if fetch_url "${url}" >/dev/null 2>&1; then
      echo "${name} is healthy"
      return
    fi
    echo "${name} health check ${attempt}/${attempts} failed; retrying in ${delay}s..."
    sleep "${delay}"
  done

  echo "${name} did not become healthy at ${url}" >&2
  compose logs --tail=80 >&2 || true
  exit 1
}

cmd_deploy() {
  require_docker
  compose build
  compose up -d --force-recreate
  wait_for_health "API" "${API_HEALTH_URL}"
  wait_for_health "Dashboard" "${DASH_HEALTH_URL}"
}

cmd_build() {
  require_docker
  compose build
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
  compose restart "${API_SERVICE_NAME}"
  wait_for_health "API" "${API_HEALTH_URL}"
}

cmd_status() {
  require_docker
  compose ps
  echo
  echo "API health:"
  fetch_url "${API_HEALTH_URL}" || {
    echo "API health check failed at ${API_HEALTH_URL}" >&2
    exit 1
  }
  echo
  echo
  echo "Dashboard health:"
  fetch_url "${DASH_HEALTH_URL}" >/dev/null || {
    echo "Dashboard health check failed at ${DASH_HEALTH_URL}" >&2
    exit 1
  }
  echo "${DASH_HEALTH_URL}"
}

cmd_logs() {
  require_docker
  compose logs -f "${API_SERVICE_NAME}"
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
