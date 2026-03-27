import { verifyToken } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { GraphQLError } from "graphql";
import type { IncomingMessage } from "node:http";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      const clerkId = payload.sub;

      // Upsert user so we always have a local record
      const user = await prisma.user.upsert({
        where: { clerkId },
        update: {},
        create: { clerkId },
      });
      userId = user.id;
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
