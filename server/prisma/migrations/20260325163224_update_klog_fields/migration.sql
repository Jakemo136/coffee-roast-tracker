/*
  Warnings:

  - You are about to drop the column `developmentDeltaTemp` on the `Roast` table. All the data in the column will be lost.
  - You are about to drop the column `dryingEndTime` on the `Roast` table. All the data in the column will be lost.
  - You are about to drop the column `maillardEndTime` on the `Roast` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Roast" DROP COLUMN "developmentDeltaTemp",
DROP COLUMN "dryingEndTime",
DROP COLUMN "maillardEndTime",
ADD COLUMN     "ambientTemp" DOUBLE PRECISION,
ADD COLUMN     "colourChangeTemp" DOUBLE PRECISION,
ADD COLUMN     "colourChangeTime" DOUBLE PRECISION,
ADD COLUMN     "developmentPercent" DOUBLE PRECISION,
ADD COLUMN     "fanProfileCurve" JSONB,
ADD COLUMN     "roastEndTime" DOUBLE PRECISION,
ADD COLUMN     "roastProfileCurve" JSONB,
ADD COLUMN     "roastingLevel" DOUBLE PRECISION,
ADD COLUMN     "tastingNotes" TEXT,
ADD COLUMN     "timeSeriesData" JSONB;

-- AlterTable
ALTER TABLE "RoastProfile" ADD COLUMN     "profileDesigner" TEXT,
ADD COLUMN     "profileShortName" TEXT;
