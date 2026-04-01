import { useState } from "react";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import { Modal } from "./Modal";
import { SCRAPE_BEAN_URL, PARSE_BEAN_PAGE, CREATE_BEAN, MY_BEANS_QUERY } from "../graphql/operations";
import styles from "./AddBeanModal.module.css";

interface AddBeanModalProps {
  onClose: () => void;
  onSaved: (beanId: string) => void;
}

type FetchState = "idle" | "loading" | "success" | "error" | "paste";

const PASTE_ONLY_DOMAINS = ["sweetmarias.com"];

function requiresPaste(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return PASTE_ONLY_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export function AddBeanModal({ onClose, onSaved }: AddBeanModalProps) {
  const [url, setUrl] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [pasteContent, setPasteContent] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [origin, setOrigin] = useState("");
  const [process, setProcess] = useState("");
  const [elevation, setElevation] = useState("");
  const [variety, setVariety] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [bagNotes, setBagNotes] = useState("");
  const [score, setScore] = useState("");
  const [cropYear, setCropYear] = useState("");
  const [populated, setPopulated] = useState(false);
  const [suggestedFlavors, setSuggestedFlavors] = useState<string[]>([]);
  const [flavorInput, setFlavorInput] = useState("");
  const [showFlavorInput, setShowFlavorInput] = useState(false);

  const [scrapeBean] = useLazyQuery(SCRAPE_BEAN_URL, { fetchPolicy: "no-cache" });
  const [parsePage] = useLazyQuery(PARSE_BEAN_PAGE, { fetchPolicy: "no-cache" });

  const [createBean, { loading: saving }] = useMutation(CREATE_BEAN, {
    refetchQueries: [{ query: MY_BEANS_QUERY }],
  });

  function applyResult(result: {
    name?: string | null;
    origin?: string | null;
    process?: string | null;
    elevation?: string | null;
    variety?: string | null;
    bagNotes?: string | null;
    score?: number | null;
    cropYear?: number | null;
    suggestedFlavors?: readonly string[] | null;
  }) {
    if (result.name) setName(result.name);
    if (result.origin) setOrigin(result.origin);
    if (result.process) setProcess(result.process);
    if (result.elevation) setElevation(result.elevation);
    if (result.variety) setVariety(result.variety);
    if (result.bagNotes) setBagNotes(result.bagNotes);
    if (result.score != null) setScore(String(result.score));
    if (result.cropYear != null) setCropYear(String(result.cropYear));
    if (result.suggestedFlavors) setSuggestedFlavors([...result.suggestedFlavors]);
    setPopulated(true);
  }

  async function handleFetch() {
    if (!url.trim()) return;
    if (requiresPaste(url.trim())) {
      setSourceUrl(url);
      setFetchState("paste");
      return;
    }
    setFetchState("loading");
    try {
      const { data } = await scrapeBean({ variables: { url: url.trim() } });
      const result = data?.scrapeBeanUrl;
      if (result) {
        applyResult(result);
        setSourceUrl(url);
        setFetchState("success");
      }
    } catch (err: unknown) {
      const isForbidden =
        err instanceof Error && err.message.includes("blocked");
      setFetchState(isForbidden ? "paste" : "error");
    }
  }

  async function handleParse() {
    if (!pasteContent.trim()) return;
    setFetchState("loading");
    try {
      const { data } = await parsePage({ variables: { html: pasteContent.trim() } });
      const result = data?.parseBeanPage;
      if (result) {
        applyResult(result);
        if (url.trim()) setSourceUrl(url);
        setFetchState("success");
      }
    } catch {
      setFetchState("error");
    }
  }

  async function handleSave() {
    const scoreNum = score ? parseFloat(score) : undefined;
    const cropYearNum = cropYear ? parseInt(cropYear, 10) : undefined;

    const result = await createBean({
      variables: {
        input: {
          name: name.trim(),
          shortName: shortName.trim(),
          origin: origin.trim() || undefined,
          process: process.trim() || undefined,
          elevation: elevation.trim() || undefined,
          variety: variety.trim() || undefined,
          sourceUrl: sourceUrl || undefined,
          bagNotes: bagNotes.trim() || undefined,
          score: scoreNum && !isNaN(scoreNum) ? scoreNum : undefined,
          cropYear: cropYearNum && !isNaN(cropYearNum) ? cropYearNum : undefined,
        },
      },
    });
    const newBeanId = result.data?.createBean.bean.id;
    if (newBeanId) {
      onSaved(newBeanId);
    }
  }

  function addFlavor() {
    const entries = flavorInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (entries.length === 0) return;
    setSuggestedFlavors((prev) => {
      const next = [...prev];
      for (const entry of entries) {
        if (!next.some((f) => f.toLowerCase() === entry.toLowerCase())) {
          next.push(entry);
        }
      }
      return next;
    });
    setFlavorInput("");
  }

  function removeFlavor(flavor: string) {
    setSuggestedFlavors((prev) => prev.filter((f) => f !== flavor));
  }

  const canSave = name.trim().length > 0 && shortName.trim().length > 0 && !saving;

  let fetchButtonLabel = "Fetch";
  if (fetchState === "success") fetchButtonLabel = "Refetch";
  if (fetchState === "error") fetchButtonLabel = "Retry";

  const footer = (
    <>
      <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        disabled={!canSave}
        onClick={handleSave}
      >
        Save Bean
      </button>
    </>
  );

  return (
    <Modal title="Add Bean" onClose={onClose} footer={footer}>
      {/* URL Section */}
      <div className={styles.urlSection}>
        <div className={styles.urlRow}>
          <input
            type="text"
            className={styles.urlInput}
            placeholder="Paste a green coffee supplier URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
            disabled={fetchState === "loading" || !url.trim()}
            onClick={handleFetch}
          >
            {fetchButtonLabel}
          </button>
        </div>
        {fetchState === "idle" && (
          <div className={styles.urlHint}>
            Auto-fill bean details from Sweet Maria's, Coffee Bean Corral, and other suppliers.
          </div>
        )}
      </div>

      {/* Fetch Status */}
      {fetchState === "loading" && (
        <div className={`${styles.fetchStatus} ${styles.fetchLoading}`}>
          <div className={styles.spinner} />
          Fetching bean details...
        </div>
      )}
      {fetchState === "success" && (
        <div className={`${styles.fetchStatus} ${styles.fetchSuccess}`}>
          <span>&#10003;</span>
          Bean details fetched successfully — review and edit below
        </div>
      )}
      {fetchState === "error" && (
        <div className={`${styles.fetchStatus} ${styles.fetchError}`}>
          <span>&#10007;</span>
          Couldn't get bean details from that URL. Enter them below.
        </div>
      )}

      {/* Paste Mode */}
      {fetchState === "paste" && (
        <div className={styles.pasteSection}>
          <div className={`${styles.fetchStatus} ${styles.fetchPaste}`}>
            <span>&#128203;</span>
            This site requires paste mode. Copy the product details from the page and paste below.
          </div>
          <textarea
            className={styles.pasteInput}
            placeholder="Copy the product specs section from the supplier page and paste here"
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            rows={5}
          />
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
            disabled={!pasteContent.trim()}
            onClick={handleParse}
          >
            Parse
          </button>
        </div>
      )}

      {/* Divider */}
      <div className={styles.divider}>
        <span className={styles.dividerText}>or enter details manually</span>
      </div>

      {/* Form Fields */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Bean Name <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          className={`${styles.formInput} ${populated && name ? styles.populated : ""}`}
          placeholder="e.g. Colombia China Alta Jose Buitrago"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Short Name <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          className={styles.formInput}
          placeholder="e.g. CCAJ"
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
        />
        <div className={styles.formHint}>Used for .klog matching &amp; display</div>
      </div>

      {/* 2x2 grid: Process + Elevation (row 1), Origin + Varietal/Cultivar (row 2) */}
      <div className={styles.formRow2}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Process</label>
          <input
            type="text"
            className={`${styles.formInput} ${populated && process ? styles.populated : ""}`}
            placeholder="e.g. Washed"
            value={process}
            onChange={(e) => setProcess(e.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Elevation</label>
          <input
            type="text"
            className={`${styles.formInput} ${populated && elevation ? styles.populated : ""}`}
            placeholder="e.g. 1800-2000m"
            value={elevation}
            onChange={(e) => setElevation(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.formRow2}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Origin</label>
          <input
            type="text"
            className={`${styles.formInput} ${populated && origin ? styles.populated : ""}`}
            placeholder="e.g. Huila, Colombia"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Varietal / Cultivar</label>
          <input
            type="text"
            className={`${styles.formInput} ${populated && variety ? styles.populated : ""}`}
            placeholder="e.g. Bourbon, SL28"
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
          />
        </div>
      </div>

      {/* Score */}
      <div className={styles.formRow2}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Score (SCA / Cupping)</label>
          <input
            type="text"
            className={`${styles.formInput} ${populated && score ? styles.populated : ""}`}
            placeholder="—"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Crop Year</label>
          <input
            type="text"
            className={`${styles.formInput} ${populated && cropYear ? styles.populated : ""}`}
            placeholder="e.g. 2025"
            value={cropYear}
            onChange={(e) => setCropYear(e.target.value)}
          />
        </div>
      </div>

      {/* Supplier Notes */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Supplier Notes</label>
        <textarea
          className={`${styles.formInput} ${populated && bagNotes ? styles.populated : ""}`}
          placeholder="Paste or type tasting notes from the bag or listing"
          value={bagNotes}
          onChange={(e) => setBagNotes(e.target.value)}
          rows={3}
        />
        {populated && bagNotes && (
          <div className={styles.formHint}>Auto-filled from listing — edit as needed</div>
        )}
      </div>

      {/* Flavors Section */}
      <div className={styles.flavorsSection}>
        <div className={styles.flavorsLabel}>
          {populated && suggestedFlavors.length > 0 ? "Suggested Flavors" : "Flavors"}
          {populated && suggestedFlavors.length > 0 && <span className={styles.badge}>from supplier</span>}
        </div>
        {suggestedFlavors.length > 0 && (
          <div className={styles.flavorPills}>
            {suggestedFlavors.map((flavor) => (
              <span key={flavor} className={styles.flavorPill}>
                {flavor}
                <button
                  type="button"
                  className={styles.flavorRemove}
                  onClick={() => removeFlavor(flavor)}
                  aria-label={`Remove ${flavor}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
        {showFlavorInput ? (
          <div className={styles.flavorInputRow}>
            <input
              type="text"
              className={styles.flavorInput}
              placeholder="e.g. Citrus, Chocolate, Berry"
              value={flavorInput}
              onChange={(e) => setFlavorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addFlavor(); }
              }}
              autoFocus
            />
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
              onClick={addFlavor}
              disabled={!flavorInput.trim()}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.addFlavorBtn}
            onClick={() => setShowFlavorInput(true)}
          >
            + Add flavors
          </button>
        )}
        <div className={styles.flavorsHint}>For reference — tag flavors per roast after logging</div>
      </div>
    </Modal>
  );
}
