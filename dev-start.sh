#!/bin/bash
# RingSolutions local development launcher
# Usage: ./dev-start.sh
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== RingSolutions Dev Environment ==="

# Backend
echo "[1/2] Starting Flask API on :5000..."
cd "$ROOT/backend"
source venv/bin/activate
python3 dev_setup.py 2>/dev/null
FLASK_ENV=development python3 -m flask run --host=0.0.0.0 --port=5000 > /tmp/ringsolutions-api.log 2>&1 &
API_PID=$!
echo "    Flask PID: $API_PID"

# Wait for backend to be ready
for i in $(seq 1 15); do
  if curl -s http://127.0.0.1:5000/api/health > /dev/null 2>&1; then
    echo "    ✓ API is ready"
    break
  fi
  sleep 1
done

# Frontend
echo "[2/2] Starting Vite frontend on :5173..."
cd "$ROOT/frontend"
npm run dev -- --host 0.0.0.0 > /tmp/ringsolutions-frontend.log 2>&1 &
VITE_PID=$!
echo "    Vite PID: $VITE_PID"

sleep 2

echo ""
echo "======================================="
echo "  RingSolutions is running!"
echo "======================================="
echo "  Frontend : http://localhost:5173"
echo "  API      : http://localhost:5000/api"
echo "  Health   : http://localhost:5000/api/health"
echo ""
echo "  Login    : admin@ringsolutions.com"
echo "  Password : admin1234"
echo "======================================="
echo ""
echo "Logs: tail -f /tmp/ringsolutions-api.log"
echo "      tail -f /tmp/ringsolutions-frontend.log"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and cleanup on Ctrl+C
trap "echo 'Stopping...'; kill $API_PID $VITE_PID 2>/dev/null; exit 0" INT TERM
wait
