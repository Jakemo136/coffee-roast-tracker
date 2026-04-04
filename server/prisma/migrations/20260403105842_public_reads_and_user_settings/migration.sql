-- AlterTable: Rename isShared to isPublic and change default
ALTER TABLE "Roast" RENAME COLUMN "isShared" TO "isPublic";
ALTER TABLE "Roast" ALTER COLUMN "isPublic" SET DEFAULT true;

-- AlterTable: Drop shareToken column and its unique index
DROP INDEX IF EXISTS "Roast_shareToken_key";
ALTER TABLE "Roast" DROP COLUMN "shareToken";

-- AlterTable: Add theme and privateByDefault to User
ALTER TABLE "User" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'LATTE';
ALTER TABLE "User" ADD COLUMN "privateByDefault" BOOLEAN NOT NULL DEFAULT false;
