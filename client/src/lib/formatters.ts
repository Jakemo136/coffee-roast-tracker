import { celsiusToFahrenheit } from "./tempConversion";

type TempUnit = "CELSIUS" | "FAHRENHEIT";

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatTemp(
  celsius: number | null | undefined,
  unit: TempUnit,
): string {
  if (celsius == null) return "—";
  if (unit === "FAHRENHEIT") {
    return `${Math.round(celsiusToFahrenheit(celsius))}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
