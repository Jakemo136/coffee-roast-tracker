# Supplier Combobox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text supplier input in AddBeanModal with a searchable Combobox pre-populated with community suppliers via a `distinctSuppliers` query, cached with `cache-first`.

**Architecture:** New `distinctSuppliers` public query returns unique non-null supplier strings from all beans. Client queries it with `cache-first` in parent components (AppLayout, BeanLibraryPage) and passes the list to AddBeanModal, which renders the existing Combobox with `allowCustom`. Zero new models, one new resolver, one new operation.

**Tech Stack:** Prisma, Apollo Server 4, Apollo Client 4 (cache-first), gql.tada, existing Combobox component

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `server/src/schema/typeDefs.ts` | Add `distinctSuppliers: [String!]!` to Query |
| Modify | `server/src/resolvers/bean.ts` | Add `distinctSuppliers` resolver |
| Modify | `server/src/resolvers/bean.test.ts` | Test for new query |
| Modify | `client/src/graphql/operations.ts` | Add `DISTINCT_SUPPLIERS_QUERY` |
| Modify | `client/src/components/AddBeanModal.tsx` | Replace supplier `<input>` with `<Combobox allowCustom>` |
| Modify | `client/src/components/AppLayout.tsx` | Query distinctSuppliers, pass to UploadModal |
| Modify | `client/src/components/UploadModal.tsx` | Accept + forward `suppliers` prop to AddBeanModal |
| Modify | `client/src/features/beans/BeanLibraryPage.tsx` | Query distinctSuppliers, pass to AddBeanModal |
| Modify | `client/test/mocks/schema-handler.ts` | Add `distinctSuppliers` resolver to MSW |
| Modify | `client/src/components/__tests__/AddBeanModal.test.tsx` | Update supplier field tests for Combobox |

---

### Task 1: Server — schema + resolver + test

**Files:**
- Modify: `server/src/schema/typeDefs.ts`
- Modify: `server/src/resolvers/bean.ts`
- Modify: `server/src/resolvers/bean.test.ts`

- [ ] **Step 1: Add `distinctSuppliers` to the schema**

In `server/src/schema/typeDefs.ts`, add to the Query type:

```graphql
distinctSuppliers: [String!]!
```

- [ ] **Step 2: Add the resolver**

In `server/src/resolvers/bean.ts`, add to the Query object:

```typescript
distinctSuppliers: async (_: unknown, __: unknown, ctx: Context) => {
  const beans = await ctx.prisma.bean.findMany({
    where: { supplier: { not: null } },
    distinct: ["supplier"],
    select: { supplier: true },
    orderBy: { supplier: "asc" },
  });
  return beans.map((b) => b.supplier!);
},
```

No auth required — public query, consistent with `publicBeans`.

- [ ] **Step 3: Write the server test**

In `server/src/resolvers/bean.test.ts`, add a test:

```typescript
it("distinctSuppliers returns unique non-null supplier values", async () => {
  const result = await server.executeOperation(
    {
      query: `query { distinctSuppliers }`,
    },
    { contextValue: { prisma } },
  );

  expect(result.body.kind).toBe("single");
  const data = (result.body as any).singleResult.data;
  expect(Array.isArray(data.distinctSuppliers)).toBe(true);
  // Should contain no duplicates
  const set = new Set(data.distinctSuppliers);
  expect(set.size).toBe(data.distinctSuppliers.length);
  // Should not contain null
  expect(data.distinctSuppliers).not.toContain(null);
});
```

- [ ] **Step 4: Run server tests**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/server && npm test`
Expected: All tests pass (129 existing + 1 new)

- [ ] **Step 5: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add server/src/schema/typeDefs.ts server/src/resolvers/bean.ts server/src/resolvers/bean.test.ts
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "feat(server): add distinctSuppliers public query"
```

---

### Task 2: Client — operation + MSW handler + Combobox swap + parent wiring

**Files:**
- Modify: `client/src/graphql/operations.ts`
- Modify: `client/test/mocks/schema-handler.ts`
- Modify: `client/src/components/AddBeanModal.tsx`
- Modify: `client/src/components/UploadModal.tsx`
- Modify: `client/src/components/AppLayout.tsx`
- Modify: `client/src/features/beans/BeanLibraryPage.tsx`

- [ ] **Step 1: Add the GraphQL operation**

In `client/src/graphql/operations.ts`, add:

```typescript
export const DISTINCT_SUPPLIERS_QUERY = graphql(`
  query DistinctSuppliers {
    distinctSuppliers
  }
`);
```

- [ ] **Step 2: Add MSW mock resolver**

In `client/test/mocks/schema-handler.ts`, add to the Query resolvers:

```typescript
distinctSuppliers: () => ["Happy Mug", "Sweet Maria's"],
```

- [ ] **Step 3: Update AddBeanModal**

In `client/src/components/AddBeanModal.tsx`:

1. Add `suppliers?: string[]` to the props interface
2. Import `Combobox` from `./Combobox`
3. Replace the supplier `<input>` with:

```tsx
<Combobox
  options={(suppliers ?? []).map((s) => ({ value: s, label: s }))}
  value={supplier}
  onChange={setSupplier}
  placeholder="e.g. Sweet Maria's"
  allowCustom
/>
```

- [ ] **Step 4: Wire through UploadModal**

In `client/src/components/UploadModal.tsx`:

1. Add `suppliers?: string[]` to props
2. Pass `suppliers={suppliers}` to `<AddBeanModal>` where it's rendered

- [ ] **Step 5: Wire in AppLayout**

In `client/src/components/AppLayout.tsx`:

1. Import `DISTINCT_SUPPLIERS_QUERY` from operations
2. Add query: `const { data: suppliersData } = useQuery(DISTINCT_SUPPLIERS_QUERY, { fetchPolicy: "cache-first" });`
3. Derive: `const suppliers = suppliersData?.distinctSuppliers ?? [];`
4. Pass `suppliers={suppliers}` to `<UploadModal>`

- [ ] **Step 6: Wire in BeanLibraryPage**

In `client/src/features/beans/BeanLibraryPage.tsx`:

1. Import `DISTINCT_SUPPLIERS_QUERY`
2. Add query with `cache-first`
3. Pass `suppliers` prop to `<AddBeanModal>`

- [ ] **Step 7: Run client tests**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm test`
Fix any test failures from the Combobox swap (existing AddBeanModal tests may need selector updates).

- [ ] **Step 8: Run schema validation**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm run validate:schema`
Expected: 32 operations pass (31 + new DistinctSuppliers)

- [ ] **Step 9: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add client/src/graphql/operations.ts client/test/mocks/schema-handler.ts client/src/components/AddBeanModal.tsx client/src/components/UploadModal.tsx client/src/components/AppLayout.tsx client/src/features/beans/BeanLibraryPage.tsx
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "feat(client): supplier combobox with distinctSuppliers query"
```

---

### Task 3: Update tests

**Files:**
- Modify: `client/src/components/__tests__/AddBeanModal.test.tsx`
- May need updates: `client/src/components/__tests__/add-bean-flow.integration.test.tsx`
- May need updates: `client/src/components/__tests__/upload-flow.integration.test.tsx`

- [ ] **Step 1: Update AddBeanModal unit tests**

The supplier field changed from `<input>` to `<Combobox>`. Tests that target the supplier input by placeholder `"e.g. Sweet Maria's"` will need to interact with it as a Combobox instead. Read the existing tests and the Combobox component to understand the interaction pattern (click to open, type to filter, click option or type custom value).

- [ ] **Step 2: Update integration tests if needed**

The `add-bean-flow.integration.test.tsx` and `upload-flow.integration.test.tsx` may reference the supplier field. Update selectors if broken.

- [ ] **Step 3: Run full client test suite**

Run: `cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm test`
Expected: All 294+ tests pass

- [ ] **Step 4: Commit**

```bash
git -C /Users/jakemosher/Workspace/coffee-roast-tracker add -A
git -C /Users/jakemosher/Workspace/coffee-roast-tracker commit -m "test: update supplier field tests for Combobox interaction"
```

---

### Task 4: Verification + docs

- [ ] **Step 1: Run full test suite (server + client)**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker && npm test
```

- [ ] **Step 2: Run schema validation**

```bash
cd /Users/jakemosher/Workspace/coffee-roast-tracker/client && npm run validate:schema
```

- [ ] **Step 3: Update BUILD_STATUS.md**

- [ ] **Step 4: Commit**
