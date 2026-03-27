-- DropIndex
DROP INDEX "Roast_beanId_idx";

-- DropIndex
DROP INDEX "Roast_shareToken_idx";

-- DropIndex
DROP INDEX "Roast_userId_idx";

-- DropIndex
DROP INDEX "UserBean_beanId_idx";

-- DropIndex
DROP INDEX "UserBean_userId_idx";

-- CreateIndex
CREATE INDEX "Roast_userId_createdAt_idx" ON "Roast"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Roast_beanId_userId_roastDate_idx" ON "Roast"("beanId", "userId", "roastDate" DESC);

-- CreateIndex
CREATE INDEX "UserBean_userId_shortName_idx" ON "UserBean"("userId", "shortName");
