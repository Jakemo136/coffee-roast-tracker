import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { HttpLink } from "@apollo/client/link/http";
import { DashboardPage } from "../DashboardPage";
import { server } from "../../../../test/mocks/server";
import { graphql, HttpResponse } from "msw";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("test-token") }),
}));

function createTestClient() {
  return new ApolloClient({
    link: new HttpLink({ uri: "/graphql" }),
    cache: new InMemoryCache(),
  });
}

function renderDashboard() {
  const client = createTestClient();
  return render(
    <ApolloProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </ApolloProvider>,
  );
}

describe("DashboardPage", () => {
  it("renders loading state initially", () => {
    renderDashboard();
    expect(screen.getByText("Loading roasts...")).toBeInTheDocument();
  });

  it("renders roast rows with bean names", async () => {
    renderDashboard();
    // Bean names appear in both the row and the filter dropdown, so use getAllByText
    const ethiopiaElements = await screen.findAllByText("Ethiopia Yirgacheffe");
    expect(ethiopiaElements.length).toBeGreaterThanOrEqual(1);
    const colombiaElements = screen.getAllByText("Colombia Huila");
    expect(colombiaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("displays star ratings on roast rows", async () => {
    renderDashboard();
    await screen.findAllByText("Ethiopia Yirgacheffe");

    const ratingContainers = screen.getAllByLabelText(/Rating:/);
    expect(ratingContainers.length).toBeGreaterThanOrEqual(1);

    const rated = screen.getByLabelText("Rating: 4 out of 5");
    expect(rated).toBeInTheDocument();
  });

  it("displays flavor pills on roast rows", async () => {
    renderDashboard();
    await screen.findAllByText("Ethiopia Yirgacheffe");

    // Flavors appear in both desktop and mobile columns
    expect(screen.getAllByText("Dark Chocolate").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Blueberry").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Honey").length).toBeGreaterThanOrEqual(1);
  });

  it("shows overflow chip when more than 3 flavors", async () => {
    renderDashboard();
    await screen.findAllByText("Ethiopia Yirgacheffe");

    // Ethiopia has 4 flavors, so +1 overflow should appear (desktop + mobile)
    const overflowChips = screen.getAllByText("+1");
    expect(overflowChips.length).toBeGreaterThanOrEqual(1);
  });

  it("shows short name from user bean", async () => {
    renderDashboard();
    await screen.findAllByText("Ethiopia Yirgacheffe");

    expect(screen.getByText("Yirg")).toBeInTheDocument();
    // "Huila" appears both as short name and in dropdown
    expect(screen.getAllByText("Huila").length).toBeGreaterThanOrEqual(1);
  });

  it("shows roast and bean count in subtitle", async () => {
    renderDashboard();
    await screen.findAllByText("Ethiopia Yirgacheffe");

    expect(screen.getByText(/2 roasts across 2 beans/)).toBeInTheDocument();
  });

  it("renders empty state when no roasts exist", async () => {
    server.use(
      graphql.query("MyRoasts", () => {
        return HttpResponse.json({
          data: { myRoasts: [] },
        });
      }),
    );

    renderDashboard();
    expect(await screen.findByText("No roasts yet")).toBeInTheDocument();
    expect(
      screen.getByText("Upload your first roast"),
    ).toBeInTheDocument();
  });

  it("renders error state on query failure", async () => {
    server.use(
      graphql.query("MyRoasts", () => {
        return HttpResponse.json({
          errors: [{ message: "Something went wrong" }],
        });
      }),
    );

    renderDashboard();
    expect(
      await screen.findByText(/Error loading roasts/),
    ).toBeInTheDocument();
  });
});
