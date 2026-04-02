import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { HttpLink } from "@apollo/client/link/http";
import { UploadModal } from "../UploadModal";

function createTestClient() {
  return new ApolloClient({
    link: new HttpLink({ uri: "/graphql" }),
    cache: new InMemoryCache(),
  });
}

function renderModal(props: Partial<{ onClose: () => void }> = {}) {
  const client = createTestClient();
  const onClose = props.onClose ?? vi.fn();
  return {
    ...render(
      <ApolloProvider client={client}>
        <UploadModal onClose={onClose} />
      </ApolloProvider>,
    ),
    onClose,
  };
}

function createKlogFile(name = "test-roast.klog", content = '{"roast": "data"}') {
  return new File([content], name, { type: "application/json" });
}

describe("UploadModal", () => {
  it("renders drop zone with instruction text", () => {
    renderModal();
    expect(screen.getByText("Drop your .klog file here")).toBeInTheDocument();
    expect(screen.getByText("or browse files")).toBeInTheDocument();
  });

  it("renders the modal title", () => {
    renderModal();
    expect(screen.getByText("Upload Roast Log")).toBeInTheDocument();
  });

  it("shows 'Parsed successfully ✓' after file preview", async () => {
    const user = userEvent.setup();
    renderModal();

    const fileInput = screen.getByTestId("file-input");
    const file = createKlogFile();
    await user.upload(fileInput, file);

    expect(await screen.findByText("Parsed successfully ✓")).toBeInTheDocument();
  });

  it("shows bean selector with beans from query", async () => {
    const user = userEvent.setup();
    renderModal();

    const fileInput = screen.getByTestId("file-input");
    const file = createKlogFile();
    await user.upload(fileInput, file);

    const select = await screen.findByTestId("bean-select");
    expect(select).toBeInTheDocument();
    // "Yirg — Ethiopia Yirgacheffe" appears in both metadata grid and select option
    expect(screen.getAllByText("Yirg — Ethiopia Yirgacheffe").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Huila — Colombia Huila")).toBeInTheDocument();
  });

  it("displays parse warnings when present", async () => {
    const user = userEvent.setup();
    renderModal();

    const fileInput = screen.getByTestId("file-input");
    const file = createKlogFile();
    await user.upload(fileInput, file);

    expect(await screen.findByTestId("parse-warnings")).toBeInTheDocument();
    expect(screen.getByText("Ambient temp not recorded")).toBeInTheDocument();
  });

  it("cancel button calls onClose", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    const fileInput = screen.getByTestId("file-input");
    const file = createKlogFile();
    await user.upload(fileInput, file);

    await screen.findByText("Parsed successfully ✓");

    const cancelBtn = screen.getByText("Cancel");
    await user.click(cancelBtn);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows metadata grid after preview", async () => {
    const user = userEvent.setup();
    renderModal();

    const fileInput = screen.getByTestId("file-input");
    const file = createKlogFile();
    await user.upload(fileInput, file);

    await screen.findByText("Parsed successfully ✓");

    expect(screen.getByText("Bean Match")).toBeInTheDocument();
    expect(screen.getByText("Roast Date")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Development")).toBeInTheDocument();
  });

  it("closes modal when backdrop is clicked in drop zone step", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    const backdrop = screen.getByTestId("modal-backdrop");
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledOnce();
  });
});
