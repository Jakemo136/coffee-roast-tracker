import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricsTable } from "../MetricsTable";

describe("MetricsTable", () => {
  const defaultProps = {
    totalDuration: 624,
    colourChangeTime: 318,
    colourChangeTemp: 169,
    firstCrackTime: 522,
    firstCrackTemp: 198,
    roastEndTime: 624,
    roastEndTemp: 207,
    developmentTime: 102,
    developmentPercent: 16.3,
    tempUnit: "CELSIUS" as const,
  };

  it("renders all 7 metric rows", () => {
    render(<MetricsTable {...defaultProps} />);
    expect(screen.getByText("Total Duration")).toBeInTheDocument();
    expect(screen.getByText("Dry End")).toBeInTheDocument();
    expect(screen.getByText("FC Time")).toBeInTheDocument();
    expect(screen.getByText("FC Temp")).toBeInTheDocument();
    expect(screen.getByText("Dev Time")).toBeInTheDocument();
    expect(screen.getByText("Dev ΔT")).toBeInTheDocument();
    expect(screen.getByText("End Temp")).toBeInTheDocument();
  });

  it("formats duration values correctly", () => {
    render(<MetricsTable {...defaultProps} />);
    expect(screen.getByText("10:24")).toBeInTheDocument(); // total duration
    expect(screen.getByText("1:42")).toBeInTheDocument();  // dev time
  });

  it("formats temperature values correctly", () => {
    render(<MetricsTable {...defaultProps} />);
    expect(screen.getByText("207°C")).toBeInTheDocument(); // end temp
    expect(screen.getByText("198°C")).toBeInTheDocument(); // FC temp
  });

  it("shows DTR% as secondary value on Dev Time row", () => {
    render(<MetricsTable {...defaultProps} />);
    expect(screen.getByText("16.3%")).toBeInTheDocument();
  });

  it("computes and displays Dev ΔT", () => {
    render(<MetricsTable {...defaultProps} />);
    // 207 - 198 = 9°C
    expect(screen.getByText("9°C")).toBeInTheDocument();
  });

  it("applies accent styling to dev rows", () => {
    const { container } = render(<MetricsTable {...defaultProps} />);
    const devRows = container.querySelectorAll("[class*='devRow']");
    expect(devRows.length).toBe(2);
  });

  it("handles null values with dashes", () => {
    render(<MetricsTable {...{...defaultProps, totalDuration: null, firstCrackTemp: null}} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });
});
