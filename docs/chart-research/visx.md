# Visx — Chart Library Evaluation

**Library:** [Visx](https://airbnb.io/visx/) (by Airbnb)
**Version evaluated:** 3.12.0 (stable, Nov 2024) / 4.0.1-alpha.0 (React 19 support, Nov 2025)
**License:** MIT
**GitHub:** ~20.7k stars, 149 open issues, actively maintained
**Evaluated for:** Coffee roast curve visualization (time-series, multi-line, annotations, interactivity)

---

## Overview and Philosophy

Visx is a collection of low-level visualization primitives that wrap D3 concepts as React components. Rather than providing opinionated chart types (bar chart, line chart, etc.), visx gives you composable building blocks — scales, axes, shapes, tooltips, annotations, zoom — and lets you assemble them into exactly the chart you need.

Key design principles:

- **React-native rendering.** Components render to SVG via React's reconciler, not through D3's DOM manipulation. No `useEffect` + `d3.select` escape hatches needed.
- **Modular packages.** ~30 scoped packages (`@visx/shape`, `@visx/scale`, `@visx/axis`, etc.) — import only what you use.
- **Unopinionated.** No built-in themes, no magic layouts. You control every pixel.
- **Two API levels.** Low-level primitives for full control, plus `@visx/xychart` as a higher-level composable chart API that handles layout, tooltips, and theming with less boilerplate.

---

## Strengths for This Use Case

### Full control over multi-line time-series layout

Roast curves are specialized charts — 6+ lines with dual Y-axes (temperature on left, ROR/power/fan on right), dense data, and domain-specific annotations. Visx's composable model lets you build exactly this layout without fighting a high-level chart API that wasn't designed for it. You place each `<LineSeries>` or `<LinePath>` explicitly, configure independent Y scales, and position axes wherever needed.

### Dual/multiple Y-axis support

Unlike Recharts (which supports dual Y-axis but makes 3+ axes awkward), visx lets you create as many scales and axes as needed. Temperature, ROR, power, and fan RPM can each get their own scale and axis, positioned and styled independently.

### Annotation system

`@visx/annotation` provides `<AnnotationLine>`, `<AnnotationLabel>`, and composable annotation connectors. Vertical reference lines for first crack, colour change, and roast end are straightforward — just position a line at the timestamp's x-coordinate with a label. The `@visx/xychart` API also supports `<AnnotationLineSubject>` for declarative annotations within the chart context.

### SVG rendering scales well at 400 data points

400 points per series is well within SVG's comfort zone. Even with 6 series overlaid (2,400 total points), modern browsers handle SVG path rendering without perceptible lag. Visx renders paths via `<LinePath>` which produces a single `<path>` element per series — the browser composites 6 paths, not 2,400 individual elements.

### Multi-roast overlay is just data composition

Comparing 2-4 roasts on the same chart means rendering 8-24 line series. Since visx doesn't impose a "one dataset" model, you simply map over your roast data and render a `<LinePath>` per series per roast. Synchronized time axes come naturally — all series share the same X scale.

### Tooltip precision with Voronoi

`@visx/voronoi` and `@visx/tooltip` let you build nearest-point tooltips that snap to the closest data point across all series. For dense time-series data, Voronoi-based hit detection is far more precise than the "nearest X-value" approach used by most chart libraries. `@visx/xychart` also provides a built-in `<Tooltip>` component with crosshair support.

### Zoom and pan

`@visx/zoom` provides a `<Zoom>` component with transform matrix management. You can restrict zoom to the X-axis only (time axis zoom) while keeping Y-axes fixed — exactly what roast curve exploration needs.

### Responsive containers

`@visx/responsive` provides `<ParentSize>` and `withParentSize` HOC. The chart re-renders at the container's dimensions, making it work across desktop and tablet without hardcoded sizes.

### Modular bundle

You only import what you use. A typical roast chart might pull in `@visx/shape`, `@visx/scale`, `@visx/axis`, `@visx/grid`, `@visx/tooltip`, `@visx/annotation`, `@visx/responsive`, and `@visx/zoom`. Each package is small (2-15 KB gzipped). Using `@visx/xychart` pulls in more but is still reasonable (~40-50 KB gzipped including dependencies).

---

## Weaknesses and Limitations

### React 19 compatibility requires alpha/v4

The stable release (3.12.0) declares `react: "^16 || ^17 || ^18"` in peer dependencies. React 19 support landed in 4.0.1-alpha.0 (Nov 2025), which is not yet stable. In practice, visx 3.x often works with React 19 since it doesn't use removed APIs, but there's no official guarantee. You'll either need to:

- Use the v4 alpha (risk: API changes before stable)
- Use v3 with React 19 and accept the peer dependency warning
- Pin React 18 initially and upgrade later

### Significant boilerplate for complex charts

Building a roast curve chart with dual Y-axes, 6+ series, tooltips, zoom, annotations, and a legend will be 200-400 lines of code even with `@visx/xychart`. With low-level primitives, expect 400-600+ lines. Every axis, every tooltip behavior, every legend interaction is your responsibility.

### No built-in legend toggle

Visx provides `@visx/legend` for rendering legend items, but toggling series visibility on click is not built in. You'll need to manage visible/hidden state yourself and conditionally render series — straightforward but manual.

### No built-in pan gesture handling

`@visx/zoom` handles zoom transforms but doesn't provide scroll-to-zoom or drag-to-pan out of the box in a polished way. You'll need to wire up wheel events and pointer events yourself, or use the zoom component's constrained transform API.

### Tooltip for multi-series requires custom logic

When hovering over a roast chart, you want to see all 6 values at the current time position. Visx tooltips are low-level — you get the hover coordinates and need to look up the nearest data point in each series yourself. `@visx/xychart`'s `<Tooltip>` handles multi-series tooltips better but still requires configuration.

### Documentation gaps

Visx's documentation is example-driven rather than reference-driven. The examples are excellent for learning patterns, but when you need to customize deeply (e.g., custom zoom constraints, complex annotation positioning), you'll often end up reading source code.

### Animation requires react-spring

`@visx/xychart` uses `@react-spring/web` for transitions. If you don't need animations, this is unnecessary weight. The low-level primitives don't require it.

---

## Performance Assessment

| Scenario | Data Points | Expected Performance |
|---|---|---|
| Single roast, 6 series | ~2,400 SVG path points | Excellent — no perceptible lag |
| 4 roasts overlaid, 6 series each | ~9,600 SVG path points | Good — smooth on modern hardware |
| 4 roasts + zoom/pan + tooltips | ~9,600 + interaction handlers | Good — Voronoi recalc on zoom may need throttling |
| Real-time streaming (live roast) | Appending points every ~0.5s | Needs care — re-rendering 6 `<LinePath>` components on every data point addition; consider windowing or `requestAnimationFrame` batching |

SVG path rendering is the right approach here. Canvas would only become necessary at 50k+ points, which roast data never approaches. The main performance consideration is tooltip hit-testing during rapid mouse movement — Voronoi lookup is O(1) after initial construction, so this is fast.

---

## Multi-Chart Overlay (Comparing Roasts)

Visx handles this naturally. The approach:

1. Define a single time (X) scale spanning the longest roast duration
2. Define shared Y scales (temperature, ROR, etc.)
3. For each roast, render its series as `<LinePath>` components with distinct colors
4. Use a color scheme per roast (e.g., Roast A = blues, Roast B = reds) with line style variations (solid, dashed) to distinguish series type

There's no "dataset" abstraction to fight against. You render exactly what you want.

---

## Annotation / Reference Line Support

`@visx/annotation` provides:

- **`<AnnotationLineSubject>`** — vertical or horizontal reference lines
- **`<AnnotationLabel>`** — positioned text labels with optional background
- **`<AnnotationConnector>`** — lines connecting labels to subjects

For roast events (first crack at t=8:32, colour change at t=6:15, etc.), you'd render a vertical line at the X position with a label. With `@visx/xychart`, annotations participate in the chart's scale context automatically.

Alternatively, at the low level, a vertical annotation is just an SVG `<line>` from `y=0` to `y=chartHeight` at `xScale(eventTime)` — dead simple.

---

## Customization Depth

This is visx's primary selling point. You have control over:

- Exact SVG structure and nesting
- Any D3 scale type (linear, log, time, band, etc.)
- Axis tick formatting, count, and positioning
- Grid line styling and density
- Curve interpolation (monotoneX recommended for roast curves — avoids overshoot between data points)
- Tooltip content, positioning, and styling (it's just a React component)
- Color schemes (no theme to override — you set colors directly)
- Clip paths for zoom regions
- Any SVG attribute on any element

If you need a specific visual treatment — say, a shaded region between two temperature curves, or a gradient fill under the ROR line — it's just SVG composition. No API limitation stands in the way.

---

## Bundle Size

Visx is modular. Approximate gzipped sizes for packages you'd use:

| Package | Gzipped |
|---|---|
| `@visx/shape` | ~5 KB |
| `@visx/scale` | ~2 KB (wraps d3-scale) |
| `@visx/axis` | ~5 KB |
| `@visx/grid` | ~3 KB |
| `@visx/tooltip` | ~3 KB |
| `@visx/annotation` | ~4 KB |
| `@visx/responsive` | ~2 KB |
| `@visx/zoom` | ~3 KB |
| `@visx/voronoi` | ~2 KB |
| `@visx/legend` | ~4 KB |
| **Total (low-level)** | **~33 KB** |
| `@visx/xychart` (includes many of the above) | **~45-55 KB** |

For comparison: Recharts is ~45 KB gzipped, Chart.js is ~65 KB. Visx's low-level approach is competitive; the xychart convenience layer is comparable to alternatives.

---

## Community and Maintenance Status

- **Stars:** ~20,700 (well-established)
- **Maintainer:** Airbnb's data visualization team
- **Release cadence:** Stable releases roughly quarterly; v4 alpha in progress (Nov 2025) targeting React 19
- **npm downloads:** Strong adoption in the React data visualization space
- **Ecosystem:** Used extensively at Airbnb, well-regarded in the React community
- **Risk:** Airbnb open-source projects occasionally slow down. The gap between 3.12.0 (Nov 2024) and the v4 alpha (Nov 2025) is a year. However, the library is stable and doesn't need frequent updates — D3 primitives don't change often.

---

## Learning Curve

| Library | Time to First Chart | Time to Production Roast Chart | Flexibility Ceiling |
|---|---|---|---|
| **Chart.js / react-chartjs-2** | 30 min | Days (fighting config) | Medium — plugin system helps but you hit walls |
| **Recharts** | 30 min | Days (dual Y-axis, custom tooltips get painful) | Medium — declarative but opinionated |
| **Visx (xychart)** | 1-2 hours | 2-3 days | High — escape to low-level when needed |
| **Visx (low-level)** | 3-4 hours | 3-5 days | Unlimited — you own the SVG |
| **Raw D3 in React** | Half a day | A week+ | Unlimited but fights React's model |

Visx's learning curve is steeper upfront but pays off for specialized charts. For a roast curve chart that needs dual Y-axes, 6+ series, event annotations, and zoom — you'd hit Recharts' limits within a day and spend time working around them. With visx, you spend the time building what you need instead of working around what the library assumes.

The recommended approach: **start with `@visx/xychart`** for the basic structure, then drop to low-level primitives for specific elements that need custom behavior (e.g., dual Y-axes, zoom constraints).

---

## Code Example: Multi-Line Roast Chart with Dual Y-Axes, Annotations, and Tooltip

This example uses low-level visx primitives to build a roast curve chart with dual Y-axes (temperature on left, ROR/power/fan on right), vertical annotation lines for roast events, a crosshair tooltip showing all series values, a clickable legend for toggling series, and responsive sizing via `<ParentSize>`. It supports overlaying multiple roasts on the same chart.

```tsx
import { useMemo, useState, useCallback } from "react";
import { LinePath, Line } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { curveMonotoneX } from "@visx/curve";
import { AxisBottom, AxisLeft, AxisRight } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { localPoint } from "@visx/event";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { bisector } from "d3-array";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoastDataPoint {
  time: number; // seconds from start
  spotTemp: number; // degrees C
  meanTemp: number; // degrees C
  profileTemp: number; // degrees C
  ror: number; // degrees C / min
  powerKw: number; // kW (0-3 typical)
  fanRpm: number; // percentage 0-100
}

interface RoastEvent {
  time: number; // seconds
  label: string; // e.g. "FC", "SC", "DROP"
  color: string;
}

interface Roast {
  id: string;
  name: string;
  data: RoastDataPoint[];
  events: RoastEvent[];
}

interface RoastCurveChartProps {
  roasts: Roast[];
}

// ---------------------------------------------------------------------------
// Series configuration — left axis (temperature) vs right axis (secondary)
// ---------------------------------------------------------------------------

type SeriesKey = keyof Omit<RoastDataPoint, "time">;

interface SeriesConfig {
  key: SeriesKey;
  label: string;
  axis: "left" | "right";
  unit: string;
}

const SERIES: SeriesConfig[] = [
  { key: "spotTemp", label: "Spot Temp", axis: "left", unit: "C" },
  { key: "meanTemp", label: "Mean Temp", axis: "left", unit: "C" },
  { key: "profileTemp", label: "Profile Temp", axis: "left", unit: "C" },
  { key: "ror", label: "RoR", axis: "right", unit: "C/min" },
  { key: "powerKw", label: "Power", axis: "right", unit: "kW" },
  { key: "fanRpm", label: "Fan", axis: "right", unit: "%" },
];

// One color palette per roast; series within a roast vary by index.
// Dash patterns distinguish roasts when colors are similar.
const ROAST_PALETTES = [
  ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"],
  ["#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa", "#a78bfa"],
  ["#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#2563eb", "#7c3aed"],
  ["#b91c1c", "#c2410c", "#a16207", "#15803d", "#1d4ed8", "#6d28d9"],
] as const;

const DASH_PATTERNS = ["", "6,3", "2,2", "8,4,2,4"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const bisectTime = bisector<RoastDataPoint, number>((d) => d.time).left;

function nearestDatum(
  data: RoastDataPoint[],
  timeValue: number
): RoastDataPoint | undefined {
  const idx = bisectTime(data, timeValue, 1);
  const d0 = data[idx - 1];
  const d1 = data[idx];
  if (!d0) return d1;
  if (!d1) return d0;
  return timeValue - d0.time > d1.time - timeValue ? d1 : d0;
}

// ---------------------------------------------------------------------------
// Tooltip data shape
// ---------------------------------------------------------------------------

interface TooltipDatum {
  time: number;
  roastValues: {
    roastName: string;
    point: RoastDataPoint;
  }[];
}

// ---------------------------------------------------------------------------
// Chart inner component — receives explicit width/height from ParentSize
// ---------------------------------------------------------------------------

const MARGIN = { top: 24, right: 72, bottom: 48, left: 64 };

function RoastCurveChartInner({
  roasts,
  width,
  height,
}: {
  roasts: Roast[];
  width: number;
  height: number;
}) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<SeriesKey>>(new Set());

  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
  } = useTooltip<TooltipDatum>();

  const xMax = width - MARGIN.left - MARGIN.right;
  const yMax = height - MARGIN.top - MARGIN.bottom;

  if (xMax < 50 || yMax < 50) return null;

  // Flatten all roast data to compute shared domains
  const allData = roasts.flatMap((r) => r.data);

  const maxTime = Math.max(...allData.map((d) => d.time));
  const maxTemp = Math.max(
    ...allData.map((d) => Math.max(d.spotTemp, d.meanTemp, d.profileTemp))
  );
  const maxRor = Math.max(...allData.map((d) => d.ror));
  const maxSecondary = Math.max(maxRor, 100); // fan is 0-100%

  // ---- Scales ----

  const xScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, maxTime],
        range: [0, xMax],
        nice: true,
      }),
    [maxTime, xMax]
  );

  // Left axis: temperature (all three temp series share this)
  const yScaleLeft = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, maxTemp * 1.1],
        range: [yMax, 0],
        nice: true,
      }),
    [maxTemp, yMax]
  );

  // Right axis: RoR, power, fan (normalized to a shared range)
  const yScaleRight = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, maxSecondary * 1.1],
        range: [yMax, 0],
        nice: true,
      }),
    [maxSecondary, yMax]
  );

  const yScaleFor = (axis: "left" | "right") =>
    axis === "left" ? yScaleLeft : yScaleRight;

  // ---- Tooltip handler ----

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point) return;

      const x0 = xScale.invert(point.x - MARGIN.left);
      const roastValues = roasts
        .map((roast) => {
          const nearest = nearestDatum(roast.data, x0);
          return nearest ? { roastName: roast.name, point: nearest } : null;
        })
        .filter(Boolean) as TooltipDatum["roastValues"];

      if (roastValues.length === 0) return;

      const time = roastValues[0].point.time;

      showTooltip({
        tooltipData: { time, roastValues },
        tooltipLeft: xScale(time) + MARGIN.left,
        tooltipTop: point.y,
      });
    },
    [roasts, xScale, showTooltip]
  );

  // ---- Legend toggle ----

  const toggleSeries = (key: SeriesKey) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <>
      {/* Clickable legend — toggles series visibility */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 8,
          fontSize: 12,
          fontFamily: "system-ui",
        }}
      >
        {SERIES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => toggleSeries(s.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: hiddenSeries.has(s.key) ? 0.35 : 1,
              padding: "2px 4px",
            }}
          >
            <span
              style={{
                width: 14,
                height: 3,
                backgroundColor: ROAST_PALETTES[0][i],
                display: "inline-block",
              }}
            />
            {s.label} ({s.unit})
          </button>
        ))}
      </div>

      {/* Chart SVG */}
      <svg width={width} height={height}>
        <Group top={MARGIN.top} left={MARGIN.left}>
          {/* Horizontal grid lines aligned to left (temperature) axis */}
          <GridRows
            scale={yScaleLeft}
            width={xMax}
            stroke="#e5e7eb"
            strokeDasharray="2,2"
            numTicks={6}
          />

          {/* Vertical annotation lines for roast events (FC, SC, DROP) */}
          {roasts.map((roast, roastIdx) =>
            roast.events.map((evt) => {
              const x = xScale(evt.time);
              return (
                <Group key={`${roast.id}-${evt.label}`}>
                  <Line
                    from={{ x, y: 0 }}
                    to={{ x, y: yMax }}
                    stroke={evt.color}
                    strokeWidth={1.5}
                    strokeDasharray={DASH_PATTERNS[roastIdx] || ""}
                  />
                  <text
                    x={x}
                    y={-6}
                    fill={evt.color}
                    fontSize={10}
                    fontFamily="system-ui"
                    textAnchor="middle"
                  >
                    {roast.name.slice(0, 3)} {evt.label}
                  </text>
                </Group>
              );
            })
          )}

          {/* Line series: one LinePath per series per roast */}
          {roasts.map((roast, roastIdx) =>
            SERIES.map((series, seriesIdx) => {
              if (hiddenSeries.has(series.key)) return null;
              const yScale = yScaleFor(series.axis);
              const color =
                ROAST_PALETTES[roastIdx % ROAST_PALETTES.length][seriesIdx];

              return (
                <LinePath<RoastDataPoint>
                  key={`${roast.id}-${series.key}`}
                  data={roast.data}
                  x={(d) => xScale(d.time)}
                  y={(d) => yScale(d[series.key])}
                  stroke={color}
                  strokeWidth={series.axis === "left" ? 1.5 : 1}
                  strokeDasharray={
                    DASH_PATTERNS[roastIdx % DASH_PATTERNS.length]
                  }
                  curve={curveMonotoneX}
                  defined={(d) => d[series.key] != null}
                />
              );
            })
          )}

          {/* Tooltip vertical crosshair */}
          {tooltipOpen && tooltipData && (
            <Line
              from={{ x: xScale(tooltipData.time), y: 0 }}
              to={{ x: xScale(tooltipData.time), y: yMax }}
              stroke="#6b7280"
              strokeWidth={1}
              strokeDasharray="4,2"
              pointerEvents="none"
            />
          )}

          {/* Left axis: Temperature */}
          <AxisLeft
            scale={yScaleLeft}
            numTicks={6}
            stroke="#374151"
            tickStroke="#374151"
            label="Temperature (C)"
            labelProps={{ fill: "#374151", fontSize: 12 }}
            tickLabelProps={{
              fill: "#6b7280",
              fontSize: 10,
              textAnchor: "end",
              dx: "-0.25em",
            }}
          />

          {/* Right axis: RoR / Power / Fan */}
          <AxisRight
            left={xMax}
            scale={yScaleRight}
            numTicks={5}
            stroke="#374151"
            tickStroke="#374151"
            label="RoR / Power / Fan"
            labelProps={{ fill: "#374151", fontSize: 12 }}
            tickLabelProps={{
              fill: "#6b7280",
              fontSize: 10,
              textAnchor: "start",
              dx: "0.25em",
            }}
          />

          {/* Bottom axis: Time */}
          <AxisBottom
            top={yMax}
            scale={xScale}
            numTicks={Math.min(12, Math.floor(xMax / 60))}
            tickFormat={(v) => formatTime(v as number)}
            stroke="#374151"
            tickStroke="#374151"
            label="Time"
            labelProps={{ fill: "#374151", fontSize: 12 }}
            tickLabelProps={{
              fill: "#6b7280",
              fontSize: 10,
              textAnchor: "middle",
            }}
          />

          {/* Invisible rect captures pointer events for tooltip */}
          <rect
            width={xMax}
            height={yMax}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => hideTooltip()}
          />
        </Group>
      </svg>

      {/* Tooltip overlay */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          style={{
            backgroundColor: "#1f2937",
            color: "#e5e7eb",
            padding: "8px 10px",
            borderRadius: 4,
            fontSize: 11,
            fontFamily: "system-ui",
            lineHeight: 1.5,
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {formatTime(tooltipData.time)}
          </div>
          {tooltipData.roastValues.map(({ roastName, point }) => (
            <div key={roastName} style={{ marginBottom: 4 }}>
              <div style={{ fontWeight: 500, opacity: 0.8 }}>{roastName}</div>
              {SERIES.filter((s) => !hiddenSeries.has(s.key)).map((s) => (
                <div key={s.key}>
                  {s.label}: {point[s.key].toFixed(1)} {s.unit}
                </div>
              ))}
            </div>
          ))}
        </TooltipWithBounds>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Public component — responsive wrapper
// ---------------------------------------------------------------------------

function RoastCurveChart({ roasts }: RoastCurveChartProps) {
  return (
    <div style={{ width: "100%", height: 520 }}>
      <ParentSize>
        {({ width, height }) => (
          <RoastCurveChartInner
            roasts={roasts}
            width={width}
            height={height}
          />
        )}
      </ParentSize>
    </div>
  );
}

export { RoastCurveChart };
export type { RoastDataPoint, RoastEvent, Roast, RoastCurveChartProps };
```

### What this example demonstrates

- **Dual Y-axes:** `yScaleLeft` for temperature series and `yScaleRight` for RoR/power/fan, rendered with `<AxisLeft>` and `<AxisRight>` respectively. Each series maps to the correct scale via the `axis` field in `SERIES` config.
- **Multi-roast overlay:** Outer loop over `roasts[]`, inner loop over `SERIES[]`. Each roast gets a distinct dash pattern; each series gets a distinct color from the roast's palette.
- **Annotation lines:** Vertical `<Line>` components at `xScale(event.time)` spanning the full chart height, with text labels above the chart area for first crack, colour change, and drop.
- **Crosshair tooltip:** An invisible `<rect>` captures pointer events, `d3-array`'s `bisector` finds the nearest data point per roast, and `<TooltipWithBounds>` renders all values grouped by roast.
- **Legend toggle:** Click a legend button to hide/show a series via `hiddenSeries` state set.
- **Responsive:** `<ParentSize>` passes container dimensions; no hardcoded width.

### What this example does not cover (but visx supports)

- **Zoom/pan:** Wrap with `@visx/zoom`'s `<Zoom>` component, apply the transform matrix to `xScale`'s domain, and constrain zoom to the X-axis only.
- **Brush selection:** `@visx/brush` can add a time-range selection below the main chart (overview + detail pattern).
- **Animated transitions:** Use `@visx/xychart`'s `AnimatedLineSeries` or integrate `@react-spring/web` for enter/exit animations on series toggle.

---

## Verdict

**Visx is a strong fit for this use case.** Roast curve visualization is a specialized, data-dense chart that benefits from the fine-grained control visx provides. The dual Y-axis requirement, 6+ series, event annotations, and zoom/pan are all achievable without fighting the library's abstractions.

**Primary concern:** React 19 support is only in alpha (v4). If the app targets React 19 today, you'll either use the alpha or tolerate a peer dependency warning with v3.

**Recommendation:** Use visx if you're comfortable writing 300-500 lines of chart code and want full control over the result. Start with `@visx/xychart` for rapid iteration, then optimize specific interactions with low-level primitives. If you'd prefer a chart in 50 lines and can accept less customization, evaluate Recharts as a lower-effort alternative.
