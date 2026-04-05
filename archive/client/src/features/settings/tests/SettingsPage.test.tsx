import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { HttpLink } from "@apollo/client/link/http";
import { SettingsPage } from "../SettingsPage";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("test-token") }),
}));

function createTestClient() {
  return new ApolloClient({
    link: new HttpLink({ uri: "/graphql" }),
    cache: new InMemoryCache(),
  });
}

function renderSettings() {
  const client = createTestClient();
  return render(
    <ApolloProvider client={client}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </ApolloProvider>,
  );
}

describe("SettingsPage", () => {
  it("renders the Settings heading", () => {
    renderSettings();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders both temperature unit buttons", async () => {
    renderSettings();
    expect(await screen.findByText("°C")).toBeInTheDocument();
    expect(screen.getByText("°F")).toBeInTheDocument();
  });

  it("defaults to Celsius as the active unit", async () => {
    renderSettings();
    const celsiusBtn = await screen.findByText("°C");
    expect(celsiusBtn).toHaveAttribute("aria-pressed", "true");
    const fahrenheitBtn = screen.getByText("°F");
    expect(fahrenheitBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("switches active state when Fahrenheit is clicked", async () => {
    const user = userEvent.setup();
    renderSettings();

    const fahrenheitBtn = await screen.findByText("°F");
    await user.click(fahrenheitBtn);

    expect(fahrenheitBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("°C")).toHaveAttribute("aria-pressed", "false");
  });
});
