import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppLayout } from "../AppLayout";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ isSignedIn: false, isLoaded: true }),
  UserButton: () => <div data-testid="clerk-user-button" />,
}));

describe("AppLayout", () => {
  it("renders navigation links", () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Beans")).toBeInTheDocument();
    expect(screen.getByText("Compare")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders the Upload button in the header", () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );
    const uploadButton = screen.getByRole("button", { name: "Upload" });
    expect(uploadButton).toBeInTheDocument();
  });

  it("renders the logo linking to home", () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );
    const logo = screen.getByText("Coffee Roast Tracker");
    expect(logo).toBeInTheDocument();
    expect(logo.closest("a")).toHaveAttribute("href", "/");
  });
});
