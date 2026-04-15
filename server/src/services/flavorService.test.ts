import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "../../test/prisma-client.js";
import { FlavorService } from "./flavorService.js";

let service: FlavorService;

beforeAll(() => {
  service = new FlavorService(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("FlavorService.parseSupplierNotes", () => {
  it("matches exact single words: 'honey and caramel'", async () => {
    const results = await service.parseSupplierNotes("honey and caramel");
    const names = results.map((d) => d.name);
    expect(names).toContain("Honey");
    expect(names).toContain("Caramelized");
  });

  it("matches multi-word substring: 'dark chocolate'", async () => {
    const results = await service.parseSupplierNotes(
      "Rich dark chocolate finish",
    );
    const names = results.map((d) => d.name);
    expect(names).toContain("Dark chocolate");
  });

  it("matches constituent words: 'chocolate' matches Chocolate and Dark chocolate", async () => {
    const results = await service.parseSupplierNotes("chocolate notes");
    const names = results.map((d) => d.name);
    expect(names).toContain("Chocolate");
    expect(names).toContain("Dark chocolate");
  });

  it("matches via Porter stemming: 'fermenting' matches 'Fermented' descriptor", async () => {
    // stemmer("fermenting") = "ferment", stemmer("fermented") = "ferment" — stems match
    // but "fermenting" is not a constituent word of "Fermented"
    const results = await service.parseSupplierNotes("fermenting character");
    const names = results.map((d) => d.name);
    expect(names).toContain("Fermented");
  });

  it("matches via Porter stemming: 'floral' matches Floral descriptor", async () => {
    // stemmer("floral") and stemmer("floral") are identical, so this matches
    // via constituent word. Note: stemmer("fruity") !== stemmer("fruit")
    // ("fruiti" vs "fruit"), so "fruity" does NOT match "fruit" descriptors —
    // a known Porter stemmer limitation for adjective→noun pairs.
    const results = await service.parseSupplierNotes("fruity and floral");
    const names = results.map((d) => d.name);
    expect(names).toContain("Floral");
  });

  it("matches via de-pluralized substring: 'berries' matches berry descriptors", async () => {
    const results = await service.parseSupplierNotes(
      "bright berries and citrus",
    );
    const names = results.map((d) => d.name);
    // "berries" → de-plural → "berry", found inside "Blueberry", "Raspberry", "Strawberry", "Blackberry"
    expect(names).toContain("Blueberry");
    expect(names).toContain("Raspberry");
    expect(names).toContain("Strawberry");
    expect(names).toContain("Blackberry");
    // "Berry" is also a descriptor — "berry" substring of "berry" (exact)
    expect(names).toContain("Berry");
    // "citrus" matches "Citrus fruit" via constituent word
    expect(names).toContain("Citrus fruit");
  });

  it("returns full FlavorDescriptor objects with color and category", async () => {
    const results = await service.parseSupplierNotes("honey");
    const honey = results.find((d) => d.name === "Honey");
    expect(honey).toBeDefined();
    expect(honey!.id).toBeDefined();
    expect(honey!.color).toBeDefined();
    expect(honey!.category).toBeDefined();
    expect(honey!.isOffFlavor).toBe(false);
  });

  it("matches SM Suke Quto bag notes correctly", async () => {
    const sukeQutoNotes =
      "Honey and orange marmalade sweetness with peach, mango, papaya, and pineapple. Cocoa finish.";
    const results = await service.parseSupplierNotes(sukeQutoNotes);
    const names = results.map((d) => d.name);
    expect(names).toContain("Honey");
    expect(names).toContain("Orange");
    expect(names).toContain("Peach");
    expect(names).toContain("Pineapple");
    expect(names).toContain("Cocoa");
    // Mango and Papaya are NOT in the SCA 2016 flavor wheel, so no match expected
  });

  it("returns empty array for empty input", async () => {
    const results = await service.parseSupplierNotes("");
    expect(results).toEqual([]);
  });

  it("returns empty array for whitespace-only input", async () => {
    const results = await service.parseSupplierNotes("   ");
    expect(results).toEqual([]);
  });

  it("returns empty array when no descriptors match", async () => {
    const results = await service.parseSupplierNotes(
      "xyzzy foobarbaz quxquux",
    );
    expect(results).toEqual([]);
  });

  it("returns each descriptor at most once", async () => {
    const results = await service.parseSupplierNotes(
      "chocolate chocolate dark chocolate cocoa chocolate",
    );
    const names = results.map((d) => d.name);
    const chocolateCount = names.filter((n) => n === "Chocolate").length;
    const darkChocolateCount = names.filter(
      (n) => n === "Dark chocolate",
    ).length;
    expect(chocolateCount).toBe(1);
    expect(darkChocolateCount).toBe(1);
  });

  it("does not match off-flavor descriptors", async () => {
    const results = await service.parseSupplierNotes(
      "rubber and petroleum with medicinal notes",
    );
    const names = results.map((d) => d.name);
    // These are off-flavors and should be excluded
    expect(names).not.toContain("Rubber");
    expect(names).not.toContain("Petroleum");
    expect(names).not.toContain("Medicinal");
  });

  it("is case-insensitive", async () => {
    const results = await service.parseSupplierNotes("HONEY AND CHOCOLATE");
    const names = results.map((d) => d.name);
    expect(names).toContain("Honey");
    expect(names).toContain("Chocolate");
  });
});
