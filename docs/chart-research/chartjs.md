# Chart.js (with react-chartjs-2) — Chart Library Evaluation

**Library:** [Chart.js](https://www.chartjs.org/) + [react-chartjs-2](https://react-chartjs-2.js.org/)
**Versions evaluated:** Chart.js 4.4.x (stable, MIT) / react-chartjs-2 5.x
**GitHub:** Chart.js ~65k stars, react-chartjs-2 ~6.6k stars
**License:** MIT
**Evaluated for:** Coffee roast curve visualization (time-series, multi-line, dual Y-axes, annotations, zoom/pan)

---

## Overview

Chart.js is a Canvas-based charting library that provides a high-level, declarative API for common chart types (line, bar, pie, scatter, etc.). It emphasizes simplicity and good defaults while remaining extensible through a plugin system. The library renders entirely to `<canvas>`, which gives it a performance advantage over SVG-based alternatives for larger datasets.

**react-chartjs-2** is the official React wrapper. It exposes typed components (`<Line>`, `<Bar>`, etc.) that accept `data` and `options` props, manage the Chart.js instance lifecycle, and re-render efficiently when props change. Version 5.x supports Chart.js 4.x and ships with full TypeScript definitions.

Key design principles:

- **Convention over configuration.** Sensible defaults for scales, tooltips, legends, and animations out of the box. Override only what you need.
- **Canvas rendering.** All drawing goes through the HTML Canvas API, not SVG. This means better performance at high point counts but no native DOM elements for individual data points.
- **Plugin architecture.** First-party and community plugins extend functionality (annotations, zoom, streaming, datalabels) without bloating the core.
- **Tree-shakeable (v4+).** Chart.js 4 moved to a fully modular architecture. You register only the components you use.

---

## Strengths for This Use Case

### Canvas performance at scale

Roast curves involve ~400 data points per series across 6+ lines. When comparing 2-4 roasts, that reaches 4,800-9,600 total data points. Canvas rendering handles this comfortably because it draws pixels to a bitmap rather than maintaining a DOM tree of SVG elements. Redraw cost scales with pixel area, not element count.

### Built-in decimation plugin

Chart.js ships a decimation plugin that supports two algorithms:

- **min-max:** preserves local extrema, good for maintaining visual accuracy of peaks and valleys (important for ROR curves).
- **LTTB (Largest-Triangle-Three-Buckets):** perceptually optimal downsampling that preserves the visual shape of a curve while dramatically reducing rendered point count.

For roast comparison mode (4 roasts x 6 series x 400 points = 9,600 points), decimation with LTTB at ~150 samples per series keeps rendering snappy without visible data loss. The decimation plugin works automatically when `parsing: false` and data is provided in the internal `{x, y}` format.

### Rich plugin ecosystem

The three plugins we need all exist as mature, first-party or officially recommended packages:

| Need | Plugin | Status |
|------|--------|--------|
| Event markers (vertical lines) | `chartjs-plugin-annotation` | Official, actively maintained |
| Zoom and pan | `chartjs-plugin-zoom` | Official, uses Hammer.js |
| Custom data labels | `chartjs-plugin-datalabels` | Official |

### Dual/multiple Y-axes are first-class

Chart.js natively supports multiple Y-axes via `yAxisID` on each dataset. Temperature (left axis) and ROR/power/fan (right axis) are a standard configuration pattern, not a workaround. Each axis gets independent scale bounds, tick formatting, and grid line visibility.

### Responsive by default

`responsive: true` and `maintainAspectRatio: false` are the defaults. The chart resizes to fill its container using a `ResizeObserver`. Combined with a CSS container query or simple percentage-width wrapper, desktop-to-tablet responsiveness requires zero extra code.

### Minimal boilerplate for multi-dataset line charts

Adding a second, third, or fourth roast to the chart is just pushing more objects into the `datasets` array. No structural changes to the component or options. This makes the "compare 2-4 roasts" feature straightforward to implement.

---

## Weaknesses for This Use Case

### Limited per-point interactivity

Because Canvas doesn't produce DOM elements for individual data points, hover/click behavior relies on Chart.js's internal hit detection. Custom interactions beyond the built-in tooltip and onClick handler require working with the Chart.js event system, which is less intuitive than attaching event listeners to SVG elements. For roast curves this is acceptable (we mainly need tooltips), but building highly custom interactions (e.g., dragging an annotation marker) takes more effort.

### Tooltip customization is callback-driven

Custom tooltips require an `external` callback function that receives tooltip model data and manually positions/populates an HTML element. This works, but it's imperative rather than declarative. Showing a rich tooltip with all 6 series values at a given timestamp requires careful formatting inside the callback. Contrast with SVG-based libraries where you can render a React component as the tooltip.

### Annotation plugin is separate from core

While `chartjs-plugin-annotation` is well-maintained, it's not bundled with Chart.js. It adds another dependency to track and occasionally has compatibility lag after major Chart.js releases. As of 2025, the plugin is stable and compatible with Chart.js 4.x.

### Canvas is not SSR-friendly

Chart.js requires a `<canvas>` element in the DOM. Server-side rendering produces an empty canvas tag that is hydrated client-side. This is fine for our use case (roast charts are inherently interactive, client-rendered content), but it means no meaningful chart content in the initial HTML payload.

### Styling is config objects, not CSS

All visual customization (colors, fonts, line styles, grid appearance) is done through Chart.js's options object, not CSS. This is a different mental model from styled-components or Tailwind. Theming requires building a config factory function rather than applying CSS classes.

### No built-in crosshair

A vertical crosshair that follows the cursor across the time axis (common in roast profiling software like Artisan and Cropster) is not a built-in feature. You need a custom plugin or the `chartjs-plugin-crosshair` community package (less actively maintained). The interaction mode `index` with `intersect: false` gets close by highlighting all datasets at the same x-value, but the visual crosshair line requires extra work.

---

## Performance

### Canvas vs SVG

| Factor | Canvas (Chart.js) | SVG (visx, Recharts) |
|--------|-------------------|----------------------|
| 400 pts x 6 series | Excellent | Good |
| 400 pts x 6 series x 4 roasts | Excellent | Starts to feel sluggish |
| Zoom/pan redraw | Fast (bitmap repaint) | Slower (DOM reflow) |
| Memory | Lower (no DOM nodes per point) | Higher (DOM nodes) |
| Hit testing | Algorithmic (internal) | Native (DOM events) |
| Accessibility | Requires ARIA on canvas | SVG elements are accessible |

For our dataset sizes (up to ~10,000 points in comparison mode), Canvas is the more performant choice. SVG is viable but offers no advantage at these scales.

### Built-in decimation (LTTB)

Configuration for optimal roast curve rendering:

```typescript
plugins: {
  decimation: {
    enabled: true,
    algorithm: 'lttb',
    samples: 200, // per series — preserves curve shape, reduces draw calls
  },
},
```

Requirements for decimation to work:
1. Data must be in `{x, y}` format (not separate `labels` + `data` arrays)
2. `parsing: false` should be set for performance
3. X-axis must be a `linear` or `time` scale
4. Line chart type only (not scatter)

With decimation enabled, even 4-roast comparison with 6 series each renders at 60fps during zoom/pan interactions.

### Additional performance tuning

```typescript
{
  animation: false,          // disable animations during zoom/pan
  parsing: false,            // skip internal data parsing
  normalized: true,          // data is pre-sorted by x
  spanGaps: true,            // don't break line at null values
  elements: {
    point: { radius: 0 },   // don't render individual points
    line: { tension: 0 },   // straight line segments (faster than bezier)
  },
}
```

---

## Multi-Roast Comparison

Overlaying multiple roasts is a data-level concern, not a structural one. Each roast becomes a set of datasets sharing the same axis configuration:

```typescript
// Each roast contributes 6 datasets (or however many series it has)
const datasets = roasts.flatMap((roast, i) => [
  {
    label: `${roast.name} — Bean Temp`,
    data: roast.beanTemp,       // Array<{x: number, y: number}>
    yAxisID: 'yTemp',
    borderColor: ROAST_COLORS[i].primary,
    borderWidth: 1.5,
  },
  {
    label: `${roast.name} — ROR`,
    data: roast.ror,
    yAxisID: 'yROR',
    borderColor: ROAST_COLORS[i].secondary,
    borderDash: [4, 2],
    borderWidth: 1,
  },
  // ... power, fan, etc.
]);
```

Chart.js handles 24 datasets (4 roasts x 6 series) without issue. Legend toggle is built in — clicking a legend item shows/hides that dataset. For better UX, group legend items by roast using a custom `generateLabels` callback or an external legend component.

---

## Annotations

`chartjs-plugin-annotation` supports the event markers we need. Vertical lines for colour change, first crack, and roast end:

```typescript
import annotationPlugin from 'chartjs-plugin-annotation';

// Register once at module level
ChartJS.register(annotationPlugin);

// In chart options:
plugins: {
  annotation: {
    annotations: {
      firstCrack: {
        type: 'line',
        scaleID: 'x',
        value: 482,              // seconds into roast
        borderColor: 'rgba(255, 99, 132, 0.8)',
        borderWidth: 2,
        borderDash: [6, 3],
        label: {
          content: '1st Crack',
          display: true,
          position: 'start',
          backgroundColor: 'rgba(255, 99, 132, 0.8)',
          font: { size: 11 },
        },
      },
      colourChange: {
        type: 'line',
        scaleID: 'x',
        value: 330,
        borderColor: 'rgba(255, 159, 64, 0.8)',
        borderWidth: 2,
        borderDash: [6, 3],
        label: {
          content: 'Colour Change',
          display: true,
          position: 'start',
          backgroundColor: 'rgba(255, 159, 64, 0.8)',
        },
      },
      roastEnd: {
        type: 'line',
        scaleID: 'x',
        value: 620,
        borderColor: 'rgba(75, 192, 192, 0.8)',
        borderWidth: 2,
        label: {
          content: 'Drop',
          display: true,
          position: 'start',
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
        },
      },
    },
  },
},
```

The annotation plugin also supports box annotations (useful for highlighting the development phase between first crack and roast end) and point annotations.

For multi-roast comparison, generate annotation objects dynamically per roast, offsetting labels vertically to avoid overlap.

---

## Customization

### Dual Y-axes via yAxisID

```typescript
scales: {
  x: {
    type: 'linear',
    title: { display: true, text: 'Time (s)' },
    ticks: {
      callback: (val: number) => {
        const min = Math.floor(val / 60);
        const sec = Math.round(val % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
      },
    },
  },
  yTemp: {
    type: 'linear',
    position: 'left',
    title: { display: true, text: 'Temperature (C)' },
    min: 0,
    max: 250,
  },
  yROR: {
    type: 'linear',
    position: 'right',
    title: { display: true, text: 'ROR (C/min) / Power / Fan' },
    min: 0,
    max: 30,
    grid: { drawOnChartArea: false }, // avoid grid line overlap
  },
},
```

Datasets declare which axis they belong to via `yAxisID: 'yTemp'` or `yAxisID: 'yROR'`. A third axis (e.g., for fan RPM as a percentage) can be added the same way.

### Custom tooltips

The `interaction` option controls how the tooltip selects data points:

```typescript
interaction: {
  mode: 'index',       // show all datasets at the same x index
  axis: 'x',
  intersect: false,    // trigger without hovering directly on a point
},
```

For a fully custom tooltip (e.g., a styled HTML panel showing all series values at the hovered timestamp):

```typescript
plugins: {
  tooltip: {
    enabled: false,
    external: (context) => {
      // context.tooltip contains position, dataPoints, etc.
      // Render or update a positioned HTML element
    },
  },
},
```

### Zoom and pan

```typescript
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(zoomPlugin);

// In options:
plugins: {
  zoom: {
    pan: {
      enabled: true,
      mode: 'x',                    // pan only on time axis
      modifierKey: undefined,        // no modifier needed
    },
    zoom: {
      wheel: { enabled: true },
      pinch: { enabled: true },      // tablet support
      drag: { enabled: false },
      mode: 'x',
    },
    limits: {
      x: { minRange: 30 },          // minimum 30s visible window
    },
  },
},
```

The zoom plugin uses Hammer.js for touch gestures, providing native-feeling pinch-to-zoom on tablets.

---

## Bundle Size

Chart.js 4.x is fully tree-shakeable. You register only the components you use:

| What you register | Approx. gzipped size |
|-------------------|---------------------|
| Full Chart.js (all chart types, scales, elements) | ~70 KB |
| Line chart only (LinearScale, LineElement, PointElement, Tooltip, Legend) | ~35-40 KB |
| + chartjs-plugin-annotation | +8 KB |
| + chartjs-plugin-zoom (includes Hammer.js) | +25 KB |
| react-chartjs-2 | +3 KB |
| **Total (line chart + annotations + zoom)** | **~75-80 KB gzipped** |

Tree-shaking requires explicit registration:

```typescript
import {
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);
```

Compared to alternatives:
- **Recharts:** ~45 KB gzipped (but SVG, no built-in zoom/annotations)
- **visx:** ~25-30 KB (but requires building everything from scratch)
- **Plotly.js:** ~1 MB+ (not tree-shakeable)
- **Highcharts:** ~80 KB (commercial license required)

Chart.js's total footprint with plugins is competitive, and the plugins provide functionality that other libraries would require custom code to replicate.

---

## Maintenance

| Metric | Chart.js | react-chartjs-2 |
|--------|----------|------------------|
| GitHub stars | ~65,000 | ~6,600 |
| npm weekly downloads | ~3M+ | ~1.5M+ |
| Release cadence | Patch releases every 2-4 weeks | Follows Chart.js releases |
| Open issues | ~100-150 | ~30-50 |
| Last major release | v4.0 (Nov 2022) | v5.0 (2022, aligned with Chart.js 4) |
| License | MIT | MIT |

### React 19 support

react-chartjs-2 v5.x works with React 19. The library uses `useRef` and `useEffect` internally to manage the Chart.js canvas instance. There are no class components, no deprecated lifecycle methods, and no `forwardRef` usage that would conflict with React 19. The ref-based architecture means it is compatible with React 19's ref-as-prop pattern without changes.

Chart.js itself is framework-agnostic (pure Canvas API), so React version compatibility is entirely a react-chartjs-2 concern.

### Plugin compatibility

- `chartjs-plugin-annotation` 3.x: compatible with Chart.js 4.x, actively maintained
- `chartjs-plugin-zoom` 2.x: compatible with Chart.js 4.x, actively maintained
- Both plugins have TypeScript type definitions

---

## Code Example

A complete TypeScript React component showing a multi-line roast curve chart with dual Y-axes, annotation lines for roast events, and zoom/pan enabled.

```tsx
import { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
import type { ChartData, ChartOptions } from 'chart.js';

// --- Register Chart.js components (tree-shaking) ---
ChartJS.register(
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
  zoomPlugin
);

// --- Types ---
interface RoastDataPoint {
  x: number; // seconds
  y: number;
}

interface RoastEvent {
  label: string;
  timeSeconds: number;
  color: string;
}

interface RoastCurveProps {
  beanTemp: RoastDataPoint[];
  envTemp: RoastDataPoint[];
  profileTemp: RoastDataPoint[];
  ror: RoastDataPoint[];
  powerKw: RoastDataPoint[];
  fanRpm: RoastDataPoint[];
  events: RoastEvent[];
  roastName: string;
}

// --- Helpers ---
function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function buildEventAnnotations(events: RoastEvent[]) {
  return Object.fromEntries(
    events.map((event, i) => [
      `event-${i}`,
      {
        type: 'line' as const,
        scaleID: 'x',
        value: event.timeSeconds,
        borderColor: event.color,
        borderWidth: 2,
        borderDash: [6, 3],
        label: {
          content: event.label,
          display: true,
          position: 'start' as const,
          backgroundColor: event.color,
          color: '#fff',
          font: { size: 11, weight: 'bold' as const },
          padding: 4,
        },
      },
    ])
  );
}

// --- Component ---
function RoastCurveChart({
  beanTemp,
  envTemp,
  profileTemp,
  ror,
  powerKw,
  fanRpm,
  events,
  roastName,
}: RoastCurveProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  const data: ChartData<'line'> = {
    datasets: [
      // Temperature series (left Y-axis)
      {
        label: 'Bean Temp',
        data: beanTemp,
        yAxisID: 'yTemp',
        borderColor: '#e74c3c',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'Environment Temp',
        data: envTemp,
        yAxisID: 'yTemp',
        borderColor: '#3498db',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'Profile Temp',
        data: profileTemp,
        yAxisID: 'yTemp',
        borderColor: '#9b59b6',
        borderWidth: 1.5,
        borderDash: [4, 2],
        pointRadius: 0,
        tension: 0.2,
      },
      // Rate / power / fan series (right Y-axis)
      {
        label: 'ROR (C/min)',
        data: ror,
        yAxisID: 'yRate',
        borderColor: '#2ecc71',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'Power (kW)',
        data: powerKw,
        yAxisID: 'yRate',
        borderColor: '#f39c12',
        borderWidth: 1,
        borderDash: [2, 2],
        pointRadius: 0,
      },
      {
        label: 'Fan RPM (scaled)',
        data: fanRpm,
        yAxisID: 'yRate',
        borderColor: '#1abc9c',
        borderWidth: 1,
        borderDash: [6, 2],
        pointRadius: 0,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    parsing: false,
    normalized: true,
    animation: false,

    interaction: {
      mode: 'index',
      axis: 'x',
      intersect: false,
    },

    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          title: (items) => {
            if (items.length === 0) return '';
            return formatTime(items[0].parsed.x);
          },
        },
      },
      decimation: {
        enabled: true,
        algorithm: 'lttb',
        samples: 200,
      },
      annotation: {
        annotations: buildEventAnnotations(events),
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x',
        },
        limits: {
          x: { minRange: 30 },
        },
      },
    },

    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Time' },
        ticks: {
          callback: (val) => formatTime(val as number),
          maxRotation: 0,
          autoSkip: true,
        },
      },
      yTemp: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Temperature (C)' },
        min: 0,
        max: 250,
        grid: { color: 'rgba(0, 0, 0, 0.06)' },
      },
      yRate: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'ROR / Power / Fan' },
        min: 0,
        max: 30,
        grid: { drawOnChartArea: false },
      },
    },
  };

  function handleResetZoom() {
    chartRef.current?.resetZoom();
  }

  return (
    <div>
      <div style={{ position: 'relative', height: '500px', width: '100%' }}>
        <Line ref={chartRef} data={data} options={options} />
      </div>
      <button type="button" onClick={handleResetZoom}>
        Reset Zoom
      </button>
    </div>
  );
}

export { RoastCurveChart };
export type { RoastCurveProps, RoastDataPoint, RoastEvent };
```

### Usage

```tsx
import { RoastCurveChart } from './RoastCurveChart';
import type { RoastEvent } from './RoastCurveChart';

const events: RoastEvent[] = [
  { label: 'Colour Change', timeSeconds: 330, color: '#f39c12' },
  { label: '1st Crack', timeSeconds: 482, color: '#e74c3c' },
  { label: 'Drop', timeSeconds: 620, color: '#27ae60' },
];

function RoastDetail() {
  // roastData would come from your GraphQL query
  return (
    <RoastCurveChart
      beanTemp={roastData.beanTemp}
      envTemp={roastData.envTemp}
      profileTemp={roastData.profileTemp}
      ror={roastData.ror}
      powerKw={roastData.powerKw}
      fanRpm={roastData.fanRpm}
      events={events}
      roastName="Ethiopia Yirgacheffe — Light"
    />
  );
}
```

### Multi-roast comparison extension

To compare multiple roasts, flatten datasets from each roast and prefix labels with the roast name. The component structure stays the same — only the `datasets` array grows:

```tsx
const allDatasets = selectedRoasts.flatMap((roast, roastIndex) =>
  buildDatasetsForRoast(roast, ROAST_PALETTE[roastIndex])
);

const allAnnotations = selectedRoasts.reduce(
  (acc, roast, roastIndex) => ({
    ...acc,
    ...buildEventAnnotations(
      roast.events.map((e) => ({
        ...e,
        label: `${roast.name} — ${e.label}`,
        color: ROAST_PALETTE[roastIndex].annotationColor,
      }))
    ),
  }),
  {}
);
```

---

## Summary

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Multi-line time-series | Strong | Native multi-dataset support, dead simple to add series |
| 400+ points x 6 series | Strong | Canvas rendering + built-in LTTB decimation |
| Multi-roast overlay (2-4) | Strong | Just more datasets; legend toggle built in |
| Dual Y-axes | Strong | First-class `yAxisID` support, unlimited axes |
| Event annotations | Strong | `chartjs-plugin-annotation` is mature and well-typed |
| Zoom and pan | Strong | `chartjs-plugin-zoom` with touch support |
| Custom tooltips | Adequate | Callback-driven, not declarative React |
| Crosshair | Weak | Requires custom plugin or community package |
| TypeScript | Strong | Full type definitions for core and react-chartjs-2 |
| React 19 | Strong | react-chartjs-2 v5 compatible, no deprecated APIs |
| Bundle size | Good | ~75-80 KB gzipped with all needed plugins |
| Learning curve | Low | High-level API with good docs; plugins drop in |
| Maintenance | Strong | ~65k stars, active releases, large ecosystem |

**Bottom line:** Chart.js is a strong fit for roast curve visualization. It handles the data volume, multi-axis layout, and annotation requirements out of the box (with plugins). The main trade-offs vs. a lower-level library like visx are less granular control over rendering and callback-driven (rather than declarative) tooltip customization. For this use case, the productivity gain from Chart.js's batteries-included approach likely outweighs the flexibility loss.
