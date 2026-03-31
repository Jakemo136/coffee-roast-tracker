import "../lib/chartSetup";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { ROASTS_BY_IDS_QUERY } from "../graphql/operations";
import { formatDuration, formatTemp, formatDate } from "../lib/formatters";
import { StarRating } from "../components/StarRating";
import styles from "./ComparePage.module.css";

const COMPARE_COLORS = ["#5a3e2b", "#c27a8a", "#5a7247", "#c4862a", "#7a4a6e"];

interface TimeSeriesEntry {
  time: number;
  temp: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ComparePage() {
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get("ids");
  const ids = useMemo(
    () => (idsParam ? idsParam.split(",").filter(Boolean) : []),
    [idsParam],
  );

  const { data, loading } = useQuery(ROASTS_BY_IDS_QUERY, {
    variables: { ids },
    skip: ids.length < 2,
  });

  const roasts = data?.roastsByIds ?? [];

  const chartData = useMemo<ChartData<"line">>(() => {
    const datasets = roasts.map((roast, i) => {
      const series = (roast.timeSeriesData ?? []) as Array<TimeSeriesEntry>;
      return {
        label: `${formatDate(roast.roastDate)} · ${roast.bean?.name ?? "Unknown"}`,
        data: series.map((d) => ({ x: d.time, y: d.temp })),
        borderColor: COMPARE_COLORS[i % COMPARE_COLORS.length],
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
      };
    });
    return { datasets };
  }, [roasts]);

  const chartOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: { display: false },
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
          ticks: {
            callback(value) {
              return formatTime(value as number);
            },
          },
          title: { display: true, text: "Time" },
        },
        y: {
          type: "linear" as const,
          position: "left" as const,
          title: { display: true, text: "Temperature (°C)" },
        },
      },
    }),
    [],
  );

  if (ids.length < 2) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Compare Roasts</h1>
        <p className={styles.empty}>
          Select 2+ roasts from the Dashboard to compare
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Compare Roasts</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Compare Roasts</h1>

      <div className={styles.legend}>
        {roasts.map((roast, i) => (
          <div key={roast.id} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{
                backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length],
              }}
            />
            {formatDate(roast.roastDate)} &middot; {roast.bean?.name ?? "Unknown"}
          </div>
        ))}
      </div>

      <div className={styles.chartContainer}>
        <Line data={chartData} options={chartOptions} />
      </div>

      <table className={styles.metricsTable}>
        <thead>
          <tr>
            <th>Metric</th>
            {roasts.map((roast, i) => (
              <th
                key={roast.id}
                style={{ color: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
              >
                {formatDate(roast.roastDate)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={styles.metricLabel}>Bean</td>
            {roasts.map((roast) => (
              <td key={roast.id}>{roast.bean?.name ?? "—"}</td>
            ))}
          </tr>
          <tr>
            <td className={styles.metricLabel}>Duration</td>
            {roasts.map((roast) => (
              <td key={roast.id}>{formatDuration(roast.totalDuration)}</td>
            ))}
          </tr>
          <tr>
            <td className={styles.metricLabel}>Dev Time</td>
            {roasts.map((roast) => (
              <td key={roast.id}>{formatDuration(roast.developmentTime)}</td>
            ))}
          </tr>
          <tr>
            <td className={styles.metricLabel}>DTR%</td>
            {roasts.map((roast) => {
              const dtr =
                roast.developmentTime != null && roast.totalDuration
                  ? ((roast.developmentTime / roast.totalDuration) * 100).toFixed(1)
                  : null;
              return <td key={roast.id}>{dtr != null ? `${dtr}%` : "—"}</td>;
            })}
          </tr>
          <tr>
            <td className={styles.metricLabel}>FC Temp</td>
            {roasts.map((roast) => (
              <td key={roast.id}>
                {formatTemp(roast.firstCrackTemp, "CELSIUS")}
              </td>
            ))}
          </tr>
          <tr>
            <td className={styles.metricLabel}>End Temp</td>
            {roasts.map((roast) => (
              <td key={roast.id}>
                {formatTemp(roast.roastEndTemp, "CELSIUS")}
              </td>
            ))}
          </tr>
          <tr>
            <td className={styles.metricLabel}>Dev ΔT</td>
            {roasts.map((roast) => {
              const delta =
                roast.firstCrackTemp != null && roast.roastEndTemp != null
                  ? roast.roastEndTemp - roast.firstCrackTemp
                  : null;
              return (
                <td key={roast.id}>
                  {delta != null ? `${Math.round(delta)}°C` : "—"}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={styles.metricLabel}>Rating</td>
            {roasts.map((roast) => (
              <td key={roast.id}>
                <StarRating value={roast.rating ?? null} readOnly />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
