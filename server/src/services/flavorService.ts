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
   * descriptors.
   *
   * Excluded from matching:
   *   - off-flavors (`isOffFlavor: true`)
   *   - Tier 2 SCA parent categories (`isParent: true`) — their Tier 3
   *     leaves are more specific. Parents can still be assigned manually.
   *
   * Matching rules (per descriptor):
   *
   *   Multi-word descriptors match ONLY via phrase-substring A:
   *     A. The lowercased descriptor name appears in the text bounded on
   *        both sides by non-letter characters (or string edges). This
   *        prevents "apple" from matching inside "pineapple", and requires
   *        "Dark chocolate" to appear as a phrase — not just both words
   *        somewhere in the document.
   *
   *   Single-word descriptors match via word-level B:
   *     B. A text word matches the descriptor word via any of:
   *        - exact: textWord === descriptorWord
   *        - de-plural exact: dePlural(textWord) === descriptorWord
   *          (e.g. "raisins" → "raisin" === "raisin")
   *        - Porter stem exact: stem(textWord) === stem(descriptorWord)
   *          (e.g. stem("fermenting") === stem("fermented"))
   *
   * Removed: the previous de-plural SUBSTRING rule. It caused "like" to
   * match Hay-like/Herb-like, "bit" to match Bitter, "tea" to match
   * Black Tea, and "app" to match Apple.
   */
  async parseSupplierNotes(text: string): Promise<FlavorDescriptor[]> {
    if (!text || !text.trim()) return [];

    const descriptors = await this.prisma.flavorDescriptor.findMany({
      where: { isOffFlavor: false, isParent: false, isQuality: false },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const normalizedText = text.toLowerCase();
    const textWords = normalizedText.match(/[a-z]+/g) ?? [];

    const dePlural = (w: string): string => {
      if (w.endsWith("ies") && w.length > 3) return w.slice(0, -3) + "y";
      if (w.endsWith("es") && w.length > 3) return w.slice(0, -2);
      if (w.endsWith("s") && !w.endsWith("ss") && w.length > 2) return w.slice(0, -1);
      return w;
    };

    // Precompute for each text word: exact, de-plural, and Porter stem.
    const textForms = textWords.map((w) => ({
      word: w,
      dePlural: dePlural(w),
      stem: stemmer(w),
    }));

    const singleWordMatches = (descriptorWord: string): boolean => {
      const dwStem = stemmer(descriptorWord);
      for (const tf of textForms) {
        if (tf.word === descriptorWord) return true;
        if (tf.dePlural === descriptorWord) return true;
        if (tf.stem === dwStem) return true;
      }
      return false;
    };

    const phraseMatches = (descriptorLower: string): boolean => {
      let from = 0;
      while (from <= normalizedText.length - descriptorLower.length) {
        const idx = normalizedText.indexOf(descriptorLower, from);
        if (idx === -1) return false;
        const before = idx === 0 ? "" : normalizedText[idx - 1];
        const afterIdx = idx + descriptorLower.length;
        const after = afterIdx >= normalizedText.length ? "" : normalizedText[afterIdx];
        const leftOk = before === "" || !/[a-z]/i.test(before);
        const rightOk = after === "" || !/[a-z]/i.test(after);
        if (leftOk && rightOk) return true;
        from = idx + 1;
      }
      return false;
    };

    const matched = new Set<string>();
    const results: FlavorDescriptor[] = [];

    for (const descriptor of descriptors) {
      if (matched.has(descriptor.id)) continue;

      const descriptorLower = descriptor.name.toLowerCase();
      const descriptorWords = descriptorLower.match(/[a-z]+/g) ?? [];
      if (descriptorWords.length === 0) continue;

      if (descriptorWords.length === 1) {
        // Single-word: match via exact / de-plural / stem.
        if (singleWordMatches(descriptorWords[0]!)) {
          matched.add(descriptor.id);
          results.push(descriptor);
        }
        continue;
      }

      // Multi-word: require the full phrase in text with word boundaries.
      if (phraseMatches(descriptorLower)) {
        matched.add(descriptor.id);
        results.push(descriptor);
      }
    }

    return results;
  }
}
