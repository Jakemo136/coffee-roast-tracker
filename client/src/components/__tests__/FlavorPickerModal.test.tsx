import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { HttpLink } from "@apollo/client/link/http";
import { FlavorPickerModal } from "../FlavorPickerModal";

function createTestClient() {
  return new ApolloClient({
    link: new HttpLink({ uri: "/graphql" }),
    cache: new InMemoryCache(),
  });
}

function renderModal(props: Partial<Parameters<typeof FlavorPickerModal>[0]> = {}) {
  const client = createTestClient();
  const defaultProps = {
    roastId: "roast-1",
    mode: "flavors" as const,
    initialSelected: [] as string[],
    onClose: vi.fn(),
    onSaved: vi.fn(),
    ...props,
  };
  return {
    ...render(
      <ApolloProvider client={client}>
        <FlavorPickerModal {...defaultProps} />
      </ApolloProvider>,
    ),
    onClose: defaultProps.onClose,
    onSaved: defaultProps.onSaved,
  };
}

describe("FlavorPickerModal", () => {
  it("renders category groups when modal is open", async () => {
    renderModal();
    // Wait for descriptors to load
    expect(await screen.findByText("Jasmine")).toBeInTheDocument();
    // Check that category headers render
    expect(screen.getByTestId("category-FLORAL")).toBeInTheDocument();
    expect(screen.getByTestId("category-COCOA")).toBeInTheDocument();
    expect(screen.getByTestId("category-BERRY")).toBeInTheDocument();
  });

  it("clicking a pill toggles selection and shows in Selected section", async () => {
    const user = userEvent.setup();
    renderModal();

    // Wait for descriptors
    const jasmine = await screen.findByText("Jasmine");
    await user.click(jasmine);

    // Should appear in selected section — now Jasmine shows twice (selected + category)
    expect(screen.getByText("Selected (1)")).toBeInTheDocument();
    expect(screen.getAllByText("Jasmine")).toHaveLength(2);
  });

  it("clicking a selected pill deselects it", async () => {
    const user = userEvent.setup();
    renderModal({ initialSelected: ["fd-1"] });

    // Wait for descriptors — Jasmine appears twice (selected section + category)
    await screen.findAllByText("Jasmine");

    // Initially selected
    expect(screen.getByText("Selected (1)")).toBeInTheDocument();

    // Find the remove button in the selected section and click it
    const removeBtn = screen.getByLabelText("Remove Jasmine");
    await user.click(removeBtn);

    expect(screen.getByText("Selected (0)")).toBeInTheDocument();
  });

  it("search filters descriptors", async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText("Jasmine");
    expect(screen.getByText("Dark Chocolate")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Search descriptors...");
    await user.type(searchInput, "Jas");

    // Jasmine should still be visible
    expect(screen.getByText("Jasmine")).toBeInTheDocument();
    // Dark Chocolate should be filtered out
    expect(screen.queryByText("Dark Chocolate")).not.toBeInTheDocument();
  });

  it("save button calls mutation and onSaved", async () => {
    const user = userEvent.setup();
    const { onSaved } = renderModal({ initialSelected: ["fd-1"] });

    // Wait for descriptors — Jasmine appears twice when pre-selected
    await screen.findAllByText("Jasmine");

    const saveBtn = screen.getByText("Save");
    await user.click(saveBtn);

    // Wait for mutation to complete
    await vi.waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce();
    });
  });

  it("cancel button calls onClose", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await screen.findByText("Jasmine");

    const cancelBtn = screen.getByText("Cancel");
    await user.click(cancelBtn);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("off-flavor mode shows only OFF_FLAVOR category", async () => {
    renderModal({ mode: "offFlavors" });

    // Wait for off-flavor descriptors
    expect(await screen.findByText("Grassy")).toBeInTheDocument();
    expect(screen.getByText("Roasty")).toBeInTheDocument();
    expect(screen.getByText("Ashy")).toBeInTheDocument();

    // Should show off-flavor category group
    expect(screen.getByTestId("category-OFF_FLAVOR")).toBeInTheDocument();

    // Should NOT show positive flavor descriptors
    expect(screen.queryByText("Jasmine")).not.toBeInTheDocument();
    expect(screen.queryByText("Dark Chocolate")).not.toBeInTheDocument();
  });

  it("renders Edit Off-Flavors title in offFlavors mode", async () => {
    renderModal({ mode: "offFlavors" });
    expect(screen.getByText("Edit Off-Flavors")).toBeInTheDocument();
  });

  it("renders Edit Flavors title in flavors mode", async () => {
    renderModal();
    expect(screen.getByText("Edit Flavors")).toBeInTheDocument();
  });

  it("shows empty state when nothing selected", async () => {
    renderModal();
    await screen.findByText("Jasmine");
    expect(screen.getByText("None selected")).toBeInTheDocument();
    expect(screen.getByText("Selected (0)")).toBeInTheDocument();
  });
});
