import "../lib/chartSetup";
import { useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import type { AnnotationOptions } from "chartjs-plugin-annotation";
import styles from "./RoastChart.module.css";

interface TimeSeriesEntry {
  time: number;
  spotTemp: number;
  temp: number;
  meanTemp: number;
  profileTemp: number;
  profileROR: number;
  actualROR: number;
  desiredROR: number;
  powerKW: number;
  actualFanRPM: number;
}

interface RoastChartProps {
  timeSeriesData: Array<TimeSeriesEntry> | null;
  roastProfileCurve: Array<{ time: number; temp: number }> | null;
  fanProfileCurve: Array<{ time: number; rpm: number }> | null;
  colourChangeTime: number | null;
  colourChangeTemp: number | null;
  firstCrackTime: number | null;
  firstCrackTemp: number | null;
  roastEndTime: number | null;
  roastEndTemp: number | null;
  totalDuration: number | null;
}

type PhaseZoom = "full" | "dry" | "maillard" | "dev";

const TOGGLE_CONFIG = [
  { key: "beanTemp", label: "Bean Temp", color: "#5a3e2b" },
  { key: "envTemp", label: "Env Temp", color: "#9e9790" },
  { key: "ror", label: "RoR", color: "#c44a3b" },
  { key: "fanSpeed", label: "Fan Speed", color: "#5a7247" },
  { key: "power", label: "Power", color: "#c4862a" },
  { key: "zones", label: "Zones", color: "#c9a84c" },
] as const;

type ToggleKey = (typeof TOGGLE_CONFIG)[number]["key"];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function RoastChart({
  timeSeriesData,
  colourChangeTime,
  colourChangeTemp,
  firstCrackTime,
  firstCrackTemp,
  roastEndTime,
  roastEndTemp,
  totalDuration,
}: RoastChartProps) {
  const [activeToggles, setActiveToggles] = useState<Set<ToggleKey>>(
    () => new Set(["beanTemp"]),
  );
  const [phaseZoom, setPhaseZoom] = useState<PhaseZoom>("full");

  function handleToggle(key: ToggleKey) {
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
    () => (timeSeriesData ?? []).map((d) => d.time),
    [timeSeriesData],
  );

  const datasets = useMemo(() => {
    const data = timeSeriesData ?? [];
    const result: ChartData<"line">["datasets"] = [];

    if (activeToggles.has("beanTemp")) {
      result.push({
        label: "Bean Temp",
        data: data.map((d) => d.temp),
        borderColor: "#5a3e2b",
        backgroundColor: "rgba(90,62,43,0.1)",
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: "y",
      });
    }

    if (activeToggles.has("envTemp")) {
      result.push({
        label: "Env Temp",
        data: data.map((d) => d.spotTemp),
        borderColor: "#9e9790",
        backgroundColor: "rgba(158,151,144,0.1)",
        borderWidth: 1.5,
        pointRadius: 0,
        yAxisID: "y",
      });
    }

    if (activeToggles.has("ror")) {
      result.push({
        label: "RoR",
        data: data.map((d) => d.actualROR),
        borderColor: "#c44a3b",
        backgroundColor: "rgba(196,74,59,0.1)",
        borderWidth: 1.5,
        pointRadius: 0,
        yAxisID: "y1",
      });
    }

    if (activeToggles.has("fanSpeed")) {
      result.push({
        label: "Fan Speed",
        data: data.map((d) => d.actualFanRPM),
        borderColor: "#5a7247",
        backgroundColor: "rgba(90,114,71,0.1)",
        borderWidth: 1.5,
        pointRadius: 0,
        yAxisID: "y1",
      });
    }

    if (activeToggles.has("power")) {
      result.push({
        label: "Power",
        data: data.map((d) => d.powerKW),
        borderColor: "#c4862a",
        backgroundColor: "rgba(196,134,42,0.1)",
        borderWidth: 1.5,
        pointRadius: 0,
        yAxisID: "y1",
      });
    }

    return result;
  }, [timeSeriesData, activeToggles]);

  const xBounds = useMemo(() => {
    switch (phaseZoom) {
      case "dry":
        return { min: 0, max: colourChangeTime ?? undefined };
      case "maillard":
        return {
          min: colourChangeTime ?? undefined,
          max: firstCrackTime ?? undefined,
        };
      case "dev":
        return {
          min: firstCrackTime ?? undefined,
          max: roastEndTime ?? undefined,
        };
      case "full":
      default:
        return { min: 0, max: totalDuration ?? undefined };
    }
  }, [phaseZoom, colourChangeTime, firstCrackTime, roastEndTime, totalDuration]);

  const annotations = useMemo(() => {
    const result: Record<string, AnnotationOptions> = {};

    if (colourChangeTime != null) {
      result.colourChange = {
        type: "line" as const,
        xMin: colourChangeTime,
        xMax: colourChangeTime,
        borderColor: "#c9a84c",
        borderDash: [5, 5],
        borderWidth: 1,
        label: {
          display: true,
          content: `CC ${colourChangeTemp ?? ""}°`,
          position: "start" as const,
        },
      };
    }

    if (firstCrackTime != null) {
      result.firstCrack = {
        type: "line" as const,
        xMin: firstCrackTime,
        xMax: firstCrackTime,
        borderColor: "#c44a3b",
        borderDash: [5, 5],
        borderWidth: 1,
        label: {
          display: true,
          content: `FC ${firstCrackTemp ?? ""}°`,
          position: "start" as const,
        },
      };
    }

    if (roastEndTime != null) {
      result.roastEnd = {
        type: "line" as const,
        xMin: roastEndTime,
        xMax: roastEndTime,
        borderColor: "#5a3e2b",
        borderDash: [5, 5],
        borderWidth: 1,
        label: {
          display: true,
          content: `End ${roastEndTemp ?? ""}°`,
          position: "start" as const,
        },
      };
    }

    if (activeToggles.has("zones")) {
      if (colourChangeTime != null) {
        result.dryingZone = {
          type: "box" as const,
          xMin: 0,
          xMax: colourChangeTime,
          backgroundColor: "rgba(201,168,76,0.08)",
          borderWidth: 0,
        };
      }
      if (colourChangeTime != null && firstCrackTime != null) {
        result.maillardZone = {
          type: "box" as const,
          xMin: colourChangeTime,
          xMax: firstCrackTime,
          backgroundColor: "rgba(168,133,69,0.08)",
          borderWidth: 0,
        };
      }
      if (firstCrackTime != null && roastEndTime != null) {
        result.devZone = {
          type: "box" as const,
          xMin: firstCrackTime,
          xMax: roastEndTime,
          backgroundColor: "rgba(196,74,59,0.08)",
          borderWidth: 0,
        };
      }
    }

    return result;
  }, [
    colourChangeTime,
    colourChangeTemp,
    firstCrackTime,
    firstCrackTemp,
    roastEndTime,
    roastEndTemp,
    activeToggles,
  ]);

  const hasSecondaryAxis =
    activeToggles.has("ror") ||
    activeToggles.has("fanSpeed") ||
    activeToggles.has("power");

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
          callbacks: {
            title(items) {
              const raw = items[0]?.parsed?.x;
              return raw != null ? formatTime(raw) : "";
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear" as const,
          min: xBounds.min,
          max: xBounds.max,
          ticks: {
            callback(value) {
              return formatTime(value as number);
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
          title: {
            display: true,
            text: "Temperature (°C)",
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
    [annotations, xBounds, hasSecondaryAxis],
  );

  const chartData: ChartData<"line"> = useMemo(
    () => ({
      labels,
      datasets,
    }),
    [labels, datasets],
  );

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toggleGroup}>
          {TOGGLE_CONFIG.map(({ key, label, color }) => {
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
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className={styles.phaseGroup}>
          {(
            [
              { key: "full", label: "Full" },
              { key: "dry", label: "Dry" },
              { key: "maillard", label: "Maill." },
              { key: "dev", label: "Dev" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`${styles.phaseBtn} ${phaseZoom === key ? styles.phaseBtnActive : ""}`}
              onClick={() => setPhaseZoom(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.chartWrap}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

export { RoastChart };
export type { RoastChartProps };
