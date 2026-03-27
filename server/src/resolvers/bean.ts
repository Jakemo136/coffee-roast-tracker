import type { Context } from "../context.js";
import { requireAuth } from "../context.js";

export const beanResolvers = {
  Query: {
    myBeans: async (_: unknown, __: unknown, ctx: Context) => {
      const userId = requireAuth(ctx);
      return ctx.prisma.userBean.findMany({
        where: { userId },
        include: { bean: true },
        orderBy: { createdAt: "desc" },
      });
    },
  },

  Mutation: {
    createBean: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          name: string;
          origin?: string;
          process?: string;
          cropYear?: number;
          notes?: string;
          shortName?: string;
        };
      },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);
      const { notes, shortName, ...beanData } = input;

      return ctx.prisma.$transaction(async (tx) => {
        const bean = await tx.bean.create({ data: beanData });
        return tx.userBean.create({
          data: { userId, beanId: bean.id, notes, shortName },
          include: { bean: true },
        });
      });
    },

    addBeanToLibrary: async (
      _: unknown,
      { beanId, notes, shortName }: { beanId: string; notes?: string; shortName?: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      const bean = await ctx.prisma.bean.findUnique({ where: { id: beanId } });
      if (!bean) {
        throw new Error("Bean not found");
      }

      return ctx.prisma.userBean.create({
        data: { userId, beanId, notes, shortName },
        include: { bean: true },
      });
    },

    updateUserBean: async (
      _: unknown,
      { id, notes, shortName }: { id: string; notes?: string; shortName?: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      const userBean = await ctx.prisma.userBean.findFirst({
        where: { id, userId },
      });
      if (!userBean) {
        throw new Error("Bean not found in your library");
      }

      return ctx.prisma.userBean.update({
        where: { id },
        data: { notes, shortName },
        include: { bean: true },
      });
    },

    removeBeanFromLibrary: async (
      _: unknown,
      { beanId }: { beanId: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      const userBean = await ctx.prisma.userBean.findUnique({
        where: { userId_beanId: { userId, beanId } },
      });
      if (!userBean) {
        throw new Error("Bean not found in your library");
      }

      await ctx.prisma.userBean.delete({ where: { id: userBean.id } });
      return true;
    },
  },
};
