#!/usr/bin/env bash
# --harness proves A only; default runs the real B matrix. Always cleans its own project.
# Supports --grep "pattern" and --project desktop|mobile for filtered iterations.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/isolated-auth.sh"
isolated_init

# Parse arguments: separate mode flags from Playwright filters.
E2E_GREP=""
E2E_PROJECT=""
E2E_MODE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --harness|--runner-failure)
      [[ -z "$E2E_MODE" ]] || { echo "e2e.sh: duplicate mode flag" >&2; exit 2; }
      E2E_MODE="$1"; shift ;;
    --grep)
      [[ $# -ge 2 ]] || { echo "e2e.sh: --grep requires a value" >&2; exit 2; }
      [[ -z "$E2E_GREP" ]] || { echo "e2e.sh: duplicate --grep" >&2; exit 2; }
      E2E_GREP="$2"; shift 2 ;;
    --project)
      [[ $# -ge 2 ]] || { echo "e2e.sh: --project requires a value" >&2; exit 2; }
      [[ -z "$E2E_PROJECT" ]] || { echo "e2e.sh: duplicate --project" >&2; exit 2; }
      if [[ "$2" != "desktop" && "$2" != "mobile" ]]; then
        echo "e2e.sh: --project must be desktop or mobile" >&2; exit 2;
      fi
      E2E_PROJECT="$2"; shift 2 ;;
    *)
      echo "e2e.sh: unknown flag: $1" >&2; exit 2 ;;
  esac
done

# Reject combining mode flags with filters.
if [[ -n "$E2E_MODE" && ( -n "$E2E_GREP" || -n "$E2E_PROJECT" ) ]]; then
  echo "e2e.sh: cannot combine --harness/--runner-failure with --grep/--project" >&2; exit 2;
fi

if [[ -z "$E2E_MODE" ]]; then
  # Product mode: host Node 24 runs the closed lifecycle/DB control (run-e2e.mjs). Fail before any build or resource.
  node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)' 2>/dev/null || {
    echo 'e2e.sh: product mode requires Node >= 24 on the host (scripts/run-e2e.mjs)' >&2; exit 2;
  }
fi
PROJECT="${STARTER_E2E_PROJECT:-starter-e2e-$(date +%s)-$$-$RANDOM}"
validate_project "$PROJECT"
[[ "$PROJECT" == starter-e2e-* ]] || exit 2
export STARTER_E2E_ARTIFACTS="$ROOT/e2e/artifacts/$PROJECT"
# Git Bash maps Windows TEMP to /tmp; Docker must bind the native host path,
# shared with the Windows Node controller, rather than a different Linux /tmp.
if command -v cygpath >/dev/null 2>&1; then
  export STARTER_E2E_ARTIFACTS="$(cygpath -m "$STARTER_E2E_ARTIFACTS")"
fi
export APP_PUBLIC_URL=http://localhost
COMPOSE_ARGS=(compose --env-file scripts/fixtures/e2e.env.example -p "$PROJECT"
  -f docker-compose.yml -f compose.auth-test.yml -f docker-compose.e2e.yml --profile oidc --profile e2e)
assert_absent
mkdir -p "$STARTER_E2E_ARTIFACTS/control"
cp scripts/fixtures/oidc.json "$STARTER_E2E_ARTIFACTS/control/oidc.json"
install_cleanup # Before build/up: handles partial start, build failure and signals.
compose build server client e2e
compose up -d --wait --wait-timeout 300 db oidc server client voice-provider
compose run --rm --no-deps e2e node harness/readiness.mjs
if [[ "$E2E_MODE" == "--harness" ]]; then
  compose run --rm --no-deps e2e npm run harness
elif [[ "$E2E_MODE" == "--runner-failure" ]]; then
  # Infrastructure assay only: explicit container failure, never product evidence.
  compose run --rm --no-deps e2e node -e 'process.exit(42)'
else
  # Product mode: run full E2E lifecycle via run-e2e.mjs controller.
  # Prove this exact image's sanitizer (canaries, fail-closed refusal) before trusting any report it exports.
  compose run --rm --no-deps e2e python3 harness/test_sanitize.py
  
  # Build filter arguments for run-e2e.mjs (passed after compose args).
  FILTER_ARGS=()
  if [[ -n "$E2E_GREP" ]]; then
    FILTER_ARGS+=('--grep' "$E2E_GREP")
  fi
  if [[ -n "$E2E_PROJECT" ]]; then
    FILTER_ARGS+=('--project' "$E2E_PROJECT")
  fi
  
  node scripts/run-e2e.mjs "${COMPOSE_ARGS[@]}" "${FILTER_ARGS[@]}" &
  COMPOSE_PID=$!
  code=0
  wait "$COMPOSE_PID" || code=$?
  COMPOSE_PID=''
  exit "$code"
fi
