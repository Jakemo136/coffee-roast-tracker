import { describe, it, expect, beforeAll } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { parseKlog } from "./klogParser.js";
import type { ParsedKlog } from "./klogParser.js";

const FIXTURE_PATH = path.resolve(
  import.meta.dirname,
  "../../../mocks/sample-roasts/EGB 0320a.klog",
);

describe("parseKlog", () => {
  let fileContent: string;
  let result: ParsedKlog;

  beforeAll(() => {
    fileContent = fs.readFileSync(FIXTURE_PATH, "utf-8");
    result = parseKlog(fileContent);
  });

  describe("happy path — exact event values", () => {
    it("parses firstCrackTime", () => {
      expect(result.firstCrackTime).toBe(348.729);
    });

    it("parses developmentPercent", () => {
      expect(result.developmentPercent).toBe(13.7606);
    });

    it("parses colourChangeTime", () => {
      expect(result.colourChangeTime).toBe(171.042);
    });

    it("parses roastEndTime", () => {
      expect(result.roastEndTime).toBe(404.373);
    });
  });

  describe("totalDuration", () => {
    it("equals roastEndTime, not the last data row time", () => {
      expect(result.totalDuration).toBe(404.373);
      expect(result.totalDuration).toBe(result.roastEndTime);
    });
  });

  describe("time-series truncation", () => {
    it("contains no data points after roastEndTime", () => {
      expect(result.timeSeriesData).not.toBeNull();
      const maxTime = Math.max(...result.timeSeriesData!.map((p) => p.time));
      expect(maxTime).toBeLessThanOrEqual(result.roastEndTime!);
    });

    it("has data points near the roast end", () => {
      const lastPoint =
        result.timeSeriesData![result.timeSeriesData!.length - 1]!;
      // Last point should be within a few seconds of roast end
      expect(result.roastEndTime! - lastPoint.time).toBeLessThan(5);
    });
  });

  describe("derived temperatures", () => {
    it("derives colourChangeTemp as a reasonable value", () => {
      expect(result.colourChangeTemp).not.toBeNull();
      // Colour change typically happens around 160-180°C
      expect(result.colourChangeTemp!).toBeGreaterThan(155);
      expect(result.colourChangeTemp!).toBeLessThan(185);
    });

    it("derives firstCrackTemp as a reasonable value", () => {
      expect(result.firstCrackTemp).not.toBeNull();
      // First crack typically around 196-210°C
      expect(result.firstCrackTemp!).toBeGreaterThan(195);
      expect(result.firstCrackTemp!).toBeLessThan(215);
    });

    it("derives roastEndTemp as a reasonable value", () => {
      expect(result.roastEndTemp).not.toBeNull();
      // Roast end temp should be higher than first crack
      expect(result.roastEndTemp!).toBeGreaterThan(200);
      expect(result.roastEndTemp!).toBeLessThan(220);
    });
  });

  describe("curve decoding", () => {
    it("parses roastProfileCurve as non-null array of CurvePoints", () => {
      expect(result.roastProfileCurve).not.toBeNull();
      expect(Array.isArray(result.roastProfileCurve)).toBe(true);
      expect(result.roastProfileCurve!.length).toBeGreaterThan(0);

      for (const point of result.roastProfileCurve!) {
        expect(typeof point.time).toBe("number");
        expect(typeof point.temp).toBe("number");
      }
    });

    it("parses fanProfileCurve as non-null array of FanCurvePoints", () => {
      expect(result.fanProfileCurve).not.toBeNull();
      expect(Array.isArray(result.fanProfileCurve)).toBe(true);
      expect(result.fanProfileCurve!.length).toBeGreaterThan(0);

      for (const point of result.fanProfileCurve!) {
        expect(typeof point.time).toBe("number");
        expect(typeof point.rpm).toBe("number");
      }
    });

    it("filters out sentinel 0,0 pairs from roastProfileCurve", () => {
      for (const point of result.roastProfileCurve!) {
        // At least one of time or temp should be non-zero for non-sentinel points
        // First point has time=0 but non-zero temp, so check that pure 0,0 sentinels are gone
        if (point.time === 0) {
          expect(point.temp).not.toBe(0);
        }
      }
    });
  });

  describe("scalar header fields", () => {
    it("parses roastDate", () => {
      expect(result.roastDate).not.toBeNull();
      expect(result.roastDate).toBeInstanceOf(Date);
    });

    it("parses ambientTemp", () => {
      expect(result.ambientTemp).toBe(20.25);
    });

    it("parses tastingNotes", () => {
      expect(result.tastingNotes).toBe("103.2g out");
    });

    it("parses profileFileName", () => {
      expect(result.profileFileName).toBe("EGB.kpro");
    });

    it("parses roastingLevel", () => {
      expect(result.roastingLevel).toBeCloseTo(4.3, 1);
    });

    it("computes developmentTime", () => {
      expect(result.developmentTime).toBeCloseTo(
        404.373 - 348.729,
        2,
      );
    });
  });

  describe("partial failure", () => {
    it("returns null timeSeriesData with warning when data section is malformed", () => {
      const malformed = [
        "tasting_notes:test",
        "profile_file_name:test.kpro",
        "roast_date:20/03/2026 22:15:45 UTC",
        "",
        "offsets\t0\t0\t0",
        "time\t#spot_temp\t#=temp\t=mean_temp",
        "not_a_number\tbad\tdata\there",
        "also_bad\tnope\tnah\tnein",
      ].join("\n");

      const partial = parseKlog(malformed);

      expect(partial.timeSeriesData).toBeNull();
      expect(partial.parseWarnings.length).toBeGreaterThan(0);
      // Scalar fields should still be parsed
      expect(partial.tastingNotes).toBe("test");
      expect(partial.profileFileName).toBe("test.kpro");
      expect(partial.roastDate).not.toBeNull();
    });
  });

  describe("throws on unrecognizable input", () => {
    it("throws for garbage input", () => {
      expect(() => parseKlog("this is just garbage data\nwith no structure")).toThrow(
        /[Uu]nrecognizable/,
      );
    });

    it("throws for empty string", () => {
      expect(() => parseKlog("")).toThrow(/[Uu]nrecognizable/);
    });
  });

  describe("ambient_temperature with (Mem) prefix", () => {
    it("strips (Mem) prefix and parses correctly", () => {
      const ymhPath = path.resolve(
        import.meta.dirname,
        "../../../mocks/sample-roasts/YMH 0320.klog",
      );
      const ymhContent = fs.readFileSync(ymhPath, "utf-8");
      const ymhResult = parseKlog(ymhContent);

      expect(ymhResult.ambientTemp).toBe(28.9375);
    });
  });
});
