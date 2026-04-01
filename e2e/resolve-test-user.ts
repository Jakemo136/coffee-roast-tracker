/**
 * Resolves Alice's user ID from the seeded database.
 * Run: DATABASE_URL=... npx tsx e2e/resolve-test-user.ts
 */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  const alice = await prisma.user.findFirst({
    where: { clerkId: "clerk_seed_alice_001" },
  });

  if (!alice) {
    console.error("Alice not found — has the E2E database been seeded?");
    process.exit(1);
  }

  console.log(alice.id);
  await prisma.$disconnect();
}

main();
