#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/apps/api/compose.smoke.yml"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-gitiempo-api-smoke}"
export API_IMAGE="${API_IMAGE:-gitiempo-api:local}"

cleanup() {
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT
cleanup

docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up --abort-on-container-exit --exit-code-from smoke smoke
