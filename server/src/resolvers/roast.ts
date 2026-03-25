import type { Prisma } from "@prisma/client";
import type { Context } from "../context.js";
import { requireAuth } from "../context.js";
import { parseKlog } from "../lib/klogParser.js";
import { validateKlogFile } from "../lib/validateKlog.js";
import { uploadFile } from "../utils/r2.js";

type JsonInput = Prisma.InputJsonValue | undefined;

// Fields to omit from list queries for performance (large JSON blobs)
const LIST_QUERY_OMIT = {
  timeSeriesData: true,
  roastProfileCurve: true,
  fanProfileCurve: true,
} as const;

export const roastResolvers = {
  Query: {
    myRoasts: async (_: unknown, __: unknown, ctx: Context) => {
      const userId = requireAuth(ctx);
      return ctx.prisma.roast.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        omit: LIST_QUERY_OMIT,
        include: { bean: true, roastFiles: true, roastProfile: true },
      });
    },

    roastById: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      const userId = requireAuth(ctx);
      return ctx.prisma.roast.findFirst({
        where: { id, userId },
        include: { bean: true, roastFiles: true, roastProfile: true },
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
        include: { bean: true, roastFiles: true, roastProfile: true },
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
        include: { bean: true, roastFiles: true, roastProfile: true },
      });
    },

    roastByShareToken: async (
      _: unknown,
      { token }: { token: string },
      ctx: Context
    ) => {
      return ctx.prisma.roast.findFirst({
        where: { shareToken: token, isShared: true },
        include: { bean: true, roastFiles: true, roastProfile: true },
      });
    },
  },

  Mutation: {
    createRoast: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          beanId: string;
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
        };
      },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      // Verify the bean exists
      const bean = await ctx.prisma.bean.findUnique({
        where: { id: input.beanId },
      });
      if (!bean) {
        throw new Error("Bean not found");
      }

      return ctx.prisma.roast.create({
        data: {
          ...input,
          roastDate: input.roastDate ? new Date(input.roastDate) : null,
          userId,
        },
        include: { bean: true, roastFiles: true, roastProfile: true },
      });
    },

    updateRoast: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: {
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
        };
      },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      const roast = await ctx.prisma.roast.findFirst({
        where: { id, userId },
      });
      if (!roast) {
        throw new Error("Roast not found");
      }

      return ctx.prisma.roast.update({
        where: { id },
        data: {
          ...input,
          roastDate: input.roastDate ? new Date(input.roastDate) : undefined,
        },
        include: { bean: true, roastFiles: true, roastProfile: true },
      });
    },

    deleteRoast: async (
      _: unknown,
      { id }: { id: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      const roast = await ctx.prisma.roast.findFirst({
        where: { id, userId },
      });
      if (!roast) {
        throw new Error("Roast not found");
      }

      await ctx.prisma.roast.delete({ where: { id } });
      return true;
    },

    toggleRoastSharing: async (
      _: unknown,
      { id }: { id: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      const roast = await ctx.prisma.roast.findFirst({
        where: { id, userId },
      });
      if (!roast) {
        throw new Error("Roast not found");
      }

      return ctx.prisma.roast.update({
        where: { id },
        data: { isShared: !roast.isShared },
        include: { bean: true, roastFiles: true, roastProfile: true },
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
        throw new Error(validation.error ?? "Invalid .klog file");
      }

      // Duplicate check
      const existing = await ctx.prisma.roastFile.findFirst({
        where: { fileName, roast: { userId } },
      });
      if (existing) {
        throw new Error(
          "A roast log with this filename already exists. Do you want to replace it?"
        );
      }

      // Verify bean exists
      const bean = await ctx.prisma.bean.findUnique({
        where: { id: beanId },
      });
      if (!bean) {
        throw new Error("Bean not found");
      }

      // Parse the klog file
      const parsed = parseKlog(fileContent);

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
          timeSeriesData: parsed.timeSeriesData as unknown as Prisma.InputJsonValue,
          roastProfileCurve: parsed.roastProfileCurve as unknown as Prisma.InputJsonValue,
          fanProfileCurve: parsed.fanProfileCurve as unknown as Prisma.InputJsonValue,
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
        // Extract profile_short_name and profile_designer from raw headers
        let profileShortName: string | null = null;
        let profileDesigner: string | null = null;
        const lines = fileContent.split(/\r?\n/);
        for (const line of lines) {
          if (line.trim() === "") break;
          if (line.startsWith("!")) continue;
          const colonIdx = line.indexOf(":");
          if (colonIdx === -1) break;
          const key = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim();
          if (key === "profile_short_name") profileShortName = value;
          if (key === "profile_designer") profileDesigner = value;
        }

        await ctx.prisma.roastProfile.upsert({
          where: { roastId: roast.id },
          update: {
            fileKey: parsed.profileFileName,
            fileName: parsed.profileFileName,
            profileType: "KAFFELOGIC",
            profileShortName,
            profileDesigner,
          },
          create: {
            roastId: roast.id,
            fileKey: parsed.profileFileName,
            fileName: parsed.profileFileName,
            profileType: "KAFFELOGIC",
            profileShortName,
            profileDesigner,
          },
        });
      }

      // Re-fetch with includes
      const fullRoast = await ctx.prisma.roast.findUniqueOrThrow({
        where: { id: roast.id },
        include: { bean: true, roastFiles: true, roastProfile: true },
      });

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

      const roast = await ctx.prisma.roast.findFirst({
        where: { id: input.roastId, userId },
      });
      if (!roast) {
        throw new Error("Roast not found");
      }

      // Upsert — one profile per roast
      return ctx.prisma.roastProfile.upsert({
        where: { roastId: input.roastId },
        update: {
          fileKey: input.fileKey,
          fileName: input.fileName,
          profileType: (input.profileType as "KAFFELOGIC") ?? "KAFFELOGIC",
        },
        create: {
          roastId: input.roastId,
          fileKey: input.fileKey,
          fileName: input.fileName,
          profileType: (input.profileType as "KAFFELOGIC") ?? "KAFFELOGIC",
        },
      });
    },
  },

  Roast: {
    bean: (parent: { id: string; beanId: string }, _: unknown, ctx: Context) =>
      ctx.prisma.bean.findFirstOrThrow({ where: { id: parent.beanId } }),
    roastFiles: (parent: { id: string }, _: unknown, ctx: Context) =>
      ctx.prisma.roastFile.findMany({ where: { roastId: parent.id } }),
    roastProfile: (parent: { id: string }, _: unknown, ctx: Context) =>
      ctx.prisma.roastProfile.findUnique({ where: { roastId: parent.id } }),
  },
};
