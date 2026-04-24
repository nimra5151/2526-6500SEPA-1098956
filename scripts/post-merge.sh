#!/bin/bash
set -e

npm install --legacy-peer-deps

if command -v npm &>/dev/null && npm run db:push --dry-run 2>&1 | grep -q "drizzle"; then
  npm run db:push 2>/dev/null || true
fi
