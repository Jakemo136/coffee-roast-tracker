import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { HttpLink } from "@apollo/client/link/http";
import { SharedRoastPage } from "../SharedRoastPage";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("test-token") }),
}));

vi.mock("../../components/RoastChart", () => ({
  RoastChart: () => <div data-testid="roast-chart">Chart</div>,
}));

function createTestClient() {
  return new ApolloClient({
    link: new HttpLink({ uri: "/graphql" }),
    cache: new InMemoryCache(),
  });
}

function renderSharedRoast(token: string) {
  const client = createTestClient();
  return render(
    <ApolloProvider client={client}>
      <MemoryRouter initialEntries={[`/share/${token}`]}>
        <Routes>
          <Route path="share/:token" element={<SharedRoastPage />} />
        </Routes>
      </MemoryRouter>
    </ApolloProvider>,
  );
}

describe("SharedRoastPage", () => {
  it("renders bean name and metrics when data is available", async () => {
    renderSharedRoast("valid-share-token");

    expect(await screen.findByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
    expect(screen.getByText("Dev Time")).toBeInTheDocument();
  });

  it("renders flavors as pills", async () => {
    renderSharedRoast("valid-share-token");

    expect(await screen.findByText("Dark Chocolate")).toBeInTheDocument();
  });

  it("shows the roast chart", async () => {
    renderSharedRoast("valid-share-token");

    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByTestId("roast-chart")).toBeInTheDocument();
  });

  it("shows not available message for invalid token", async () => {
    renderSharedRoast("invalid-token");

    expect(await screen.findByText("This roast is not available")).toBeInTheDocument();
  });

  it("renders the CTA with sign-up link", async () => {
    renderSharedRoast("valid-share-token");

    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText(/Track your own roasts/)).toBeInTheDocument();
  });

  it("shows download button when roast profile exists", async () => {
    renderSharedRoast("valid-share-token");

    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("Download .kpro")).toBeInTheDocument();
  });
});
