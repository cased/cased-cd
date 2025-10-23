#!/bin/bash

echo "🛑 Stopping Cased CD development servers..."
echo ""

# Try to kill from saved PIDs first
if [ -f /tmp/cased-cd-pids.txt ]; then
    PIDS=$(cat /tmp/cased-cd-pids.txt)
    for PID in $PIDS; do
        if ps -p $PID > /dev/null 2>&1; then
            echo "   Killing process $PID"
            kill $PID 2>/dev/null || true
        fi
    done
    rm /tmp/cased-cd-pids.txt
fi

# Kill any remaining processes on the ports
if lsof -i:8080 &> /dev/null; then
    echo "   Stopping mock server (port 8080)"
    lsof -ti:8080 | xargs kill 2>/dev/null || true
fi

if lsof -i:5173 &> /dev/null; then
    echo "   Stopping Vite server (port 5173)"
    lsof -ti:5173 | xargs kill 2>/dev/null || true
fi

# Clean up logs
if [ -f /tmp/cased-cd-mock.log ]; then
    rm /tmp/cased-cd-mock.log
fi

if [ -f /tmp/cased-cd-vite.log ]; then
    rm /tmp/cased-cd-vite.log
fi

echo ""
echo "✅ Development servers stopped"
