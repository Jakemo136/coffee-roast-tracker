# Server-Side Flavor Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move flavor note parsing from the client to the server using Porter stemming, expand descriptors to ~110, and unify the two drifting flavor lists.

**Architecture:** New `parseSupplierNotes` GraphQL query backed by `FlavorService` using the `stemmer` npm package. Client sends debounced text, renders returned `FlavorDescriptor` pills. ScrapingService delegates to the same method.

**Tech Stack:** Node.js, `stemmer` (Porter stemmer), Apollo Server 4, Apollo Client 4 (`useLazyQuery`), Prisma, Vitest, Jest

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `server/package.json` | Add `stemmer` dependency |
| Modify | `server/prisma/schema.prisma` | Add `GRAIN`, `FERMENTED` to FlavorCategory enum |
| Create | `server/prisma/migrations/...` | Prisma migration for enum change |
| Modify | `server/prisma/seed.ts` | Expand FLAVOR_DESCRIPTORS to ~110 |
| Modify | `server/src/lib/flavorColors.ts` | Add colors for GRAIN, FERMENTED categories |
| Modify | `server/src/services/flavorService.ts` | Add `parseSupplierNotes()` method |
| Create | `server/src/services/flavorService.test.ts` | Tests for parseSupplierNotes |
| Modify | `server/src/schema/typeDefs.ts` | Add `parseSupplierNotes` query |
| Modify | `server/src/resolvers/flavor.ts` | Wire resolver |
| Modify | `server/src/resolvers/flavor.test.ts` | Integration test for query |
| Modify | `server/src/services/scrapingService.ts` | Remove KNOWN_FLAVORS, delegate to FlavorService |
| Modify | `server/src/services/scrapingService.test.ts` | Update tests |
| Modify | `client/src/graphql/operations.ts` | Add PARSE_SUPPLIER_NOTES query |
| Modify | `client/src/graphql/schema.graphql` | Add parseSupplierNotes to schema |
| Modify | `client/src/components/AddBeanModal.tsx` | Use server query with debounce |
| Modify | `client/src/features/beans/BeanDetailPage.tsx` | Use server query with debounce |
| Delete | `client/src/lib/flavorParser.ts` | No longer needed |
| Delete | `client/src/lib/__tests__/flavorParser.test.ts` | No longer needed |
| Modify | `client/src/components/__tests__/AddBeanModal.test.tsx` | Update mocks |
| Modify | `client/src/features/beans/__tests__/BeanDetailPage.test.tsx` | Update mocks |
| Modify | `client/src/components/__tests__/add-bean-flow.integration.test.tsx` | Update for async parsing |
| Modify | `client/src/features/beans/__tests__/bean-detail-flow.integration.test.tsx` | Update for async parsing |

---

### Task 1: Add `stemmer` dependency and expand Prisma schema

**Files:**
- Modify: `server/package.json`
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Install stemmer**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker/server && npm install stemmer
```

- [ ] **Step 2: Add GRAIN and FERMENTED to FlavorCategory enum**

In `server/prisma/schema.prisma`, find the `FlavorCategory` enum and add:

```prisma
enum FlavorCategory {
  FLORAL
  HONEY
  SUGARS
  CARAMEL
  FRUITS
  CITRUS
  BERRY
  COCOA
  NUTS
  RUSTIC
  SPICE
  BODY
  GRAIN
  FERMENTED
  OFF_FLAVOR
}
```

- [ ] **Step 3: Create and apply migration**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker/server && npx prisma migrate dev --name add_grain_fermented_categories
```

- [ ] **Step 4: Add colors for new categories**

In `server/src/lib/flavorColors.ts`, add entries for `GRAIN` and `FERMENTED`:

```typescript
GRAIN: "#c4a35a",      // wheat/toast gold
FERMENTED: "#8b3a62",  // wine purple
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add server/package.json server/package-lock.json server/prisma/schema.prisma server/prisma/migrations/ server/src/lib/flavorColors.ts
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "chore: add stemmer dep, GRAIN/FERMENTED categories"
```

---

### Task 2: Expand seed descriptors to ~110

**Files:**
- Modify: `server/prisma/seed.ts`

- [ ] **Step 1: Expand FLAVOR_DESCRIPTORS array**

Replace the `FLAVOR_DESCRIPTORS` array in `server/prisma/seed.ts` with the expanded list. Include all existing entries plus:

```typescript
const FLAVOR_DESCRIPTORS: { name: string; category: string; isOffFlavor?: boolean }[] = [
  // FLORAL
  { name: "Jasmine", category: "FLORAL" },
  { name: "Rose", category: "FLORAL" },
  { name: "Lavender", category: "FLORAL" },
  { name: "Chamomile", category: "FLORAL" },
  { name: "Violet", category: "FLORAL" },
  { name: "Hibiscus", category: "FLORAL" },
  { name: "Elderflower", category: "FLORAL" },
  { name: "Bergamot", category: "FLORAL" },
  // HONEY
  { name: "Honey", category: "HONEY" },
  { name: "Honeycomb", category: "HONEY" },
  { name: "Honeydew", category: "HONEY" },
  // SUGARS
  { name: "Brown Sugar", category: "SUGARS" },
  { name: "Molasses", category: "SUGARS" },
  { name: "Maple Syrup", category: "SUGARS" },
  { name: "Raw Sugar", category: "SUGARS" },
  { name: "Panela", category: "SUGARS" },
  { name: "Muscovado", category: "SUGARS" },
  { name: "Demerara", category: "SUGARS" },
  { name: "Sugar Cane", category: "SUGARS" },
  // CARAMEL
  { name: "Caramel", category: "CARAMEL" },
  { name: "Butterscotch", category: "CARAMEL" },
  { name: "Toffee", category: "CARAMEL" },
  { name: "Dulce de Leche", category: "CARAMEL" },
  // FRUITS
  { name: "Stone Fruit", category: "FRUITS" },
  { name: "Apple", category: "FRUITS" },
  { name: "Grape", category: "FRUITS" },
  { name: "Tropical Fruit", category: "FRUITS" },
  { name: "Peach", category: "FRUITS" },
  { name: "Plum", category: "FRUITS" },
  { name: "Apricot", category: "FRUITS" },
  { name: "Pear", category: "FRUITS" },
  { name: "Cherry", category: "FRUITS" },
  { name: "Mango", category: "FRUITS" },
  { name: "Papaya", category: "FRUITS" },
  { name: "Pineapple", category: "FRUITS" },
  { name: "Melon", category: "FRUITS" },
  { name: "Dried Fruit", category: "FRUITS" },
  { name: "Fig", category: "FRUITS" },
  { name: "Date", category: "FRUITS" },
  { name: "Raisin", category: "FRUITS" },
  { name: "Prune", category: "FRUITS" },
  { name: "Coconut", category: "FRUITS" },
  // CITRUS
  { name: "Lemon", category: "CITRUS" },
  { name: "Orange", category: "CITRUS" },
  { name: "Grapefruit", category: "CITRUS" },
  { name: "Lime", category: "CITRUS" },
  { name: "Tangerine", category: "CITRUS" },
  { name: "Yuzu", category: "CITRUS" },
  { name: "Kumquat", category: "CITRUS" },
  // BERRY
  { name: "Blueberry", category: "BERRY" },
  { name: "Raspberry", category: "BERRY" },
  { name: "Strawberry", category: "BERRY" },
  { name: "Blackberry", category: "BERRY" },
  { name: "Blackcurrant", category: "BERRY" },
  { name: "Boysenberry", category: "BERRY" },
  // COCOA
  { name: "Dark Chocolate", category: "COCOA" },
  { name: "Milk Chocolate", category: "COCOA" },
  { name: "Cocoa Nib", category: "COCOA" },
  { name: "Bittersweet", category: "COCOA" },
  { name: "Cocoa", category: "COCOA" },
  { name: "Chocolate", category: "COCOA" },
  { name: "Cacao", category: "COCOA" },
  // NUTS
  { name: "Walnut", category: "NUTS" },
  { name: "Almond", category: "NUTS" },
  { name: "Hazelnut", category: "NUTS" },
  { name: "Peanut", category: "NUTS" },
  { name: "Cashew", category: "NUTS" },
  { name: "Pecan", category: "NUTS" },
  { name: "Macadamia", category: "NUTS" },
  { name: "Pistachio", category: "NUTS" },
  { name: "Nougat", category: "NUTS" },
  // RUSTIC
  { name: "Tobacco", category: "RUSTIC" },
  { name: "Leather", category: "RUSTIC" },
  { name: "Smoky", category: "RUSTIC" },
  { name: "Cedar", category: "RUSTIC" },
  { name: "Earthy", category: "RUSTIC" },
  { name: "Woody", category: "RUSTIC" },
  { name: "Herbal", category: "RUSTIC" },
  { name: "Savory", category: "RUSTIC" },
  // SPICE
  { name: "Cinnamon", category: "SPICE" },
  { name: "Clove", category: "SPICE" },
  { name: "Nutmeg", category: "SPICE" },
  { name: "Black Pepper", category: "SPICE" },
  { name: "Cardamom", category: "SPICE" },
  { name: "Anise", category: "SPICE" },
  { name: "Ginger", category: "SPICE" },
  { name: "Allspice", category: "SPICE" },
  { name: "Star Anise", category: "SPICE" },
  // BODY
  { name: "Creamy", category: "BODY" },
  { name: "Silky", category: "BODY" },
  { name: "Syrupy", category: "BODY" },
  { name: "Buttery", category: "BODY" },
  { name: "Velvety", category: "BODY" },
  { name: "Juicy", category: "BODY" },
  { name: "Tea-like", category: "BODY" },
  { name: "Winey", category: "BODY" },
  // GRAIN
  { name: "Toast", category: "GRAIN" },
  { name: "Malt", category: "GRAIN" },
  { name: "Cereal", category: "GRAIN" },
  { name: "Graham Cracker", category: "GRAIN" },
  // FERMENTED
  { name: "Wine", category: "FERMENTED" },
  { name: "Whiskey", category: "FERMENTED" },
  { name: "Rum", category: "FERMENTED" },
  { name: "Fermented", category: "FERMENTED" },
  { name: "Vinegar", category: "FERMENTED" },
  // OFF_FLAVOR
  { name: "Thin", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Sour", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Astringent", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Crabapple", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Pithy", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Flat", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Roasty/Burnt", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Baked", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Cranberry", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Grassy", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Rubbery", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Musty", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Papery", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Acrid", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Ashy", category: "OFF_FLAVOR", isOffFlavor: true },
];
```

- [ ] **Step 2: Reseed local database**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker/server && npx prisma db seed
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add server/prisma/seed.ts
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "feat: expand flavor descriptors to ~110 (SCA flavor wheel coverage)"
```

---

### Task 3: Server-side `parseSupplierNotes` — service + tests

**Files:**
- Modify: `server/src/services/flavorService.ts`
- Create: `server/src/services/flavorService.test.ts`

- [ ] **Step 1: Write the test file**

Create `server/src/services/flavorService.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { FlavorService } from "./flavorService.js";
import { prisma } from "../../test/prisma-client.js";

let service: FlavorService;

beforeAll(() => {
  service = new FlavorService(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("FlavorService.parseSupplierNotes", () => {
  it("matches exact single-word descriptors", async () => {
    const result = await service.parseSupplierNotes("honey and caramel");
    const names = result.map((d) => d.name);
    expect(names).toContain("Honey");
    expect(names).toContain("Caramel");
  });

  it("matches multi-word descriptors by substring", async () => {
    const result = await service.parseSupplierNotes("notes of dark chocolate and toffee");
    const names = result.map((d) => d.name);
    expect(names).toContain("Dark Chocolate");
    expect(names).toContain("Toffee");
  });

  it("matches when any word of a multi-word descriptor appears", async () => {
    const result = await service.parseSupplierNotes("rich chocolate finish");
    const names = result.map((d) => d.name);
    expect(names).toContain("Chocolate");
    expect(names).toContain("Dark Chocolate");
    expect(names).toContain("Milk Chocolate");
  });

  it("stem matches: 'fruity' matches fruit-containing descriptors", async () => {
    const result = await service.parseSupplierNotes("intensely fruity and aromatic");
    const names = result.map((d) => d.name);
    expect(names).toContain("Tropical Fruit");
    expect(names).toContain("Stone Fruit");
    expect(names).toContain("Dried Fruit");
  });

  it("stem matches: 'berries' matches berry descriptors", async () => {
    const result = await service.parseSupplierNotes("hints of red berries");
    const names = result.map((d) => d.name);
    // "berry" (de-pluralized) is a substring of Blueberry, Raspberry, etc.
    expect(names.some((n) => n.toLowerCase().includes("berry"))).toBe(true);
  });

  it("returns full FlavorDescriptor objects with color and category", async () => {
    const result = await service.parseSupplierNotes("honey");
    expect(result.length).toBeGreaterThan(0);
    const honey = result.find((d) => d.name === "Honey");
    expect(honey).toBeDefined();
    expect(honey!.color).toBeDefined();
    expect(honey!.category).toBe("HONEY");
  });

  it("handles the Sweet Maria's Suke Quto description", async () => {
    const text = `Suke Quto is a powerhouse dry-process coffee, intensely fruited
      and aromatic. City roasts produced potent sweetness, dominated by forward
      fruit notes of cooked peach and tropical accents. The wet aroma had a
      strong syrupy sweetness of dark sugar and honey. Tropical notes such as
      dried mango, papaya, and pineapple. Acidity underscored by fruity tones,
      like red berry and orange. cocoa/chocolate at Full City.`;

    const result = await service.parseSupplierNotes(text);
    const names = result.map((d) => d.name);
    expect(names).toContain("Honey");
    expect(names).toContain("Orange");
    expect(names).toContain("Peach");
    expect(names).toContain("Mango");
    expect(names).toContain("Papaya");
    expect(names).toContain("Pineapple");
    expect(names).toContain("Cocoa");
  });

  it("returns empty array for empty input", async () => {
    expect(await service.parseSupplierNotes("")).toEqual([]);
    expect(await service.parseSupplierNotes("   ")).toEqual([]);
  });

  it("returns empty array for no matches", async () => {
    const result = await service.parseSupplierNotes("xyzzy foobar quux blargh");
    expect(result).toEqual([]);
  });

  it("each descriptor matches at most once", async () => {
    const result = await service.parseSupplierNotes("chocolate chocolate chocolate");
    const chocolateMatches = result.filter((d) => d.name.toLowerCase().includes("chocolate"));
    // Each chocolate descriptor appears once
    const unique = new Set(chocolateMatches.map((d) => d.name));
    expect(chocolateMatches.length).toBe(unique.size);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker/server && npm test -- --testPathPattern=flavorService
```

Expected: FAIL — `parseSupplierNotes` is not a function

- [ ] **Step 3: Implement `parseSupplierNotes` in FlavorService**

Add to `server/src/services/flavorService.ts`:

```typescript
import { stemmer } from "stemmer";
```

Add method to the `FlavorService` class:

```typescript
  async parseSupplierNotes(text: string) {
    if (!text.trim()) return [];

    const descriptors = await this.prisma.flavorDescriptor.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const normalized = text
      .toLowerCase()
      .replace(/[/\\()[\]{}"'`]/g, " ")
      .replace(/[,;.:!?]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const textWords = normalized.split(" ").filter(Boolean);
    const textStems = new Set(textWords.map((w) => stemmer(w)));

    const matched: typeof descriptors = [];

    for (const descriptor of descriptors) {
      const dLower = descriptor.name.toLowerCase();
      const dWords = dLower.split(" ");

      // 1. Full name substring
      if (normalized.includes(dLower)) {
        matched.push(descriptor);
        continue;
      }

      // 2. Any constituent word appears in text
      if (dWords.some((dw) => textWords.includes(dw))) {
        matched.push(descriptor);
        continue;
      }

      // 3. Porter stem match
      if (dWords.some((dw) => textStems.has(stemmer(dw)))) {
        matched.push(descriptor);
        continue;
      }

      // 4. De-pluralized substring: "berries" → "berry" inside "blueberry"
      const anySubstring = textWords.some((tw) => {
        const base = tw.replace(/(?:ies|ied|ed|ing|s)$/, (m) =>
          m === "ies" || m === "ied" ? "y" : "",
        );
        return base.length >= 4 && dWords.some((dw) => dw.includes(base));
      });
      if (anySubstring) {
        matched.push(descriptor);
        continue;
      }
    }

    return matched;
  }
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker/server && npm test -- --testPathPattern=flavorService
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add server/src/services/flavorService.ts server/src/services/flavorService.test.ts
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "feat: add parseSupplierNotes to FlavorService with Porter stemming"
```

---

### Task 4: Wire GraphQL query + resolver

**Files:**
- Modify: `server/src/schema/typeDefs.ts`
- Modify: `server/src/resolvers/flavor.ts`
- Modify: `server/src/resolvers/flavor.test.ts`

- [ ] **Step 1: Add query to typeDefs**

In `server/src/schema/typeDefs.ts`, add to the Query type:

```graphql
parseSupplierNotes(text: String!): [FlavorDescriptor!]!
```

- [ ] **Step 2: Add resolver**

In `server/src/resolvers/flavor.ts`, add to `Query`:

```typescript
    parseSupplierNotes: async (
      _: unknown,
      { text }: { text: string },
      ctx: Context,
    ) => {
      // Public — no auth required
      return new FlavorService(ctx.prisma).parseSupplierNotes(text);
    },
```

- [ ] **Step 3: Add integration test**

In `server/src/resolvers/flavor.test.ts`, add:

```typescript
const PARSE_SUPPLIER_NOTES = `
  query ParseSupplierNotes($text: String!) {
    parseSupplierNotes(text: $text) {
      id
      name
      category
      color
    }
  }
`;
```

And the test:

```typescript
  it("parseSupplierNotes returns matched descriptors for prose text", async () => {
    const response = await server.executeOperation(
      {
        query: PARSE_SUPPLIER_NOTES,
        variables: { text: "honey and chocolate with berry notes" },
      },
      { contextValue: { prisma, userId: testUserId } },
    );

    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const results = body.singleResult.data!.parseSupplierNotes as any[];
    expect(results.length).toBeGreaterThan(0);
    const names = results.map((d: any) => d.name);
    expect(names).toContain("Honey");
  });

  it("parseSupplierNotes returns empty array for no matches", async () => {
    const response = await server.executeOperation(
      {
        query: PARSE_SUPPLIER_NOTES,
        variables: { text: "xyzzy gibberish" },
      },
      { contextValue: { prisma, userId: testUserId } },
    );

    const body = response.body as {
      kind: "single";
      singleResult: {
        data: Record<string, unknown> | null;
        errors?: { message: string }[];
      };
    };

    expect(body.singleResult.errors).toBeUndefined();
    const results = body.singleResult.data!.parseSupplierNotes as any[];
    expect(results).toEqual([]);
  });
```

- [ ] **Step 4: Run server tests**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker/server && npm test
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add server/src/schema/typeDefs.ts server/src/resolvers/flavor.ts server/src/resolvers/flavor.test.ts
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "feat: add parseSupplierNotes GraphQL query"
```

---

### Task 5: Client — wire `parseSupplierNotes` query with debounced input

**Files:**
- Modify: `client/src/graphql/operations.ts`
- Modify: `client/src/graphql/schema.graphql`
- Modify: `client/src/components/AddBeanModal.tsx`
- Modify: `client/src/features/beans/BeanDetailPage.tsx`
- Delete: `client/src/lib/flavorParser.ts`
- Delete: `client/src/lib/__tests__/flavorParser.test.ts`

- [ ] **Step 1: Add operation and update schema**

In `client/src/graphql/schema.graphql`, add to Query:

```graphql
parseSupplierNotes(text: String!): [FlavorDescriptor!]!
```

In `client/src/graphql/operations.ts`, add:

```typescript
export const PARSE_SUPPLIER_NOTES_QUERY = graphql(`
  query ParseSupplierNotes($text: String!) {
    parseSupplierNotes(text: $text) {
      id
      name
      category
      color
    }
  }
`);
```

- [ ] **Step 2: Run schema validation**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm run validate:schema
```

Expected: All operations pass (count increases by 1)

- [ ] **Step 3: Update AddBeanModal**

Replace the `parseCuppingNotes` function and related state with a debounced server query. Key changes:

- Remove: `import { parseFlavorNotes } from "../lib/flavorParser";`
- Add: `import { useLazyQuery } from "@apollo/client/react";` (if not already imported)
- Add: `import { PARSE_SUPPLIER_NOTES_QUERY } from "../graphql/operations";`
- Replace the `parseCuppingNotes()` call with a debounced `useLazyQuery`:

```typescript
const [parseNotes, { loading: parsing }] = useLazyQuery(PARSE_SUPPLIER_NOTES_QUERY);

const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function handleNotesChange(value: string) {
  setCuppingNotes(value);
  setParseAttempted(false);

  if (debounceRef.current) clearTimeout(debounceRef.current);
  if (!value.trim()) {
    setMatchedFlavors([]);
    return;
  }

  debounceRef.current = setTimeout(async () => {
    const { data } = await parseNotes({ variables: { text: value } });
    if (data?.parseSupplierNotes) {
      setMatchedFlavors(data.parseSupplierNotes.map((d) => d.name));
      setParseAttempted(true);
    }
  }, 400);
}
```

Update the textarea `onChange` to use `handleNotesChange(e.target.value)`.

Remove the "Parse Flavors" button — parsing happens automatically on debounce. Replace with a subtle loading indicator:

```tsx
{parsing && <span className={styles.parsingText}>Matching flavors...</span>}
```

- [ ] **Step 4: Update BeanDetailPage**

Same pattern as AddBeanModal. Replace `handleParseCuppingNotes()` with debounced `useLazyQuery`. Remove the "Parse" button, add loading indicator.

Remove: `import { parseFlavorNotes } from "../../lib/flavorParser";`
Remove: `import { FLAVOR_DESCRIPTORS_QUERY } from "../../graphql/operations";` (no longer needed here)
Remove: The `flavorData`/`flavorList` query and variables.

- [ ] **Step 5: Delete client-side parser**

```bash
rm /Users/jakemosher/Workspace/coffee-roast-tracker/client/src/lib/flavorParser.ts
rm /Users/jakemosher/Workspace/coffee-roast-tracker/client/src/lib/__tests__/flavorParser.test.ts
```

- [ ] **Step 6: Update unit tests**

In `client/src/components/__tests__/AddBeanModal.test.tsx`:
- The mock for `useLazyQuery` should return parsed results when called
- Tests that check for "Parse Flavors" button need updating — it no longer exists
- Tests that check matched pills need to await the debounced query response

In `client/src/features/beans/__tests__/BeanDetailPage.test.tsx`:
- Remove the `Toast` and `FLAVOR_DESCRIPTORS_QUERY` mocks if no longer needed
- Mock `useLazyQuery` for `parseSupplierNotes`

In integration tests (`add-bean-flow`, `bean-detail-flow`, `upload-flow`):
- The MSW schema handler will resolve `parseSupplierNotes` automatically against the schema
- Update tests that click "Parse Flavors" — now they type into the textarea and wait for debounced results

- [ ] **Step 7: Run full client test suite**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm test
```

Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add -A
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "feat: wire parseSupplierNotes query with debounced input in AddBeanModal and BeanDetailPage"
```

---

### Task 6: Unify scrapingService to use FlavorService

**Files:**
- Modify: `server/src/services/scrapingService.ts`
- Modify: `server/src/services/scrapingService.test.ts`

- [ ] **Step 1: Remove KNOWN_FLAVORS from scrapingService**

Delete the `KNOWN_FLAVORS` array and the `extractFlavorsFromProse()` private method. Replace usages of `extractFlavorsFromProse` with a call to `FlavorService.parseSupplierNotes()`.

The `ScrapingService` constructor will need to accept a `PrismaClient` to instantiate `FlavorService`:

```typescript
constructor(private prisma: PrismaClient) {}
```

Update the `scrapeBeanUrl` and `parseBeanPage` methods to use:

```typescript
const flavorService = new FlavorService(this.prisma);
const matched = await flavorService.parseSupplierNotes(bagNotes ?? html);
suggestedFlavors = matched.map((d) => d.name);
```

- [ ] **Step 2: Update resolver to pass prisma**

In `server/src/resolvers/flavor.ts`, update ScrapingService instantiation:

```typescript
return new ScrapingService(ctx.prisma).scrapeBeanUrl(url);
```

- [ ] **Step 3: Update tests**

In `server/src/services/scrapingService.test.ts`, update the ScrapingService constructor calls to pass `prisma`. Tests that check `result.bagNotes` or `suggestedFlavors` should still work since the output shape hasn't changed.

- [ ] **Step 4: Run server tests**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker/server && npm test
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add server/src/services/scrapingService.ts server/src/services/scrapingService.test.ts server/src/resolvers/flavor.ts
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "refactor: unify scrapingService flavor matching via FlavorService.parseSupplierNotes"
```

---

### Task 7: Verification + docs

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker && npm test
```

- [ ] **Step 2: Run schema validation**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm run validate:schema
```

- [ ] **Step 3: Update BUILD_STATUS.md**

Add a "Server-Side Flavor Parsing" section documenting what changed.

- [ ] **Step 4: Commit and push**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add docs/BUILD_STATUS.md
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "docs: update BUILD_STATUS with server-side flavor parsing"
git -C /Users/jakemosher/Workspace/coffee-roast-tracker push
```
