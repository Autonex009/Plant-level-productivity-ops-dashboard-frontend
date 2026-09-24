# Plant-Level Productivity & Ops Dashboard — frontend

A three-level operations dashboard for an Indian corrugated-box plant. Dark by
default, because its primary surface is a screen that runs all shift in a plant
office.

```bash
npm install
cp .env.example .env     # point VITE_API_PROXY at the API
npm run dev              # http://localhost:5173
```

The API must be running (see the backend repo). In dev, Vite proxies `/api` to
`VITE_API_PROXY`, so the browser stays same-origin and nothing depends on CORS.

| Script | |
|---|---|
| `npm run dev` | dev server with HMR |
| `npm run build` | typecheck + production build to `dist/` |
| `npm run typecheck` | types only |

Stack: Vite, React 19, TypeScript, Tailwind v4, TanStack Query, Recharts,
React Router.

## The three levels

| Level | Question it answers | Audience | Route |
|---|---|---|---|
| 1 · Plant | What is happening with the plant right now? | Owner, GM | `/` |
| 2 · Stage | Which part of Boarding, Printing or Bundling is hurting? | Plant head, supervisor | `/stage/:stage` |
| 3 · Specifics | What exactly do I fix? | Supervisor, operator, maintenance | `/stage/:stage/specifics` |

Navigation is strictly down-and-back. Click a stage on the status line or any
KPI card to go down; use the breadcrumb to come back. There are no sideways tabs
at the top level — tabs hide problems, and a single landing screen makes every
problem visible on page load.

**The fastest route is an alert.** Clicking one jumps straight to the evidence
behind it: Level 3 opens with the right panel selected, the time window
pre-loaded, and the causing events highlighted and scrolled into view.

## The time selector

`Today / Week / Month / Custom`, top right. It switches the time base of the
whole screen and inherits into every drill-down, because it lives in the URL —
which also makes every view shareable as a link.

Two things never change with it: the layout skeleton, and the **status line**,
which always shows the plant right now.

In Week/Month/Custom the alerts panel becomes the **recurring-issues list** —
cause, event count, hours, approximate rupee impact, and the tell-tale detail
("52% of it on PRINT-1"). The week's list is the Monday meeting agenda.

## Conventions worth knowing before you change anything

These are load-bearing. Each exists because the alternative misleads someone on
a shop floor.

- **Every number carries its target and a verdict.** `KpiCard` never renders a
  bare value. The RAG pill also carries a glyph and a word, so the verdict is
  never colour alone.
- **Grey is not a failure colour.** It means "cannot judge" — a missing value or
  an unconfigured band. A dead data feed renders grey, never red: a broken feed
  must not be reported as a broken machine.
- **Planned time is grey, never red.** Order changes and planned maintenance are
  drawn in neutral on every Pareto and every time strip. Painting a changeover
  the same colour as a breakdown is how a dashboard loses the shop floor.
- **The tilde means provisional.** Intra-shift figures are computed before waste
  is weighed. They carry `~` until shift-end reconciliation. The dashboard never
  silently revises a number; it declares which ones are still settling.
- **No dual-axis charts.** The Pareto's cumulative percentage rides as a label
  on each bar, not as a second line on a second y-axis.
- **Caps are real.** Four rollup cards at Level 1, five KPI cards at Level 2,
  two charts per screen. The restraint is the feature.

## Where things live

```
src/
  api/          response types and TanStack Query hooks (one call per screen)
  lib/
    viz.ts      the visual grammar: colours, RAG meaning, chart chrome
    format.ts   number, rupee (lakh/crore) and duration formatting
    useRange.ts the time selector, backed by the URL
  components/
    ProcessFlow.tsx   the live Boarding → Printing → Bundling status line
    ProcessDiagram.tsx the shop-floor schematic on Machine Monitoring
    KpiCard.tsx       value + target + verdict
    AlertPanel.tsx    alerts, acknowledgement, and alert deep-linking
    ReasonPicker.tsx  the one write action: classifying a stop
    charts/           one component per question in the visual grammar
    machines/         the machine artwork the schematic is drawn from
    settings/         target bands and the shift mass balance
  pages/        PlantView (L1), StageView (L2), StageSpecifics (L3),
                OwnerMobileView (L1 on a phone)
```

## Charts

One chart form per question, used identically everywhere:

| Question | Form | Component |
|---|---|---|
| Will we make the period? | Cumulative flight path vs plan, gap in days | `FlightPath` |
| Where did the potential go? | Loss waterfall, 100% → delivered | `LossWaterfall` |
| How did the hours go? | Bars against a takt line, cause-annotated | `HourlyBars` |
| What do I fix first? | Horizontal Pareto, planned time grey | `Pareto` |
| Where did the minutes go? | 100% stacked horizontal strip | `TimeSplitStrip` |
| Which direction are we moving? | Line with target band | `TrendLine` |
| Is a parameter healthy? | Value-in-band strip with drift arrow | `BandStrip` |

Deliberately absent, permanently: pie charts, speedometer gauges, 3D, and more
than two charts on one screen.

### The machine schematic

`components/machines/MachineArt.tsx` draws the plant as machines rather than as
boxes with a glyph in them — a corrugator by its fluted rolls and steam, a flexo
by its cylinder column and ink duct, a bundler by its strapping arch. Every
drawing shares one coordinate space (168 wide, floor at y=100), so stations line
up on a common floor line and the same art is reused at thumbnail size on the
Settings page and in the machine health panel.

Two rules hold the schematic together:

- **Motion means one thing.** A roll only spins, a belt only flows and a sheet
  only travels while the machine driving it is actually running. A stopped
  machine goes still and dims.
- **Steel is not a status colour.** Machine bodies use their own neutral tokens;
  state rides on one accent bar and one lamp, in the same status palette as
  every KPI card.

### Colour

Data colours come from a validated palette; the tokens are in `src/index.css`
and the semantics in `src/lib/viz.ts`. Before changing any data colour, re-run
the validator against the surfaces the chart actually renders on:

```bash
node <dataviz-skill>/scripts/validate_palette.js \
  "#3987e5,#898781,#d03b3b,#c98500,#5f5f58" --mode dark --surface "#17171a"
```

Two slots fail a categorical chroma check **on purpose**: `setup` and `idle` are
greys, because planned and inactive time must not be coloured like a fault. The
required relief ships with them — every segment is labelled, a legend is always
present, and the tooltip names the state.

## Mobile

Below 768px, Level 1 renders `OwnerMobileView`: a vertical stack with re-ordered
priorities, not a shrunk desktop. Money first (cost of waste as the hero), then
the remaining rollups as a grid, then the stage status strip, then alerts, with
trends collapsed behind a tap on any card. Supervisors and plant heads use the
desktop layout.

## Refresh cadences

Set in `src/api/queries.ts`, and deliberately unhurried: status tiles every
~2.5 minutes, KPI cards and charts every ~10. Faster updating makes numbers
flicker and erodes trust without adding information. Refetch-on-window-focus is
off for the same reason.
