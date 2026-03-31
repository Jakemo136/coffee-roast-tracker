import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { HttpLink } from "@apollo/client/link/http";
import { BeanDetailPage } from "../BeanDetailPage";
import { server } from "../../../test/mocks/server";
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

function renderBeanDetail(beanId = "bean-1") {
  const client = createTestClient();
  return render(
    <ApolloProvider client={client}>
      <MemoryRouter initialEntries={[`/beans/${beanId}`]}>
        <Routes>
          <Route path="beans/:id" element={<BeanDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ApolloProvider>,
  );
}

describe("BeanDetailPage", () => {
  it("renders bean name and metadata cards", async () => {
    renderBeanDetail("bean-1");
    expect(await screen.findByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
    expect(screen.getByText("Ethiopia")).toBeInTheDocument();
    expect(screen.getByText("Washed")).toBeInTheDocument();
    expect(screen.getByText("1800m")).toBeInTheDocument();
  });

  it("displays origin, process, elevation, and avg rating cards", async () => {
    renderBeanDetail("bean-1");
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("Origin")).toBeInTheDocument();
    expect(screen.getByText("Process")).toBeInTheDocument();
    expect(screen.getByText("Elevation")).toBeInTheDocument();
    expect(screen.getByText("Avg Rating")).toBeInTheDocument();
  });

  it("shows common flavors section", async () => {
    renderBeanDetail("bean-1");
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("Common Flavors Across Roasts")).toBeInTheDocument();
  });

  it("shows supplier notes section", async () => {
    renderBeanDetail("bean-1");
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("Supplier Notes (from Sweet Maria's)")).toBeInTheDocument();
    // No bagNotes in mock data
    expect(screen.getByText("No supplier notes")).toBeInTheDocument();
  });

  it("shows supplier notes text when bagNotes exist", async () => {
    server.use(
      graphql.query("MyBeans", () => {
        return HttpResponse.json({
          data: {
            myBeans: [
              {
                id: "ub-1",
                shortName: "Yirg",
                notes: "Light roast preferred",
                bean: {
                  id: "bean-1",
                  name: "Ethiopia Yirgacheffe",
                  origin: "Ethiopia",
                  process: "Washed",
                  elevation: "1800m",
                  sourceUrl: null,
                  bagNotes: "Bright acidity, floral notes, clean cup",
                },
              },
            ],
          },
        });
      }),
    );

    renderBeanDetail("bean-1");
    expect(await screen.findByText("Bright acidity, floral notes, clean cup")).toBeInTheDocument();
  });

  it("shows roast table with dates", async () => {
    renderBeanDetail("bean-1");
    await screen.findByText("Ethiopia Yirgacheffe");
    // The mock roast for bean-1 has date 2026-03-15
    expect(await screen.findByText("Mar 15")).toBeInTheDocument();
  });

  it("shows empty state for no roasts", async () => {
    server.use(
      graphql.query("RoastsByBean", () => {
        return HttpResponse.json({
          data: { roastsByBean: [] },
        });
      }),
    );

    renderBeanDetail("bean-1");
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("No roasts yet")).toBeInTheDocument();
  });

  it("shows Compare all button when multiple roasts exist", async () => {
    server.use(
      graphql.query("RoastsByBean", () => {
        return HttpResponse.json({
          data: {
            roastsByBean: [
              {
                id: "roast-1",
                roastDate: "2026-03-15T00:00:00.000Z",
                notes: "First roast",
                developmentTime: 75,
                developmentPercent: 18.5,
                totalDuration: 405,
                firstCrackTemp: 196,
                roastEndTemp: 210,
                rating: 4,
                flavors: [],
                offFlavors: [],
              },
              {
                id: "roast-2",
                roastDate: "2026-03-20T00:00:00.000Z",
                notes: "Second roast",
                developmentTime: 70,
                developmentPercent: 17.0,
                totalDuration: 410,
                firstCrackTemp: 195,
                roastEndTemp: 208,
                rating: 3,
                flavors: [],
                offFlavors: [],
              },
            ],
          },
        });
      }),
    );

    renderBeanDetail("bean-1");
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(await screen.findByText("Compare all")).toBeInTheDocument();
  });

  it("shows Your Notes section with edit button", async () => {
    renderBeanDetail("bean-1");
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("Your Notes")).toBeInTheDocument();
    expect(screen.getByText("Light roast preferred")).toBeInTheDocument();
    // There are multiple Edit buttons (header + notes)
    const editButtons = screen.getAllByText("Edit");
    expect(editButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("shows back link to beans page", async () => {
    renderBeanDetail("bean-1");
    await screen.findByText("Ethiopia Yirgacheffe");
    const backLink = screen.getByText(/My Beans/);
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest("a")).toHaveAttribute("href", "/beans");
  });
});
