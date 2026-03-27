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

const TOGGLE_ROAST_SHARING = `
  mutation ToggleRoastSharing($id: String!) {
    toggleRoastSharing(id: $id) {
      id
      isShared
      shareToken
    }
  }
`;

const ROAST_BY_SHARE_TOKEN = `
  query RoastByShareToken($token: String!) {
    roastByShareToken(token: $token) {
      id
      ambientTemp
      notes
      isShared
      shareToken
      bean { id name }
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
let sharingRoastId: string;
let sharingRoastToken: string;
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

  // Create roast for test user (starts unshared)
  const roast = await prisma.roast.create({
    data: {
      userId: testUserId,
      beanId: testBeanId,
      ambientTemp: 20.0,
      notes: "Sharing test roast",
    },
  });
  sharingRoastId = roast.id;
  sharingRoastToken = roast.shareToken;

  // Create roast for other user
  const otherRoast = await prisma.roast.create({
    data: {
      userId: otherUserId,
      beanId: testBeanId,
      ambientTemp: 22.0,
      notes: "Other sharing roast",
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

describe("toggleRoastSharing", () => {
  it("toggles isShared from false to true", async () => {
    const response = await executeAs(testUserId, TOGGLE_ROAST_SHARING, { id: sharingRoastId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roast = body.singleResult.data!.toggleRoastSharing as {
      id: string;
      isShared: boolean;
      shareToken: string;
    };

    expect(roast.id).toBe(sharingRoastId);
    expect(roast.isShared).toBe(true);
    expect(roast.shareToken).toBeDefined();
  });

  it("toggles back from true to false", async () => {
    const response = await executeAs(testUserId, TOGGLE_ROAST_SHARING, { id: sharingRoastId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roast = body.singleResult.data!.toggleRoastSharing as {
      id: string;
      isShared: boolean;
    };

    expect(roast.id).toBe(sharingRoastId);
    expect(roast.isShared).toBe(false);
  });

  it("throws NOT_FOUND for non-existent roast", async () => {
    const response = await executeAs(testUserId, TOGGLE_ROAST_SHARING, { id: "nonexistent-id" });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Roast not found");
  });

  it("cannot toggle another user's roast", async () => {
    const response = await executeAs(testUserId, TOGGLE_ROAST_SHARING, { id: otherRoastId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Roast not found");
  });
});

describe("roastByShareToken", () => {
  // First, enable sharing on the roast so the shared test works
  beforeAll(async () => {
    await prisma.roast.update({
      where: { id: sharingRoastId },
      data: { isShared: true },
    });
  });

  it("returns shared roast by token (no auth required)", async () => {
    const response = await executeAs(null, ROAST_BY_SHARE_TOKEN, { token: sharingRoastToken });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roast = body.singleResult.data!.roastByShareToken as {
      id: string;
      isShared: boolean;
      notes: string;
      bean: { name: string };
    };

    expect(roast.id).toBe(sharingRoastId);
    expect(roast.isShared).toBe(true);
    expect(roast.notes).toBe("Sharing test roast");
    expect(roast.bean.name).toBe("Sharing Test Bean");
  });

  it("returns null for unshared roast (isShared: false)", async () => {
    // Temporarily unshare the roast
    await prisma.roast.update({
      where: { id: sharingRoastId },
      data: { isShared: false },
    });

    const response = await executeAs(null, ROAST_BY_SHARE_TOKEN, { token: sharingRoastToken });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    expect(body.singleResult.data!.roastByShareToken).toBeNull();

    // Re-share for subsequent tests
    await prisma.roast.update({
      where: { id: sharingRoastId },
      data: { isShared: true },
    });
  });

  it("returns null for invalid token", async () => {
    const response = await executeAs(null, ROAST_BY_SHARE_TOKEN, { token: "invalid-token-abc" });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    expect(body.singleResult.data!.roastByShareToken).toBeNull();
  });
});
