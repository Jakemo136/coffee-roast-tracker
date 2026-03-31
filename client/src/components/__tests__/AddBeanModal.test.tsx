import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { HttpLink } from "@apollo/client/link/http";
import { AddBeanModal } from "../AddBeanModal";

function createTestClient() {
  return new ApolloClient({
    link: new HttpLink({ uri: "/graphql" }),
    cache: new InMemoryCache(),
  });
}

function renderModal(props: Partial<{ onClose: () => void; onSaved: (id: string) => void }> = {}) {
  const client = createTestClient();
  const onClose = props.onClose ?? vi.fn();
  const onSaved = props.onSaved ?? vi.fn();
  return {
    ...render(
      <ApolloProvider client={client}>
        <AddBeanModal onClose={onClose} onSaved={onSaved} />
      </ApolloProvider>,
    ),
    onClose,
    onSaved,
  };
}

describe("AddBeanModal", () => {
  it("renders URL input and Fetch button", () => {
    renderModal();
    expect(screen.getByPlaceholderText("https://www.sweetmarias.com/...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fetch" })).toBeInTheDocument();
  });

  it("shows 'or enter details manually' divider", () => {
    renderModal();
    expect(screen.getByText("or enter details manually")).toBeInTheDocument();
  });

  it("renders all form fields (Bean Name, Short Name, Origin, Process, Elevation)", () => {
    renderModal();
    expect(screen.getByText("Bean Name")).toBeInTheDocument();
    expect(screen.getByText("Short Name")).toBeInTheDocument();
    expect(screen.getByText("Origin")).toBeInTheDocument();
    expect(screen.getByText("Process")).toBeInTheDocument();
    expect(screen.getByText("Elevation")).toBeInTheDocument();
  });

  it("Save Bean button is disabled when name and shortName are empty", () => {
    renderModal();
    const saveBtn = screen.getByRole("button", { name: "Save Bean" });
    expect(saveBtn).toBeDisabled();
  });

  it("Save Bean button is enabled when name and shortName are filled", async () => {
    const user = userEvent.setup();
    renderModal();

    const nameInput = screen.getByPlaceholderText("e.g. Colombia China Alta Jose Buitrago");
    const shortNameInput = screen.getByPlaceholderText("e.g. CCAJ");

    await user.type(nameInput, "Test Bean");
    await user.type(shortNameInput, "TB");

    const saveBtn = screen.getByRole("button", { name: "Save Bean" });
    expect(saveBtn).toBeEnabled();
  });

  it("renders Supplier Notes textarea", () => {
    renderModal();
    expect(
      screen.getByPlaceholderText("Paste or type tasting notes from the bag or listing"),
    ).toBeInTheDocument();
  });

  it("renders '+ Add flavors' button", () => {
    renderModal();
    expect(screen.getByRole("button", { name: "+ Add flavors" })).toBeInTheDocument();
  });
});
