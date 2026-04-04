import type { Context } from "../context.js";
import { requireAuth } from "../context.js";
import { RoastService } from "../services/roastService.js";
import type { CreateRoastInput, UpdateRoastInput } from "../services/roastService.js";

export type { RoastInputBase, CreateRoastInput, UpdateRoastInput } from "../services/roastService.js";

export const roastResolvers = {
  Query: {
    previewRoastLog: async (
      _: unknown,
      { fileName, fileContent }: { fileName: string; fileContent: string },
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).previewRoastLog(userId, fileName, fileContent);
    },

    myRoasts: async (_: unknown, __: unknown, ctx: Context) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).myRoasts(userId);
    },

    roastById: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).roastById(userId, id);
    },

    roastsByBean: async (
      _: unknown,
      { beanId }: { beanId: string },
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).roastsByBean(userId, beanId);
    },

    roastsByIds: async (
      _: unknown,
      { ids }: { ids: string[] },
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).roastsByIds(userId, ids);
    },

    downloadProfile: async (
      _: unknown,
      { roastId }: { roastId: string },
      ctx: Context,
    ) => {
      // Public download for public roasts; auth-scoped for private roasts
      return new RoastService(ctx.prisma).downloadProfile(ctx.userId, roastId);
    },

    roast: async (
      _: unknown,
      { id }: { id: string },
      ctx: Context,
    ) => {
      return new RoastService(ctx.prisma).publicRoast(id, ctx.userId);
    },

    publicRoasts: async (
      _: unknown,
      { beanId, limit, offset }: { beanId?: string; limit?: number; offset?: number },
      ctx: Context,
    ) => {
      return new RoastService(ctx.prisma).publicRoasts(beanId, limit, offset);
    },

    communityStats: async (_: unknown, __: unknown, ctx: Context) => {
      return new RoastService(ctx.prisma).communityStats();
    },
  },

  Mutation: {
    createRoast: async (
      _: unknown,
      { input }: { input: CreateRoastInput },
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).createRoast(userId, input);
    },

    updateRoast: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateRoastInput },
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).updateRoast(userId, id, input);
    },

    deleteRoast: async (
      _: unknown,
      { id }: { id: string },
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).deleteRoast(userId, id);
    },

    toggleRoastPublic: async (
      _: unknown,
      { id }: { id: string },
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).toggleRoastPublic(userId, id);
    },

    uploadRoastLog: async (
      _: unknown,
      {
        beanId,
        fileName,
        fileContent,
        notes,
      }: { beanId: string; fileName: string; fileContent: string; notes?: string },
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).uploadRoastLog(userId, beanId, fileName, fileContent, notes);
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
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).uploadRoastProfile(userId, input);
    },
  },
};
