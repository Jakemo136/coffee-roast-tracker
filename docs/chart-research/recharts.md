# Recharts — Chart Library Evaluation

**Library:** [Recharts](https://recharts.org/)
**Version evaluated:** 3.3.0 (stable, 2025)
**License:** MIT
**GitHub:** ~25k stars, actively maintained
**Evaluated for:** Coffee roast curve visualization (time-series, multi-line, annotations, interactivity)

---

## Overview and Philosophy

Recharts is a declarative charting library built on React and D3. Its core philosophy is that charts should be composed from React components — `<LineChart>`, `<XAxis>`, `<Tooltip>`, `<Line>` — rather than configured through a single options object. Each visual element is a component with props, making charts readable and familiar to React developers.

Key design principles:

- **Declarative composition.** Charts are built by nesting components inside a chart container. Add a `<Line>`, get a line. Add a `<ReferenceLine>`, get an annotation.
- **Built-in chart types.** Provides `LineChart`, `BarChart`, `AreaChart`, `ComposedChart`, `ScatterChart`, etc. out of the box — no assembly required.
- **D3 under the hood.** Scales, layouts, and math are handled by D3, but you rarely interact with D3 directly.
- **SVG rendering.** All output is SVG, which means CSS styling, browser dev tools inspection, and accessibility attributes work natively.

Recharts 3.x is a significant rewrite from 2.x with improved TypeScript support, better performance, and a modernized internal architecture.

---

## Strengths for This Use Case

### Fast time to a working chart

A multi-line time-series chart with tooltips, axes, and a grid can be built in under 30 lines of JSX. For a roast curve prototype, you can have something rendering in minutes rather than hours. The declarative API maps directly to what you see.

### Built-in dual Y-axis support

Recharts natively supports multiple Y-axes via `yAxisId`. Each `<YAxis>` gets an ID, and each `<Line>` references which axis it belongs to. Temperature on the left axis and ROR/power/fan on the right axis is a first-class pattern — no workarounds needed.

### ReferenceLine and ReferenceArea for annotations

`<ReferenceLine>` supports vertical and horizontal lines with labels, stroke customization, and dash arrays. Marking first crack, colour change, and roast end as vertical lines at specific time values is a one-liner per event. `<ReferenceArea>` can highlight phases (e.g., development time) as shaded regions.

### Brush component for time-axis zoom

The built-in `<Brush>` component renders a range selector below the chart, allowing users to zoom into a time window. It can display a miniature version of the chart data for context. This covers the primary zoom use case for roast analysis without any custom implementation.

### Custom tooltips

The `<Tooltip content={<CustomTooltip />} />` pattern lets you render any React component as the tooltip. For roast curves, this means displaying all 6 series values at the hovered time point with formatted labels, colors, and units — fully controlled.

### ResponsiveContainer

`<ResponsiveContainer>` wraps any chart and makes it fill its parent's width and height. Desktop and tablet layouts work without hardcoded dimensions.

### Legend with click-to-toggle

The `<Legend>` component supports `onClick` handlers. Combined with component state, you can toggle series visibility by clicking legend items — a common requirement for charts with 6+ series where users want to focus on specific metrics.

### Familiar API for React developers

No D3 knowledge required. The component-based API means any React developer on the team can read, modify, and maintain chart code without a specialized skill set.

---

## Weaknesses for This Use Case

### No true pan interaction

Recharts does not provide drag-to-pan or scroll-to-zoom on the chart area itself. The `<Brush>` component handles range selection, but it's a separate control below the chart — not an in-chart gesture. If users expect to click-and-drag the chart to pan along the time axis (as in Artisan or Cropster), you'd need to build this yourself by managing the X-axis domain in state and handling pointer events, which fights Recharts' declarative model.

### Limited to two Y-axes in practice

While Recharts technically supports multiple `yAxisId` values, the layout engine positions axes on the left or right. With three or more Y-axes (temperature, ROR, power, fan), you end up stacking axes on the same side, which gets visually crowded. You can work around this with custom positioning, but it's not elegant. For this app, two axes (temperature left, secondary metrics right) is workable but constraining.

### No built-in data decimation or downsampling

Recharts renders every data point it receives. With 400 points per series and 6 series across 4 overlaid roasts (9,600 points), there's no built-in mechanism to reduce point density at wider zoom levels. You'd need to implement downsampling yourself before passing data to the chart.

### Single `data` array model complicates multi-roast overlay

Recharts charts expect a single `data` array where each object contains all series values. Overlaying multiple roasts means either: (a) merging roast data into a unified time-indexed array where each object has `roast1SpotTemp`, `roast2SpotTemp`, etc., or (b) using a `<ComposedChart>` with separate `<Line>` components that reference different data arrays (supported but less documented). Approach (a) works but requires data transformation and generates verbose dataKey names. This is a friction point compared to libraries that let each series reference independent data.

### SVG performance ceiling with many overlaid roasts

At 4 roasts with 6 series each, you're rendering 24 SVG `<path>` elements with 400 points each. This is within SVG's comfort zone on desktop but may show jank on lower-powered tablets during rapid interactions (tooltip tracking, brush dragging). Recharts 3.x improved rendering performance, but it's still SVG — there's no canvas fallback.

### Custom axis formatting requires workarounds

Tick formatting via `tickFormatter` works for simple cases, but advanced axis customization (rotated labels, multi-line ticks, adaptive tick density based on zoom level) requires the `tick` prop with a custom SVG component. This drops you into raw SVG rendering, which breaks the high-level abstraction.

### Animation overhead on large datasets

Recharts animates chart transitions by default. With 24 series, animation on initial render or data change can cause visible stutter. You'll want `isAnimationActive={false}` on `<Line>` components for production roast charts, which defeats one of the library's selling points.

---

## Performance Assessment

| Scenario | Data Points | Expected Performance |
|---|---|---|
| Single roast, 6 series | ~2,400 SVG path points | Excellent — no perceptible lag |
| 2 roasts overlaid, 6 series each | ~4,800 SVG path points | Good — smooth on all devices |
| 4 roasts overlaid, 6 series each | ~9,600 SVG path points | Adequate — disable animations, test on tablet |
| 4 roasts + brush interaction + tooltips | ~9,600 + interaction handlers | Marginal — brush drag may feel sluggish on low-end devices |

### Mitigation strategies

- **Disable animations:** Set `isAnimationActive={false}` on all `<Line>` components for data-heavy charts.
- **Disable dots:** Set `dot={false}` to avoid rendering 400 individual `<circle>` elements per line (this is critical — the default renders a dot per data point).
- **Downsample data:** Pre-process roast data to reduce point density when zoomed out. Recharts won't do this for you.
- **Use `monotone` curve type:** `curveMonotoneX` produces smooth paths with fewer SVG commands than `linear` interpolation on dense data.

Recharts does **not** offer built-in decimation, virtualization, or canvas rendering. For the expected data volume (up to ~10k points), SVG is workable with the mitigations above, but there's no headroom.

---

## Multi-Roast Comparison

Recharts expects a flat data array. To overlay multiple roasts, you have two approaches:

### Approach 1: Merged data array (recommended for Recharts)

Transform roast data into a single time-indexed array:

```typescript
interface MergedDataPoint {
  time: number;
  roast1_spotTemp?: number;
  roast1_meanTemp?: number;
  roast2_spotTemp?: number;
  roast2_meanTemp?: number;
  // ... etc
}
```

Then render a `<Line>` for each `roast{N}_{metric}` dataKey. This works but creates a wide, sparse data object and requires dynamic dataKey generation.

### Approach 2: Multiple Line components with different data

In `<ComposedChart>`, individual `<Line>` components can accept a `data` prop that overrides the chart-level data. This lets each roast keep its own array:

```tsx
<ComposedChart data={[]}>
  <Line data={roast1Data} dataKey="spotTemp" />
  <Line data={roast2Data} dataKey="spotTemp" />
</ComposedChart>
```

This is cleaner but less documented, and tooltip behavior with mixed data sources requires custom handling.

Neither approach is as natural as libraries that model each series independently.

---

## Annotations (Reference Lines)

Recharts' `<ReferenceLine>` component is well-suited for roast event markers:

```tsx
<ReferenceLine
  x={eventTimeInSeconds}
  stroke="#f59e0b"
  strokeDasharray="4 4"
  label={{ value: "First Crack", position: "top", fill: "#f59e0b" }}
/>
```

Features:

- Vertical lines via `x` prop, horizontal via `y` prop
- Label positioning: `top`, `bottom`, `left`, `right`, `insideTopLeft`, etc.
- Custom label rendering via `label` as a React element
- Stroke styling (color, dash array, width)
- `<ReferenceArea>` for highlighting phases (e.g., development time as a shaded region between first crack and roast end)
- Reference lines participate in the chart's coordinate system and respond to brush/zoom changes

This is one of Recharts' genuine strengths for this use case.

---

## Customization

### Dual Y-axes

```tsx
<YAxis yAxisId="temp" orientation="left" domain={[0, 250]} label="Temp (C)" />
<YAxis yAxisId="secondary" orientation="right" domain={[0, 100]} label="ROR / Power / Fan" />

<Line yAxisId="temp" dataKey="spotTemp" />
<Line yAxisId="secondary" dataKey="ror" />
```

Works well for two axes. A third axis is technically possible but requires manual margin and layout management.

### Custom tooltips

Full control via the `content` prop — render any React component. Access all series values at the hovered point through the `payload` array.

### Axis formatting

`tickFormatter` handles simple cases (time formatting, unit suffixes). For complex ticks, use the `tick` prop with a custom component.

### Curve interpolation

Supports D3 curve types: `monotone`, `monotoneX`, `linear`, `step`, `natural`, `basis`. `monotoneX` is ideal for roast curves — it preserves monotonicity and avoids overshoot between data points.

---

## Bundle Size

Recharts ships as a single package. Approximate sizes:

| Metric | Size |
|---|---|
| Package (unpacked) | ~2.3 MB |
| Minified | ~500 KB |
| Minified + gzipped | ~65 KB |
| Tree-shaken (typical chart) | ~45-55 KB gzipped |

Recharts is not modular — you install the full package even if you only use `LineChart`. Tree-shaking removes unused chart types, but shared internals (scales, animation, layout engine) are always included. This is larger than visx's low-level approach (~33 KB) but comparable to visx's xychart (~45-55 KB).

Dependencies include D3 modules (`d3-scale`, `d3-shape`, `d3-interpolate`), `react-smooth` (animation), and `victory-vendor` (D3 bundling).

---

## Maintenance and Community

- **GitHub stars:** ~25,000
- **npm weekly downloads:** ~2.5M+ (one of the most popular React chart libraries)
- **Release cadence:** Active — Recharts 3.x shipped in 2024-2025 with regular patch releases
- **React 19 support:** Recharts 3.x supports React 18 and 19. The v3 rewrite removed legacy React patterns (class components, deprecated lifecycle methods). No peer dependency issues with React 19.
- **TypeScript:** First-class TypeScript support in 3.x. Components are generically typed, and the `content` / `shape` / `tick` render props have proper type signatures.
- **Open issues:** ~200-300 open issues (typical for a library of this popularity). Most are feature requests rather than bugs.
- **Bus factor:** Maintained by a small core team with community contributions. Not backed by a large company (unlike visx/Airbnb), but the large user base ensures continued attention.

---

## Code Example

A TypeScript React component showing a multi-line roast curve chart with dual Y-axes, reference lines for events, a custom tooltip, and a brush for zoom.

```tsx
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Brush,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
import type {
  ValueType,
  NameType,
} from "recharts/types/component/DefaultTooltipContent";

// --- Types ---

interface RoastDataPoint {
  time: number; // seconds from start
  spotTemp: number;
  meanTemp: number;
  profileTemp: number;
  ror: number;
  powerKw: number;
  fanRpm: number;
}

interface RoastEvent {
  time: number;
  label: string;
  color: string;
}

interface RoastCurveChartProps {
  data: RoastDataPoint[];
  events: RoastEvent[];
  roastName: string;
}

// --- Series configuration ---

const TEMP_SERIES = [
  { dataKey: "spotTemp", label: "Spot Temp", color: "#ef4444", strokeWidth: 2 },
  { dataKey: "meanTemp", label: "Mean Temp", color: "#f97316", strokeWidth: 2 },
  {
    dataKey: "profileTemp",
    label: "Profile Temp",
    color: "#eab308",
    strokeWidth: 1.5,
    strokeDasharray: "6 3",
  },
] as const;

const SECONDARY_SERIES = [
  { dataKey: "ror", label: "Rate of Rise", color: "#22c55e", strokeWidth: 1.5 },
  { dataKey: "powerKw", label: "Power (kW)", color: "#3b82f6", strokeWidth: 1 },
  { dataKey: "fanRpm", label: "Fan RPM", color: "#8b5cf6", strokeWidth: 1 },
] as const;

// --- Helpers ---

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// --- Custom tooltip ---

function RoastTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "#1f2937",
        border: "1px solid #374151",
        borderRadius: 6,
        padding: "8px 12px",
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
      }}
    >
      <div style={{ color: "#e5e7eb", fontWeight: 600, marginBottom: 4 }}>
        {formatTime(label as number)}
      </div>
      {payload.map((entry) => (
        <div key={entry.name} style={{ color: entry.color, padding: "1px 0" }}>
          {entry.name}: {Number(entry.value).toFixed(1)}
        </div>
      ))}
    </div>
  );
}

// --- Chart component ---

function RoastCurveChart({ data, events, roastName }: RoastCurveChartProps) {
  return (
    <div style={{ width: "100%", height: 520 }}>
      <h3 style={{ margin: "0 0 8px 0" }}>{roastName}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 60, bottom: 10, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

          {/* Time axis */}
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatTime}
            stroke="#9ca3af"
            tick={{ fontSize: 11 }}
          />

          {/* Temperature axis (left) */}
          <YAxis
            yAxisId="temp"
            orientation="left"
            domain={[0, 250]}
            tickFormatter={(v: number) => `${v}\u00B0`}
            stroke="#9ca3af"
            tick={{ fontSize: 11 }}
            label={{
              value: "Temperature (\u00B0C)",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#9ca3af", fontSize: 12 },
            }}
          />

          {/* Secondary axis (right) — ROR, power, fan */}
          <YAxis
            yAxisId="secondary"
            orientation="right"
            domain={[0, 100]}
            stroke="#9ca3af"
            tick={{ fontSize: 11 }}
            label={{
              value: "ROR / Power / Fan",
              angle: 90,
              position: "insideRight",
              style: { fill: "#9ca3af", fontSize: 12 },
            }}
          />

          {/* Temperature lines */}
          {TEMP_SERIES.map((series) => (
            <Line
              key={series.dataKey}
              yAxisId="temp"
              type="monotone"
              dataKey={series.dataKey}
              name={series.label}
              stroke={series.color}
              strokeWidth={series.strokeWidth}
              strokeDasharray={
                "strokeDasharray" in series ? series.strokeDasharray : undefined
              }
              dot={false}
              isAnimationActive={false}
            />
          ))}

          {/* Secondary metric lines */}
          {SECONDARY_SERIES.map((series) => (
            <Line
              key={series.dataKey}
              yAxisId="secondary"
              type="monotone"
              dataKey={series.dataKey}
              name={series.label}
              stroke={series.color}
              strokeWidth={series.strokeWidth}
              dot={false}
              isAnimationActive={false}
            />
          ))}

          {/* Event annotations (vertical reference lines) */}
          {events.map((event) => (
            <ReferenceLine
              key={event.label}
              x={event.time}
              yAxisId="temp"
              stroke={event.color}
              strokeDasharray="4 4"
              label={{
                value: event.label,
                position: "top",
                fill: event.color,
                fontSize: 11,
              }}
            />
          ))}

          <Tooltip content={<RoastTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            wrapperStyle={{ fontSize: 12 }}
          />

          {/* Brush for time-axis zoom */}
          <Brush
            dataKey="time"
            height={24}
            stroke="#6b7280"
            fill="#111827"
            tickFormatter={formatTime}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export { RoastCurveChart };
export type { RoastDataPoint, RoastEvent, RoastCurveChartProps };

// --- Usage example ---
//
// const events: RoastEvent[] = [
//   { time: 375, label: "Colour Change", color: "#f59e0b" },
//   { time: 512, label: "First Crack", color: "#ef4444" },
//   { time: 660, label: "Roast End", color: "#6b7280" },
// ];
//
// <RoastCurveChart data={roastData} events={events} roastName="Ethiopia Yirgacheffe — March 2026" />
```

### What this example demonstrates

- **Dual Y-axes:** Temperature on the left (0-250 C), secondary metrics on the right (0-100)
- **6 line series** with distinct colors, widths, and dash patterns
- **Vertical reference lines** for roast events (colour change, first crack, roast end)
- **Custom tooltip** showing all values at the hovered time point
- **Brush** for time-axis zoom/range selection
- **Responsive** via `<ResponsiveContainer>`
- **Performance-conscious:** `dot={false}` and `isAnimationActive={false}` on all lines

### What this example does not cover

- **Multi-roast overlay:** Would require merging data arrays or using per-`<Line>` data props in `<ComposedChart>`, plus a per-roast color scheme.
- **Legend toggle:** Add an `onClick` handler to `<Legend>` that toggles series visibility in component state.
- **True pan/zoom:** The `<Brush>` covers range selection but not click-drag panning on the chart area itself.

---

## Verdict

**Recharts is a viable but not ideal fit for this use case.** It excels at getting a multi-line chart with dual axes, annotations, and tooltips working quickly. The declarative API is maintainable and approachable for the whole team. Reference lines for roast events are a genuine strength.

**Where it falls short:** The single-data-array model creates friction for multi-roast overlay. There's no built-in data decimation for large datasets. The `<Brush>` is functional but not the same as true chart pan/zoom. And while two Y-axes work well, the library becomes awkward if you later need a third axis for fan RPM or power.

**When to choose Recharts:**

- You prioritize development speed and team familiarity over pixel-perfect control
- Multi-roast comparison is limited to 2 overlaid roasts (manageable data merging)
- Brush-based zoom is sufficient (no need for drag-to-pan)
- You want a well-maintained library with strong community support and no React 19 compatibility concerns

**When to look elsewhere:**

- You need 3+ roasts overlaid with independent data arrays per series
- You want true pan/zoom gestures on the chart area
- You anticipate needing 3+ Y-axes or highly custom axis layouts
- You need fine-grained control over every SVG element
