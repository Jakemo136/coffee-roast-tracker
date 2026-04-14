import { describe, it, expect } from "vitest";
import { parseFlavorNotes } from "../flavorParser";

const DESCRIPTORS = [
  { name: "Honey" },
  { name: "Orange" },
  { name: "Syrupy" },
  { name: "Dark Chocolate" },
  { name: "Milk Chocolate" },
  { name: "Cocoa Nib" },
  { name: "Tropical Fruit" },
  { name: "Stone Fruit" },
  { name: "Caramel" },
  { name: "Toffee" },
  { name: "Blueberry" },
  { name: "Raspberry" },
  { name: "Cinnamon" },
  { name: "Brown Sugar" },
  { name: "Jasmine" },
  { name: "Rose" },
  { name: "Creamy" },
  { name: "Maple Syrup" },
];

describe("parseFlavorNotes", () => {
  it("matches exact single-word descriptors", () => {
    const result = parseFlavorNotes("honey and caramel", DESCRIPTORS);
    expect(result).toContain("Honey");
    expect(result).toContain("Caramel");
  });

  it("matches multi-word descriptors by substring", () => {
    const result = parseFlavorNotes("notes of dark chocolate and toffee", DESCRIPTORS);
    expect(result).toContain("Dark Chocolate");
    expect(result).toContain("Toffee");
  });

  it("matches when any word of a multi-word descriptor appears", () => {
    const result = parseFlavorNotes("rich chocolate finish with tropical accents", DESCRIPTORS);
    expect(result).toContain("Dark Chocolate");
    expect(result).toContain("Milk Chocolate");
    expect(result).toContain("Tropical Fruit");
  });

  it("stem matches: 'fruity' matches 'Tropical Fruit'", () => {
    const result = parseFlavorNotes("intensely fruity and aromatic", DESCRIPTORS);
    expect(result).toContain("Tropical Fruit");
    expect(result).toContain("Stone Fruit");
  });

  it("stem matches: 'berries' matches 'Blueberry'/'Raspberry'", () => {
    const result = parseFlavorNotes("hints of red berries", DESCRIPTORS);
    expect(result).toContain("Blueberry");
    expect(result).toContain("Raspberry");
  });

  it("is case-insensitive", () => {
    const result = parseFlavorNotes("HONEY and ORANGE peel", DESCRIPTORS);
    expect(result).toContain("Honey");
    expect(result).toContain("Orange");
  });

  it("handles the Sweet Maria's Suke Quto description", () => {
    const text = `Suke Quto is a powerhouse dry-process coffee, intensely fruited and aromatic,
      with low-end heft. City roasts produced potent sweetness, dominated by forward fruit notes
      of cooked peach and tropical accents. The wet aroma had a strong syrupy sweetness of dark
      sugar and honey, with a winey accent. Tropical notes, such as dried mango, papaya, and
      pineapple, shifting to hints of red berries. Aromatically, light City roasts had Chai spice,
      fresh rue herb, and fragrant Bergamot citrus. Acidity is underscored by fruity tones, like
      red berry and orange. There's also cocoa/chocolate at Full City.`;

    const result = parseFlavorNotes(text, DESCRIPTORS);
    expect(result).toContain("Honey");
    expect(result).toContain("Orange");
    expect(result).toContain("Syrupy");
    expect(result).toContain("Tropical Fruit");
    expect(result).toContain("Dark Chocolate");
    expect(result).toContain("Cocoa Nib");
  });

  it("returns empty array for empty input", () => {
    expect(parseFlavorNotes("", DESCRIPTORS)).toEqual([]);
    expect(parseFlavorNotes("   ", DESCRIPTORS)).toEqual([]);
  });

  it("returns empty array for no matches", () => {
    const result = parseFlavorNotes("xyzzy foobar quux blargh", DESCRIPTORS);
    expect(result).toEqual([]);
  });

  it("each descriptor matches at most once", () => {
    const result = parseFlavorNotes("chocolate chocolate chocolate", DESCRIPTORS);
    const chocolateMatches = result.filter((r) => r.includes("Chocolate"));
    // Dark Chocolate and Milk Chocolate each once
    expect(chocolateMatches.length).toBe(2);
  });
});
