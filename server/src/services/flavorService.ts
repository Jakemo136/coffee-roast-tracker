import type { FlavorCategory, PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";
import { CATEGORY_COLORS } from "../lib/flavorColors.js";

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
        category: category as FlavorCategory,
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

    if (descriptorIds.length > 0) {
      const descriptors = await this.prisma.flavorDescriptor.findMany({
        where: { id: { in: descriptorIds } },
        select: { id: true, isOffFlavor: true },
      });
      const invalid = descriptors.filter((d) => d.isOffFlavor);
      if (invalid.length > 0) {
        throw new GraphQLError("Cannot add off-flavor descriptors as regular flavors", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
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

    if (descriptorIds.length > 0) {
      const descriptors = await this.prisma.flavorDescriptor.findMany({
        where: { id: { in: descriptorIds } },
        select: { id: true, isOffFlavor: true },
      });
      const invalid = descriptors.filter((d) => !d.isOffFlavor);
      if (invalid.length > 0) {
        throw new GraphQLError("Cannot add regular flavors as off-flavors", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
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
