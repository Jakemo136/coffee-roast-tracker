import type { PrismaClient } from "@prisma/client";

export async function requireRoast(prisma: PrismaClient, id: string, userId: string) {
  const roast = await prisma.roast.findFirst({ where: { id, userId } });
  if (!roast) {
    throw new Error("Roast not found");
  }
  return roast;
}

export async function requireBean(prisma: PrismaClient, beanId: string) {
  const bean = await prisma.bean.findUnique({ where: { id: beanId } });
  if (!bean) {
    throw new Error("Bean not found");
  }
  return bean;
}

export async function requireUserBean(prisma: PrismaClient, id: string, userId: string) {
  const userBean = await prisma.userBean.findFirst({ where: { id, userId } });
  if (!userBean) {
    throw new Error("Bean not found in your library");
  }
  return userBean;
}
