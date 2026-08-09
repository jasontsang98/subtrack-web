#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
project_name="subtrack-integration-$$"

cleanup() {
  docker compose -p "$project_name" -f "$project_root/compose.test.yaml" down --volumes --remove-orphans
}
trap cleanup EXIT INT TERM

docker compose -p "$project_name" -f "$project_root/compose.test.yaml"   up --build --abort-on-container-exit --exit-code-from integration integration
