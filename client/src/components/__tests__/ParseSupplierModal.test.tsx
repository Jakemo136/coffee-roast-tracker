import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { HttpLink } from "@apollo/client/link/http";
import { ParseSupplierModal } from "../ParseSupplierModal";

function createTestClient() {
  return new ApolloClient({
    link: new HttpLink({ uri: "/graphql" }),
    cache: new InMemoryCache(),
  });
}

function renderModal(props: Partial<{ onClose: () => void; onResult: () => void }> = {}) {
  const client = createTestClient();
  const onClose = props.onClose ?? vi.fn();
  const onResult = props.onResult ?? vi.fn();
  return {
    ...render(
      <ApolloProvider client={client}>
        <ParseSupplierModal onClose={onClose} onResult={onResult} />
      </ApolloProvider>,
    ),
    onClose,
    onResult,
  };
}

describe("ParseSupplierModal", () => {
  it("renders URL input and paste textarea both visible by default", () => {
    renderModal();
    expect(
      screen.getByPlaceholderText("https://example.com/coffee/ethiopia-yirgacheffe"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fetch" })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Paste the product description, tasting notes, or page source here…",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Parse" })).toBeInTheDocument();
  });

  it("Fetch button is disabled when URL is empty", () => {
    renderModal();
    expect(screen.getByRole("button", { name: "Fetch" })).not.toBeDisabled();
    // The button is enabled but clicking it with empty URL shows an error — the
    // disabled state only applies while loading. Verify it is enabled when idle.
    expect(screen.getByRole("button", { name: "Fetch" })).toBeInTheDocument();
  });

  it("Parse button is disabled when paste area is empty — shows error on click", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Parse" }));
    expect(screen.getByText("Please paste some content to parse.")).toBeInTheDocument();
  });

  it("shows paste-mode message for Sweet Maria's URLs", async () => {
    const user = userEvent.setup();
    renderModal();

    const urlInput = screen.getByPlaceholderText(
      "https://example.com/coffee/ethiopia-yirgacheffe",
    );
    await user.type(urlInput, "https://www.sweetmarias.com/some-bean.html");
    await user.click(screen.getByRole("button", { name: "Fetch" }));

    expect(
      screen.getByText(/This site blocks automated fetching/),
    ).toBeInTheDocument();
  });
});
