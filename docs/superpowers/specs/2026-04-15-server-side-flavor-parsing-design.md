# Server-Side Flavor Parsing — Design Spec

## Problem

Supplier/cupping notes are free-text prose. The client-side parser uses hand-rolled substring and prefix matching that misses common morphological variants ("fruity" → "fruit", "berries" → "berry"). The scraping service has its own `KNOWN_FLAVORS` list that drifts from the DB. The seed descriptor list (~55 entries) is sparse compared to the SCA flavor wheel (~110 descriptors).

## Solution

1. **Server-side `parseSupplierNotes` query** — takes prose text, returns matched flavor descriptor names using Porter stemming against the DB descriptor list. Single source of truth.
2. **Expand seed descriptors to ~110** — approximate the SCA/WCR flavor wheel coverage. Merge in terms from scrapingService's `KNOWN_FLAVORS` that are missing.
3. **Client uses Apollo cache for descriptors, server for parsing** — `FLAVOR_DESCRIPTORS_QUERY` stays `cache-first` for display/autocomplete. New `parseSupplierNotes` query handles the fuzzy matching server-side.
4. **Remove client-side `flavorParser.ts`** — no longer needed; parsing is server-side.
5. **Remove scrapingService's `KNOWN_FLAVORS`** — its `extractFlavorsFromProse` delegates to the same `FlavorService.parseSupplierNotes` method.

## Architecture

```
Client (debounced input, 400ms)
  → parseSupplierNotes(text) query
  → Server: FlavorService.parseSupplierNotes()
    → Load descriptors from DB (cacheable in-process)
    → Stem each text word (Porter stemmer via `stemmer` package)
    → Match stemmed words against stemmed descriptor names
    → Return matched descriptor names
```

The `stemmer` package (12.9 KB, ESM, Porter algorithm) runs server-side only. Zero client bundle impact.

## Matching Strategy (server-side)

In priority order, a descriptor matches if:
1. **Full name substring** — "dark chocolate" appears literally in the normalized text
2. **Any constituent word match** — "chocolate" in text matches "Dark Chocolate"
3. **Porter stem match** — stem("fruity") = stem("fruit"), so "fruity" matches descriptors containing "fruit"
4. **De-pluralized substring** — "berries" → "berry", found inside "blueberry"

Each descriptor matches at most once. Off-flavor descriptors are included in results (client can filter by `isOffFlavor` if needed).

## Expanded Seed Descriptors (~110)

Add to existing categories:
- **FLORAL**: Violet, Hibiscus, Elderflower, Bergamot
- **FRUITS**: Peach, Plum, Apricot, Pear, Cherry, Mango, Papaya, Pineapple, Melon, Dried Fruit, Fig, Date, Raisin, Prune, Coconut
- **CITRUS**: Tangerine, Yuzu, Kumquat
- **BERRY**: Blackcurrant, Boysenberry
- **COCOA**: Cocoa, Chocolate, Cacao
- **SUGARS**: Panela, Muscovado, Demerara, Sugar Cane
- **SPICE**: Cardamom, Anise, Ginger, Allspice, Star Anise
- **NUTS**: Cashew, Pecan, Macadamia, Pistachio, Nougat
- **BODY**: Buttery, Velvety, Juicy, Tea-like, Winey
- **RUSTIC**: Cedar, Earthy, Woody, Herbal, Savory
- **NEW — GRAIN**: Toast, Malt, Cereal, Graham Cracker
- **NEW — FERMENTED**: Wine, Whiskey, Rum, Fermented, Vinegar

That brings the total from ~55 to ~110. The `FlavorCategory` enum in Prisma needs `GRAIN` and `FERMENTED` added.

## GraphQL Schema Changes

```graphql
type Query {
  # Existing
  flavorDescriptors(isOffFlavor: Boolean): [FlavorDescriptor!]!
  # New — public, no auth required
  parseSupplierNotes(text: String!): [FlavorDescriptor!]!
}
```

Returns full `FlavorDescriptor` objects (not just names) so the client gets color and category for pill rendering.

## Client Changes

- **AddBeanModal**: Replace `parseCuppingNotes()` with debounced `useLazyQuery(PARSE_SUPPLIER_NOTES)`. Show matched pills live as user types.
- **BeanDetailPage**: Same — replace `handleParseCuppingNotes()` with the server query.
- **Remove `client/src/lib/flavorParser.ts`** and its test file.
- **Debounce**: 400ms after last keystroke, fire query. Show a subtle "Matching flavors..." indicator during loading.

## ScrapingService Changes

Replace `KNOWN_FLAVORS` list and `extractFlavorsFromProse()` with a call to `FlavorService.parseSupplierNotes()`. The scraping service already has access to the Prisma client via context.
