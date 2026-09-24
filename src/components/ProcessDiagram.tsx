import { useState } from "react";
import { Link } from "react-router-dom";

import type { MachineTile, ParameterStrip, Stage } from "@/api/types";
import { formatMinutes, formatNumber } from "@/lib/format";
import { STAGE_LABEL, STATE_META } from "@/lib/viz";

const BOX_W = 156;
const BOX_H = 60;
const ROW_GAP = 16;
const COL_GAP = 130;
const WASTE_W = 140;
const WASTE_H = 46;

const STATE_ORDER = ["running", "setup", "down", "waiting", "idle", "no_data"] as const;

/**
 * The plant, drawn as what it actually is: reels and starch in, three real
 * stages with their real machines (printing fans out to two parallel
 * printers, not one box that quietly hides the second machine), waste
 * peeling off where the spec says it is lost, bundles out.
 *
 * Two things are deliberately encoded separately, because they answer two
 * different questions. The icon says *what* a box is (a corrugator reads
 * differently from a printer, and both read differently from the Inputs /
 * Waste / Dispatch boundary nodes, which get a hatched fill instead of a
 * solid one - they are not machines, they are where material enters or
 * leaves the process). Colour says *how it's doing right now* - the one
 * state palette used everywhere else in the dashboard, so red always means
 * the same thing here as it does on a KPI card.
 *
 * "Dynamic" means live state, not just a live number: a line only animates -
 * a moving dot, not just a dashed stroke - while the machine at its source is
 * actually running. A stopped machine's line goes flat and dim, which is the
 * same "grey means no failure, red/dim means look here" grammar as the rest
 * of the dashboard, applied to the one place that shows the whole process at
 * once.
 *
 * A box's colour and icon answer "what is this and how is it doing" at a
 * glance; clicking it answers the next question - "how is it doing,
 * exactly" - with the same parameter readings and reason codes the rest of
 * the page already has, rather than sending the reader away to find them.
 */
export function ProcessDiagram({
  machinesByStage,
  parameters = [],
  stageHref,
}: {
  machinesByStage: Record<Stage, MachineTile[]>;
  parameters?: ParameterStrip[];
  stageHref: (stage: Stage) => string;
}) {
  const [selected, setSelected] = useState<{ machineId: number; stage: Stage } | null>(null);

  const boarding = machinesByStage.board_manufacturing ?? [];
  const printing = machinesByStage.printing ?? [];
  const bundling = machinesByStage.bundling ?? [];

  const columns = [
    { key: "inputs", x: 0, machines: null },
    { key: "board_manufacturing" as Stage, x: BOX_W + COL_GAP, machines: boarding },
    { key: "printing" as Stage, x: (BOX_W + COL_GAP) * 2, machines: printing },
    { key: "bundling" as Stage, x: (BOX_W + COL_GAP) * 3, machines: bundling },
    { key: "dispatch", x: (BOX_W + COL_GAP) * 4, machines: null },
  ];

  const maxRows = Math.max(1, boarding.length, printing.length, bundling.length);
  const plotH = maxRows * BOX_H + (maxRows - 1) * ROW_GAP;
  const centerY = plotH / 2;
  const wasteY = plotH + 74;
  const totalH = wasteY + WASTE_H + 24;
  const totalW = columns[columns.length - 1].x + BOX_W;

  const boxesOf = (machines: MachineTile[] | null) => {
    if (machines === null) return [{ y: centerY - BOX_H / 2, machine: null }];
    const height = machines.length * BOX_H + (machines.length - 1) * ROW_GAP;
    const start = centerY - height / 2;
    return machines.map((machine, i) => ({ y: start + i * (BOX_H + ROW_GAP), machine }));
  };

  const laidOut = columns.map((col) => ({ ...col, boxes: boxesOf(col.machines) }));

  // Every box in column A connects to every box in column B - correct for
  // fan-out (one corrugator feeding two printers) and fan-in (two printers
  // feeding one bundler) without hard-coding today's machine counts.
  const edges: {
    from: { x: number; y: number; running: boolean };
    to: { x: number; y: number };
  }[] = [];
  for (let c = 0; c < laidOut.length - 1; c++) {
    const left = laidOut[c];
    const right = laidOut[c + 1];
    // Inputs has no machine of its own to be "running" - but material is
    // plainly arriving if the machine it feeds is running, so that one edge
    // reads off the *destination*. Every other edge still reads off its
    // source, same as always: a machine only counts as feeding the next box
    // while it is itself running.
    const leftIsBoundary = left.machines === null;
    for (const a of left.boxes) {
      for (const b of right.boxes) {
        const running = leftIsBoundary
          ? b.machine?.state === "running"
          : a.machine?.state === "running";
        edges.push({
          from: { x: left.x + BOX_W, y: a.y + BOX_H / 2, running },
          to: { x: right.x, y: b.y + BOX_H / 2 },
        });
      }
    }
  }

  // Waste peels off Boarding and Printing (per the spec: those are the two
  // stages a mass-balance loss is attributed to), converging on one box.
  // Each source keeps its own column's centre-x, so the branch actually
  // starts under the box it is leaving rather than a fixed column, and
  // carries its machine's running state so the branch can visibly carry
  // waste right now instead of always looking dormant.
  const wasteSources = [
    ...laidOut[1].boxes.map((box) => ({
      x: laidOut[1].x + BOX_W / 2,
      y: box.y,
      running: box.machine?.state === "running",
    })),
    ...laidOut[2].boxes.map((box) => ({
      x: laidOut[2].x + BOX_W / 2,
      y: box.y,
      running: box.machine?.state === "running",
    })),
  ];
  const wasteX = laidOut[2].x + BOX_W / 2 - WASTE_W / 2;

  const curve = (x1: number, y1: number, x2: number, y2: number) => {
    const midX = (x1 + x2) / 2;
    return `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`;
  };

  // Boundary nodes aren't machines and have no state of their own - but
  // material is visibly moving through them whenever the machine on the
  // other side of that edge is running, so they borrow that machine's
  // liveness instead of always sitting grey.
  const inputsLive = boarding.some((m) => m.state === "running");
  const dispatchLive = bundling.some((m) => m.state === "running");
  const wasteLive = wasteSources.some((s) => s.running);

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${totalW} ${totalH}`}
          className="mx-auto block"
          style={{ minWidth: 760, height: (totalH / totalW) * 760 }}
          role="img"
          aria-label="Live process flow, reels to dispatch"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-ink-muted)" />
            </marker>
            <marker
              id="arrow-live"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-good)" />
            </marker>
          </defs>

          {/* Flow lines, under the boxes. */}
          {edges.map((edge, i) => {
            const d = curve(edge.from.x, edge.from.y, edge.to.x, edge.to.y);
            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke={edge.from.running ? "var(--color-good)" : "var(--color-hairline-strong)"}
                  strokeWidth={edge.from.running ? 2.2 : 1.6}
                  strokeDasharray={edge.from.running ? "7 6" : undefined}
                  className={edge.from.running ? "flow-line" : undefined}
                  markerEnd={edge.from.running ? "url(#arrow-live)" : "url(#arrow)"}
                />
                {edge.from.running && (
                  <circle r="3.2" fill="var(--color-good)">
                    <animateMotion dur="1.3s" repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Waste branches - a loss, so this never turns the flow-line
              green or joins the good-flow dot. It still needs to read as
              "happening right now" when its source machine is actually
              running, so an active branch gets a bolder stroke and its own
              (critical-coloured) moving dot instead. */}
          {wasteSources.map((source, i) => {
            const d = curve(source.x, source.y + BOX_H, wasteX + WASTE_W / 2, wasteY);
            return (
              <g key={`waste-${i}`}>
                <path
                  d={d}
                  fill="none"
                  stroke="var(--color-critical)"
                  strokeWidth={source.running ? 1.8 : 1.4}
                  strokeDasharray="2 5"
                  opacity={source.running ? 0.85 : 0.45}
                />
                {source.running && (
                  <circle r="2.6" fill="var(--color-critical)">
                    <animateMotion dur="1.6s" repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Inputs / Dispatch / Waste boundary nodes - not machines, so no
              state of their own, but they light up with the edge feeding
              them so the pipeline doesn't look like it dead-ends at either
              end while everything between is live. */}
          <foreignObject x={0} y={centerY - BOX_H / 2} width={BOX_W} height={BOX_H}>
            <BoundaryBox title="Inputs" sub="kraft reels, starch" icon={<InputsIcon />} live={inputsLive} />
          </foreignObject>
          <foreignObject x={laidOut[4].x} y={centerY - BOX_H / 2} width={BOX_W} height={BOX_H}>
            <BoundaryBox
              title="Dispatch"
              sub="counted bundles"
              icon={<DispatchIcon />}
              live={dispatchLive}
            />
          </foreignObject>
          <foreignObject x={wasteX} y={wasteY} width={WASTE_W} height={WASTE_H}>
            <BoundaryBox
              title="Waste"
              sub="trim, warp, rejects"
              icon={<WasteIcon />}
              tone="critical"
              live={wasteLive}
            />
          </foreignObject>

          {/* Machine boxes. */}
          {[laidOut[1], laidOut[2], laidOut[3]].map((col) =>
            col.boxes.map(
              (box, i) =>
                box.machine && (
                  <foreignObject key={`${col.key}-${i}`} x={col.x} y={box.y} width={BOX_W} height={BOX_H}>
                    <MachineBox
                      machine={box.machine}
                      stage={col.key as Stage}
                      selected={selected?.machineId === box.machine.machine_id}
                      onSelect={() => {
                        const stage = col.key as Stage;
                        setSelected((current) =>
                          current?.machineId === box.machine!.machine_id
                            ? null
                            : { machineId: box.machine!.machine_id, stage },
                        );
                      }}
                    />
                  </foreignObject>
                ),
            ),
          )}
        </svg>
      </div>

      <Legend />

      {selected ? (
        <MachineHealthPanel
          machine={machinesByStage[selected.stage].find((m) => m.machine_id === selected.machineId)}
          stage={selected.stage}
          parameters={parameters.filter((p) => p.machine_id === selected.machineId)}
          stageHref={stageHref}
          onClose={() => setSelected(null)}
        />
      ) : (
        <p className="px-1 text-[11px] italic text-[var(--color-ink-muted)]">
          Click any machine for its live health.
        </p>
      )}
    </div>
  );
}

function BoundaryBox({
  title,
  sub,
  icon,
  tone,
  live,
}: {
  title: string;
  sub: string;
  icon: React.ReactNode;
  tone?: "critical";
  live?: boolean;
}) {
  // Waste keeps its critical colour whether or not it's currently active -
  // a loss is never "good news" just because it's happening right now.
  // Inputs/Dispatch have no state of their own, so idle is the neutral grey
  // hairline and live borrows the same green as an actually-running machine.
  const color =
    tone === "critical"
      ? "var(--color-critical)"
      : live
        ? "var(--color-state-running)"
        : "var(--color-ink-muted)";
  const borderColor =
    tone === "critical"
      ? "var(--color-critical)"
      : live
        ? "var(--color-state-running)"
        : "var(--color-hairline-strong)";
  return (
    <div
      className="flex h-full w-full items-center gap-2 rounded-md border border-dashed px-2.5"
      style={{
        borderColor,
        color,
        backgroundImage:
          tone === "critical"
            ? "repeating-linear-gradient(45deg, rgba(225,29,72,0.09) 0 1px, transparent 1px 8px)"
            : "repeating-linear-gradient(45deg, rgba(148,163,184,0.14) 0 1px, transparent 1px 8px)",
      }}
    >
      <span className="shrink-0" style={{ color }}>
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-1.5">
          {live && (
            <span
              aria-hidden
              className="relative h-1.5 w-1.5 shrink-0 rounded-full pulse"
              style={{ backgroundColor: color, color }}
            />
          )}
          <span className="truncate text-[11.5px] font-semibold">{title}</span>
        </div>
        <span className="truncate text-[10px] leading-tight opacity-80">{sub}</span>
      </div>
    </div>
  );
}

const STAGE_ICON: Record<Stage, React.ReactNode> = {
  board_manufacturing: <CorrugatorIcon />,
  printing: <PrinterIcon />,
  bundling: <BundlerIcon />,
};

function MachineBox({
  machine,
  stage,
  selected,
  onSelect,
}: {
  machine: MachineTile;
  stage: Stage;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = STATE_META[machine.state];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${machine.name} - ${meta.label} - view health`}
      className="flex h-full w-full cursor-pointer items-center gap-2 rounded-md border bg-[var(--color-surface-1)] pr-2.5 text-left transition hover:brightness-[0.98] focus-visible:outline-none"
      style={{
        borderColor: "var(--color-hairline)",
        borderLeft: `4px solid ${meta.color}`,
        boxShadow: selected ? "0 0 0 2px var(--color-series-1)" : undefined,
      }}
    >
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: "var(--color-plane)", color: "var(--color-ink-2)" }}
      >
        {STAGE_ICON[stage]}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`relative h-1.5 w-1.5 shrink-0 rounded-full ${machine.state === "running" ? "pulse" : ""}`}
            style={{ backgroundColor: meta.color, color: meta.color }}
          />
          <span className="truncate text-[12px] font-semibold text-[var(--color-ink)]">
            {machine.machine_code}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="tnum text-[13px] font-bold text-[var(--color-ink)]">
            {machine.rate != null ? formatNumber(machine.rate, machine.rate >= 1000 ? 0 : 1) : "--"}
          </span>
          <span className="text-[10px] text-[var(--color-ink-muted)]">{machine.rate_unit}</span>
          <span className="truncate text-[10px]" style={{ color: meta.color }}>
            · {meta.label}
          </span>
        </div>
      </div>
    </button>
  );
}

const PARAM_TONE: Record<ParameterStrip["position"], string> = {
  in_band: "var(--color-good)",
  unknown: "var(--color-ink-muted)",
  above: "var(--color-warning)",
  below: "var(--color-warning)",
};

function MachineHealthPanel({
  machine,
  stage,
  parameters,
  stageHref,
  onClose,
}: {
  machine: MachineTile | undefined;
  stage: Stage;
  parameters: ParameterStrip[];
  stageHref: (stage: Stage) => string;
  onClose: () => void;
}) {
  if (!machine) return null;
  const meta = STATE_META[machine.state];

  const metrics: { label: string; value: string; tone?: string }[] = [
    {
      label: machine.rate_unit ? `Rate (${machine.rate_unit})` : "Rate",
      value: machine.rate != null ? formatNumber(machine.rate, machine.rate >= 1000 ? 0 : 1) : "--",
    },
    {
      label: "vs standard",
      value: machine.rate_vs_standard_pct != null ? `${machine.rate_vs_standard_pct}%` : "--",
    },
    {
      label: "Time in state",
      value: formatMinutes(machine.minutes_in_state),
    },
  ];
  if (machine.reason_code) {
    metrics.push({ label: "Reason", value: machine.reason_code.description });
  }
  for (const p of parameters) {
    metrics.push({
      label: p.label,
      value: `${formatNumber(p.value, 2)} ${p.unit}`,
      tone: PARAM_TONE[p.position],
    });
  }

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-hairline)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: "var(--color-plane)", color: "var(--color-ink-2)" }}
          >
            {STAGE_ICON[stage]}
          </span>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-[var(--color-ink)]">{machine.name}</span>
            <span className="text-[11px] text-[var(--color-ink-muted)]">
              {machine.machine_code} · {STAGE_LABEL[stage]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
          >
            {meta.label}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close machine health"
            className="text-[13px] leading-none text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink)]"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex flex-col">
            <span className="truncate text-[10px] text-[var(--color-ink-muted)]">{metric.label}</span>
            <span
              className="tnum truncate text-[12.5px] font-semibold"
              style={{ color: metric.tone ?? "var(--color-ink)" }}
            >
              {metric.value}
            </span>
          </div>
        ))}
      </div>

      <Link
        to={stageHref(stage)}
        className="mt-3 inline-block text-[11px] text-[var(--color-series-1)] transition hover:underline"
      >
        Open stage →
      </Link>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[10.5px] text-[var(--color-ink-2)]">
      {STATE_ORDER.map((state) => (
        <span key={state} className="flex items-center gap-1">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: STATE_META[state].color }}
          />
          {STATE_META[state].label}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <svg width="16" height="8" aria-hidden>
          <circle cx="8" cy="4" r="3" fill="var(--color-good)" />
        </svg>
        Live material flow
      </span>
      <span className="flex items-center gap-1">
        <svg width="16" height="8" aria-hidden>
          <line
            x1="0"
            y1="4"
            x2="16"
            y2="4"
            stroke="var(--color-critical)"
            strokeWidth="1.4"
            strokeDasharray="2 3"
          />
        </svg>
        Waste
      </span>
    </div>
  );
}

function InputsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function CorrugatorIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="15" height="15" aria-hidden>
      <path
        d="M3 7.2c1.1-1.8 2.6-1.8 3.7 0s2.6 1.8 3.7 0 2.6-1.8 3.7 0 2.6 1.8 3.7 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M3 13c1.1-1.8 2.6-1.8 3.7 0s2.6 1.8 3.7 0 2.6-1.8 3.7 0 2.6 1.8 3.7 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PrinterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="15" height="15" aria-hidden>
      <path d="M5.5 7.2V3.6h9v3.6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="3" y="7.2" width="14" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.2 13.4v3h7.6v-3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function BundlerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="15" height="15" aria-hidden>
      <rect x="3.5" y="5" width="13" height="11" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 10.2h13M10 5v11" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function DispatchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="15" height="15" aria-hidden>
      <path d="M2.6 13.6V6.8h7.2v6.8" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path
        d="M9.8 9.4h3.1l2.5 2.4v1.8H9.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="5.8" cy="14.6" r="1.3" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12.6" cy="14.6" r="1.3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function WasteIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="15" height="15" aria-hidden>
      <path
        d="M4.2 6h11.6M8 6V4.4h4V6M6.1 6l.7 9.4a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9L14 6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
