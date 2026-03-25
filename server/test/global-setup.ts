import { execSync } from "node:child_process";
import path from "node:path";
import dotenv from "dotenv";

// Jest globalSetup runs from the project root (where jest.config.ts lives)
const serverRoot = process.cwd();

dotenv.config({ path: path.join(serverRoot, ".env.test") });

export default async function globalSetup() {
  execSync("npx prisma migrate reset --force", {
    cwd: serverRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION:
        "yes, reset the test database prdy plz",
    },
  });
}
