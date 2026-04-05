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
  tooltip?: string;
}

export function MetricsTable({ metrics, tempUnit }: MetricsTableProps) {
  const rows: MetricRow[] = [
    { label: "Total Duration", value: formatDuration(metrics.duration) },
    { label: "Dry End", value: formatDuration(metrics.colourChangeTime), tooltip: "Time when colour change begins (end of drying phase)" },
    {
      label: "Dry End Temp",
      value: formatTemp(metrics.colourChangeTemp, tempUnit),
    },
    { label: "FC Time", value: formatDuration(metrics.fcTime), tooltip: "First Crack — when beans audibly crack from internal steam pressure" },
    { label: "FC Temp", value: formatTemp(metrics.fcTemp, tempUnit), tooltip: "Bean temperature at First Crack" },
    { label: "Dev Time", value: formatDuration(metrics.devTime), tooltip: "Development Time — duration from First Crack to end of roast" },
    {
      label: "DTR",
      value: metrics.dtr != null ? `${metrics.dtr.toFixed(1)}%` : "\u2014",
      tooltip: "Development Time Ratio — dev time as % of total roast duration",
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
          <span className={styles.label} title={row.tooltip}>{row.label}</span>
          <span className={styles.value}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}
