import { describe, it, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { validateKlogFile } from "./validateKlog.js";

const FIXTURE_PATH = path.resolve(
  import.meta.dirname,
  "../../../mocks/sample-roasts/EGB 0320a.klog",
);

describe("validateKlogFile", () => {
  it("accepts a valid .klog file", () => {
    const content = fs.readFileSync(FIXTURE_PATH, "utf-8");
    const result = validateKlogFile("EGB 0320a.klog", content);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects a file with wrong extension", () => {
    const content = fs.readFileSync(FIXTURE_PATH, "utf-8");
    const result = validateKlogFile("roast.txt", content);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/extension/i);
  });

  it("rejects a file missing the time-series header", () => {
    const noTimeSeries = [
      "tasting_notes:test notes",
      "profile_file_name:test.kpro",
      "",
      "some random data without tabs",
    ].join("\n");

    const result = validateKlogFile("test.klog", noTimeSeries);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/time-series/i);
  });

  it("rejects an empty file", () => {
    const result = validateKlogFile("empty.klog", "");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/header/i);
  });
});
