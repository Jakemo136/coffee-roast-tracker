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

const UPDATE_THEME = `
  mutation UpdateTheme($theme: String!) {
    updateTheme(theme: $theme) {
      id
      theme
    }
  }
`;

const UPDATE_PRIVACY_DEFAULT = `
  mutation UpdatePrivacyDefault($privateByDefault: Boolean!) {
    updatePrivacyDefault(privateByDefault: $privateByDefault) {
      id
      privateByDefault
    }
  }
`;

const USER_SETTINGS = `
  query UserSettings {
    userSettings {
      id
      tempUnit
      theme
      privateByDefault
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

function executeAs(userId: string | null, query: string, variables?: Record<string, unknown>) {
  return server.executeOperation(
    { query, variables },
    { contextValue: { prisma, userId } },
  );
}

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
    const response = await executeAs(testUserId, UPDATE_TEMP_UNIT, { tempUnit: "FAHRENHEIT" });
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
    const response = await executeAs(testUserId, UPDATE_TEMP_UNIT, { tempUnit: "CELSIUS" });
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
    const response = await executeAs(null, UPDATE_TEMP_UNIT, { tempUnit: "FAHRENHEIT" });
    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain(
      "Authentication required"
    );
  });
});

describe("updateTheme mutation", () => {
  it("updates theme to BLACK_COFFEE", async () => {
    const response = await executeAs(testUserId, UPDATE_THEME, { theme: "BLACK_COFFEE" });
    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();

    const user = body.singleResult.data!.updateTheme as {
      id: string;
      theme: string;
    };
    expect(user.id).toBe(testUserId);
    expect(user.theme).toBe("BLACK_COFFEE");
  });

  it("updates theme to LATTE", async () => {
    const response = await executeAs(testUserId, UPDATE_THEME, { theme: "LATTE" });
    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();

    const user = body.singleResult.data!.updateTheme as {
      id: string;
      theme: string;
    };
    expect(user.theme).toBe("LATTE");
  });

  it("requires authentication", async () => {
    const response = await executeAs(null, UPDATE_THEME, { theme: "BLACK_COFFEE" });
    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Authentication required");
  });
});

describe("updatePrivacyDefault mutation", () => {
  it("sets privateByDefault to true", async () => {
    const response = await executeAs(testUserId, UPDATE_PRIVACY_DEFAULT, { privateByDefault: true });
    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();

    const user = body.singleResult.data!.updatePrivacyDefault as {
      id: string;
      privateByDefault: boolean;
    };
    expect(user.id).toBe(testUserId);
    expect(user.privateByDefault).toBe(true);
  });

  it("sets privateByDefault back to false", async () => {
    const response = await executeAs(testUserId, UPDATE_PRIVACY_DEFAULT, { privateByDefault: false });
    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();

    const user = body.singleResult.data!.updatePrivacyDefault as {
      id: string;
      privateByDefault: boolean;
    };
    expect(user.privateByDefault).toBe(false);
  });

  it("requires authentication", async () => {
    const response = await executeAs(null, UPDATE_PRIVACY_DEFAULT, { privateByDefault: true });
    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Authentication required");
  });
});

describe("userSettings query", () => {
  it("returns all user settings including new fields", async () => {
    const response = await executeAs(testUserId, USER_SETTINGS);
    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();

    const user = body.singleResult.data!.userSettings as {
      id: string;
      tempUnit: string;
      theme: string;
      privateByDefault: boolean;
    };
    expect(user.id).toBe(testUserId);
    expect(user.tempUnit).toBe("CELSIUS");
    expect(user.theme).toBe("LATTE");
    expect(user.privateByDefault).toBe(false);
  });

  it("requires authentication", async () => {
    const response = await executeAs(null, USER_SETTINGS);
    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeDefined();
    expect(body.singleResult.errors![0]!.message).toContain("Authentication required");
  });
});
