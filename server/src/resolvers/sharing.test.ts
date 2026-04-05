import { describe, it, expect, beforeAll, afterAll, jest } from "@jest/globals";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "../schema/typeDefs.js";
import { resolvers } from "./index.js";
import { prisma } from "../../test/prisma-client.js";
import type { Context } from "../context.js";

// Mock R2 (required — the service imports it)
jest.unstable_mockModule("../utils/r2.js", () => ({
  uploadFile: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  r2: {},
  BUCKET: "test-bucket",
  getDownloadUrl: jest.fn<() => Promise<string>>().mockResolvedValue("https://example.com/download"),
  getFileContent: jest.fn<() => Promise<string>>().mockResolvedValue(""),
}));

// --- GraphQL Operations ---

const TOGGLE_ROAST_PUBLIC = `
  mutation ToggleRoastPublic($id: String!) {
    toggleRoastPublic(id: $id) {
      id
      isPublic
    }
  }
`;

const ROAST_QUERY = `
  query Roast($id: String!) {
    roast(id: $id) {
      id
      ambientTemp
      notes
      isPublic
      bean { id name }
    }
  }
`;

const PUBLIC_ROASTS = `
  query PublicRoasts($beanId: String, $limit: Int, $offset: Int) {
    publicRoasts(beanId: $beanId, limit: $limit, offset: $offset) {
      id
      isPublic
      bean { id name }
    }
  }
`;

const COMMUNITY_STATS = `
  query CommunityStats {
    communityStats {
      totalRoasts
      totalBeans
    }
  }
`;

// --- Helpers ---

type SingleBody = {
  kind: "single";
  singleResult: {
    data: Record<string, unknown> | null;
    errors?: { message: string; extensions?: { code?: string } }[];
  };
};

let server: ApolloServer<Context>;

function executeAs(userId: string | null, query: string, variables?: Record<string, unknown>) {
  return server.executeOperation(
    { query, variables },
    { contextValue: { prisma, userId } },
  );
}

// --- Test data IDs ---

let testUserId: string;
let otherUserId: string;
let testBeanId: string;
let publicRoastId: string;
let privateRoastId: string;
let otherRoastId: string;

beforeAll(async () => {
  server = new ApolloServer<Context>({ typeDefs, resolvers });

  // Create two users
  const testUser = await prisma.user.create({
    data: { clerkId: "test_clerk_sharing" },
  });
  testUserId = testUser.id;

  const otherUser = await prisma.user.create({
    data: { clerkId: "test_clerk_sharing_other" },
  });
  otherUserId = otherUser.id;

  // Create bean
  const bean = await prisma.bean.create({
    data: { name: "Sharing Test Bean" },
  });
  testBeanId = bean.id;

  // Create public roast for test user (default isPublic: true)
  const publicRoast = await prisma.roast.create({
    data: {
      userId: testUserId,
      beanId: testBeanId,
      ambientTemp: 20.0,
      notes: "Public test roast",
      isPublic: true,
    },
  });
  publicRoastId = publicRoast.id;

  // Create private roast for test user
  const privateRoast = await prisma.roast.create({
    data: {
      userId: testUserId,
      beanId: testBeanId,
      ambientTemp: 21.0,
      notes: "Private test roast",
      isPublic: false,
    },
  });
  privateRoastId = privateRoast.id;

  // Create roast for other user
  const otherRoast = await prisma.roast.create({
    data: {
      userId: otherUserId,
      beanId: testBeanId,
      ambientTemp: 22.0,
      notes: "Other sharing roast",
      isPublic: true,
    },
  });
  otherRoastId = otherRoast.id;
});

afterAll(async () => {
  await prisma.roast.deleteMany({
    where: { userId: { in: [testUserId, otherUserId] } },
  });
  await prisma.userBean.deleteMany({
    where: { userId: { in: [testUserId, otherUserId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [testUserId, otherUserId] } },
  });
  await prisma.bean.delete({ where: { id: testBeanId } });
  await prisma.$disconnect();
});

// --- Tests ---

describe("toggleRoastPublic", () => {
  it("toggles isPublic from true to false", async () => {
    const response = await executeAs(testUserId, TOGGLE_ROAST_PUBLIC, { id: publicRoastId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roast = body.singleResult.data!.toggleRoastPublic as {
      id: string;
      isPublic: boolean;
    };

    expect(roast.id).toBe(publicRoastId);
    expect(roast.isPublic).toBe(false);
  });

  it("toggles back from false to true", async () => {
    const response = await executeAs(testUserId, TOGGLE_ROAST_PUBLIC, { id: publicRoastId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roast = body.singleResult.data!.toggleRoastPublic as {
      id: string;
      isPublic: boolean;
    };

    expect(roast.id).toBe(publicRoastId);
    expect(roast.isPublic).toBe(true);
  });

  it("throws NOT_FOUND for non-existent roast", async () => {
    const response = await executeAs(testUserId, TOGGLE_ROAST_PUBLIC, { id: "nonexistent-id" });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Roast not found");
  });

  it("cannot toggle another user's roast", async () => {
    const response = await executeAs(testUserId, TOGGLE_ROAST_PUBLIC, { id: otherRoastId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Roast not found");
  });
});

describe("roast (public query)", () => {
  it("returns public roast without auth", async () => {
    const response = await executeAs(null, ROAST_QUERY, { id: publicRoastId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roast = body.singleResult.data!.roast as {
      id: string;
      isPublic: boolean;
      notes: string;
      bean: { name: string };
    };

    expect(roast.id).toBe(publicRoastId);
    expect(roast.isPublic).toBe(true);
    expect(roast.notes).toBe("Public test roast");
    expect(roast.bean.name).toBe("Sharing Test Bean");
  });

  it("returns null for private roast when not the owner", async () => {
    const response = await executeAs(null, ROAST_QUERY, { id: privateRoastId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    expect(body.singleResult.data!.roast).toBeNull();
  });

  it("returns private roast when the owner requests it", async () => {
    const response = await executeAs(testUserId, ROAST_QUERY, { id: privateRoastId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roast = body.singleResult.data!.roast as { id: string; isPublic: boolean };
    expect(roast.id).toBe(privateRoastId);
    expect(roast.isPublic).toBe(false);
  });

  it("returns null for non-existent roast", async () => {
    const response = await executeAs(null, ROAST_QUERY, { id: "invalid-id" });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    expect(body.singleResult.data!.roast).toBeNull();
  });
});

describe("publicRoasts", () => {
  it("returns only public roasts without auth", async () => {
    const response = await executeAs(null, PUBLIC_ROASTS, {});
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roasts = body.singleResult.data!.publicRoasts as { id: string; isPublic: boolean }[];

    // All returned roasts should be public
    for (const roast of roasts) {
      expect(roast.isPublic).toBe(true);
    }
    // Private roast should not appear
    const ids = roasts.map((r) => r.id);
    expect(ids).not.toContain(privateRoastId);
  });

  it("filters by beanId", async () => {
    const response = await executeAs(null, PUBLIC_ROASTS, { beanId: testBeanId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roasts = body.singleResult.data!.publicRoasts as { id: string; bean: { id: string } }[];

    for (const roast of roasts) {
      expect(roast.bean.id).toBe(testBeanId);
    }
  });

  it("respects limit parameter", async () => {
    const response = await executeAs(null, PUBLIC_ROASTS, { limit: 1 });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roasts = body.singleResult.data!.publicRoasts as unknown[];
    expect(roasts.length).toBeLessThanOrEqual(1);
  });
});

describe("communityStats", () => {
  it("returns total public roasts and total beans without auth", async () => {
    const response = await executeAs(null, COMMUNITY_STATS);
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const stats = body.singleResult.data!.communityStats as {
      totalRoasts: number;
      totalBeans: number;
    };

    expect(stats.totalRoasts).toBeGreaterThanOrEqual(2); // at least our 2 public roasts
    expect(stats.totalBeans).toBeGreaterThanOrEqual(1);
  });
});
