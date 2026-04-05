import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { RoastsTable } from "../RoastsTable";
import type { RoastRow } from "../RoastsTable";

function makeRoasts(count: number): RoastRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `roast-${i + 1}`,
    beanName: `Bean ${String.fromCharCode(65 + (i % 26))}`,
    roastDate: `2025-01-${String(i + 1).padStart(2, "0")}`,
    rating: ((i % 5) + 1),
    duration: 600 + i * 30,
    firstCrackTemp: 195 + i,
    devPercent: 18 + i * 0.5,
  }));
}

const sampleRoasts: RoastRow[] = [
  {
    id: "r1",
    beanName: "Ethiopia Yirgacheffe",
    roastDate: "2025-03-01",
    rating: 4,
    duration: 660,
    firstCrackTemp: 198,
    devPercent: 20.5,
  },
  {
    id: "r2",
    beanName: "Colombia Supremo",
    roastDate: "2025-03-05",
    rating: 3,
    duration: 720,
    firstCrackTemp: 200,
    devPercent: 18.2,
  },
  {
    id: "r3",
    beanName: "Ethiopia Sidamo",
    roastDate: "2025-03-10",
    rating: 5,
    duration: 600,
    firstCrackTemp: 196,
    devPercent: 22.0,
  },
];

const sampleBeans = [
  { id: "b1", name: "Ethiopia Yirgacheffe" },
  { id: "b2", name: "Colombia Supremo" },
  { id: "b3", name: "Ethiopia Sidamo" },
];

describe("RoastsTable", () => {
  it("renders table with roast data", () => {
    render(<RoastsTable roasts={sampleRoasts} />);

    const table = screen.getByTestId("roasts-table");
    expect(table).toBeInTheDocument();

    expect(screen.getByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
    expect(screen.getByText("Colombia Supremo")).toBeInTheDocument();
    expect(screen.getByText("Ethiopia Sidamo")).toBeInTheDocument();

    // Check column headers
    expect(screen.getByText("Bean Name")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Rating")).toBeInTheDocument();
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("FC Temp")).toBeInTheDocument();
    expect(screen.getByText("DTR%")).toBeInTheDocument();
  });

  it("search filters rows by bean name", async () => {
    const user = userEvent.setup();
    render(<RoastsTable roasts={sampleRoasts} searchable />);

    const searchInput = screen.getByTestId("search-input");
    await user.type(searchInput, "Ethiopia");

    expect(screen.getByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
    expect(screen.getByText("Ethiopia Sidamo")).toBeInTheDocument();
    expect(screen.queryByText("Colombia Supremo")).not.toBeInTheDocument();
  });

  it("bean filter dropdown filters rows", async () => {
    const user = userEvent.setup();
    render(
      <RoastsTable roasts={sampleRoasts} filterable beans={sampleBeans} />,
    );

    const beanFilter = screen.getByTestId("bean-filter");
    expect(beanFilter).toHaveAttribute("aria-label", "Filter by bean");

    await user.selectOptions(beanFilter, "Colombia Supremo");

    // The table body should only contain the filtered row
    const tbody = screen.getByTestId("roasts-table").querySelector("tbody")!;
    expect(tbody.querySelectorAll("tr")).toHaveLength(1);
    expect(within(tbody).getByText("Colombia Supremo")).toBeInTheDocument();
    expect(within(tbody).queryByText("Ethiopia Yirgacheffe")).not.toBeInTheDocument();
    expect(within(tbody).queryByText("Ethiopia Sidamo")).not.toBeInTheDocument();
  });

  it("sort by column header", async () => {
    const user = userEvent.setup();
    render(<RoastsTable roasts={sampleRoasts} sortable />);

    // Click "Bean Name" header to sort ascending
    await user.click(screen.getByText("Bean Name"));

    const rows = screen.getAllByRole("row");
    // rows[0] is header; data rows start at index 1
    const firstDataRow = rows[1]!;
    expect(within(firstDataRow).getByText("Colombia Supremo")).toBeInTheDocument();

    // Click again for descending
    await user.click(screen.getByText(/Bean Name/));

    const rowsDesc = screen.getAllByRole("row");
    const firstDataRowDesc = rowsDesc[1]!;
    expect(within(firstDataRowDesc).getByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
  });

  it("pagination shows correct number of rows", () => {
    const manyRoasts = makeRoasts(25);
    render(<RoastsTable roasts={manyRoasts} pageSize={10} />);

    // Should show 10 data rows on the first page
    const tbody = screen.getByTestId("roasts-table").querySelector("tbody");
    expect(tbody!.querySelectorAll("tr")).toHaveLength(10);

    // Pagination component should be present
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  it("checkbox selection enables compare button", async () => {
    const user = userEvent.setup();
    const handleCompare = vi.fn();
    render(
      <RoastsTable
        roasts={sampleRoasts}
        selectable
        onCompare={handleCompare}
      />,
    );

    const compareBtn = screen.getByRole("button", { name: /compare/i });
    expect(compareBtn).toBeDisabled();

    // Select two roasts
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]!);
    await user.click(checkboxes[1]!);

    expect(compareBtn).toBeEnabled();

    await user.click(compareBtn);
    expect(handleCompare).toHaveBeenCalledWith(
      expect.arrayContaining(["r1", "r2"]),
    );
  });

  it("max selection limit disables additional checkboxes", async () => {
    const user = userEvent.setup();
    render(
      <RoastsTable
        roasts={sampleRoasts}
        selectable
        maxSelections={2}
        onCompare={() => {}}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");

    // Select the first two
    await user.click(checkboxes[0]!);
    await user.click(checkboxes[1]!);

    // Third checkbox should be disabled
    expect(checkboxes[2]).toBeDisabled();

    // Limit message should appear
    expect(screen.getByText(/maximum of 2 selections reached/i)).toBeInTheDocument();
  });

  it("compare button disabled when <2 selected", async () => {
    const user = userEvent.setup();
    render(
      <RoastsTable
        roasts={sampleRoasts}
        selectable
        onCompare={() => {}}
      />,
    );

    const compareBtn = screen.getByRole("button", { name: /compare/i });
    expect(compareBtn).toBeDisabled();
    expect(compareBtn).toHaveAttribute("title", "Select at least 2 roasts to compare");

    // Select one
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]!);

    expect(compareBtn).toBeDisabled();
  });

  it("inline rating fires onRatingChange", async () => {
    const user = userEvent.setup();
    const handleRatingChange = vi.fn();
    render(
      <RoastsTable roasts={sampleRoasts} onRatingChange={handleRatingChange} />,
    );

    // StarRating renders radio buttons for interactive mode
    // Find the first "Rate 3 stars" button (there will be one per row)
    const rateButtons = screen.getAllByLabelText("Rate 3 stars");
    await user.click(rateButtons[0]!);

    expect(handleRatingChange).toHaveBeenCalledWith("r1", 3);
  });

  it("row click fires onRowClick", async () => {
    const user = userEvent.setup();
    const handleRowClick = vi.fn();
    render(<RoastsTable roasts={sampleRoasts} onRowClick={handleRowClick} />);

    // Click on a bean name cell (part of the row)
    await user.click(screen.getByText("Colombia Supremo"));

    expect(handleRowClick).toHaveBeenCalledWith("r2");
  });
});
