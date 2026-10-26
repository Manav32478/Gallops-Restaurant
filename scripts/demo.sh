#!/usr/bin/env bash
#
# One-command demo reset: fresh schema, seed data (real 170-dish menu, tables,
# staff, demo order history), then start the server.
#
# Usage: ./scripts/demo.sh           # reset + seed + run
#        ./scripts/demo.sh --keep-db # just seed + run (no reset)
#
set -euo pipefail

say() { printf '\n\033[1;36m▸ %s\033[0m\n' "$1"; }

if [ ! -f .env ]; then
  cp .env.example .env
  say "Created .env from .env.example — EDIT IT (DATABASE_URL + AUTH_SECRET) before continuing."
  exit 1
fi

if [ "${1:-}" != "--keep-db" ]; then
  say "Resetting the database (prisma migrate reset)"
  npx prisma migrate reset --force --skip-generate
else
  say "Keeping the existing database — applying pending migrations"
  npx prisma migrate deploy
fi

say "Seeding demo data"
npm run seed

say "Starting the server"
npm run dev
