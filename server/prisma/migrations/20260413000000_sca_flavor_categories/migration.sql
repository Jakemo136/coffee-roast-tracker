-- Migration: sca_flavor_categories
-- Replaces old FlavorCategory enum values with SCA Tier 1 wheel categories.
-- This is destructive to existing FlavorDescriptor data (Task 2 reseeds).

-- Step 1: Drop dependent columns/defaults, alter the enum, restore column

-- Delete all existing FlavorDescriptor rows (Task 2 will reseed)
DELETE FROM "FlavorDescriptor";

-- Drop old enum type values by recreating the enum
-- PostgreSQL requires creating a new type and swapping

-- Rename old enum
ALTER TYPE "FlavorCategory" RENAME TO "FlavorCategory_old";

-- Create new enum with SCA Tier 1 categories
CREATE TYPE "FlavorCategory" AS ENUM (
  'FRUITY',
  'SOUR_FERMENTED',
  'GREEN_VEGETATIVE',
  'OTHER',
  'ROASTED',
  'SPICES',
  'NUTTY_COCOA',
  'SWEET',
  'FLORAL',
  'OFF_FLAVOR'
);

-- Alter the column to use the new type (table is empty so no casting needed)
ALTER TABLE "FlavorDescriptor" ALTER COLUMN "category" TYPE "FlavorCategory" USING "category"::text::"FlavorCategory";

-- Drop old enum
DROP TYPE "FlavorCategory_old";
