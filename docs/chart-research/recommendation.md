# Chart Library Recommendation — Coffee Roast Tracker

## Side-by-Side Comparison

| Criterion | Recharts | Chart.js | visx |
|---|:---:|:---:|:---:|
| Performance with multi-roast overlay (4 roasts x 6 series) | 3 | 5 | 4 |
| Ease of multi-roast comparison implementation | 2 | 5 | 4 |
| Event annotation support | 4 | 4 | 4 |
| Interactivity (tooltips, zoom/pan, legend toggle) | 3 | 5 | 3 |
| Customization depth | 3 | 3 | 5 |
| Bundle size | 3 | 3 | 4 |
| React 19 support maturity | 4 | 4 | 2 |
| Learning curve / time to implement | 4 | 4 | 2 |
| Maintenance / community health | 4 | 5 | 3 |
| **Total** | **30** | **38** | **31** |

**Rating scale:** 1 = poor fit, 5 = excellent fit for this project's requirements.

---

## Analysis

The core differentiator for this project is multi-roast overlay. Comparing 2-4 roasts on a single chart with 6 series each (up to 24 lines and ~9,600 data points) is not a nice-to-have — it is the primary analytical feature. Recharts' single-data-array model makes this awkward: you either merge roast data into a wide, sparse object with dynamic keys like `roast1_spotTemp`, or use the less-documented per-`<Line>` data prop on `<ComposedChart>`. Chart.js handles this naturally — each roast contributes datasets to a flat array, legend toggle is built in, and adding a fourth roast is just more array entries with no structural change. Visx also handles multi-roast overlay cleanly since there is no "dataset" abstraction to work around, but the implementation cost is significantly higher.

Performance and interactivity tilt further toward Chart.js. Canvas rendering with built-in LTTB decimation means 9,600 points render at 60fps during zoom/pan — no manual downsampling needed. The zoom plugin provides real drag-to-pan and scroll-to-zoom on the chart area itself, plus pinch-to-zoom on tablets, all with a few lines of config. Recharts only offers the `<Brush>` component (a separate range selector, not in-chart gestures), and visx requires wiring up pointer events and transform matrices manually via `@visx/zoom`. For a solo developer, the difference between "add a plugin" and "build zoom from primitives" is days of work.

The trade-off with Chart.js is customization ceiling and tooltip ergonomics. Tooltip customization is callback-driven rather than declarative React, and all styling lives in config objects rather than CSS. For this project, that is an acceptable trade-off. The roast chart needs specific, well-defined interactions (tooltips showing all series at the hovered timestamp, zoom on the time axis, legend toggle, annotation lines) — not open-ended visualization experimentation. Chart.js covers every one of these requirements either natively or through mature, officially maintained plugins. The styling concern is also mitigated by the project's use of CSS Modules + CSS Variables: since the chart is a self-contained Canvas element rather than styled DOM nodes, the chart's config-based theming does not conflict with the app's styling approach.

---

## Recommendation: Chart.js (with react-chartjs-2)

Chart.js is the right choice for this project. The reasons are concrete:

- **Multi-roast comparison works out of the box.** Each roast maps to a set of datasets. No data merging, no workarounds, no fighting the abstraction.
- **Canvas + LTTB decimation handles the data volume.** 4 roasts x 6 series x 400 points renders smoothly without manual optimization.
- **Zoom/pan is a plugin, not a project.** `chartjs-plugin-zoom` provides scroll-to-zoom, drag-to-pan, and pinch-to-zoom with ~10 lines of config. This is the single biggest time savings versus Recharts (no real pan) or visx (build it yourself).
- **Annotations are a plugin, not a project.** `chartjs-plugin-annotation` handles vertical reference lines for first crack, colour change, and roast end. Mature, typed, and compatible with Chart.js 4.x.
- **Dual Y-axes are first-class.** `yAxisID` on each dataset, independent scale configuration, no limit on axis count.
- **React 19 compatible today.** react-chartjs-2 v5 uses refs and effects internally with no deprecated APIs. No alpha versions, no peer dependency warnings.
- **Solo developer velocity matters.** The research documents estimate comparable time-to-first-chart for Recharts and Chart.js, but Chart.js reaches production-grade multi-roast comparison faster because the hard features (zoom, annotations, multi-dataset overlay) are solved by plugins rather than custom code.

Bundle size with all needed plugins (~75-80 KB gzipped) is larger than Recharts (~45 KB) or visx low-level (~33 KB), but the plugins replace custom code that would take days to write and maintain. That is a good trade.

---

## Runner-Up: visx

visx is the second choice. Switch to it if:

- **The chart needs to evolve beyond what Chart.js plugins support** — for example, if you later need a synchronized overview+detail panel, custom brush selection, gradient fills between two temperature curves, or other bespoke SVG compositions that Chart.js cannot express.
- **Canvas rendering becomes a limitation** — for example, if you need per-point DOM event handling, CSS-driven styling on chart elements, or accessibility attributes on individual data series.
- **React 19 support stabilizes in visx v4** — the alpha is the main risk today. Once v4 ships stable, the React 19 concern disappears.

Do not switch to visx speculatively. The low-level control is powerful but costs 3-5x more implementation time for the same feature set. Only move to it if Chart.js hits a concrete wall that cannot be worked around with plugins or custom Chart.js plugins.

Recharts is not the runner-up. Its single-data-array model and lack of real zoom/pan make it a poor fit for multi-roast comparison, which is the non-negotiable core feature.
