import { describe, it, expect, afterAll } from "@jest/globals";
import { prisma } from "../../test/prisma-client.js";

describe("test infrastructure", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("connects to the test database", async () => {
    const count = await prisma.user.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
