#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/apps/api/compose.e2e.yml"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-gitiempo-api-e2e}"

cleanup() {
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT
cleanup

docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up --build --abort-on-container-exit --exit-code-from api-e2e api-e2e
