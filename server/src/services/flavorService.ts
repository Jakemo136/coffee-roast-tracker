import type { FlavorCategory, FlavorDescriptor, PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";
import { stemmer } from "stemmer";
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

  /**
   * Parse free-text supplier/bag notes and match against known flavor
   * descriptors using multiple strategies (substring, constituent word,
   * Porter stemming, de-pluralization).
   */
  async parseSupplierNotes(text: string): Promise<FlavorDescriptor[]> {
    if (!text || !text.trim()) return [];

    const descriptors = await this.prisma.flavorDescriptor.findMany({
      where: { isOffFlavor: false },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const normalizedText = text.toLowerCase();
    const textWords = normalizedText.match(/[a-z]+/g) ?? [];
    const textStems = textWords.map((w) => stemmer(w));

    // De-pluralize text words: -ies → -y, -s → ""
    const dePluralized = textWords.map((w) => {
      if (w.endsWith("ies")) return w.slice(0, -3) + "y";
      if (w.endsWith("es")) return w.slice(0, -2);
      if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
      return w;
    });

    const matched = new Set<string>();
    const results: FlavorDescriptor[] = [];

    for (const descriptor of descriptors) {
      if (matched.has(descriptor.id)) continue;

      const descriptorLower = descriptor.name.toLowerCase();
      const descriptorWords = descriptorLower.match(/[a-z]+/g) ?? [];

      // Strategy 1: Full name substring match
      if (normalizedText.includes(descriptorLower)) {
        matched.add(descriptor.id);
        results.push(descriptor);
        continue;
      }

      // Strategy 2: Any constituent word match
      if (descriptorWords.some((dw) => textWords.includes(dw))) {
        matched.add(descriptor.id);
        results.push(descriptor);
        continue;
      }

      // Strategy 3: Porter stem match — stem both text words and descriptor words
      const descriptorStems = descriptorWords.map((w) => stemmer(w));
      if (descriptorStems.some((ds) => textStems.includes(ds))) {
        matched.add(descriptor.id);
        results.push(descriptor);
        continue;
      }

      // Strategy 4: De-pluralized substring — check if any de-pluralized
      // text word appears inside the descriptor name
      if (dePluralized.some((dp) => descriptorLower.includes(dp) && dp.length >= 3)) {
        matched.add(descriptor.id);
        results.push(descriptor);
        continue;
      }
    }

    return results;
  }
}
