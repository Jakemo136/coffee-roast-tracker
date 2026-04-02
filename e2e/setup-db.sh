#!/bin/bash
# Run this before E2E tests to reset and seed the test database.
# Usage: bash e2e/setup-db.sh
set -e

E2E_DB="postgresql://jakemosher@localhost:5432/coffee_roast_tracker_test"
SERVER_DIR="$(cd "$(dirname "$0")/../server" && pwd)"

echo "[E2E] Resetting test database..."
cd "$SERVER_DIR"
DATABASE_URL="$E2E_DB" npx prisma migrate reset --force

echo "[E2E] Done. Alice ID:"
psql -d coffee_roast_tracker_test -tAc "SELECT id FROM \"User\" WHERE \"clerkId\" = 'clerk_seed_alice_001'"
