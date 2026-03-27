import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "../schema/typeDefs.js";
import { resolvers } from "./index.js";
import { prisma } from "../../test/prisma-client.js";
import type { Context } from "../context.js";

const UPDATE_TEMP_UNIT = `
  mutation UpdateTempUnit($tempUnit: TempUnit!) {
    updateTempUnit(tempUnit: $tempUnit) {
      id
      tempUnit
    }
  }
`;

type SingleResult = {
  kind: "single";
  singleResult: {
    data: Record<string, unknown> | null;
    errors?: { message: string }[];
  };
};

let server: ApolloServer<Context>;
let testUserId: string;

beforeAll(async () => {
  server = new ApolloServer<Context>({ typeDefs, resolvers });

  const user = await prisma.user.create({
    data: { clerkId: "test_clerk_user_resolvers" },
  });
  testUserId = user.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.$disconnect();
});

describe("updateTempUnit mutation", () => {
  it("updates from CELSIUS to FAHRENHEIT", async () => {
    const response = await server.executeOperation(
      {
        query: UPDATE_TEMP_UNIT,
        variables: { tempUnit: "FAHRENHEIT" },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();

    const user = body.singleResult.data!.updateTempUnit as {
      id: string;
      tempUnit: string;
    };
    expect(user.id).toBe(testUserId);
    expect(user.tempUnit).toBe("FAHRENHEIT");
  });

  it("updates from FAHRENHEIT to CELSIUS", async () => {
    const response = await server.executeOperation(
      {
        query: UPDATE_TEMP_UNIT,
        variables: { tempUnit: "CELSIUS" },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();

    const user = body.singleResult.data!.updateTempUnit as {
      id: string;
      tempUnit: string;
    };
    expect(user.id).toBe(testUserId);
    expect(user.tempUnit).toBe("CELSIUS");
  });

  it("requires authentication", async () => {
    const response = await server.executeOperation(
      {
        query: UPDATE_TEMP_UNIT,
        variables: { tempUnit: "FAHRENHEIT" },
      },
      { contextValue: { prisma, userId: null } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain(
      "Authentication required"
    );
  });
});
