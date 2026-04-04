import { formatDuration, formatTemp } from "../../lib/formatters";
import type { TempUnit } from "../../lib/formatters";
import styles from "./MetricsTable.module.css";

interface Metrics {
  duration?: number;
  fcTime?: number;
  devTime?: number;
  dtr?: number;
  fcTemp?: number;
  roastEndTemp?: number;
  colourChangeTime?: number;
  colourChangeTemp?: number;
  rating?: number;
}

interface MetricsTableProps {
  metrics: Metrics;
  tempUnit: TempUnit;
}

interface MetricRow {
  label: string;
  value: string;
}

export function MetricsTable({ metrics, tempUnit }: MetricsTableProps) {
  const rows: MetricRow[] = [
    { label: "Total Duration", value: formatDuration(metrics.duration) },
    { label: "Dry End", value: formatDuration(metrics.colourChangeTime) },
    {
      label: "Dry End Temp",
      value: formatTemp(metrics.colourChangeTemp, tempUnit),
    },
    { label: "FC Time", value: formatDuration(metrics.fcTime) },
    { label: "FC Temp", value: formatTemp(metrics.fcTemp, tempUnit) },
    { label: "Dev Time", value: formatDuration(metrics.devTime) },
    {
      label: "DTR",
      value: metrics.dtr != null ? `${metrics.dtr.toFixed(1)}%` : "\u2014",
    },
    { label: "End Temp", value: formatTemp(metrics.roastEndTemp, tempUnit) },
    {
      label: "Rating",
      value: metrics.rating != null ? `${metrics.rating}/10` : "\u2014",
    },
  ];

  return (
    <div className={styles.table} data-testid="metrics-table">
      {rows.map((row) => (
        <div key={row.label} className={styles.row}>
          <span className={styles.label}>{row.label}</span>
          <span className={styles.value}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}
