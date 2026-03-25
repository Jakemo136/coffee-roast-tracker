/*
  Warnings:

  - You are about to drop the column `notes` on the `Bean` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Bean` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Bean" DROP CONSTRAINT "Bean_userId_fkey";

-- DropIndex
DROP INDEX "Bean_userId_idx";

-- AlterTable
ALTER TABLE "Bean" DROP COLUMN "notes",
DROP COLUMN "userId",
ADD COLUMN     "cropYear" INTEGER;

-- CreateTable
CREATE TABLE "UserBean" (
    "id" TEXT NOT NULL,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "beanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBean_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBean_userId_idx" ON "UserBean"("userId");

-- CreateIndex
CREATE INDEX "UserBean_beanId_idx" ON "UserBean"("beanId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBean_userId_beanId_key" ON "UserBean"("userId", "beanId");

-- AddForeignKey
ALTER TABLE "UserBean" ADD CONSTRAINT "UserBean_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBean" ADD CONSTRAINT "UserBean_beanId_fkey" FOREIGN KEY ("beanId") REFERENCES "Bean"("id") ON DELETE CASCADE ON UPDATE CASCADE;
