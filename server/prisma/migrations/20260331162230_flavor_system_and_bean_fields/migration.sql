-- CreateEnum
CREATE TYPE "FlavorCategory" AS ENUM ('FLORAL', 'HONEY', 'SUGARS', 'CARAMEL', 'FRUITS', 'CITRUS', 'BERRY', 'COCOA', 'NUTS', 'RUSTIC', 'SPICE', 'BODY', 'OFF_FLAVOR');

-- AlterTable
ALTER TABLE "Bean" ADD COLUMN     "bagNotes" TEXT,
ADD COLUMN     "elevation" TEXT,
ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "Roast" ADD COLUMN     "rating" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "FlavorDescriptor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FlavorCategory" NOT NULL,
    "isOffFlavor" BOOLEAN NOT NULL DEFAULT false,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlavorDescriptor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoastFlavor" (
    "roastId" TEXT NOT NULL,
    "descriptorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoastFlavor_pkey" PRIMARY KEY ("roastId","descriptorId")
);

-- CreateIndex
CREATE UNIQUE INDEX "FlavorDescriptor_name_key" ON "FlavorDescriptor"("name");

-- CreateIndex
CREATE INDEX "RoastFlavor_roastId_idx" ON "RoastFlavor"("roastId");

-- CreateIndex
CREATE INDEX "RoastFlavor_descriptorId_idx" ON "RoastFlavor"("descriptorId");

-- AddForeignKey
ALTER TABLE "RoastFlavor" ADD CONSTRAINT "RoastFlavor_roastId_fkey" FOREIGN KEY ("roastId") REFERENCES "Roast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoastFlavor" ADD CONSTRAINT "RoastFlavor_descriptorId_fkey" FOREIGN KEY ("descriptorId") REFERENCES "FlavorDescriptor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
