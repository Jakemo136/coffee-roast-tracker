import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { HttpLink } from "@apollo/client/link/http";
import { BeanLibraryPage } from "../BeanLibraryPage";
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

function renderBeanLibrary() {
  const client = createTestClient();
  return render(
    <ApolloProvider client={client}>
      <MemoryRouter>
        <BeanLibraryPage />
      </MemoryRouter>
    </ApolloProvider>,
  );
}

describe("BeanLibraryPage", () => {
  it("renders bean cards with names", async () => {
    renderBeanLibrary();
    expect(await screen.findByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
    expect(screen.getByText("Colombia Huila")).toBeInTheDocument();
  });

  it("displays short names", async () => {
    renderBeanLibrary();
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("Yirg")).toBeInTheDocument();
    expect(screen.getByText("Huila")).toBeInTheDocument();
  });

  it("shows flavor pills on cards", async () => {
    renderBeanLibrary();
    await screen.findByText("Ethiopia Yirgacheffe");
    // Ethiopia has flavors: Dark Chocolate, Blueberry, Honey, Floral (top 3 shown)
    expect(screen.getByText("Dark Chocolate")).toBeInTheDocument();
    expect(screen.getByText("Blueberry")).toBeInTheDocument();
    expect(screen.getByText("Honey")).toBeInTheDocument();
  });

  it("shows footer with roast count", async () => {
    renderBeanLibrary();
    await screen.findByText("Ethiopia Yirgacheffe");
    const roastCounts = screen.getAllByText("1 roast");
    expect(roastCounts.length).toBe(2);
  });

  it("shows empty state when no beans", async () => {
    server.use(
      graphql.query("MyBeans", () => {
        return HttpResponse.json({
          data: { myBeans: [] },
        });
      }),
    );

    renderBeanLibrary();
    expect(await screen.findByText("No beans yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first bean")).toBeInTheDocument();
  });

  it("shows process and elevation info", async () => {
    renderBeanLibrary();
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("Washed \u00B7 1800m")).toBeInTheDocument();
    expect(screen.getByText("Natural \u00B7 1600m")).toBeInTheDocument();
  });

  it("shows average rating for beans with rated roasts", async () => {
    renderBeanLibrary();
    await screen.findByText("Ethiopia Yirgacheffe");
    expect(screen.getByText("★ 4")).toBeInTheDocument();
  });
});
