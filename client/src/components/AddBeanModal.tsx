import { useState, useMemo } from "react";
import { Modal } from "./Modal";
import { Combobox } from "./Combobox";
import { FlavorPill } from "./FlavorPill";
import { COFFEE_PROCESSES } from "../lib/coffeeProcesses";
import styles from "./styles/AddBeanModal.module.css";

interface AddBeanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bean: {
    name: string;
    origin: string;
    process: string;
    variety?: string;
    supplier?: string;
    shortName?: string;
    score?: number;
    notes?: string;
    bagNotes?: string;
    suggestedFlavors?: string[];
  }) => void;
  flavors?: Array<{ name: string; color: string }>;
  suppliers?: string[];
  /** When true, only name is required (used for inline creation during upload) */
  minimal?: boolean;
}

const processOptions = COFFEE_PROCESSES.map((p) => ({
  value: p,
  label: p,
}));

export function AddBeanModal({
  isOpen,
  onClose,
  onSave,
  flavors = [],
  suppliers = [],
  minimal = false,
}: AddBeanModalProps) {
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [process, setProcess] = useState("");
  const [variety, setVariety] = useState("");
  const [shortName, setShortName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [supplierDescription, setSupplierDescription] = useState("");
  const [cuppingNotes, setCuppingNotes] = useState("");
  const [matchedFlavors, setMatchedFlavors] = useState<string[]>([]);
  const [parseAttempted, setParseAttempted] = useState(false);

  const canSave = minimal
    ? name.trim().length > 0
    : name.trim().length > 0 && origin.trim().length > 0 && process.trim().length > 0;

  function parseCuppingNotes() {
    if (!cuppingNotes.trim()) return;

    const words = cuppingNotes
      .toLowerCase()
      .split(/[\s,;.]+/)
      .filter(Boolean);

    const matched: string[] = [];
    for (const flavor of flavors) {
      const flavorLower = flavor.name.toLowerCase();
      if (words.some((w) => w === flavorLower)) {
        if (!matched.includes(flavor.name)) {
          matched.push(flavor.name);
        }
      }
    }

    // Also check multi-word flavor names
    const fullText = cuppingNotes.toLowerCase();
    for (const flavor of flavors) {
      const flavorLower = flavor.name.toLowerCase();
      if (flavorLower.includes(" ") && fullText.includes(flavorLower)) {
        if (!matched.includes(flavor.name)) {
          matched.push(flavor.name);
        }
      }
    }

    setMatchedFlavors(matched);
    setParseAttempted(true);
  }

  function handleSave() {
    const scoreNum = score ? parseFloat(score) : undefined;
    onSave({
      name: name.trim(),
      origin: origin.trim(),
      process: process.trim(),
      variety: variety.trim() || undefined,
      shortName: shortName.trim() || undefined,
      supplier: supplier.trim() || undefined,
      score: scoreNum && !isNaN(scoreNum) ? scoreNum : undefined,
      notes: notes.trim() || undefined,
      bagNotes: supplierDescription.trim() || undefined,
      suggestedFlavors: matchedFlavors.length > 0 ? matchedFlavors : undefined,
    });
  }

  const flavorColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of flavors) {
      map.set(f.name.toLowerCase(), f.color);
    }
    return map;
  }, [flavors]);

  const footer = (
    <div className={styles.footer}>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnSecondary}`}
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={handleSave}
        disabled={!canSave}
      >
        Save
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Bean" footer={footer}>
      <div className={styles.content} data-testid="add-bean-modal">
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Bean Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="Bean name, e.g. Kenya AA"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Origin <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="Origin, e.g. Yirgacheffe, Ethiopia"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Process <span className={styles.required}>*</span>
          </label>
          <Combobox
            options={processOptions}
            value={process}
            onChange={setProcess}
            placeholder="Select a process"
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Variety</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. Bourbon, SL28"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Short Name</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. Yirg, Huila"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Supplier</label>
            <Combobox
              options={suppliers.map((s) => ({ value: s, label: s }))}
              value={supplier}
              onChange={setSupplier}
              placeholder="e.g. Sweet Maria's"
              allowCustom
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Score</label>
            <input
              type="number"
              className={styles.formInput}
              placeholder="e.g. 86"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Supplier Notes</label>
          <textarea
            className={styles.formTextarea}
            placeholder="Supplier's description of this bean"
            value={supplierDescription}
            onChange={(e) => setSupplierDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Notes</label>
          <textarea
            className={styles.formTextarea}
            placeholder="Personal remarks about this bean"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className={styles.cuppingSection}>
          <span className={styles.cuppingLabel}>Paste supplier notes</span>
          <div className={styles.cuppingRow}>
            <textarea
              className={styles.cuppingTextarea}
              placeholder="Paste tasting notes to auto-match flavors"
              value={cuppingNotes}
              onChange={(e) => setCuppingNotes(e.target.value)}
              rows={2}
            />
            <button
              type="button"
              className={styles.parseBtn}
              onClick={parseCuppingNotes}
            >
              Parse Flavors
            </button>
          </div>
          {parseAttempted && matchedFlavors.length === 0 && (
            <div className={styles.noMatchText}>No flavors matched — try different terms or add flavors after saving the bean.</div>
          )}
          {matchedFlavors.length > 0 && (
            <div>
              <span className={styles.matchedLabel}>Matched flavors:</span>
              <div className={styles.matchedPills}>
                {matchedFlavors.map((name) => (
                  <FlavorPill
                    key={name}
                    name={name}
                    color={flavorColorMap.get(name.toLowerCase()) ?? "#888888"}
                    onRemove={() =>
                      setMatchedFlavors((prev) =>
                        prev.filter((f) => f !== name),
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
