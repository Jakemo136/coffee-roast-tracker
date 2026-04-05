import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Set E2E mode so AppProviders skips the real Clerk key check
vi.stubEnv("VITE_E2E_TEST", "true");

vi.mock("@clerk/clerk-react", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAuth: () => ({ isSignedIn: true, isLoaded: true, getToken: vi.fn() }),
  useUser: () => ({ user: null }),
}));

vi.mock("@apollo/client/react", () => ({
  ApolloProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../../lib/apollo", () => ({
  createApolloClient: vi.fn(() => ({})),
}));

import { AppProviders, useTempUnit, useTheme } from "../AppProviders";

describe("AppProviders", () => {
  it("renders children", () => {
    render(
      <AppProviders>
        <div data-testid="child">Hello</div>
      </AppProviders>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("provides theme context to children", () => {
    function ThemeConsumer() {
      const { theme } = useTheme();
      return <span data-testid="theme">{theme}</span>;
    }

    render(
      <AppProviders>
        <ThemeConsumer />
      </AppProviders>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("provides temp unit context to children", () => {
    function TempConsumer() {
      const { tempUnit } = useTempUnit();
      return <span data-testid="temp">{tempUnit}</span>;
    }

    render(
      <AppProviders>
        <TempConsumer />
      </AppProviders>,
    );
    expect(screen.getByTestId("temp")).toHaveTextContent("CELSIUS");
  });
});
