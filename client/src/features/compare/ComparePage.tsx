import "../../lib/chartSetup";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { ROASTS_BY_IDS_QUERY } from "../../graphql/operations";
import { useTempUnit } from "../../providers/AppProviders";
import { formatDuration, formatTemp, formatDate } from "../../lib/formatters";
import { celsiusToFahrenheit } from "../../lib/tempConversion";
import { StarRating } from "../../components/StarRating";
import { ErrorState } from "../../components/ErrorState";
import { SkeletonLoader } from "../../components/SkeletonLoader";
import styles from "./ComparePage.module.css";

const COMPARE_COLORS = ["#5a3e2b", "#c27a8a", "#5a7247", "#c4862a", "#7a4a6e"];

interface TimeSeriesEntry {
  time: number;
  temp: number;
  meanTemp?: number;
}

export function ComparePage() {
  const [searchParams] = useSearchParams();
  const { tempUnit } = useTempUnit();
  const idsParam = searchParams.get("ids");
  const ids = useMemo(
    () => (idsParam ? idsParam.split(",").filter(Boolean) : []),
    [idsParam],
  );

  const { data, loading, error, refetch } = useQuery(ROASTS_BY_IDS_QUERY, {
    variables: { ids },
    skip: ids.length < 2,
  });

  const roasts = data?.roastsByIds ?? [];

  const chartData = useMemo<ChartData<"line">>(() => {
    const datasets = roasts.map((roast, i) => {
      const series = (roast.timeSeriesData ?? []) as Array<TimeSeriesEntry>;
      return {
        label: `${formatDate(roast.roastDate)} · ${roast.bean?.name ?? "Unknown"}`,
        data: series.map((d) => {
          const tempC = d.meanTemp ?? d.temp;
          return { x: d.time, y: tempC != null && tempUnit === "FAHRENHEIT" ? celsiusToFahrenheit(tempC) : tempC };
        }),
        borderColor: COMPARE_COLORS[i % COMPARE_COLORS.length],
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
      };
    });
    return { datasets };
  }, [roasts, tempUnit]);

  const tempLabel = tempUnit === "FAHRENHEIT" ? "Temperature (\u00b0F)" : "Temperature (\u00b0C)";

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
              return raw != null ? formatDuration(raw) : "";
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear" as const,
          ticks: {
            callback(value) {
              return formatDuration(value as number);
            },
          },
          title: { display: true, text: "Time" },
        },
        y: {
          type: "linear" as const,
          position: "left" as const,
          title: { display: true, text: tempLabel },
        },
      },
    }),
    [tempLabel],
  );

  // No IDs provided
  if (ids.length < 2) {
    return (
      <div className={styles.page} data-testid="compare-page">
        <h1 className={styles.title}>Compare Roasts</h1>
        <p className={styles.empty}>
          Select roasts to compare from the dashboard
        </p>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className={styles.page} data-testid="compare-page">
        <h1 className={styles.title}>Compare Roasts</h1>
        <SkeletonLoader variant="card" count={2} />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className={styles.page} data-testid="compare-page">
        <h1 className={styles.title}>Compare Roasts</h1>
        <ErrorState
          message={`Error loading roasts: ${error.message}`}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="compare-page">
      <h1 className={styles.title}>Compare Roasts</h1>

      {/* Legend */}
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

      {/* Chart */}
      <div className={styles.chartContainer} data-testid="compare-chart">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Comparison metrics table */}
      <table className={styles.metricsTable} data-testid="compare-metrics">
        <thead>
          <tr>
            <th>Roast</th>
            <th>Bean</th>
            <th>Duration</th>
            <th>Dev Time</th>
            <th>DTR%</th>
            <th>FC Temp</th>
            <th>End Temp</th>
            <th>Dev {"\u0394"}T</th>
            <th>Rating</th>
          </tr>
        </thead>
        <tbody>
          {roasts.map((roast, i) => {
            const color = COMPARE_COLORS[i % COMPARE_COLORS.length];
            const dtr =
              roast.developmentTime != null && roast.totalDuration
                ? ((roast.developmentTime / roast.totalDuration) * 100).toFixed(1)
                : null;
            const delta =
              roast.firstCrackTemp != null && roast.roastEndTemp != null
                ? roast.roastEndTemp - roast.firstCrackTemp
                : null;
            return (
              <tr
                key={roast.id}
                className={styles.roastRow}
                style={{ borderLeftColor: color }}
              >
                <td className={styles.roastLabel}>
                  {formatDate(roast.roastDate)}
                </td>
                <td>{roast.bean?.name ?? "\u2014"}</td>
                <td>{formatDuration(roast.totalDuration)}</td>
                <td>{formatDuration(roast.developmentTime)}</td>
                <td>{dtr != null ? `${dtr}%` : "\u2014"}</td>
                <td>{formatTemp(roast.firstCrackTemp, tempUnit)}</td>
                <td>{formatTemp(roast.roastEndTemp, tempUnit)}</td>
                <td>{delta != null ? formatTemp(delta, tempUnit) : "\u2014"}</td>
                <td><StarRating value={roast.rating ?? 0} readOnly size="sm" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
