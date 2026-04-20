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
      include: ROAST_INCLUDE,
    });
  }

  async publicRoast(id: string, userId: string | null) {
    const roast = await this.prisma.roast.findFirst({
      where: { id },
      include: ROAST_INCLUDE,
    });
    if (!roast) return null;
    if (roast.isPublic || roast.userId === userId) return roast;
    return null;
  }

  async publicRoasts(beanId?: string, limit?: number, offset?: number) {
    return this.prisma.roast.findMany({
      where: {
        isPublic: true,
        ...(beanId ? { beanId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit ?? 50,
      skip: offset ?? 0,
      omit: LIST_QUERY_OMIT,
      include: ROAST_INCLUDE,
    });
  }

  async communityStats() {
    const [totalRoasts, totalBeans] = await Promise.all([
      this.prisma.roast.count({ where: { isPublic: true } }),
      this.prisma.bean.count(),
    ]);
    return { totalRoasts, totalBeans };
  }

  async downloadProfile(userId: string | null, roastId: string) {
    // Allow download for public roasts (no auth required) or owner's roasts
    const roast = await this.prisma.roast.findFirst({
      where: {
        id: roastId,
        OR: [
          { isPublic: true },
          ...(userId ? [{ userId }] : []),
        ],
      },
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

    // Match beans using profile short name and filename
    const fileNameWithoutExt = fileName.replace(/\.klog$/i, "");
    const suggestedBeans = await this.findMatchingBeans(
      userId,
      parsed.profileShortName,
      fileNameWithoutExt,
    );

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
   * Find matching beans using profile short name and/or filename.
   *
   * For each user bean, checks whether the bean's shortName or bean.name
   * appears in the profileShortName or filename (bidirectional substring).
   * This catches cases like:
   *   - profileShortName "ESQ E-WSH" contains shortName "ESQ"
   *   - filename "ESQ 0322b" contains shortName "ESQ"
   *   - shortName "Eth Yirg" appears in bean name "Ethiopia Yirgacheffe"
   *
   * Returns up to 5 candidates, exact shortName matches first.
   */
  private async findMatchingBeans(
    userId: string,
    profileShortName: string | null | undefined,
    fileName: string | null | undefined,
  ) {
    // Get all user beans (typically < 50 for a hobbyist)
    const userBeans = await this.prisma.userBean.findMany({
      where: { userId },
      include: { bean: true },
    });

    if (userBeans.length === 0) return [];

    const sources = [profileShortName, fileName].filter(Boolean).map((s) => s!.toLowerCase());
    if (sources.length === 0) return [];

    type Scored = { userBean: typeof userBeans[number]; score: number };
    const scored: Scored[] = [];

    for (const ub of userBeans) {
      const shortName = (ub.shortName ?? "").toLowerCase();
      const beanName = ub.bean.name.toLowerCase();
      let score = 0;

      for (const source of sources) {
        // Exact shortName match (highest value)
        if (shortName && shortName === source) { score = Math.max(score, 100); continue; }
        // shortName found in source (e.g. "ESQ" in "ESQ E-WSH")
        if (shortName && source.includes(shortName)) { score = Math.max(score, 80); continue; }
        // source found in shortName
        if (shortName && shortName.includes(source)) { score = Math.max(score, 70); continue; }
        // bean name found in source or source found in bean name
        if (source.includes(beanName) || beanName.includes(source)) { score = Math.max(score, 50); continue; }
      }

      if (score > 0) {
        scored.push({ userBean: ub, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.userBean);
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

  async toggleRoastPublic(userId: string, id: string) {
    const roast = await requireRoast(this.prisma, id, userId);

    return this.prisma.roast.update({
      where: { id },
      data: { isPublic: !roast.isPublic },
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

    // Duplicate check — if the same file was already uploaded, return the existing roast
    const existing = await this.prisma.roastFile.findFirst({
      where: { fileName, roast: { userId } },
      include: { roast: true },
    });
    if (existing) {
      const roast = await this.prisma.roast.findUniqueOrThrow({
        where: { id: existing.roastId },
        include: ROAST_INCLUDE,
      });
      return { roast, parseWarnings: ["This file was previously uploaded — returning existing roast."] };
    }

    await requireBean(this.prisma, beanId);

    // Look up user's privacy preference
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const isPublic = !user.privateByDefault;

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
          isPublic,
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
