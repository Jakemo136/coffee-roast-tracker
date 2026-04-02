import { verifyToken } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { GraphQLError } from "graphql";
import type { IncomingMessage } from "node:http";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const userIdCache = new Map<string, { userId: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface Context {
  prisma: PrismaClient;
  userId: string | null;
}

export async function createContext({
  req,
}: {
  req: IncomingMessage;
}): Promise<Context> {
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  // E2E test bypass: skip Clerk verification when test user ID is set
  if (process.env.E2E_TEST_USER_ID && authHeader === "Bearer e2e-test-token") {
    // Allow per-request user override via x-e2e-clerk-id header (resolves to internal ID)
    const overrideClerkId = req.headers["x-e2e-clerk-id"] as string | undefined;
    if (overrideClerkId) {
      const user = await prisma.user.findUnique({ where: { clerkId: overrideClerkId } });
      if (user) return { prisma, userId: user.id };
    }
    return { prisma, userId: process.env.E2E_TEST_USER_ID };
  }

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      const clerkId = payload.sub;

      // Check cache before hitting DB
      const cached = userIdCache.get(clerkId);
      if (cached && cached.expiresAt > Date.now()) {
        userId = cached.userId;
      } else {
        const user = await prisma.user.upsert({
          where: { clerkId },
          update: {},
          create: { clerkId },
        });
        userId = user.id;
        userIdCache.set(clerkId, { userId, expiresAt: Date.now() + CACHE_TTL_MS });
      }
    } catch (err) {
      console.error("Token verification failed:", err);
    }
  }

  return { prisma, userId };
}

export function requireAuth(ctx: Context): string {
  if (!ctx.userId) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return ctx.userId;
}
