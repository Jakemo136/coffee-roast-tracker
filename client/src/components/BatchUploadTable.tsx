import { Combobox } from "./Combobox";
import { formatDuration } from "../lib/formatters";
import styles from "./styles/BatchUploadTable.module.css";

interface RoastPreviewMinimal {
  roastDate?: string | null;
  profileShortName?: string | null;
  totalDuration?: number | null;
  developmentPercent?: number | null;
  suggestedBeans: Array<{ bean: { id: string; name: string } }>;
  parseWarnings: string[];
}

export interface BatchRow {
  fileName: string;
  fileContent: string;
  preview: RoastPreviewMinimal | null;
  error: string | null;
  selectedBeanId: string;
  saved: boolean;
}

interface BatchUploadTableProps {
  rows: BatchRow[];
  beans: Array<{ value: string; label: string }>;
  onBeanChange: (index: number, beanId: string) => void;
  onAddBean: () => void;
  onSaveAll: () => void;
  saving: boolean;
  saveProgress: { current: number; total: number } | null;
}

export function BatchUploadTable({
  rows,
  beans,
  onBeanChange,
  onAddBean,
  onSaveAll,
  saving,
  saveProgress,
}: BatchUploadTableProps) {
  const validRows = rows.filter((r) => !r.error);
  const allHaveBeans = validRows.length > 0 && validRows.every((r) => r.selectedBeanId);
  const canSave = allHaveBeans && !saving;

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>File</th>
            <th className={styles.th}>Date</th>
            <th className={styles.th}>Profile</th>
            <th className={styles.th}>Duration</th>
            <th className={styles.th}>Bean</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`${styles.row} ${row.error ? styles.errorRow : ""} ${!row.error && !row.selectedBeanId ? styles.unmatched : ""} ${row.saved ? styles.savedRow : ""}`}
              data-testid={`batch-row-${i}`}
            >
              {row.error ? (
                <>
                  <td className={styles.td}>{row.fileName}</td>
                  <td className={`${styles.td} ${styles.errorText}`} colSpan={4}>
                    {row.error}
                  </td>
                </>
              ) : (
                <>
                  <td className={styles.td}>{row.fileName}</td>
                  <td className={styles.td}>
                    {row.preview?.roastDate
                      ? new Date(row.preview.roastDate).toLocaleDateString()
                      : "\u2014"}
                  </td>
                  <td className={styles.td}>
                    {row.preview?.profileShortName ?? "\u2014"}
                  </td>
                  <td className={styles.td}>
                    {formatDuration(row.preview?.totalDuration)}
                  </td>
                  <td className={styles.td}>
                    <Combobox
                      options={beans}
                      value={row.selectedBeanId}
                      onChange={(beanId) => onBeanChange(i, beanId)}
                      placeholder="Select a bean..."
                    />
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.addBeanLink}
          onClick={onAddBean}
        >
          + Add New Bean
        </button>

        <div className={styles.saveSection}>
          {saveProgress && (
            <span className={styles.progressText}>
              Saving {saveProgress.current} of {saveProgress.total}…
            </span>
          )}
          <button
            type="button"
            className={styles.saveAllBtn}
            onClick={onSaveAll}
            disabled={!canSave}
          >
            Save All ({validRows.length})
          </button>
        </div>
      </div>
    </div>
  );
}
