import { describe, it, expect, beforeAll, afterAll, jest } from "@jest/globals";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "../schema/typeDefs.js";
import { prisma } from "../../test/prisma-client.js";
import type { Context } from "../context.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractKproContent } from "../lib/kproExtractor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load real klog fixture
const klogFixturePath = path.resolve(
  __dirname,
  "../../../mocks/sample-roasts/EGB 0320a.klog"
);
const klogContent = fs.readFileSync(klogFixturePath, "utf-8");

// Mock the R2 module
jest.unstable_mockModule("../utils/r2.js", () => ({
  uploadFile: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getFileContent: jest.fn<() => Promise<string>>().mockResolvedValue(klogContent),
  r2: {},
  BUCKET: "test-bucket",
  getDownloadUrl: jest.fn<() => Promise<string>>().mockResolvedValue("https://example.com/download"),
}));

// Must import resolvers after mocking
const { resolvers } = await import("./index.js");

const DOWNLOAD_PROFILE = `
  query DownloadProfile($roastId: String!) {
    downloadProfile(roastId: $roastId) {
      fileName
      content
    }
  }
`;

const UPLOAD_ROAST_LOG = `
  mutation UploadRoastLog($beanId: String!, $fileName: String!, $fileContent: String!) {
    uploadRoastLog(beanId: $beanId, fileName: $fileName, fileContent: $fileContent) {
      roast {
        id
        roastProfile {
          profileShortName
        }
      }
      parseWarnings
    }
  }
`;

const CREATE_ROAST = `
  mutation CreateRoast($input: CreateRoastInput!) {
    createRoast(input: $input) {
      id
    }
  }
`;

let server: ApolloServer<Context>;
let testUserIdA: string;
let testUserIdB: string;
let testBeanId: string;
const createdRoastIds: string[] = [];

beforeAll(async () => {
  server = new ApolloServer<Context>({ typeDefs, resolvers });

  const userA = await prisma.user.create({
    data: { clerkId: "test_clerk_download_profile_a" },
  });
  testUserIdA = userA.id;

  const userB = await prisma.user.create({
    data: { clerkId: "test_clerk_download_profile_b" },
  });
  testUserIdB = userB.id;

  const bean = await prisma.bean.create({
    data: { name: "Test Download Bean" },
  });
  testBeanId = bean.id;
});

afterAll(async () => {
  // Clean up roasts (cascades to roastFiles, roastProfiles)
  if (createdRoastIds.length > 0) {
    await prisma.roast.deleteMany({
      where: { id: { in: createdRoastIds } },
    });
  }
  await prisma.roast.deleteMany({ where: { userId: { in: [testUserIdA, testUserIdB] } } });
  await prisma.userBean.deleteMany({ where: { userId: { in: [testUserIdA, testUserIdB] } } });
  await prisma.user.deleteMany({ where: { id: { in: [testUserIdA, testUserIdB] } } });
  await prisma.bean.delete({ where: { id: testBeanId } });
  await prisma.$disconnect();
});

type SingleResult = {
  kind: "single";
  singleResult: {
    data: Record<string, unknown> | null;
    errors?: { message: string }[];
  };
};

describe("downloadProfile query", () => {
  it("returns extracted .kpro content for a roast with a .klog file", async () => {
    // First upload a klog to create the roast + roastFile + roastProfile
    const uploadResponse = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "EGB 0320a download-test.klog",
          fileContent: klogContent,
        },
      },
      { contextValue: { prisma, userId: testUserIdA } }
    );

    const uploadBody = uploadResponse.body as SingleResult;
    expect(uploadBody.singleResult.errors).toBeUndefined();
    const roastId = (uploadBody.singleResult.data!.uploadRoastLog as { roast: { id: string } }).roast.id;
    createdRoastIds.push(roastId);

    // Now call downloadProfile
    const response = await server.executeOperation(
      {
        query: DOWNLOAD_PROFILE,
        variables: { roastId },
      },
      { contextValue: { prisma, userId: testUserIdA } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();
    expect(body.singleResult.data).toBeDefined();

    const download = body.singleResult.data!.downloadProfile as {
      fileName: string;
      content: string;
    };
    expect(download).not.toBeNull();
    expect(download.fileName).toBe("EGB.kpro");
    expect(download.content).toContain("profile_short_name:EGB");
  });

  it("returns content matching direct extractKproContent output", async () => {
    // Upload a klog
    const uploadResponse = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "EGB 0320a content-match.klog",
          fileContent: klogContent,
        },
      },
      { contextValue: { prisma, userId: testUserIdA } }
    );

    const uploadBody = uploadResponse.body as SingleResult;
    const roastId = (uploadBody.singleResult.data!.uploadRoastLog as { roast: { id: string } }).roast.id;
    createdRoastIds.push(roastId);

    const response = await server.executeOperation(
      {
        query: DOWNLOAD_PROFILE,
        variables: { roastId },
      },
      { contextValue: { prisma, userId: testUserIdA } }
    );

    const body = response.body as SingleResult;
    const download = body.singleResult.data!.downloadProfile as {
      fileName: string;
      content: string;
    };

    const expectedContent = extractKproContent(klogContent);
    expect(expectedContent).not.toBeNull();
    expect(download.content).toBe(expectedContent);
  });

  it("allows unauthenticated download of public roast profiles", async () => {
    // Upload a roast first (public by default)
    const uploadResponse = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "EGB 0320a public-dl.klog",
          fileContent: klogContent,
        },
      },
      { contextValue: { prisma, userId: testUserIdA } }
    );

    const uploadBody = uploadResponse.body as SingleResult;
    const roastId = (uploadBody.singleResult.data!.uploadRoastLog as { roast: { id: string } }).roast.id;
    createdRoastIds.push(roastId);

    // Download without auth — should succeed for public roasts
    const response = await server.executeOperation(
      {
        query: DOWNLOAD_PROFILE,
        variables: { roastId },
      },
      { contextValue: { prisma, userId: null } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();
    const download = body.singleResult.data!.downloadProfile as { content: string } | null;
    expect(download).not.toBeNull();
    expect(download!.content).toContain("profile_short_name");
  });

  it("allows a different user to download public roast profiles", async () => {
    // Upload as user A
    const uploadResponse = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "EGB 0320a cross-user.klog",
          fileContent: klogContent,
        },
      },
      { contextValue: { prisma, userId: testUserIdA } }
    );

    const uploadBody = uploadResponse.body as SingleResult;
    const roastId = (uploadBody.singleResult.data!.uploadRoastLog as { roast: { id: string } }).roast.id;
    createdRoastIds.push(roastId);

    // Download as user B — should succeed for public roasts
    const response = await server.executeOperation(
      {
        query: DOWNLOAD_PROFILE,
        variables: { roastId },
      },
      { contextValue: { prisma, userId: testUserIdB } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();
    const download = body.singleResult.data!.downloadProfile as { content: string } | null;
    expect(download).not.toBeNull();
    expect(download!.content).toContain("profile_short_name");
  });

  it("returns null for a non-existent roast", async () => {
    const response = await server.executeOperation(
      {
        query: DOWNLOAD_PROFILE,
        variables: { roastId: "nonexistent-roast-id" },
      },
      { contextValue: { prisma, userId: testUserIdA } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();
    expect(body.singleResult.data!.downloadProfile).toBeNull();
  });

  it("returns null when klog content has no profile data", async () => {
    // Upload a klog that has profile_file_name so it creates a roastProfile record
    const uploadResponse = await server.executeOperation(
      {
        query: UPLOAD_ROAST_LOG,
        variables: {
          beanId: testBeanId,
          fileName: "EGB 0320a no-kpro-content.klog",
          fileContent: klogContent,
        },
      },
      { contextValue: { prisma, userId: testUserIdA } }
    );

    const uploadBody = uploadResponse.body as SingleResult;
    expect(uploadBody.singleResult.errors).toBeUndefined();
    const roastId = (uploadBody.singleResult.data!.uploadRoastLog as { roast: { id: string } }).roast.id;
    createdRoastIds.push(roastId);

    // Mock getFileContent to return content with no profile_short_name (just time-series data)
    const r2Module = await import("../utils/r2.js");
    const getFileContentMock = r2Module.getFileContent as jest.MockedFunction<typeof r2Module.getFileContent>;
    getFileContentMock.mockResolvedValueOnce("ambient_temperature:22.5\nroasting_level:4.0\n\ntime\tbean_temp\n0\t25\n10\t180\n");

    const response = await server.executeOperation(
      {
        query: DOWNLOAD_PROFILE,
        variables: { roastId },
      },
      { contextValue: { prisma, userId: testUserIdA } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();
    expect(body.singleResult.data!.downloadProfile).toBeNull();
  });

  it("returns null for a roast with no .klog file", async () => {
    // Create a roast directly (no file upload)
    const createResponse = await server.executeOperation(
      {
        query: CREATE_ROAST,
        variables: {
          input: { beanId: testBeanId },
        },
      },
      { contextValue: { prisma, userId: testUserIdA } }
    );

    const createBody = createResponse.body as SingleResult;
    expect(createBody.singleResult.errors).toBeUndefined();
    const roastId = (createBody.singleResult.data!.createRoast as { id: string }).id;
    createdRoastIds.push(roastId);

    const response = await server.executeOperation(
      {
        query: DOWNLOAD_PROFILE,
        variables: { roastId },
      },
      { contextValue: { prisma, userId: testUserIdA } }
    );

    const body = response.body as SingleResult;
    expect(body.singleResult.errors).toBeUndefined();
    expect(body.singleResult.data!.downloadProfile).toBeNull();
  });
});
