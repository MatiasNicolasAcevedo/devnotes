#!/usr/bin/env bash
# Test the supervisor without starting Java, nginx, or Docker.
set -euo pipefail
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
bash -n "$root/deploy/render/entrypoint.sh"
sh -n "$root/client/19-public-origin.sh"

fixture=$(mktemp -d)
supervisor=
cleanup() {
    if [[ -n $supervisor ]]; then
        kill -TERM "$supervisor" 2>/dev/null || true
        wait "$supervisor" || true
    fi
    rm -r -- "$fixture"
}
trap cleanup EXIT
cp "$root/deploy/render/entrypoint.sh" "$fixture/"
cat > "$fixture/19-public-origin.sh" <<'EOF'
#!/bin/sh
[ "$*" = '12345 http://127.0.0.1:8080' ]
EOF
cat > "$fixture/child" <<'EOF'
#!/usr/bin/env bash
[[ ${1:-} != -t ]] || exit 0
name=${0##*/}
trap 'touch "$TEST_STATE/$name.term"; exit 0' TERM
echo "$$" > "$TEST_STATE/$name.pid"
if [[ $name == "$FAIL_PROCESS" ]]; then
    for (( attempt=0; attempt<30; attempt++ )); do
        [[ -s $TEST_STATE/java.pid && -s $TEST_STATE/nginx.pid ]] && exit 7
        sleep 0.1
    done
    exit 8
fi
while :; do sleep 0.1; done
EOF
chmod +x "$fixture/19-public-origin.sh" "$fixture/child"
cp "$fixture/child" "$fixture/java"
cp "$fixture/child" "$fixture/nginx"

for failure in none java nginx; do
    state="$fixture/state-$failure"
    mkdir "$state"
    PATH="$fixture:$PATH" PORT=12345 TEST_STATE="$state" FAIL_PROCESS="$failure" \
        bash "$fixture/entrypoint.sh" &
    supervisor=$!
    if [[ $failure == none ]]; then
        for (( attempt=0; attempt<50; attempt++ )); do
            [[ -s $state/java.pid && -s $state/nginx.pid ]] && break
            sleep 0.1
        done
        [[ -s $state/java.pid && -s $state/nginx.pid ]]
        kill -TERM "$supervisor"
    fi
    for (( attempt=0; attempt<50; attempt++ )); do
        kill -0 "$supervisor" 2>/dev/null || break
        sleep 0.1
    done
    ! kill -0 "$supervisor" 2>/dev/null || exit 1
    status=0
    wait "$supervisor" || status=$?
    supervisor=
    case "$failure" in
        none) [[ $status == 0 && -f $state/java.term && -f $state/nginx.term ]] ;;
        java) [[ $status != 0 && -f $state/nginx.term ]] ;;
        nginx) [[ $status != 0 && -f $state/java.term ]] ;;
    esac
done
echo 'Render entrypoint: SIGTERM and both process failures passed'
