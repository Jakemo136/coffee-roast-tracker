const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SERVER = path.join(ROOT, "server");
const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://jakemosher@localhost:5432/coffee_roast_tracker_test";
const ID_FILE = path.join(__dirname, ".test-user-id");

async function globalSetup() {
  console.log("\n[E2E] Resetting test database...");
  execSync("npx prisma migrate reset --force", {
    cwd: SERVER,
    env: {
      ...process.env,
      DATABASE_URL: E2E_DB,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "Yep",
    },
    stdio: "pipe",
  });

  console.log("[E2E] Seeding test data...");
  execSync("npx prisma db seed", {
    cwd: SERVER,
    env: { ...process.env, DATABASE_URL: E2E_DB },
    stdio: "pipe",
  });

  // Resolve Alice's user ID and write to file for webServer command
  const userId = execSync(
    'psql -d coffee_roast_tracker_test -tAc "SELECT id FROM \\"User\\" WHERE \\"clerkId\\" = \'clerk_seed_alice_001\'"',
    { encoding: "utf-8" },
  ).trim();

  if (!userId) {
    throw new Error("Could not resolve Alice's user ID from test DB");
  }

  fs.writeFileSync(ID_FILE, userId);
  console.log(`[E2E] Test user: ${userId}`);
  console.log("[E2E] Database ready.\n");
}

module.exports = globalSetup;
