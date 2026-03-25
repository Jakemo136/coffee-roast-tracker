import type { Context } from "../context.js";
import { requireAuth } from "../context.js";

export const userResolvers = {
  Mutation: {
    updateTempUnit: async (
      _: unknown,
      { tempUnit }: { tempUnit: "CELSIUS" | "FAHRENHEIT" },
      ctx: Context
    ) => {
      const userId = requireAuth(ctx);
      return ctx.prisma.user.update({
        where: { id: userId },
        data: { tempUnit },
      });
    },
  },
};
