-- CreateEnum
CREATE TYPE "TempUnit" AS ENUM ('CELSIUS', 'FAHRENHEIT');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('KLOG', 'CSV');

-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('KAFFELOGIC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "tempUnit" "TempUnit" NOT NULL DEFAULT 'CELSIUS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bean" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "origin" TEXT,
    "process" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bean_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roast" (
    "id" TEXT NOT NULL,
    "dryingEndTime" DOUBLE PRECISION,
    "maillardEndTime" DOUBLE PRECISION,
    "firstCrackTime" DOUBLE PRECISION,
    "firstCrackTemp" DOUBLE PRECISION,
    "developmentTime" DOUBLE PRECISION,
    "developmentDeltaTemp" DOUBLE PRECISION,
    "roastEndTemp" DOUBLE PRECISION,
    "totalDuration" DOUBLE PRECISION,
    "roastDate" TIMESTAMP(3),
    "notes" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "beanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Roast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoastFile" (
    "id" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" "FileType" NOT NULL,
    "roastId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoastFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoastProfile" (
    "id" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "profileType" "ProfileType" NOT NULL DEFAULT 'KAFFELOGIC',
    "roastId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoastProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EspressoShot" (
    "id" TEXT NOT NULL,
    "dose" DOUBLE PRECISION,
    "yield" DOUBLE PRECISION,
    "time" DOUBLE PRECISION,
    "tds" DOUBLE PRECISION,
    "notes" TEXT,
    "roastId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EspressoShot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "Bean_userId_idx" ON "Bean"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Roast_shareToken_key" ON "Roast"("shareToken");

-- CreateIndex
CREATE INDEX "Roast_userId_idx" ON "Roast"("userId");

-- CreateIndex
CREATE INDEX "Roast_beanId_idx" ON "Roast"("beanId");

-- CreateIndex
CREATE INDEX "Roast_shareToken_idx" ON "Roast"("shareToken");

-- CreateIndex
CREATE INDEX "RoastFile_roastId_idx" ON "RoastFile"("roastId");

-- CreateIndex
CREATE UNIQUE INDEX "RoastProfile_roastId_key" ON "RoastProfile"("roastId");

-- CreateIndex
CREATE INDEX "RoastProfile_roastId_idx" ON "RoastProfile"("roastId");

-- CreateIndex
CREATE UNIQUE INDEX "EspressoShot_roastId_key" ON "EspressoShot"("roastId");

-- CreateIndex
CREATE INDEX "EspressoShot_roastId_idx" ON "EspressoShot"("roastId");

-- AddForeignKey
ALTER TABLE "Bean" ADD CONSTRAINT "Bean_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roast" ADD CONSTRAINT "Roast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roast" ADD CONSTRAINT "Roast_beanId_fkey" FOREIGN KEY ("beanId") REFERENCES "Bean"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoastFile" ADD CONSTRAINT "RoastFile_roastId_fkey" FOREIGN KEY ("roastId") REFERENCES "Roast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoastProfile" ADD CONSTRAINT "RoastProfile_roastId_fkey" FOREIGN KEY ("roastId") REFERENCES "Roast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EspressoShot" ADD CONSTRAINT "EspressoShot_roastId_fkey" FOREIGN KEY ("roastId") REFERENCES "Roast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
