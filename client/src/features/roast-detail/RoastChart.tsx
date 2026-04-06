import "../../lib/chartSetup";
import { useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import type { AnnotationOptions } from "chartjs-plugin-annotation";
import { celsiusToFahrenheit } from "../../lib/tempConversion";
import { formatDuration } from "../../lib/formatters";
import type { TempUnit } from "../../lib/formatters";
import styles from "./RoastChart.module.css";

interface TimeSeriesEntry {
  time: number;
  spotTemp?: number;
  temp?: number;
  meanTemp?: number;
  profileTemp?: number;
  profileROR?: number;
  actualROR?: number;
  desiredROR?: number;
  powerKW?: number;
  actualFanRPM?: number;
}

interface ZoneBoost {
  zone: 1 | 2 | 3;
  timeStart: number;
  timeEnd: number;
  boost: number;
}

interface RoastChartProps {
  timeSeriesData: TimeSeriesEntry[];
  colourChangeTime?: number;
  firstCrackTime?: number;
  roastEndTime?: number;
  totalDuration?: number;
  zoneBoosts?: ZoneBoost[];
  tempUnit?: TempUnit;
}

type PhaseZoom = "all" | "dry" | "maillard" | "dev";

const DATASET_CONFIG = [
  { key: "meanTemp", label: "Mean Temp", color: "#2563eb", defaultOn: true },
  { key: "profileTemp", label: "Profile Temp", color: "#6b7280", defaultOn: true, dashed: true },
  { key: "fanRPM", label: "Fan RPM", color: "#0d7a54", defaultOn: true },
  { key: "powerKW", label: "Power kW", color: "#8a5a00", defaultOn: true },
  { key: "ror", label: "RoR", color: "#dc2626", defaultOn: true },
  { key: "spotTemp", label: "Spot Temp", color: "#6d28d9", defaultOn: false },
  { key: "desiredROR", label: "Desired RoR", color: "#be185d", defaultOn: false },
] as const;

type DatasetKey = (typeof DATASET_CONFIG)[number]["key"];

const DATASET_COLOR: Record<DatasetKey, string> = Object.fromEntries(
  DATASET_CONFIG.map((cfg) => [cfg.key, cfg.color]),
) as Record<DatasetKey, string>;

function colorWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const ZONE_OFFSET: Record<number, number> = { 1: 5, 2: 10, 3: 15 };
const ZONE_BAND_COLOR = "rgba(34, 197, 94, 0.15)";

const PHASE_PADDING = 12; // seconds

function convertTemp(value: number | undefined | null, tempUnit: "CELSIUS" | "FAHRENHEIT"): number | null {
  if (value == null) return null;
  return tempUnit === "FAHRENHEIT" ? celsiusToFahrenheit(value) : value;
}

interface GridIntervalSelectProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  options: Array<{ value: number; label: string }>;
}

function GridIntervalSelect({ label, value, onChange, options }: GridIntervalSelectProps) {
  return (
    <div className={styles.gridIntervalRow}>
      <span className={styles.gridIntervalLabel}>{label}</span>
      <select
        className={styles.gridIntervalSelect}
        value={value ?? "auto"}
        onChange={(e) => onChange(e.target.value === "auto" ? null : Number(e.target.value))}
      >
        <option value="auto">Auto</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function RoastChart({
  timeSeriesData,
  colourChangeTime,
  firstCrackTime,
  roastEndTime,
  totalDuration,
  zoneBoosts,
  tempUnit = "CELSIUS",
}: RoastChartProps) {
  const [activeToggles, setActiveToggles] = useState<Set<DatasetKey>>(() => {
    const defaults = new Set<DatasetKey>();
    for (const cfg of DATASET_CONFIG) {
      if (cfg.defaultOn) defaults.add(cfg.key);
    }
    return defaults;
  });
  const [phaseZoom, setPhaseZoom] = useState<PhaseZoom>("all");
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [xGridInterval, setXGridInterval] = useState<number | null>(null);
  const [yGridInterval, setYGridInterval] = useState<number | null>(null);

  function handleToggle(key: DatasetKey) {
    setActiveToggles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const labels = useMemo(
    () => timeSeriesData.map((d) => d.time),
    [timeSeriesData],
  );

  const tempLabel = tempUnit === "FAHRENHEIT" ? "Temperature (°F)" : "Temperature (°C)";

  const datasets = useMemo(() => {
    const data = timeSeriesData;
    const result: ChartData<"line">["datasets"] = [];

    if (activeToggles.has("meanTemp")) {
      result.push({
        label: "Mean Temp",
        data: data.map((d) => convertTemp(d.meanTemp, tempUnit)),
        borderColor: DATASET_COLOR.meanTemp,
        backgroundColor: colorWithAlpha(DATASET_COLOR.meanTemp, 0.1),
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: "y",
      });
    }

    if (activeToggles.has("profileTemp")) {
      result.push({
        label: "Profile Temp",
        data: data.map((d) => convertTemp(d.profileTemp, tempUnit)),
        borderColor: DATASET_COLOR.profileTemp,
        backgroundColor: colorWithAlpha(DATASET_COLOR.profileTemp, 0.1),
        borderWidth: 1.5,
        borderDash: [6, 3],
        pointRadius: 0,
        yAxisID: "y",
      });
    }

    if (activeToggles.has("spotTemp")) {
      result.push({
        label: "Spot Temp",
        data: data.map((d) => convertTemp(d.spotTemp, tempUnit)),
        borderColor: DATASET_COLOR.spotTemp,
        backgroundColor: colorWithAlpha(DATASET_COLOR.spotTemp, 0.1),
        borderWidth: 1.5,
        pointRadius: 0,
        yAxisID: "y",
      });
    }

    if (activeToggles.has("ror")) {
      result.push({
        label: "RoR",
        data: data.map((d) => d.actualROR ?? null),
        borderColor: DATASET_COLOR.ror,
        backgroundColor: colorWithAlpha(DATASET_COLOR.ror, 0.1),
        borderWidth: 1.5,
        pointRadius: 0,
        yAxisID: "y1",
      });
    }

    if (activeToggles.has("desiredROR")) {
      result.push({
        label: "Desired RoR",
        data: data.map((d) => d.desiredROR ?? null),
        borderColor: DATASET_COLOR.desiredROR,
        backgroundColor: colorWithAlpha(DATASET_COLOR.desiredROR, 0.1),
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 0,
        yAxisID: "y1",
      });
    }

    if (activeToggles.has("fanRPM")) {
      result.push({
        label: "Fan RPM",
        data: data.map((d) => d.actualFanRPM ?? null),
        borderColor: DATASET_COLOR.fanRPM,
        backgroundColor: colorWithAlpha(DATASET_COLOR.fanRPM, 0.1),
        borderWidth: 1.5,
        pointRadius: 0,
        yAxisID: "y1",
      });
    }

    if (activeToggles.has("powerKW")) {
      result.push({
        label: "Power kW",
        data: data.map((d) => d.powerKW ?? null),
        borderColor: DATASET_COLOR.powerKW,
        backgroundColor: colorWithAlpha(DATASET_COLOR.powerKW, 0.1),
        borderWidth: 1.5,
        pointRadius: 0,
        yAxisID: "y1",
      });
    }

    // Zone boost bands: upper and lower lines per active zone, filled between
    if (zoneBoosts && zoneBoosts.length > 0) {
      const activeZones = zoneBoosts.filter((z) => z.boost !== 0);
      for (const zone of activeZones) {
        const offset = ZONE_OFFSET[zone.zone] ?? 5;
        const upperData = data.map((d) => {
          if (d.time >= zone.timeStart && d.time <= zone.timeEnd && d.profileTemp != null) {
            return convertTemp(d.profileTemp + offset, tempUnit);
          }
          return null;
        });
        const lowerData = data.map((d) => {
          if (d.time >= zone.timeStart && d.time <= zone.timeEnd && d.profileTemp != null) {
            return convertTemp(d.profileTemp - offset, tempUnit);
          }
          return null;
        });

        result.push({
          label: `Zone ${zone.zone} Upper`,
          data: upperData,
          borderColor: "transparent",
          backgroundColor: ZONE_BAND_COLOR,
          borderWidth: 0,
          pointRadius: 0,
          fill: "+1",
          yAxisID: "y",
        });
        result.push({
          label: `Zone ${zone.zone} Lower`,
          data: lowerData,
          borderColor: "transparent",
          backgroundColor: ZONE_BAND_COLOR,
          borderWidth: 0,
          pointRadius: 0,
          fill: false,
          yAxisID: "y",
        });
      }
    }

    return result;
  }, [timeSeriesData, activeToggles, zoneBoosts, tempUnit]);

  const xBounds = useMemo(() => {
    switch (phaseZoom) {
      case "dry":
        return {
          min: 0,
          max: colourChangeTime != null ? colourChangeTime + PHASE_PADDING : undefined,
        };
      case "maillard":
        return {
          min: colourChangeTime != null ? Math.max(0, colourChangeTime - PHASE_PADDING) : undefined,
          max: firstCrackTime != null ? firstCrackTime + PHASE_PADDING : undefined,
        };
      case "dev":
        return {
          min: firstCrackTime != null ? Math.max(0, firstCrackTime - PHASE_PADDING) : undefined,
          max: roastEndTime != null ? roastEndTime + PHASE_PADDING : undefined,
        };
      case "all":
      default:
        return { min: 0, max: totalDuration ?? undefined };
    }
  }, [phaseZoom, colourChangeTime, firstCrackTime, roastEndTime, totalDuration]);

  const annotations = useMemo(() => {
    const result: Record<string, AnnotationOptions> = {};

    const markers: Array<{ key: string; time: number | undefined; label: string; color: string }> = [
      { key: "colourChange", time: colourChangeTime, label: "DE", color: "#c9a84c" },
      { key: "firstCrack", time: firstCrackTime, label: "FC", color: "#ef4444" },
      { key: "roastEnd", time: roastEndTime, label: "End", color: "#5a3e2b" },
    ];

    // Stagger labels when markers are close together to avoid overlap
    const COLLISION_THRESHOLD = 20; // seconds
    const LABEL_OFFSET_STEP = 22; // pixels between staggered labels
    const activeTimes = markers
      .filter((m): m is typeof m & { time: number } => m.time != null)
      .sort((a, b) => a.time - b.time);

    const offsets = new Map<string, number>();
    let currentOffset = 0;
    for (const [i, marker] of activeTimes.entries()) {
      const prev = activeTimes[i - 1];
      if (prev && marker.time - prev.time < COLLISION_THRESHOLD) {
        currentOffset += LABEL_OFFSET_STEP;
      } else {
        currentOffset = 0;
      }
      offsets.set(marker.key, currentOffset);
    }

    for (const marker of activeTimes) {
      result[marker.key] = {
        type: "line" as const,
        xMin: marker.time,
        xMax: marker.time,
        borderColor: marker.color,
        borderDash: [5, 5],
        borderWidth: 1.5,
        label: {
          display: true,
          content: marker.label,
          position: "start" as const,
          yAdjust: offsets.get(marker.key) ?? 0,
          backgroundColor: marker.color,
          color: "#fff",
          font: { size: 11, weight: "bold" as const },
          padding: { top: 2, bottom: 2, left: 4, right: 4 },
        },
      };
    }

    return result;
  }, [colourChangeTime, firstCrackTime, roastEndTime]);

  const hasSecondaryAxis =
    activeToggles.has("ror") ||
    activeToggles.has("desiredROR") ||
    activeToggles.has("fanRPM") ||
    activeToggles.has("powerKW");

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        annotation: { annotations },
        tooltip: {
          filter: (item) => {
            // Hide zone band datasets from tooltip
            const label = item.dataset.label ?? "";
            return !label.startsWith("Zone ");
          },
          callbacks: {
            title(items) {
              const raw = items[0]?.parsed?.x;
              return raw != null ? formatDuration(raw) : "";
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear" as const,
          min: xBounds.min,
          max: xBounds.max,
          grid: {
            display: showGrid,
          },
          ticks: {
            stepSize: xGridInterval ?? undefined,
            callback(value) {
              return formatDuration(value as number);
            },
          },
          title: {
            display: true,
            text: "Time",
          },
        },
        y: {
          type: "linear" as const,
          position: "left" as const,
          grid: {
            display: showGrid,
          },
          ticks: {
            stepSize: yGridInterval ?? undefined,
          },
          title: {
            display: true,
            text: tempLabel,
          },
        },
        ...(hasSecondaryAxis
          ? {
              y1: {
                type: "linear" as const,
                position: "right" as const,
                grid: { drawOnChartArea: false },
                title: {
                  display: true,
                  text: "RoR / Fan / Power",
                },
              },
            }
          : {}),
      },
    }),
    [annotations, xBounds, hasSecondaryAxis, showGrid, tempLabel, xGridInterval, yGridInterval],
  );

  const chartData: ChartData<"line"> = useMemo(
    () => ({
      labels,
      datasets,
    }),
    [labels, datasets],
  );

  return (
    <div className={styles.container} data-testid="roast-chart">
      <div className={styles.toolbar}>
        <div className={styles.toggleGroup} role="group" aria-label="Dataset toggles">
          {DATASET_CONFIG.map(({ key, label, color }) => {
            const active = activeToggles.has(key);
            return (
              <button
                key={key}
                type="button"
                className={`${styles.toggleBtn} ${active ? styles.toggleBtnActive : ""}`}
                style={
                  active
                    ? { backgroundColor: color, borderColor: color }
                    : { color, borderColor: color, backgroundColor: "transparent" }
                }
                onClick={() => handleToggle(key)}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className={styles.controls}>
          <div className={styles.phaseGroup} role="group" aria-label="Phase zoom">
            {(
              [
                { key: "all", label: "All" },
                { key: "dry", label: "Dry" },
                { key: "maillard", label: "Maillard" },
                { key: "dev", label: "Dev" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`${styles.phaseBtn} ${phaseZoom === key ? styles.phaseBtnActive : ""}`}
                onClick={() => setPhaseZoom(key)}
                aria-pressed={phaseZoom === key}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.gridSettings}>
            <button
              type="button"
              className={styles.gearBtn}
              onClick={() => setShowGridSettings((prev) => !prev)}
              aria-label="Chart settings"
              aria-expanded={showGridSettings}
            >
              &#9881;
            </button>
            {showGridSettings && (
              <div className={styles.gridPanel}>
                <label className={styles.gridToggleLabel}>
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                  />
                  Show grid lines
                </label>
                {showGrid && (
                  <>
                    <GridIntervalSelect
                      label="Time"
                      value={xGridInterval}
                      onChange={setXGridInterval}
                      options={[{ value: 30, label: "30s" }, { value: 60, label: "1 min" }, { value: 120, label: "2 min" }]}
                    />
                    <GridIntervalSelect
                      label="Temp"
                      value={yGridInterval}
                      onChange={setYGridInterval}
                      options={[{ value: 25, label: "25°" }, { value: 50, label: "50°" }, { value: 100, label: "100°" }]}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.chartWrap}>
        <Line data={chartData} options={options} aria-label="Roast profile chart showing temperature and rate of rise over time" />
      </div>
    </div>
  );
}

export { RoastChart };
export type { RoastChartProps, TimeSeriesEntry, ZoneBoost };
