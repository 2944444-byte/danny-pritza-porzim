#!/usr/bin/env bash
# Start the backend (port 8000) and the frontend dev server (port 5173) together.
# Usage: ./run-dev.sh   (Ctrl-C stops both)
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "› Starting backend on :8000"
(
  cd "$ROOT/backend"
  pip install -q -r requirements.txt
  exec uvicorn main:app --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

echo "› Starting frontend on :5173"
(
  cd "$ROOT"
  [ -d node_modules ] || npm install
  exec npm run dev -- --host 0.0.0.0 --port 5173
) &
FRONTEND_PID=$!

trap 'echo "Stopping…"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null' INT TERM
wait
