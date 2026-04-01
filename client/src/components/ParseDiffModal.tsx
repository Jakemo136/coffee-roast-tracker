import { useState } from "react";
import { Modal } from "./Modal";
import type { ParseResult } from "./ParseSupplierModal";
import styles from "./ParseDiffModal.module.css";

interface ParseDiffModalProps {
  current: {
    name: string;
    origin: string | null;
    process: string | null;
    elevation: string | null;
    variety: string | null;
    bagNotes: string | null;
    score: number | null;
    cropYear: number | null;
    suggestedFlavors: readonly string[];
  };
  parsed: ParseResult;
  onApply: (fields: Partial<ParseResult>) => void;
  onClose: () => void;
}

const FIELD_LABELS: Record<keyof ParseResult, string> = {
  name: "Name",
  origin: "Origin",
  process: "Process",
  elevation: "Elevation",
  variety: "Variety",
  bagNotes: "Supplier Notes",
  score: "Score",
  cropYear: "Crop Year",
  suggestedFlavors: "Suggested Flavors",
};

const FIELD_KEYS = Object.keys(FIELD_LABELS) as (keyof ParseResult)[];

function formatValue(value: unknown): string {
  if (value == null) return "\u2014";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "\u2014";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value || "\u2014";
  return "\u2014";
}

function hasNewValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.length > 0;
  return true;
}

function valuesEqual(current: unknown, parsed: unknown): boolean {
  if (Array.isArray(current) && Array.isArray(parsed)) {
    return (
      current.length === parsed.length &&
      current.every((v, i) => v === parsed[i])
    );
  }
  return current === parsed;
}

interface DiffRow {
  key: keyof ParseResult;
  label: string;
  currentDisplay: string;
  newDisplay: string;
}

function computeDiffRows(
  current: ParseDiffModalProps["current"],
  parsed: ParseResult,
): DiffRow[] {
  const rows: DiffRow[] = [];
  for (const key of FIELD_KEYS) {
    const parsedVal = parsed[key];
    if (!hasNewValue(parsedVal)) continue;
    const currentVal = current[key];
    if (valuesEqual(currentVal, parsedVal)) continue;
    rows.push({
      key,
      label: FIELD_LABELS[key],
      currentDisplay: formatValue(currentVal),
      newDisplay: formatValue(parsedVal),
    });
  }
  return rows;
}

export function ParseDiffModal({
  current,
  parsed,
  onApply,
  onClose,
}: ParseDiffModalProps) {
  const diffRows = computeDiffRows(current, parsed);
  const [checked, setChecked] = useState<Set<keyof ParseResult>>(
    () => new Set(diffRows.map((r) => r.key)),
  );

  function toggleField(key: keyof ParseResult) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleApply() {
    const fields: Partial<ParseResult> = {};
    for (const key of checked) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fields as any)[key] = parsed[key];
    }
    onApply(fields);
  }

  const selectedCount = checked.size;

  const footer =
    diffRows.length > 0 ? (
      <div className={styles.footerRow}>
        <button type="button" className={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.applyBtn}
          disabled={selectedCount === 0}
          onClick={handleApply}
        >
          Apply {selectedCount} field{selectedCount !== 1 ? "s" : ""}
        </button>
      </div>
    ) : undefined;

  return (
    <Modal title="Review parsed changes" onClose={onClose} footer={footer}>
      {diffRows.length === 0 ? (
        <div className={styles.noChanges}>No changes found</div>
      ) : (
        <>
          <div className={styles.diffHeader}>
            <span />
            <span>Field</span>
            <span>Current</span>
            <span>New</span>
          </div>
          <div className={styles.diffTable}>
            {diffRows.map((row) => (
              <label key={row.key} className={styles.diffRow}>
                <input
                  type="checkbox"
                  checked={checked.has(row.key)}
                  onChange={() => toggleField(row.key)}
                />
                <span className={styles.fieldLabel}>{row.label}</span>
                <span className={styles.currentValue} title={row.currentDisplay}>
                  {row.currentDisplay}
                </span>
                <span className={styles.newValue} title={row.newDisplay}>
                  {row.newDisplay}
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
