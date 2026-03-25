import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma = new PrismaClient({ adapter });
