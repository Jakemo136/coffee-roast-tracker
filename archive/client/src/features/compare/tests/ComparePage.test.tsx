import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { HttpLink } from "@apollo/client/link/http";
import { ComparePage } from "../ComparePage";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("test-token") }),
}));

vi.mock("react-chartjs-2", () => ({
  Line: () => <canvas data-testid="mock-chart" />,
}));

function createTestClient() {
  return new ApolloClient({
    link: new HttpLink({ uri: "/graphql" }),
    cache: new InMemoryCache(),
  });
}

function renderComparePage(ids?: string) {
  const client = createTestClient();
  const initialEntries = ids ? [`/compare?ids=${ids}`] : ["/compare"];
  return render(
    <ApolloProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <ComparePage />
      </MemoryRouter>
    </ApolloProvider>,
  );
}

describe("ComparePage", () => {
  it("renders empty state when no IDs in URL", () => {
    renderComparePage();
    expect(screen.getByText("Compare Roasts")).toBeInTheDocument();
    expect(
      screen.getByText("Select 2+ roasts from the Dashboard to compare"),
    ).toBeInTheDocument();
  });

  it("renders empty state with only one ID", () => {
    renderComparePage("roast-1");
    expect(
      screen.getByText("Select 2+ roasts from the Dashboard to compare"),
    ).toBeInTheDocument();
  });

  it("renders legend items for each roast", async () => {
    renderComparePage("roast-1,roast-2");
    const ethiopiaElements = await screen.findAllByText(
      (_, el) => el?.textContent?.includes("Ethiopia Yirgacheffe") ?? false,
    );
    expect(ethiopiaElements.length).toBeGreaterThanOrEqual(1);
    const colombiaElements = screen.getAllByText(
      (_, el) => el?.textContent?.includes("Colombia Huila") ?? false,
    );
    expect(colombiaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders metrics table with expected rows", async () => {
    renderComparePage("roast-1,roast-2");
    await screen.findByText("Bean");
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Dev Time")).toBeInTheDocument();
    expect(screen.getByText("DTR%")).toBeInTheDocument();
    expect(screen.getByText("FC Temp")).toBeInTheDocument();
    expect(screen.getByText("End Temp")).toBeInTheDocument();
    expect(screen.getByText("Rating")).toBeInTheDocument();
  });

  it("renders metric values from roast data", async () => {
    renderComparePage("roast-1,roast-2");
    // Wait for data to load - bean names appear in both legend and table
    await screen.findAllByText(
      (_, el) => el?.textContent?.includes("Ethiopia Yirgacheffe") ?? false,
    );
    // Duration values
    expect(screen.getByText("6:45")).toBeInTheDocument();
    expect(screen.getByText("6:40")).toBeInTheDocument();
    // FC Temp values
    expect(screen.getByText("196°C")).toBeInTheDocument();
    expect(screen.getByText("195°C")).toBeInTheDocument();
  });

  it("renders the chart canvas", async () => {
    renderComparePage("roast-1,roast-2");
    await screen.findByTestId("mock-chart");
    expect(screen.getByTestId("mock-chart")).toBeInTheDocument();
  });

  it("renders Dev ΔT values", async () => {
    renderComparePage("roast-1,roast-2");
    await screen.findAllByText(
      (_, el) => el?.textContent?.includes("Ethiopia Yirgacheffe") ?? false,
    );
    // roast-1: 210 - 196 = 14°C, roast-2: 205 - 195 = 10°C
    expect(screen.getByText("14°C")).toBeInTheDocument();
    expect(screen.getByText("10°C")).toBeInTheDocument();
  });
});
