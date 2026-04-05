import { useState } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { Modal } from "../../components/Modal";
import { SCRAPE_BEAN_URL, PARSE_BEAN_PAGE } from "../../graphql/operations";
import styles from "./styles/ParseSupplierModal.module.css";

export interface ParseResult {
  name: string | null;
  origin: string | null;
  process: string | null;
  elevation: string | null;
  variety: string | null;
  bagNotes: string | null;
  score: number | null;
  cropYear: number | null;
  suggestedFlavors: readonly string[];
}

interface ParseSupplierModalProps {
  onClose: () => void;
  onResult: (result: ParseResult) => void;
  initialUrl?: string;
}

const CLOUDFLARE_BLOCKED_DOMAINS = ["sweetmarias.com"];

function isBlockedDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return CLOUDFLARE_BLOCKED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

export function ParseSupplierModal({
  onClose,
  onResult,
  initialUrl = "",
}: ParseSupplierModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [html, setHtml] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const [scrapeUrl, { loading: scrapeLoading }] = useLazyQuery(SCRAPE_BEAN_URL, {
    fetchPolicy: "no-cache",
  });

  const [parsePage, { loading: parseLoading }] = useLazyQuery(PARSE_BEAN_PAGE, {
    fetchPolicy: "no-cache",
  });

  async function handleFetch() {
    setUrlError(null);

    if (!url.trim()) {
      setUrlError("Please enter a URL.");
      return;
    }

    if (isBlockedDomain(url.trim())) {
      setUrlError(
        "This site blocks automated fetching (Cloudflare protection). Copy and paste the page source or product description below instead.",
      );
      return;
    }

    const { data, error } = await scrapeUrl({ variables: { url: url.trim() } });

    if (error) {
      setUrlError(error.message);
      return;
    }

    if (data?.scrapeBeanUrl) {
      const r = data.scrapeBeanUrl;
      onResult({ ...r, suggestedFlavors: r.suggestedFlavors ?? [] });
    }
  }

  async function handleParse() {
    setPasteError(null);

    if (!html.trim()) {
      setPasteError("Please paste some content to parse.");
      return;
    }

    const { data, error } = await parsePage({ variables: { html: html.trim() } });

    if (error) {
      setPasteError(error.message);
      return;
    }

    if (data?.parseBeanPage) {
      const r = data.parseBeanPage;
      onResult({ ...r, suggestedFlavors: r.suggestedFlavors ?? [] });
    }
  }

  return (
    <Modal title="Import from supplier" onClose={onClose}>
      <div className={styles.section}>
        <label className={styles.label} htmlFor="supplier-url">
          Supplier URL
        </label>
        <p className={styles.hint}>
          Attempt to auto-fill bean details from supplier URL.
        </p>
        <div className={styles.row}>
          <input
            id="supplier-url"
            className={styles.input}
            type="url"
            placeholder="https://example.com/coffee/ethiopia-yirgacheffe"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFetch();
            }}
            disabled={scrapeLoading}
          />
          <button
            className={styles.button}
            onClick={handleFetch}
            disabled={scrapeLoading || parseLoading}
          >
            {scrapeLoading ? "Fetching…" : "Fetch"}
          </button>
        </div>
        {urlError && <p className={styles.error}>{urlError}</p>}
      </div>

      <div className={styles.divider}>
        <span className={styles.dividerText}>or</span>
      </div>

      <div className={styles.section}>
        <label className={styles.label} htmlFor="supplier-paste">
          Paste supplier notes
        </label>
        <textarea
          id="supplier-paste"
          className={styles.textarea}
          placeholder="Paste the product description, tasting notes, or page source here…"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          disabled={parseLoading}
          rows={6}
        />
        {pasteError && <p className={styles.error}>{pasteError}</p>}
        <button
          className={styles.button}
          onClick={handleParse}
          disabled={parseLoading || scrapeLoading}
        >
          {parseLoading ? "Parsing…" : "Parse"}
        </button>
      </div>
    </Modal>
  );
}
