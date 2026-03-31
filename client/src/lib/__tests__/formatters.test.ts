import { describe, it, expect } from "vitest";
import { formatDuration, formatTemp, formatDate } from "../formatters";

describe("formatDuration", () => {
  it("formats seconds to mm:ss", () => {
    expect(formatDuration(102)).toBe("1:42");
  });

  it("pads seconds to two digits", () => {
    expect(formatDuration(65)).toBe("1:05");
  });

  it("returns null display for undefined", () => {
    expect(formatDuration(undefined)).toBe("—");
  });
});

describe("formatTemp", () => {
  it("formats Celsius with degree symbol", () => {
    expect(formatTemp(207, "CELSIUS")).toBe("207°C");
  });

  it("converts and formats Fahrenheit", () => {
    expect(formatTemp(100, "FAHRENHEIT")).toBe("212°F");
  });

  it("returns dash for undefined", () => {
    expect(formatTemp(undefined, "CELSIUS")).toBe("—");
  });
});

describe("formatDate", () => {
  it("formats ISO date to short display", () => {
    const result = formatDate("2026-03-28T00:00:00.000Z");
    expect(result).toBe("Mar 28");
  });

  it("returns dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });
});
