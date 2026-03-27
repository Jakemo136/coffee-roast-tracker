import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UserButton } from "../UserButton";

const mockUseAuth = vi.fn();
vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => mockUseAuth(),
  UserButton: () => <div data-testid="clerk-user-button" />,
}));

describe("UserButton", () => {
  it("shows sign-in link when not authenticated", () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: true });
    render(
      <MemoryRouter>
        <UserButton />
      </MemoryRouter>
    );
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("shows Clerk UserButton when authenticated", () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });
    render(
      <MemoryRouter>
        <UserButton />
      </MemoryRouter>
    );
    expect(screen.getByTestId("clerk-user-button")).toBeInTheDocument();
  });

  it("renders nothing while loading", () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: false });
    const { container } = render(
      <MemoryRouter>
        <UserButton />
      </MemoryRouter>
    );
    expect(container.innerHTML).toBe("");
  });
});
