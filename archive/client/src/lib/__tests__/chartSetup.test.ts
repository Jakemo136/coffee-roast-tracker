import { describe, it, expect } from "vitest";
import { ChartJS } from "../chartSetup";

describe("Chart.js setup", () => {
  it("registers line chart components", () => {
    const registry = ChartJS.registry;
    expect(registry.getScale("linear")).toBeDefined();
    expect(registry.getScale("category")).toBeDefined();
    expect(registry.getElement("point")).toBeDefined();
    expect(registry.getElement("line")).toBeDefined();
  });

  it("registers annotation plugin", () => {
    const plugin = ChartJS.registry.getPlugin("annotation");
    expect(plugin).toBeDefined();
  });

  it("registers zoom plugin", () => {
    const plugin = ChartJS.registry.getPlugin("zoom");
    expect(plugin).toBeDefined();
  });
});
