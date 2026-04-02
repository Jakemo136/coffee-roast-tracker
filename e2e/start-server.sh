#!/bin/bash
set -e

E2E_DB="postgresql://jakemosher@localhost:5432/coffee_roast_tracker_test"

# Resolve Alice's user ID
E2E_TEST_USER_ID=$(psql -d coffee_roast_tracker_test -tAc "SELECT id FROM \"User\" WHERE \"clerkId\" = 'clerk_seed_alice_001'" | tr -d ' ')

if [ -z "$E2E_TEST_USER_ID" ]; then
  echo "[E2E] ERROR: Alice not found. Run 'npm run test:e2e:setup' first."
  exit 1
fi

echo "[E2E] Test user: $E2E_TEST_USER_ID"

# Start the server
export DATABASE_URL="$E2E_DB"
export E2E_TEST_USER_ID
export CLERK_SECRET_KEY="sk_test_placeholder"
exec npm run dev:server
