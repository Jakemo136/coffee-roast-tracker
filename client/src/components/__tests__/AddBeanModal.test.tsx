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

async function addFlavorPill(user: ReturnType<typeof userEvent.setup>, flavor: string) {
  const addFlavorsBtn = screen.queryByRole("button", { name: "+ Add flavors" });
  if (addFlavorsBtn) await user.click(addFlavorsBtn);
  const input = screen.getByPlaceholderText("e.g. Citrus, Chocolate, Berry");
  await user.type(input, flavor);
  await user.click(screen.getByRole("button", { name: "Add" }));
}

describe("AddBeanModal", () => {
  it("renders URL input and Fetch button", () => {
    renderModal();
    expect(screen.getByPlaceholderText("Paste a green coffee supplier URL")).toBeInTheDocument();
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

  it("renders new fields (Varietal/Cultivar, Score, Crop Year)", () => {
    renderModal();
    expect(screen.getByText("Varietal / Cultivar")).toBeInTheDocument();
    expect(screen.getByText("Score (SCA / Cupping)")).toBeInTheDocument();
    expect(screen.getByText("Crop Year")).toBeInTheDocument();
  });

  it("skips fetch and shows paste mode for Sweet Maria's URLs", async () => {
    const user = userEvent.setup();
    renderModal();

    const urlInput = screen.getByPlaceholderText("Paste a green coffee supplier URL");
    await user.type(urlInput, "https://www.sweetmarias.com/some-bean.html");
    await user.click(screen.getByRole("button", { name: "Fetch" }));

    expect(screen.getByText(/requires paste mode/)).toBeInTheDocument();
  });

  it("renders '+ Add flavors' button", () => {
    renderModal();
    expect(screen.getByRole("button", { name: "+ Add flavors" })).toBeInTheDocument();
  });

  it("shows flavor input when '+ Add flavors' is clicked", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "+ Add flavors" }));
    expect(screen.getByPlaceholderText("e.g. Citrus, Chocolate, Berry")).toBeInTheDocument();
  });

  it("adds a flavor pill when typing and clicking Add", async () => {
    const user = userEvent.setup();
    renderModal();

    await addFlavorPill(user, "Citrus");

    expect(screen.getByText("Citrus")).toBeInTheDocument();
  });

  it("removes a flavor pill when clicking the remove button", async () => {
    const user = userEvent.setup();
    renderModal();

    await addFlavorPill(user, "Citrus");

    expect(screen.getByText("Citrus")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Citrus" }));
    expect(screen.queryByText("Citrus")).not.toBeInTheDocument();
  });

  it("adds a flavor pill via Enter key", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "+ Add flavors" }));
    const input = screen.getByPlaceholderText("e.g. Citrus, Chocolate, Berry");
    await user.type(input, "Berry{Enter}");

    expect(screen.getByText("Berry")).toBeInTheDocument();
  });

  it("splits comma-separated flavors into individual pills", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "+ Add flavors" }));
    const input = screen.getByPlaceholderText("e.g. Citrus, Chocolate, Berry");
    await user.type(input, "Citrus, Chocolate, Berry");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Citrus")).toBeInTheDocument();
    expect(screen.getByText("Chocolate")).toBeInTheDocument();
    expect(screen.getByText("Berry")).toBeInTheDocument();
  });

  it("does not add duplicate flavors (case-insensitive)", async () => {
    const user = userEvent.setup();
    renderModal();

    await addFlavorPill(user, "Citrus");
    await addFlavorPill(user, "citrus");

    const pills = screen.getAllByText("Citrus");
    expect(pills).toHaveLength(1);
  });
});
