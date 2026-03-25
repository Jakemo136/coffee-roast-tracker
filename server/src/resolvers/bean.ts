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
        };
      },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);
      const { notes, ...beanData } = input;

      const bean = await ctx.prisma.bean.create({ data: beanData });

      return ctx.prisma.userBean.create({
        data: { userId, beanId: bean.id, notes },
        include: { bean: true },
      });
    },

    addBeanToLibrary: async (
      _: unknown,
      { beanId, notes }: { beanId: string; notes?: string },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);

      const bean = await ctx.prisma.bean.findUnique({ where: { id: beanId } });
      if (!bean) {
        throw new Error("Bean not found");
      }

      return ctx.prisma.userBean.create({
        data: { userId, beanId, notes },
        include: { bean: true },
      });
    },

    updateUserBean: async (
      _: unknown,
      { id, notes }: { id: string; notes?: string },
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
        data: { notes },
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

  Bean: {
    roasts: (parent: { id: string }, _: unknown, ctx: Context) =>
      ctx.prisma.roast.findMany({
        where: { beanId: parent.id },
        orderBy: { roastDate: "desc" },
      }),
  },

  UserBean: {
    bean: (parent: { beanId: string }, _: unknown, ctx: Context) =>
      ctx.prisma.bean.findUniqueOrThrow({ where: { id: parent.beanId } }),
  },
};
