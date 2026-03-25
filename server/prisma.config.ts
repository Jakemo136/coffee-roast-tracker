import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },

  schema: path.join(__dirname, "prisma", "schema.prisma"),

  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
