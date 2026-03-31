import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "../schema/typeDefs.js";
import { resolvers } from "./index.js";
import { prisma } from "../../test/prisma-client.js";
import type { Context } from "../context.js";

const FLAVOR_DESCRIPTORS = `
  query FlavorDescriptors($isOffFlavor: Boolean) {
    flavorDescriptors(isOffFlavor: $isOffFlavor) {
      id
      name
      category
      isOffFlavor
      isCustom
      color
    }
  }
`;

const CREATE_FLAVOR_DESCRIPTOR = `
  mutation CreateFlavorDescriptor($name: String!, $category: FlavorCategory!) {
    createFlavorDescriptor(name: $name, category: $category) {
      id
      name
      category
      isOffFlavor
      isCustom
      color
    }
  }
`;

const SET_ROAST_FLAVORS = `
  mutation SetRoastFlavors($roastId: String!, $descriptorIds: [String!]!) {
    setRoastFlavors(roastId: $roastId, descriptorIds: $descriptorIds) {
      id
      flavors {
        id
        name
        category
      }
      offFlavors {
        id
        name
        category
      }
    }
  }
`;

let server: ApolloServer<Context>;
let testUserId: string;
let testBeanId: string;
let testRoastId: string;
const createdDescriptorIds: string[] = [];
let seededFlavorId: string;
let seededOffFlavorId: string;

beforeAll(async () => {
  server = new ApolloServer<Context>({ typeDefs, resolvers });

  const user = await prisma.user.create({
    data: { clerkId: "test_clerk_flavor_resolvers" },
  });
  testUserId = user.id;

  const bean = await prisma.bean.create({
    data: { name: "Flavor Test Bean" },
  });
  testBeanId = bean.id;

  const roast = await prisma.roast.create({
    data: { userId: testUserId, beanId: testBeanId },
  });
  testRoastId = roast.id;

  // Seed two descriptors for query/set tests
  const flavorDesc = await prisma.flavorDescriptor.create({
    data: {
      name: "Test Blueberry",
      category: "BERRY",
      isOffFlavor: false,
      isCustom: false,
      color: "#7a4a6e",
    },
  });
  seededFlavorId = flavorDesc.id;
  createdDescriptorIds.push(flavorDesc.id);

  const offFlavorDesc = await prisma.flavorDescriptor.create({
    data: {
      name: "Test Ashy",
      category: "OFF_FLAVOR",
      isOffFlavor: true,
      isCustom: false,
      color: "#c44a3b",
    },
  });
  seededOffFlavorId = offFlavorDesc.id;
  createdDescriptorIds.push(offFlavorDesc.id);
});

afterAll(async () => {
  // Clean up in correct dependency order
  await prisma.roastFlavor.deleteMany({
    where: { roastId: testRoastId },
  });
  await prisma.flavorDescriptor.deleteMany({
    where: { id: { in: createdDescriptorIds } },
  });
  await prisma.roast.deleteMany({
    where: { id: testRoastId },
  });
  await prisma.bean.deleteMany({
    where: { id: testBeanId },
  });
  await prisma.user.deleteMany({
    where: { id: testUserId },
  });
  await prisma.$disconnect();
});

describe("flavor resolvers", () => {
  it("flavorDescriptors returns all descriptors", async () => {
    const response = await server.executeOperation(
      { query: FLAVOR_DESCRIPTORS },
      { contextValue: { prisma, userId: testUserId } },
    );

    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const descriptors = body.singleResult.data!.flavorDescriptors as any[];
    expect(descriptors.length).toBeGreaterThanOrEqual(2);

    // Should include our seeded descriptors
    const names = descriptors.map((d: any) => d.name);
    expect(names).toContain("Test Blueberry");
    expect(names).toContain("Test Ashy");
  });

  it("flavorDescriptors(isOffFlavor: true) filters correctly", async () => {
    const response = await server.executeOperation(
      {
        query: FLAVOR_DESCRIPTORS,
        variables: { isOffFlavor: true },
      },
      { contextValue: { prisma, userId: testUserId } },
    );

    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const descriptors = body.singleResult.data!.flavorDescriptors as any[];
    expect(descriptors.length).toBeGreaterThanOrEqual(1);
    expect(descriptors.every((d: any) => d.isOffFlavor === true)).toBe(true);
    expect(descriptors.some((d: any) => d.name === "Test Ashy")).toBe(true);
  });

  it("setRoastFlavors sets flavors on a roast", async () => {
    const response = await server.executeOperation(
      {
        query: SET_ROAST_FLAVORS,
        variables: {
          roastId: testRoastId,
          descriptorIds: [seededFlavorId],
        },
      },
      { contextValue: { prisma, userId: testUserId } },
    );

    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const roast = body.singleResult.data!.setRoastFlavors as any;
    expect(roast.flavors).toHaveLength(1);
    expect(roast.flavors[0].name).toBe("Test Blueberry");
    expect(roast.offFlavors).toHaveLength(0);
  });

  it("setRoastFlavors replaces existing flavors idempotently", async () => {
    // Create a second flavor descriptor
    const secondFlavor = await prisma.flavorDescriptor.create({
      data: {
        name: "Test Honey",
        category: "HONEY",
        isOffFlavor: false,
        isCustom: false,
        color: "#c9a84c",
      },
    });
    createdDescriptorIds.push(secondFlavor.id);

    // Set new flavors (should replace the previous one)
    const response = await server.executeOperation(
      {
        query: SET_ROAST_FLAVORS,
        variables: {
          roastId: testRoastId,
          descriptorIds: [secondFlavor.id],
        },
      },
      { contextValue: { prisma, userId: testUserId } },
    );

    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const roast = body.singleResult.data!.setRoastFlavors as any;
    expect(roast.flavors).toHaveLength(1);
    expect(roast.flavors[0].name).toBe("Test Honey");
  });

  it("createFlavorDescriptor creates a custom descriptor with correct color", async () => {
    const response = await server.executeOperation(
      {
        query: CREATE_FLAVOR_DESCRIPTOR,
        variables: { name: "Test Custom Citrus", category: "CITRUS" },
      },
      { contextValue: { prisma, userId: testUserId } },
    );

    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const descriptor = body.singleResult.data!.createFlavorDescriptor as any;
    expect(descriptor.name).toBe("Test Custom Citrus");
    expect(descriptor.category).toBe("CITRUS");
    expect(descriptor.isCustom).toBe(true);
    expect(descriptor.isOffFlavor).toBe(false);
    expect(descriptor.color).toBe("#b8b44f");

    createdDescriptorIds.push(descriptor.id);
  });
});
