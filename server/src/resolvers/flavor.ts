import { GraphQLError } from "graphql";
import type { Context } from "../context.js";
import { requireAuth } from "../context.js";
import { FlavorService } from "../services/flavorService.js";
import { ScrapingService } from "../services/scrapingService.js";

export const flavorResolvers = {
  Query: {
    flavorDescriptors: async (
      _: unknown,
      { isOffFlavor }: { isOffFlavor?: boolean },
      ctx: Context,
    ) => {
      // Public — flavor descriptors are reference data
      return new FlavorService(ctx.prisma).flavorDescriptors(isOffFlavor);
    },
    parseSupplierNotes: async (
      _: unknown,
      { text }: { text: string },
      ctx: Context,
    ) => {
      return new FlavorService(ctx.prisma).parseSupplierNotes(text);
    },
    scrapeBeanUrl: async (
      _: unknown,
      { url }: { url: string },
      ctx: Context,
    ) => {
      requireAuth(ctx);
      return new ScrapingService().scrapeBeanUrl(url);
    },
    parseBeanPage: async (
      _: unknown,
      { html }: { html: string },
      ctx: Context,
    ) => {
      requireAuth(ctx);
      return new ScrapingService().parseProductPage(html);
    },
  },

  Mutation: {
    createFlavorDescriptor: async (
      _: unknown,
      { name, category }: { name: string; category: string },
      ctx: Context,
    ) => {
      requireAuth(ctx);
      return new FlavorService(ctx.prisma).createFlavorDescriptor(name, category);
    },
    setRoastFlavors: async (
      _: unknown,
      {
        roastId,
        descriptorIds,
      }: { roastId: string; descriptorIds: string[] },
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new FlavorService(ctx.prisma).setRoastFlavors(
        userId,
        roastId,
        descriptorIds,
      );
    },
    setRoastOffFlavors: async (
      _: unknown,
      {
        roastId,
        descriptorIds,
      }: { roastId: string; descriptorIds: string[] },
      ctx: Context,
    ) => {
      const userId = requireAuth(ctx);
      return new FlavorService(ctx.prisma).setRoastOffFlavors(
        userId,
        roastId,
        descriptorIds,
      );
    },
  },

  Roast: {
    flavors: async (parent: any, _: unknown, ctx: Context) => {
      if (parent.roastFlavors) {
        return parent.roastFlavors
          .map((rf: any) => rf.descriptor)
          .filter((d: any) => !d.isOffFlavor);
      }
      const roastFlavors = await ctx.prisma.roastFlavor.findMany({
        where: { roastId: parent.id, descriptor: { isOffFlavor: false } },
        include: { descriptor: true },
      });
      return roastFlavors.map((rf) => rf.descriptor);
    },
    offFlavors: async (parent: any, _: unknown, ctx: Context) => {
      if (parent.roastFlavors) {
        return parent.roastFlavors
          .map((rf: any) => rf.descriptor)
          .filter((d: any) => d.isOffFlavor);
      }
      const roastFlavors = await ctx.prisma.roastFlavor.findMany({
        where: { roastId: parent.id, descriptor: { isOffFlavor: true } },
        include: { descriptor: true },
      });
      return roastFlavors.map((rf) => rf.descriptor);
    },
  },
};
