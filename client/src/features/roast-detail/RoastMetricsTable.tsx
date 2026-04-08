import { formatDuration, formatTemp, formatDate } from "../../lib/formatters";
import type { TempUnit } from "../../lib/formatters";
import styles from "./RoastMetricsTable.module.css";

export interface RoastMetric {
  id: string;
  roastDate?: string;
  duration?: number;
  colourChangeTime?: number;
  colourChangeTemp?: number;
  fcTime?: number;
  fcTemp?: number;
  devTime?: number;
  dtr?: number;
  roastEndTemp?: number;
}

interface RoastMetricsTableProps {
  /** The current roast — always highlighted */
  currentRoastId: string;
  /** All roasts to display (current + others) */
  roasts: RoastMetric[];
  /** IDs of roasts currently overlaid on the chart */
  compareIds: string[];
  /** Toggle a roast in/out of the compare overlay */
  onToggleCompare: (id: string) => void;
  /** Navigate to a roast */
  onRowClick: (id: string) => void;
  tempUnit: TempUnit;
}

export function RoastMetricsTable({
  currentRoastId,
  roasts,
  compareIds,
  onToggleCompare,
  onRowClick,
  tempUnit,
}: RoastMetricsTableProps) {
  return (
    <div className={styles.wrapper} data-testid="metrics-table">
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}></th>
            <th className={styles.th}>Date</th>
            <th className={styles.th}>Duration</th>
            <th className={styles.th} title="Time when colour change begins (end of drying phase)">Dry End</th>
            <th className={styles.th} title="First Crack">FC Time</th>
            <th className={styles.th} title="Bean temperature at First Crack">FC Temp</th>
            <th className={styles.th} title="Development Time">Dev Time</th>
            <th className={styles.th} title="Development Time Ratio">DTR</th>
            <th className={styles.th}>End Temp</th>
          </tr>
        </thead>
        <tbody>
          {roasts.map((r) => {
            const isCurrent = r.id === currentRoastId;
            const isCompared = compareIds.includes(r.id);
            return (
              <tr
                key={r.id}
                className={`${styles.row} ${isCurrent ? styles.currentRow : styles.clickableRow} ${isCompared ? styles.comparedRow : ""}`}
                onClick={() => !isCurrent && onRowClick(r.id)}
              >
                <td className={styles.checkboxCell} onClick={(e) => e.stopPropagation()}>
                  {!isCurrent && (
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={isCompared}
                        onChange={() => onToggleCompare(r.id)}
                        aria-label={`Compare with ${formatDate(r.roastDate)}`}
                      />
                    </label>
                  )}
                </td>
                <td className={styles.td}>
                  {isCurrent ? (
                    <strong>{formatDate(r.roastDate)}</strong>
                  ) : (
                    formatDate(r.roastDate)
                  )}
                </td>
                <td className={styles.td}>{formatDuration(r.duration)}</td>
                <td className={styles.td}>{formatDuration(r.colourChangeTime)}</td>
                <td className={styles.td}>{formatDuration(r.fcTime)}</td>
                <td className={styles.td}>{formatTemp(r.fcTemp, tempUnit)}</td>
                <td className={styles.td}>{formatDuration(r.devTime)}</td>
                <td className={styles.td}>{r.dtr != null ? `${r.dtr.toFixed(1)}%` : "\u2014"}</td>
                <td className={styles.td}>{formatTemp(r.roastEndTemp, tempUnit)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
