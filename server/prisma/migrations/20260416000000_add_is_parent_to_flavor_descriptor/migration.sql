-- Migration: add_is_parent_to_flavor_descriptor
-- Adds an `isParent` flag to FlavorDescriptor so Tier 2 SCA nodes that
-- have Tier 3 children can be excluded from supplier-note parsing
-- (they stay in the DB for reference/manual assignment).

ALTER TABLE "FlavorDescriptor" ADD COLUMN "isParent" BOOLEAN NOT NULL DEFAULT false;
