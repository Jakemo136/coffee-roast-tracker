import type { Prisma, PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";
import { requireBean, requireRoast } from "../lib/guardHelpers.js";
import { parseKlog } from "../lib/klogParser.js";
import { extractKproContent } from "../lib/kproExtractor.js";
import { validateKlogFile } from "../lib/validateKlog.js";
import { getFileContent, uploadFile } from "../utils/r2.js";

type JsonInput = Prisma.InputJsonValue | undefined;

export interface RoastInputBase {
  ambientTemp?: number;
  roastingLevel?: number;
  tastingNotes?: string;
  colourChangeTime?: number;
  firstCrackTime?: number;
  roastEndTime?: number;
  colourChangeTemp?: number;
  firstCrackTemp?: number;
  roastEndTemp?: number;
  developmentTime?: number;
  developmentPercent?: number;
  totalDuration?: number;
  roastDate?: string;
  timeSeriesData?: JsonInput;
  roastProfileCurve?: JsonInput;
  fanProfileCurve?: JsonInput;
  notes?: string;
  rating?: number;
}

export interface CreateRoastInput extends RoastInputBase {
  beanId: string;
}

export type UpdateRoastInput = RoastInputBase;

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

// Fields to omit from list queries for performance (large JSON blobs)
const LIST_QUERY_OMIT = {
  timeSeriesData: true,
  roastProfileCurve: true,
  fanProfileCurve: true,
} as const;

const ROAST_INCLUDE = {
  bean: true,
  roastFiles: true,
  roastProfile: true,
  roastFlavors: { include: { descriptor: true } },
} as const;

function upsertRoastProfile(
  tx: TransactionClient | PrismaClient,
  roastId: string,
  data: {
    fileKey: string;
    fileName: string;
    profileShortName?: string | null;
    profileDesigner?: string | null;
  },
) {
  return tx.roastProfile.upsert({
    where: { roastId },
    update: { ...data, profileType: "KAFFELOGIC" },
    create: { roastId, ...data, profileType: "KAFFELOGIC" },
  });
}

export class RoastService {
  constructor(private prisma: PrismaClient) {}

  // --- Query methods ---

  async myRoasts(userId: string) {
    return this.prisma.roast.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      omit: LIST_QUERY_OMIT,
      include: ROAST_INCLUDE,
    });
  }

  async roastById(userId: string, id: string) {
    return this.prisma.roast.findFirst({
      where: { id, userId },
      include: ROAST_INCLUDE,
    });
  }

  async roastsByBean(userId: string, beanId: string) {
    return this.prisma.roast.findMany({
      where: { beanId, userId },
      orderBy: { roastDate: "desc" },
      omit: LIST_QUERY_OMIT,
      include: ROAST_INCLUDE,
    });
  }

  async roastsByIds(userId: string, ids: string[]) {
    return this.prisma.roast.findMany({
      where: { id: { in: ids }, userId },
      orderBy: { roastDate: "desc" },
      omit: LIST_QUERY_OMIT,
      include: ROAST_INCLUDE,
    });
  }

  async roastByShareToken(token: string) {
    return this.prisma.roast.findFirst({
      where: { shareToken: token, isShared: true },
      include: ROAST_INCLUDE,
    });
  }

  async downloadProfile(userId: string, roastId: string) {
    const roast = await this.prisma.roast.findFirst({
      where: { id: roastId, userId },
      include: { roastFiles: true, roastProfile: true },
    });
    if (!roast) return null;

    const klogFile = roast.roastFiles.find((f) => f.fileType === "KLOG");
    if (!klogFile) return null;

    let klogContent: string;
    try {
      klogContent = await getFileContent(klogFile.fileKey);
    } catch {
      return null;
    }
    const kproContent = extractKproContent(klogContent);
    if (!kproContent) return null;

    const fileName = roast.roastProfile?.profileShortName
      ? `${roast.roastProfile.profileShortName}.kpro`
      : klogFile.fileName.replace(/\.klog$/i, ".kpro");

    return { fileName, content: kproContent };
  }

  async previewRoastLog(userId: string, fileName: string, fileContent: string) {
    // Validate
    const validation = validateKlogFile(fileName, fileContent);
    if (!validation.valid) {
      throw new GraphQLError(validation.error, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    // Parse
    let parsed;
    try {
      parsed = parseKlog(fileContent);
    } catch (err) {
      throw new GraphQLError(
        err instanceof Error ? err.message : "Failed to parse .klog file",
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }

    // Match beans by shortName, bean name, and filename prefix
    const filePrefix = fileName.replace(/\.klog$/i, "").split(/\s+/)[0] ?? null;
    const searchTerm = parsed.profileShortName || filePrefix;
    const suggestedBeans = await this.findMatchingBeans(userId, searchTerm);

    return {
      roastDate: parsed.roastDate,
      ambientTemp: parsed.ambientTemp,
      roastingLevel: parsed.roastingLevel,
      tastingNotes: parsed.tastingNotes,
      profileShortName: parsed.profileShortName,
      profileDesigner: parsed.profileDesigner,
      colourChangeTime: parsed.colourChangeTime,
      firstCrackTime: parsed.firstCrackTime,
      roastEndTime: parsed.roastEndTime,
      developmentPercent: parsed.developmentPercent,
      totalDuration: parsed.totalDuration,
      suggestedBeans,
      parseWarnings: parsed.parseWarnings,
    };
  }

  /**
   * Find matching beans by search term (from profileShortName or filename prefix).
   * Checks: exact shortName, then shortName contains, then bean name contains.
   * Returns up to 5 candidates, exact matches first.
   */
  private async findMatchingBeans(userId: string, searchTerm: string | null | undefined) {
    if (!searchTerm) return [];

    // Exact shortName match (highest priority)
    const exactMatch = await this.prisma.userBean.findFirst({
      where: {
        userId,
        shortName: { equals: searchTerm, mode: "insensitive" },
      },
      include: { bean: true },
    });

    // Substring match on shortName and bean name (broader search)
    const fuzzyMatches = await this.prisma.userBean.findMany({
      where: {
        userId,
        OR: [
          { shortName: { contains: searchTerm, mode: "insensitive" } },
          { bean: { name: { contains: searchTerm, mode: "insensitive" } } },
        ],
      },
      include: { bean: true },
      take: 5,
    });

    // Dedupe: exact match first, then fuzzy matches
    const seen = new Set<string>();
    const results = [];

    if (exactMatch) {
      seen.add(exactMatch.id);
      results.push(exactMatch);
    }
    for (const match of fuzzyMatches) {
      if (!seen.has(match.id)) {
        seen.add(match.id);
        results.push(match);
      }
    }

    return results.slice(0, 5);
  }

  // --- Mutation methods ---

  async createRoast(userId: string, input: CreateRoastInput) {
    await requireBean(this.prisma, input.beanId);

    return this.prisma.roast.create({
      data: {
        ...input,
        roastDate: input.roastDate ? new Date(input.roastDate) : null,
        userId,
      },
      include: ROAST_INCLUDE,
    });
  }

  async updateRoast(userId: string, id: string, input: UpdateRoastInput) {
    await requireRoast(this.prisma, id, userId);

    return this.prisma.roast.update({
      where: { id },
      data: {
        ...input,
        roastDate: input.roastDate ? new Date(input.roastDate) : undefined,
      },
      include: ROAST_INCLUDE,
    });
  }

  async deleteRoast(userId: string, id: string) {
    await requireRoast(this.prisma, id, userId);

    await this.prisma.roast.delete({ where: { id } });
    return true;
  }

  async toggleRoastSharing(userId: string, id: string) {
    const roast = await requireRoast(this.prisma, id, userId);

    return this.prisma.roast.update({
      where: { id },
      data: { isShared: !roast.isShared },
      include: ROAST_INCLUDE,
    });
  }

  async uploadRoastLog(
    userId: string,
    beanId: string,
    fileName: string,
    fileContent: string,
    notes?: string,
  ) {
    // Validate file
    const validation = validateKlogFile(fileName, fileContent);
    if (!validation.valid) {
      throw new GraphQLError(validation.error, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    // Duplicate check
    const existing = await this.prisma.roastFile.findFirst({
      where: { fileName, roast: { userId } },
    });
    if (existing) {
      throw new GraphQLError(
        "A roast log with this filename already exists",
        { extensions: { code: "DUPLICATE_FILE" } },
      );
    }

    await requireBean(this.prisma, beanId);

    // Parse the klog file
    let parsed;
    try {
      parsed = parseKlog(fileContent);
    } catch (err) {
      throw new GraphQLError(
        err instanceof Error ? err.message : "Failed to parse .klog file",
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }

    // Wrap DB writes in a transaction for atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      const roast = await tx.roast.create({
        data: {
          userId,
          beanId,
          roastDate: parsed.roastDate,
          ambientTemp: parsed.ambientTemp,
          roastingLevel: parsed.roastingLevel,
          tastingNotes: parsed.tastingNotes,
          colourChangeTime: parsed.colourChangeTime,
          firstCrackTime: parsed.firstCrackTime,
          roastEndTime: parsed.roastEndTime,
          colourChangeTemp: parsed.colourChangeTemp,
          firstCrackTemp: parsed.firstCrackTemp,
          roastEndTemp: parsed.roastEndTemp,
          developmentTime: parsed.developmentTime,
          developmentPercent: parsed.developmentPercent,
          totalDuration: parsed.totalDuration,
          timeSeriesData: parsed.timeSeriesData ?? undefined,
          roastProfileCurve: parsed.roastProfileCurve ?? undefined,
          fanProfileCurve: parsed.fanProfileCurve ?? undefined,
          notes,
        },
        include: { bean: true },
      });

      const fileKey = `roasts/${userId}/${roast.id}/${fileName}`;

      const roastFile = await tx.roastFile.create({
        data: {
          roastId: roast.id,
          fileKey,
          fileName,
          fileType: "KLOG",
        },
      });

      let roastProfile = null;
      if (parsed.profileFileName) {
        roastProfile = await upsertRoastProfile(tx, roast.id, {
          fileKey: parsed.profileFileName,
          fileName: parsed.profileFileName,
          profileShortName: parsed.profileShortName,
          profileDesigner: parsed.profileDesigner,
        });
      }

      return {
        ...roast,
        roastFiles: [roastFile],
        roastProfile,
      };
    });

    // R2 upload outside transaction (non-fatal)
    const fileKey = `roasts/${userId}/${result.id}/${fileName}`;
    const parseWarnings = [...parsed.parseWarnings];
    try {
      await uploadFile(fileKey, fileContent, "text/plain");
    } catch (err) {
      parseWarnings.push(
        `Warning: failed to upload raw file to storage: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { roast: result, parseWarnings };
  }

  async uploadRoastProfile(
    userId: string,
    input: {
      roastId: string;
      fileKey: string;
      fileName: string;
      profileType?: string;
    },
  ) {
    await requireRoast(this.prisma, input.roastId, userId);

    return upsertRoastProfile(this.prisma, input.roastId, {
      fileKey: input.fileKey,
      fileName: input.fileName,
    });
  }
}
