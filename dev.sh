#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID=""

cleanup() {
  if [ -n "$BACKEND_PID" ]; then
    echo ""
    echo "Stopping backend (PID $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  echo "Done."
}

trap cleanup EXIT

# Run DB migrations, then start backend
echo "Running DB migrations..."
cd "$SCRIPT_DIR/Backend"
python -c "from start import ensure_columns; ensure_columns()"
echo "Starting backend..."
uvicorn main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

echo ""
echo "Backend:  http://127.0.0.1:8000/docs"
echo "Frontend: http://localhost:3000"
echo ""

# Start frontend (foreground — Ctrl+C here triggers cleanup)
cd "$SCRIPT_DIR/Frontend"
npm run dev
