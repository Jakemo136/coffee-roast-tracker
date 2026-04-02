import { formatDuration, formatTemp } from "../../lib/formatters";
import type { TempUnit } from "../../lib/formatters";
import styles from "./styles/MetricsTable.module.css";

interface MetricsTableProps {
  totalDuration: number | null;
  colourChangeTime: number | null;
  colourChangeTemp: number | null;
  firstCrackTime: number | null;
  firstCrackTemp: number | null;
  roastEndTime: number | null;
  roastEndTemp: number | null;
  developmentTime: number | null;
  developmentPercent: number | null;
  tempUnit: TempUnit;
}

interface MetricRow {
  label: string;
  primary: string;
  secondary?: string;
  isDev?: boolean;
}

export function MetricsTable({
  totalDuration,
  colourChangeTime,
  colourChangeTemp,
  firstCrackTime,
  firstCrackTemp,
  roastEndTime,
  roastEndTemp,
  developmentTime,
  developmentPercent,
  tempUnit,
}: MetricsTableProps) {
  const devDeltaT =
    roastEndTemp != null && firstCrackTemp != null
      ? roastEndTemp - firstCrackTemp
      : null;

  const rows: MetricRow[] = [
    {
      label: "Total Duration",
      primary: formatDuration(totalDuration),
    },
    {
      label: "Dry End",
      primary: formatDuration(colourChangeTime),
      secondary: formatTemp(colourChangeTemp, tempUnit),
    },
    {
      label: "FC Time",
      primary: formatDuration(firstCrackTime),
    },
    {
      label: "FC Temp",
      primary: formatTemp(firstCrackTemp, tempUnit),
    },
    {
      label: "Dev Time",
      primary: formatDuration(developmentTime),
      secondary:
        developmentPercent != null
          ? `${developmentPercent.toFixed(1)}%`
          : "—",
      isDev: true,
    },
    {
      label: "Dev ΔT",
      primary: formatTemp(devDeltaT, tempUnit),
      isDev: true,
    },
    {
      label: "End Temp",
      primary: formatTemp(roastEndTemp, tempUnit),
    },
  ];

  return (
    <div className={styles.card}>
      {rows.map((row) => (
        <div
          key={row.label}
          className={`${styles.row}${row.isDev ? ` ${styles.devRow}` : ""}`}
        >
          <span className={styles.label}>{row.label}</span>
          <span className={styles.values}>
            {row.secondary && (
              <span className={styles.secondary}>{row.secondary}</span>
            )}
            <span className={styles.primary}>{row.primary}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
