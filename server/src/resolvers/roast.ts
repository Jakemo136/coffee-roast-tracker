import { GraphQLError } from "graphql";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { Context } from "../context.js";
import { requireAuth } from "../context.js";
import { requireBean, requireRoast } from "../lib/guardHelpers.js";
import { parseKlog } from "../lib/klogParser.js";
import { extractKproContent } from "../lib/kproExtractor.js";
import { validateKlogFile } from "../lib/validateKlog.js";
import { getFileContent, uploadFile } from "../utils/r2.js";

type JsonInput = Prisma.InputJsonValue | undefined;

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
} as const;

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
}

export interface CreateRoastInput extends RoastInputBase {
  beanId: string;
}

type UpdateRoastInput = RoastInputBase;

async function upsertRoastProfile(
  prisma: PrismaClient,
  roastId: string,
  data: {
    fileKey: string;
    fileName: string;
    profileShortName?: string | null;
    profileDesigner?: string | null;
  },
) {
  return prisma.roastProfile.upsert({
    where: { roastId },
    update: { ...data, profileType: "KAFFELOGIC" },
    create: { roastId, ...data, profileType: "KAFFELOGIC" },
  });
}

export const roastResolvers = {
  Query: {
    previewRoastLog: async (
      _: unknown,
      { fileName, fileContent }: { fileName: string; fileContent: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

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

      // Match bean by shortName
      let suggestedBean = null;
      if (parsed.profileShortName) {
        suggestedBean = await ctx.prisma.userBean.findFirst({
          where: {
            userId,
            shortName: { equals: parsed.profileShortName, mode: "insensitive" },
          },
          include: { bean: true },
        });
      }

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
        suggestedBean,
        parseWarnings: parsed.parseWarnings,
      };
    },

    myRoasts: async (_: unknown, __: unknown, ctx: Context) => {
      const userId = requireAuth(ctx);
      return ctx.prisma.roast.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        omit: LIST_QUERY_OMIT,
        include: ROAST_INCLUDE,
      });
    },

    roastById: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      const userId = requireAuth(ctx);
      return ctx.prisma.roast.findFirst({
        where: { id, userId },
        include: ROAST_INCLUDE,
      });
    },

    roastsByBean: async (
      _: unknown,
      { beanId }: { beanId: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);
      return ctx.prisma.roast.findMany({
        where: { beanId, userId },
        orderBy: { roastDate: "desc" },
        omit: LIST_QUERY_OMIT,
        include: ROAST_INCLUDE,
      });
    },

    roastsByIds: async (
      _: unknown,
      { ids }: { ids: string[] },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);
      return ctx.prisma.roast.findMany({
        where: { id: { in: ids }, userId },
        orderBy: { roastDate: "desc" },
        omit: LIST_QUERY_OMIT,
        include: ROAST_INCLUDE,
      });
    },

    downloadProfile: async (
      _: unknown,
      { roastId }: { roastId: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      const roast = await ctx.prisma.roast.findFirst({
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
    },

    roastByShareToken: async (
      _: unknown,
      { token }: { token: string },
      ctx: Context
    ) => {
      return ctx.prisma.roast.findFirst({
        where: { shareToken: token, isShared: true },
        include: ROAST_INCLUDE,
      });
    },
  },

  Mutation: {
    createRoast: async (
      _: unknown,
      { input }: { input: CreateRoastInput },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      await requireBean(ctx.prisma, input.beanId);

      return ctx.prisma.roast.create({
        data: {
          ...input,
          roastDate: input.roastDate ? new Date(input.roastDate) : null,
          userId,
        },
        include: ROAST_INCLUDE,
      });
    },

    updateRoast: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateRoastInput },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      await requireRoast(ctx.prisma, id, userId);

      return ctx.prisma.roast.update({
        where: { id },
        data: {
          ...input,
          roastDate: input.roastDate ? new Date(input.roastDate) : undefined,
        },
        include: ROAST_INCLUDE,
      });
    },

    deleteRoast: async (
      _: unknown,
      { id }: { id: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      await requireRoast(ctx.prisma, id, userId);

      await ctx.prisma.roast.delete({ where: { id } });
      return true;
    },

    toggleRoastSharing: async (
      _: unknown,
      { id }: { id: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      const roast = await requireRoast(ctx.prisma, id, userId);

      return ctx.prisma.roast.update({
        where: { id },
        data: { isShared: !roast.isShared },
        include: ROAST_INCLUDE,
      });
    },

    uploadRoastLog: async (
      _: unknown,
      {
        beanId,
        fileName,
        fileContent,
      }: { beanId: string; fileName: string; fileContent: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      // Validate file
      const validation = validateKlogFile(fileName, fileContent);
      if (!validation.valid) {
        throw new GraphQLError(validation.error, {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // Duplicate check
      const existing = await ctx.prisma.roastFile.findFirst({
        where: { fileName, roast: { userId } },
      });
      if (existing) {
        throw new GraphQLError(
          "A roast log with this filename already exists",
          { extensions: { code: "DUPLICATE_FILE" } },
        );
      }

      await requireBean(ctx.prisma, beanId);

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

      // Create roast record
      const roast = await ctx.prisma.roast.create({
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
        },
      });

      // Upload raw file to R2 (non-fatal on failure)
      const fileKey = `roasts/${userId}/${roast.id}/${fileName}`;
      const parseWarnings = [...parsed.parseWarnings];
      try {
        await uploadFile(fileKey, fileContent, "text/plain");
      } catch (err) {
        parseWarnings.push(
          `Warning: failed to upload raw file to storage: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      // Create RoastFile record
      await ctx.prisma.roastFile.create({
        data: {
          roastId: roast.id,
          fileKey,
          fileName,
          fileType: "KLOG",
        },
      });

      // Upsert RoastProfile if profile info is available
      if (parsed.profileFileName) {
        await upsertRoastProfile(ctx.prisma, roast.id, {
          fileKey: parsed.profileFileName,
          fileName: parsed.profileFileName,
          profileShortName: parsed.profileShortName,
          profileDesigner: parsed.profileDesigner,
        });
      }

      // Re-fetch with includes
      const fullRoast = await ctx.prisma.roast.findUnique({
        where: { id: roast.id },
        include: ROAST_INCLUDE,
      });
      if (!fullRoast) {
        throw new GraphQLError("Failed to retrieve created roast", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }

      return { roast: fullRoast, parseWarnings };
    },

    uploadRoastProfile: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          roastId: string;
          fileKey: string;
          fileName: string;
          profileType?: string;
        };
      },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      await requireRoast(ctx.prisma, input.roastId, userId);

      // Upsert — one profile per roast
      return upsertRoastProfile(ctx.prisma, input.roastId, {
        fileKey: input.fileKey,
        fileName: input.fileName,
      });
    },
  },
};
