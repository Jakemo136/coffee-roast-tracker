import type { PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";

const CATEGORY_COLORS: Record<string, string> = {
  FLORAL: "#c27a8a",
  HONEY: "#c9a84c",
  SUGARS: "#bda67a",
  CARAMEL: "#a88545",
  FRUITS: "#d45f5f",
  CITRUS: "#b8b44f",
  BERRY: "#7a4a6e",
  COCOA: "#8b5e4b",
  NUTS: "#8a7a4a",
  RUSTIC: "#6b6b4a",
  SPICE: "#a07050",
  BODY: "#5a4a3a",
  OFF_FLAVOR: "#c44a3b",
};

export class FlavorService {
  constructor(private prisma: PrismaClient) {}

  async flavorDescriptors(isOffFlavor?: boolean) {
    const where = isOffFlavor != null ? { isOffFlavor } : {};
    return this.prisma.flavorDescriptor.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async createFlavorDescriptor(name: string, category: string) {
    const color = CATEGORY_COLORS[category];
    if (!color) {
      throw new GraphQLError(`Invalid category: ${category}`, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    return this.prisma.flavorDescriptor.create({
      data: {
        name,
        category: category as any,
        isOffFlavor: category === "OFF_FLAVOR",
        isCustom: true,
        color,
      },
    });
  }

  async setRoastFlavors(
    userId: string,
    roastId: string,
    descriptorIds: string[],
  ) {
    const roast = await this.prisma.roast.findFirst({
      where: { id: roastId, userId },
    });
    if (!roast) {
      throw new GraphQLError("Roast not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.roastFlavor.deleteMany({
        where: { roastId, descriptor: { isOffFlavor: false } },
      });
      if (descriptorIds.length > 0) {
        await tx.roastFlavor.createMany({
          data: descriptorIds.map((descriptorId) => ({
            roastId,
            descriptorId,
          })),
        });
      }
    });

    return this.prisma.roast.findUniqueOrThrow({
      where: { id: roastId },
      include: {
        bean: true,
        roastFiles: true,
        roastProfile: true,
        roastFlavors: { include: { descriptor: true } },
      },
    });
  }

  async setRoastOffFlavors(
    userId: string,
    roastId: string,
    descriptorIds: string[],
  ) {
    const roast = await this.prisma.roast.findFirst({
      where: { id: roastId, userId },
    });
    if (!roast) {
      throw new GraphQLError("Roast not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.roastFlavor.deleteMany({
        where: { roastId, descriptor: { isOffFlavor: true } },
      });
      if (descriptorIds.length > 0) {
        await tx.roastFlavor.createMany({
          data: descriptorIds.map((descriptorId) => ({
            roastId,
            descriptorId,
          })),
        });
      }
    });

    return this.prisma.roast.findUniqueOrThrow({
      where: { id: roastId },
      include: {
        bean: true,
        roastFiles: true,
        roastProfile: true,
        roastFlavors: { include: { descriptor: true } },
      },
    });
  }
}
