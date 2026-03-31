import { useState } from "react";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import { Modal } from "./Modal";
import { SCRAPE_BEAN_URL, CREATE_BEAN, MY_BEANS_QUERY } from "../graphql/operations";
import styles from "./AddBeanModal.module.css";

interface AddBeanModalProps {
  onClose: () => void;
  onSaved: (beanId: string) => void;
}

export function AddBeanModal({ onClose, onSaved }: AddBeanModalProps) {
  const [url, setUrl] = useState("");
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [origin, setOrigin] = useState("");
  const [process, setProcess] = useState("");
  const [elevation, setElevation] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [bagNotes, setBagNotes] = useState("");
  const [populated, setPopulated] = useState(false);
  const [suggestedFlavors, setSuggestedFlavors] = useState<string[]>([]);

  const [scrapeBean] = useLazyQuery(SCRAPE_BEAN_URL, {
    fetchPolicy: "no-cache",
  });

  const [createBean, { loading: saving }] = useMutation(CREATE_BEAN, {
    refetchQueries: [{ query: MY_BEANS_QUERY }],
  });

  async function handleFetch() {
    if (!url.trim()) return;
    setFetchState("loading");
    try {
      const { data } = await scrapeBean({ variables: { url: url.trim() } });
      const result = data?.scrapeBeanUrl;
      if (result) {
        if (result.name) setName(result.name);
        if (result.origin) setOrigin(result.origin);
        if (result.process) setProcess(result.process);
        if (result.elevation) setElevation(result.elevation);
        if (result.bagNotes) setBagNotes(result.bagNotes);
        if (result.suggestedFlavors) setSuggestedFlavors(result.suggestedFlavors);
        setSourceUrl(url);
        setPopulated(true);
        setFetchState("success");
      }
    } catch {
      setFetchState("error");
    }
  }

  async function handleSave() {
    const result = await createBean({
      variables: {
        input: {
          name: name.trim(),
          shortName: shortName.trim(),
          origin: origin.trim() || undefined,
          process: process.trim() || undefined,
          elevation: elevation.trim() || undefined,
          sourceUrl: sourceUrl || undefined,
          bagNotes: bagNotes.trim() || undefined,
        },
      },
    });
    const newBeanId = result.data?.createBean.bean.id;
    if (newBeanId) {
      onSaved(newBeanId);
    }
  }

  const canSave = name.trim().length > 0 && shortName.trim().length > 0 && !saving;

  const fetchButtonLabel = fetchState === "success" ? "Refetch" : fetchState === "error" ? "Retry" : "Fetch";

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
            placeholder="https://www.sweetmarias.com/..."
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
            Paste a supplier URL to auto-fill bean details. Fetching may take a moment.
          </div>
        )}
      </div>

      {/* Fetch Status */}
      {fetchState === "loading" && (
        <div className={`${styles.fetchStatus} ${styles.fetchLoading}`}>
          <div className={styles.spinner} />
          Fetching bean details from Sweet Maria's...
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

      <div className={styles.formRow3}>
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
          {suggestedFlavors.length > 0 ? "Suggested Flavors" : "Flavors"}
          {suggestedFlavors.length > 0 && <span className={styles.badge}>from supplier</span>}
        </div>
        {suggestedFlavors.length > 0 ? (
          <div>
            {suggestedFlavors.map((flavor) => (
              <span key={flavor}>{flavor}</span>
            ))}
          </div>
        ) : (
          <button type="button" className={styles.addFlavorsBtn}>+ Add flavors</button>
        )}
        <div className={styles.flavorsHint}>Tag expected flavor notes for this bean</div>
      </div>
    </Modal>
  );
}
