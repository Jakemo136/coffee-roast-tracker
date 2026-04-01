const { execSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SERVER = path.join(ROOT, "server");
const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://jakemosher@localhost:5432/coffee_roast_tracker_test";

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

  console.log("[E2E] Database ready.\n");
}

module.exports = globalSetup;
