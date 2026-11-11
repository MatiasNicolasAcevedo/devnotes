#!/usr/bin/env bash
set -eu

port=${PORT:-10000}
if [[ ! $port =~ ^[1-9][0-9]{0,4}$ ]] || (( port > 65535 || port == 8080 )); then
    echo 'PORT must be an integer between 1 and 65535, excluding the internal Spring port 8080' >&2
    exit 1
fi

"${BASH_SOURCE[0]%/*}/19-public-origin.sh" "$port" http://127.0.0.1:8080
nginx -t -g 'pid /tmp/devnotes-nginx.pid;'

# Job control lets both background processes receive SIGINT.
set -m
signal=
trap 'signal=TERM' TERM
trap 'signal=INT' INT

java -Duser.timezone=UTC -jar /app/app.jar --server.address=127.0.0.1 --server.port=8080 &
spring_pid=$!
nginx -g 'daemon off; pid /tmp/devnotes-nginx.pid;' &
nginx_pid=$!

# Check both PIDs, including when either command fails before the first wait.
while [[ -z $signal ]] && kill -0 "$spring_pid" 2>/dev/null && kill -0 "$nginx_pid" 2>/dev/null; do
    sleep 0.2
done

status=0
if [[ -z $signal ]]; then
    echo 'Spring or nginx exited unexpectedly' >&2
    signal=TERM
    status=1
fi
# Reap both children even if a second stop signal arrives while waiting.
trap '' TERM INT
kill -s "$signal" "$spring_pid" "$nginx_pid" 2>/dev/null || true
wait "$spring_pid" || true
wait "$nginx_pid" || true
exit "$status"
