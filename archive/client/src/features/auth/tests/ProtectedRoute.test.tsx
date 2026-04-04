import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../ProtectedRoute";

const mockUseAuth = vi.fn();
vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route index element={<div>Protected content</div>} />
        </Route>
        <Route path="/sign-in" element={<div>Sign in page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });
    renderWithRouter("/");
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects to sign-in when not authenticated", () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: true });
    renderWithRouter("/");
    expect(screen.getByText("Sign in page")).toBeInTheDocument();
  });

  it("shows loading state while Clerk loads", () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: false });
    renderWithRouter("/");
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
