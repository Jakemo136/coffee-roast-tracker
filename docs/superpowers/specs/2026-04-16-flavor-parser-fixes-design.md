# Flavor Parser Fixes — Design Spec

## Context

Two issues surfaced during live testing:

1. **Duplicate supplier notes fields**: AddBeanModal and BeanDetailPage have separate "Supplier Notes" (`bagNotes`) and "Paste supplier notes" textareas. The same text should both save as bagNotes and be the parse source.

2. **Over-eager parser**: SM Suke Quto text returned 32 matches where a thoughtful human would pick ~10. Root causes:
   - Strategy 4 (de-plural substring) matches 3-char substrings inside descriptor names: "like" → Hay-like, Herb-like; "bit" → Bitter; "tea" → Black Tea; "app" → Apple
   - Strategy 2 (any word match) lets generic words like "fruit", "sweet", "dark", "fresh" trigger matches on multi-word descriptors (Citrus fruit, Other fruit, Brown sugar, Dark green, Overall sweet)
   - Tier 2 parent categories (Berry, Dried fruit, Citrus fruit, Brown spice, Brown sugar, Burnt, Cocoa, Floral) match alongside their children, creating redundant pills

## Fix 1: Unify Supplier Notes field

Merge the two textareas into one. The single "Supplier Notes" textarea:
- Saves its content as `bagNotes` on the bean (existing behavior)
- Is the source for the "Parse Flavors" button (matched flavors saved as `suggestedFlavors`)

Remove the separate "Paste supplier notes" section. The same `supplierDescription`/`cuppingNotes` state becomes one variable.

## Fix 2: Parser matching rules

Replace current 4-strategy approach with:

### A. Phrase substring (unchanged)
Descriptor full name appears as substring in normalized text → match.
Example: "dark chocolate" in text matches "Dark chocolate".

### B. Word-level matching (rewritten)
For each constituent word of the descriptor, a text word must match via:
- Exact match: `textWord === descriptorWord`
- De-plural exact match: `dePlural(textWord) === descriptorWord` (e.g., "berries" → "berry" == "berry")
- Stem exact match: `stem(textWord) === stem(descriptorWord)` (e.g., stem("fruited") === stem("fruit"))

**For single-word descriptors**: the one word must match via B.
**For multi-word descriptors**: ALL constituent words must match via B (not just one), OR the full phrase must appear via A.

This eliminates the overreach where "fruit" alone matched "Other fruit", "Dried fruit", "Citrus fruit", etc. The text needs to actually contain "other fruit" as a phrase OR both "other" AND "fruit" in proximity.

### C. Remove Strategy 4 (de-plural substring)
This strategy caused the "like" → Hay-like, "bit" → Bitter, "tea" → Black Tea false positives. The new B rule handles the legitimate "berries" → "berry" case for the Berry descriptor.

### D. Filter Tier 2 parent descriptors
Add `isParent Boolean` field to `FlavorDescriptor`. During seed, set `isParent: true` for Tier 2 nodes that have Tier 3 children in the JSON. The `parseSupplierNotes` query excludes `isParent: true` descriptors from results. They remain in the DB for reference and can still be assigned manually via the Combobox.

Parents being filtered: Berry, Dried fruit, Other fruit, Citrus fruit, Sour, Alcohol/Fermented, Green/Vegetative (descriptor variant), Papery/Musty, Chemical, Burnt, Cereal, Brown spice, Nutty, Cocoa, Brown sugar, Floral. That's 16 parents removed from parser output.

Kept (Tier 2 leaves without children): Olive oil, Raw, Beany, Pipe tobacco, Tobacco, Pungent, Pepper, Vanilla, Vanillin, Overall sweet, Sweet Aromatics, Black Tea.

## Expected Results on SM Suke Quto text

After fixes, ~10-12 matches instead of 32:
- Peach, Pineapple, Orange (specific fruits in text)
- Honey (direct)
- Chocolate, Cocoa (direct)
- Winey (direct)
- Bitter (via stem "bittering" → "bitter")
- Fresh (direct word match, arguable but acceptable)

Lost that used to match: all Tier 2 parents, false positives from substring matching, Apple (had no justification), Berry/Blackberry/etc. (text says "berries" but no specific berry named).

## Files to Modify

| Action | File | What |
|--------|------|------|
| Modify | `server/prisma/schema.prisma` | Add `isParent Boolean @default(false)` to FlavorDescriptor |
| Create | `server/prisma/migrations/...` | Migration for new field |
| Modify | `server/prisma/seed.ts` | Set isParent from JSON structure |
| Modify | `server/src/schema/typeDefs.ts` | Expose `isParent` on FlavorDescriptor type |
| Modify | `server/src/services/flavorService.ts` | Rewrite parseSupplierNotes matching rules |
| Modify | `server/src/services/flavorService.test.ts` | Update test expectations |
| Modify | `client/src/components/AddBeanModal.tsx` | Merge the two textareas into one |
| Modify | `client/src/features/beans/BeanDetailPage.tsx` | Merge the two textareas into one |
| Modify | `client/src/components/__tests__/AddBeanModal.test.tsx` | Update test for unified field |
| Modify | `client/src/features/beans/__tests__/bean-detail-flow.integration.test.tsx` | Update if needed |

## Verification

1. `npm test` — all server and client tests pass
2. Paste SM Suke Quto text into unified supplier notes field, click Parse Flavors — confirm ~10-15 reasonable matches (no Apple, no Hay-like, no Bitter false positive from "bit", no Tier 2 parents)
3. Existing bagNotes data still saved correctly, existing suggestedFlavors workflow intact
