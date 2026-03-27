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
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).downloadProfile(userId, roastId);
    },

    roastByShareToken: async (
      _: unknown,
      { token }: { token: string },
      ctx: Context,
    ) => {
      return new RoastService(ctx.prisma).roastByShareToken(token);
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

    toggleRoastSharing: async (
      _: unknown,
      { id }: { id: string },
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).toggleRoastSharing(userId, id);
    },

    uploadRoastLog: async (
      _: unknown,
      {
        beanId,
        fileName,
        fileContent,
      }: { beanId: string; fileName: string; fileContent: string },
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new RoastService(ctx.prisma).uploadRoastLog(userId, beanId, fileName, fileContent);
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
