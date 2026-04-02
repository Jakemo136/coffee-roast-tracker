import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { HttpLink } from "@apollo/client/link/http";
import { RoastDetailPage } from "../RoastDetailPage";
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

function renderRoastDetail(id = "test-id") {
  const client = createTestClient();
  return render(
    <ApolloProvider client={client}>
      <MemoryRouter initialEntries={[`/roasts/${id}`]}>
        <Routes>
          <Route path="roasts/:id" element={<RoastDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ApolloProvider>,
  );
}

describe("RoastDetailPage", () => {
  it("renders loading state initially", () => {
    renderRoastDetail();
    expect(screen.getByText("Loading roast...")).toBeInTheDocument();
  });

  it("renders bean name", async () => {
    renderRoastDetail();
    expect(await screen.findByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
  });

  it("renders star rating", async () => {
    renderRoastDetail();
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByLabelText("Rating: 4 out of 5")).toBeInTheDocument();
  });

  it("displays flavor pills", async () => {
    renderRoastDetail();
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("Dark Chocolate")).toBeInTheDocument();
    expect(screen.getByText("Blueberry")).toBeInTheDocument();
  });

  it("shows 'None detected' when no off-flavors", async () => {
    renderRoastDetail();
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("None detected")).toBeInTheDocument();
  });

  it("renders notes text", async () => {
    renderRoastDetail();
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(
      screen.getByText("Great first crack, smooth development"),
    ).toBeInTheDocument();
  });

  it("renders metrics table with Dev Time label", async () => {
    renderRoastDetail();
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("Dev Time")).toBeInTheDocument();
  });

  it("renders 'Roast not found' for unknown id", async () => {
    renderRoastDetail("nonexistent-id");
    expect(await screen.findByText("Roast not found")).toBeInTheDocument();
  });

  it("renders error state on query failure", async () => {
    server.use(
      graphql.query("RoastById", () => {
        return HttpResponse.json({
          errors: [{ message: "Something went wrong" }],
        });
      }),
    );

    renderRoastDetail();
    expect(
      await screen.findByText(/Error loading roast/),
    ).toBeInTheDocument();
  });

  it("shows download button when roast profile exists", async () => {
    renderRoastDetail();
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("Download .kpro")).toBeInTheDocument();
  });

  it("shows view listing link when sourceUrl exists", async () => {
    renderRoastDetail();
    await screen.findByText("Ethiopia Yirgacheffe");
    const link = screen.getByText(/View listing/);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com/beans/ethiopia");
  });
});
