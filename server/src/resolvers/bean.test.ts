import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "../schema/typeDefs.js";
import { resolvers } from "./index.js";
import { prisma } from "../../test/prisma-client.js";
import type { Context } from "../context.js";

const CREATE_BEAN = `
  mutation CreateBean($input: CreateBeanInput!) {
    createBean(input: $input) {
      id
      shortName
      bean {
        id
        name
      }
    }
  }
`;

const UPDATE_USER_BEAN = `
  mutation UpdateUserBean($id: String!, $shortName: String) {
    updateUserBean(id: $id, shortName: $shortName) {
      id
      shortName
      bean {
        id
        name
      }
    }
  }
`;

const ADD_BEAN_TO_LIBRARY = `
  mutation AddBeanToLibrary($beanId: String!, $shortName: String) {
    addBeanToLibrary(beanId: $beanId, shortName: $shortName) {
      id
      shortName
      bean {
        id
        name
      }
    }
  }
`;

let server: ApolloServer<Context>;
let testUserId: string;
const createdUserBeanIds: string[] = [];
const createdBeanIds: string[] = [];

beforeAll(async () => {
  server = new ApolloServer<Context>({ typeDefs, resolvers });

  const user = await prisma.user.create({
    data: { clerkId: "test_clerk_bean_resolvers" },
  });
  testUserId = user.id;
});

afterAll(async () => {
  // Clean up in correct order
  if (createdUserBeanIds.length > 0) {
    await prisma.userBean.deleteMany({
      where: { id: { in: createdUserBeanIds } },
    });
  }
  if (createdBeanIds.length > 0) {
    await prisma.bean.deleteMany({
      where: { id: { in: createdBeanIds } },
    });
  }
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.$disconnect();
});

describe("bean resolvers — shortName", () => {
  it("createBean with shortName", async () => {
    const response = await server.executeOperation(
      {
        query: CREATE_BEAN,
        variables: {
          input: { name: "Test Bean ShortName", shortName: "TEST" },
        },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    expect(response.body.kind).toBe("single");
    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const userBean = body.singleResult.data!.createBean as {
      id: string;
      shortName: string;
      bean: { id: string; name: string };
    };

    expect(userBean.shortName).toBe("TEST");
    expect(userBean.bean.name).toBe("Test Bean ShortName");

    createdUserBeanIds.push(userBean.id);
    createdBeanIds.push(userBean.bean.id);
  });

  it("updateUserBean with shortName", async () => {
    // Create a bean + userBean first
    const bean = await prisma.bean.create({
      data: { name: "Update ShortName Bean" },
    });
    createdBeanIds.push(bean.id);

    const userBean = await prisma.userBean.create({
      data: { userId: testUserId, beanId: bean.id, shortName: "OLD" },
    });
    createdUserBeanIds.push(userBean.id);

    const response = await server.executeOperation(
      {
        query: UPDATE_USER_BEAN,
        variables: { id: userBean.id, shortName: "NEW" },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const updated = body.singleResult.data!.updateUserBean as {
      id: string;
      shortName: string;
    };
    expect(updated.shortName).toBe("NEW");
  });

  it("addBeanToLibrary with shortName", async () => {
    const bean = await prisma.bean.create({
      data: { name: "Library ShortName Bean" },
    });
    createdBeanIds.push(bean.id);

    const response = await server.executeOperation(
      {
        query: ADD_BEAN_TO_LIBRARY,
        variables: { beanId: bean.id, shortName: "LIB" },
      },
      { contextValue: { prisma, userId: testUserId } }
    );

    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const userBean = body.singleResult.data!.addBeanToLibrary as {
      id: string;
      shortName: string;
      bean: { id: string; name: string };
    };
    expect(userBean.shortName).toBe("LIB");
    expect(userBean.bean.name).toBe("Library ShortName Bean");

    createdUserBeanIds.push(userBean.id);
  });
});
