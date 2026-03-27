import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@clerk/clerk-react", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("test-token") }),
}));

beforeEach(() => {
  vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "pk_test_fake");
});

import { AppProviders } from "../AppProviders";

describe("AppProviders", () => {
  it("renders children within the provider tree", () => {
    render(
      <AppProviders>
        <div data-testid="child">Hello</div>
      </AppProviders>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
