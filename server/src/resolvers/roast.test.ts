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

const MY_ROASTS = `
  query MyRoasts {
    myRoasts {
      id
      ambientTemp
      notes
      bean { id name }
      roastFiles { id fileName }
      roastProfile { id }
    }
  }
`;

const ROAST_BY_ID = `
  query RoastById($id: String!) {
    roastById(id: $id) {
      id
      ambientTemp
      notes
      bean { id name }
      roastFiles { id fileName }
      roastProfile { id }
    }
  }
`;

const ROASTS_BY_BEAN = `
  query RoastsByBean($beanId: String!) {
    roastsByBean(beanId: $beanId) {
      id
      ambientTemp
      roastDate
      bean { id name }
    }
  }
`;

const ROASTS_BY_IDS = `
  query RoastsByIds($ids: [String!]!) {
    roastsByIds(ids: $ids) {
      id
      ambientTemp
      bean { id name }
    }
  }
`;

const CREATE_ROAST = `
  mutation CreateRoast($input: CreateRoastInput!) {
    createRoast(input: $input) {
      id
      ambientTemp
      notes
      bean { id name }
    }
  }
`;

const UPDATE_ROAST = `
  mutation UpdateRoast($id: String!, $input: UpdateRoastInput!) {
    updateRoast(id: $id, input: $input) {
      id
      ambientTemp
      notes
      bean { id name }
    }
  }
`;

const DELETE_ROAST = `
  mutation DeleteRoast($id: String!) {
    deleteRoast(id: $id)
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
let roastAId: string;
let roastBId: string;
let roastCId: string;
let otherRoastId: string;

beforeAll(async () => {
  server = new ApolloServer<Context>({ typeDefs, resolvers });

  // Create two users
  const testUser = await prisma.user.create({
    data: { clerkId: "test_clerk_roast_crud" },
  });
  testUserId = testUser.id;

  const otherUser = await prisma.user.create({
    data: { clerkId: "test_clerk_roast_crud_other" },
  });
  otherUserId = otherUser.id;

  // Create bean
  const bean = await prisma.bean.create({
    data: { name: "Test CRUD Bean" },
  });
  testBeanId = bean.id;

  // Create roasts for the test user
  const roastA = await prisma.roast.create({
    data: {
      userId: testUserId,
      beanId: testBeanId,
      ambientTemp: 20.0,
      notes: "Roast A",
      roastDate: new Date("2025-01-01"),
    },
  });
  roastAId = roastA.id;

  const roastB = await prisma.roast.create({
    data: {
      userId: testUserId,
      beanId: testBeanId,
      ambientTemp: 22.0,
      notes: "Roast B",
      roastDate: new Date("2025-01-02"),
    },
  });
  roastBId = roastB.id;

  const roastC = await prisma.roast.create({
    data: {
      userId: testUserId,
      beanId: testBeanId,
      ambientTemp: 18.5,
      notes: "Roast C",
      roastDate: new Date("2025-01-03"),
    },
  });
  roastCId = roastC.id;

  // Create roast for the other user
  const otherRoast = await prisma.roast.create({
    data: {
      userId: otherUserId,
      beanId: testBeanId,
      ambientTemp: 25.0,
      notes: "Other user roast",
      roastDate: new Date("2025-01-04"),
    },
  });
  otherRoastId = otherRoast.id;
});

afterAll(async () => {
  // Clean up in reverse dependency order
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

describe("myRoasts", () => {
  it("returns user's roasts ordered by createdAt desc", async () => {
    const response = await executeAs(testUserId, MY_ROASTS);
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roasts = body.singleResult.data!.myRoasts as { id: string; notes: string }[];

    expect(roasts.length).toBe(3);
    // createdAt desc means roastC was created last, so it should come first
    expect(roasts[0]!.id).toBe(roastCId);
    expect(roasts[1]!.id).toBe(roastBId);
    expect(roasts[2]!.id).toBe(roastAId);
  });

  it("returns empty array for user with no roasts", async () => {
    // Create a fresh user with no roasts
    const emptyUser = await prisma.user.create({
      data: { clerkId: "test_clerk_roast_crud_empty" },
    });

    const response = await executeAs(emptyUser.id, MY_ROASTS);
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roasts = body.singleResult.data!.myRoasts as unknown[];
    expect(roasts).toEqual([]);

    // Clean up
    await prisma.user.delete({ where: { id: emptyUser.id } });
  });

  it("does not return other users' roasts", async () => {
    const response = await executeAs(testUserId, MY_ROASTS);
    const body = response.body as SingleBody;

    const roasts = body.singleResult.data!.myRoasts as { id: string }[];
    const ids = roasts.map((r) => r.id);
    expect(ids).not.toContain(otherRoastId);
  });
});

describe("roastById", () => {
  it("returns roast when found", async () => {
    const response = await executeAs(testUserId, ROAST_BY_ID, { id: roastAId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roast = body.singleResult.data!.roastById as { id: string; ambientTemp: number };
    expect(roast.id).toBe(roastAId);
    expect(roast.ambientTemp).toBeCloseTo(20.0, 1);
  });

  it("returns null when roast doesn't exist", async () => {
    const response = await executeAs(testUserId, ROAST_BY_ID, { id: "nonexistent-id" });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    expect(body.singleResult.data!.roastById).toBeNull();
  });

  it("returns null for another user's roast", async () => {
    const response = await executeAs(testUserId, ROAST_BY_ID, { id: otherRoastId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    expect(body.singleResult.data!.roastById).toBeNull();
  });
});

describe("roastsByBean", () => {
  it("returns roasts for a specific bean ordered by roastDate desc", async () => {
    const response = await executeAs(testUserId, ROASTS_BY_BEAN, { beanId: testBeanId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roasts = body.singleResult.data!.roastsByBean as { id: string }[];

    expect(roasts.length).toBe(3);
    // roastDate desc: C (Jan 3), B (Jan 2), A (Jan 1)
    expect(roasts[0]!.id).toBe(roastCId);
    expect(roasts[1]!.id).toBe(roastBId);
    expect(roasts[2]!.id).toBe(roastAId);
  });

  it("does not return other users' roasts for the same bean", async () => {
    const response = await executeAs(testUserId, ROASTS_BY_BEAN, { beanId: testBeanId });
    const body = response.body as SingleBody;

    const roasts = body.singleResult.data!.roastsByBean as { id: string }[];
    const ids = roasts.map((r) => r.id);
    expect(ids).not.toContain(otherRoastId);
  });
});

describe("roastsByIds", () => {
  it("returns matching roasts", async () => {
    const response = await executeAs(testUserId, ROASTS_BY_IDS, {
      ids: [roastAId, roastCId],
    });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roasts = body.singleResult.data!.roastsByIds as { id: string }[];

    expect(roasts.length).toBe(2);
    const ids = roasts.map((r) => r.id);
    expect(ids).toContain(roastAId);
    expect(ids).toContain(roastCId);
  });

  it("filters out other users' roasts from the results", async () => {
    const response = await executeAs(testUserId, ROASTS_BY_IDS, {
      ids: [roastAId, otherRoastId],
    });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roasts = body.singleResult.data!.roastsByIds as { id: string }[];

    expect(roasts.length).toBe(1);
    expect(roasts[0]!.id).toBe(roastAId);
  });
});

describe("createRoast", () => {
  const createdIds: string[] = [];

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.roast.deleteMany({ where: { id: { in: createdIds } } });
    }
  });

  it("creates a roast with all fields", async () => {
    const response = await executeAs(testUserId, CREATE_ROAST, {
      input: {
        beanId: testBeanId,
        ambientTemp: 21.5,
        notes: "Great roast",
      },
    });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roast = body.singleResult.data!.createRoast as {
      id: string;
      ambientTemp: number;
      notes: string;
      bean: { id: string; name: string };
    };

    expect(roast.ambientTemp).toBeCloseTo(21.5, 1);
    expect(roast.notes).toBe("Great roast");
    expect(roast.bean.id).toBe(testBeanId);
    expect(roast.bean.name).toBe("Test CRUD Bean");

    createdIds.push(roast.id);
  });

  it("throws NOT_FOUND for non-existent beanId", async () => {
    const response = await executeAs(testUserId, CREATE_ROAST, {
      input: {
        beanId: "nonexistent-bean-id",
        ambientTemp: 20.0,
      },
    });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Bean not found");
  });

  it("requires authentication", async () => {
    const response = await executeAs(null, CREATE_ROAST, {
      input: {
        beanId: testBeanId,
        ambientTemp: 20.0,
      },
    });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Authentication required");
  });
});

describe("updateRoast", () => {
  it("updates roast fields", async () => {
    const response = await executeAs(testUserId, UPDATE_ROAST, {
      id: roastAId,
      input: { notes: "Updated notes", ambientTemp: 19.0 },
    });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    const roast = body.singleResult.data!.updateRoast as {
      id: string;
      notes: string;
      ambientTemp: number;
    };

    expect(roast.id).toBe(roastAId);
    expect(roast.notes).toBe("Updated notes");
    expect(roast.ambientTemp).toBeCloseTo(19.0, 1);
  });

  it("throws NOT_FOUND for non-existent roast", async () => {
    const response = await executeAs(testUserId, UPDATE_ROAST, {
      id: "nonexistent-id",
      input: { notes: "Nope" },
    });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Roast not found");
  });

  it("cannot update another user's roast", async () => {
    const response = await executeAs(testUserId, UPDATE_ROAST, {
      id: otherRoastId,
      input: { notes: "Hacked" },
    });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Roast not found");
  });
});

describe("deleteRoast", () => {
  it("deletes roast and returns true", async () => {
    // Create a roast to delete
    const roast = await prisma.roast.create({
      data: {
        userId: testUserId,
        beanId: testBeanId,
        ambientTemp: 23.0,
        notes: "To be deleted",
      },
    });

    const response = await executeAs(testUserId, DELETE_ROAST, { id: roast.id });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeUndefined();
    expect(body.singleResult.data!.deleteRoast).toBe(true);

    // Verify it's gone
    const found = await prisma.roast.findUnique({ where: { id: roast.id } });
    expect(found).toBeNull();
  });

  it("throws NOT_FOUND for non-existent roast", async () => {
    const response = await executeAs(testUserId, DELETE_ROAST, { id: "nonexistent-id" });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Roast not found");
  });

  it("cannot delete another user's roast", async () => {
    const response = await executeAs(testUserId, DELETE_ROAST, { id: otherRoastId });
    const body = response.body as SingleBody;

    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Roast not found");

    // Verify it still exists
    const found = await prisma.roast.findUnique({ where: { id: otherRoastId } });
    expect(found).not.toBeNull();
  });
});
