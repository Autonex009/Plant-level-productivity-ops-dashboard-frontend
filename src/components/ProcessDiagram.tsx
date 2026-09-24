import { useState } from "react";
import { Link } from "react-router-dom";

import type { MachineTile, ParameterStrip, Stage } from "@/api/types";
import {
  Bundler,
  Conveyor,
  Corrugator,
  DispatchBay,
  FlexoPrinter,
  FloorPad,
  ReelStand,
  STATION_W,
  Transfer,
  WasteBaler,
  WasteChute,
} from "@/components/machines/MachineArt";
import { formatMinutes, formatNumber } from "@/lib/format";
import { STAGE_LABEL, STATE_META } from "@/lib/viz";

const STATION_H = 100;
const LABEL_H = 38;
const ROW_GAP = 18;
const COL_GAP = 62;
const BELT_Y = 62; // where a conveyor sits against the station's own floor line

const STATE_ORDER = ["running", "setup", "down", "waiting", "idle", "no_data"] as const;

/**
 * The plant as a shop-floor elevation: reels in on the left, board and sheets
 * travelling right along conveyors, trim dropping into the baler below, pallets
 * out at the dispatch bay.
 *
 * Drawn as machines rather than as a flowchart. A corrugator has fluted rolls
 * and steam, a flexo has a cylinder column and an ink duct, a bundler has a
 * strapping arch - so a plant person recognises their own line without reading
 * a single label, which is the same reason the status line upstairs is shaped
 * like the process.
 *
 * Printing fans out to a station per printer rather than one box hiding two
 * machines, and the conveyors between columns are drawn per pair, so a line
 * feeding a stopped printer visibly stops while its neighbour keeps moving.
 *
 * Motion means exactly one thing anywhere on this schematic: material is
 * moving there right now. A roll only spins, a belt only flows and a sheet
 * only travels while the machine driving it is actually running; everything
 * else goes still and dims. Colour says how a machine is doing, in the same
 * status palette used on every KPI card, and the steel it is drawn in is
 * deliberately outside that palette so it never competes for meaning.
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

  const columns: {
    key: string;
    stage: Stage | null;
    machines: MachineTile[] | null;
    title: string;
    sub: string;
  }[] = [
    { key: "inputs", stage: null, machines: null, title: "Reel stand", sub: "kraft in" },
    {
      key: "board_manufacturing",
      stage: "board_manufacturing",
      machines: boarding,
      title: "Boarding",
      sub: "",
    },
    { key: "printing", stage: "printing", machines: printing, title: "Printing", sub: "" },
    { key: "bundling", stage: "bundling", machines: bundling, title: "Bundling", sub: "" },
    { key: "dispatch", stage: null, machines: null, title: "Dispatch", sub: "bundles out" },
  ];

  const maxRows = Math.max(1, boarding.length, printing.length, bundling.length);
  const rowPitch = STATION_H + LABEL_H + ROW_GAP;
  const plotH = maxRows * rowPitch - ROW_GAP;
  const centreY = plotH / 2;

  const colX = (i: number) => i * (STATION_W + COL_GAP);
  const totalW = colX(columns.length - 1) + STATION_W;

  const wasteTop = plotH + 34;
  const totalH = wasteTop + STATION_H + 16;

  /** Vertical placement of each station within its column, centred as a group. */
  const placeRows = (machines: MachineTile[] | null) => {
    const count = machines === null ? 1 : Math.max(machines.length, 1);
    const height = count * rowPitch - ROW_GAP;
    const start = centreY - height / 2;
    return Array.from({ length: count }, (_, i) => ({
      y: start + i * rowPitch,
      machine: machines ? (machines[i] ?? null) : null,
    }));
  };

  const laidOut = columns.map((col, i) => ({
    ...col,
    x: colX(i),
    rows: placeRows(col.machines),
  }));

  const inputsLive = boarding.some((m) => m.state === "running");
  const dispatchLive = bundling.some((m) => m.state === "running");

  // A conveyor runs when the machine feeding it runs. The reel stand has no
  // machine of its own, so that first belt reads off the corrugator it feeds -
  // material is plainly arriving if the corrugator is pulling it.
  const beltRuns = (left: (typeof laidOut)[number], leftRow: { machine: MachineTile | null }, rightRow: { machine: MachineTile | null }) =>
    left.machines === null
      ? rightRow.machine?.state === "running"
      : leftRow.machine?.state === "running";

  // Waste is attributed to boarding and printing, per the mass balance.
  const wasteSources = [laidOut[1], laidOut[2]].flatMap((col) =>
    col.rows
      .filter((row) => row.machine)
      .map((row) => ({
        x: col.x + STATION_W / 2,
        // Below the name plate, not through it.
        y: row.y + STATION_H + LABEL_H - 4,
        active: row.machine?.state === "running",
      })),
  );
  const wasteX = (laidOut[1].x + laidOut[2].x) / 2 + STATION_W / 2;
  const wasteActive = wasteSources.some((s) => s.active);

  const selectedMachine = selected
    ? machinesByStage[selected.stage].find((m) => m.machine_id === selected.machineId)
    : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${totalW} ${totalH}`}
          width="100%"
          style={{ minWidth: 900, maxWidth: totalW * 1.15 }}
          className="block"
          role="img"
          aria-label="Live process schematic: reel stand, corrugator, printers, bundling line, dispatch, and the waste baler"
        >
          {/* Shop floor, one pad per station. Drawn as a rule across the whole
              width it would run through the empty space between columns and
              read as a divider rather than as a floor. */}
          {laidOut.map((col) =>
            col.rows.map((row, i) => (
              <FloorPad
                key={`floor-${col.key}-${i}`}
                x={col.x - 6}
                y={row.y + STATION_H - 2}
                width={STATION_W + 12}
              />
            )),
          )}

          {/* Links between columns. A straight conveyor when the two stations
              stand at the same height; a curved transfer when they do not,
              since a straight belt across a height difference meets neither
              machine. */}
          {laidOut.slice(0, -1).map((left, i) => {
            const right = laidOut[i + 1];
            return left.rows.flatMap((leftRow, li) =>
              right.rows.map((rightRow, ri) => {
                const running = Boolean(beltRuns(left, leftRow, rightRow));
                const key = `link-${left.key}-${li}-${ri}`;
                const sameRow = Math.abs(leftRow.y - rightRow.y) < 2;
                if (sameRow) {
                  return (
                    <Conveyor
                      key={key}
                      x={left.x + STATION_W - 6}
                      y={leftRow.y + BELT_Y}
                      width={COL_GAP + 12}
                      running={running}
                    />
                  );
                }
                return (
                  <Transfer
                    key={key}
                    from={{ x: left.x + STATION_W - 4, y: leftRow.y + BELT_Y + 4 }}
                    to={{ x: right.x + 4, y: rightRow.y + BELT_Y + 4 }}
                    running={running}
                  />
                );
              }),
            );
          })}

          {/* Trim chutes down to the baler. */}
          {wasteSources.map((source, i) => (
            <WasteChute
              key={`chute-${i}`}
              from={{ x: source.x, y: source.y }}
              to={{ x: wasteX, y: wasteTop + 30 }}
              active={source.active}
            />
          ))}

          {/* The baler. */}
          <g transform={`translate(${wasteX - STATION_W / 2} ${wasteTop})`}>
            <WasteBaler active={wasteActive} />
          </g>
          <StationLabel
            x={wasteX - STATION_W / 2}
            y={wasteTop + STATION_H}
            title="Waste baler"
            value="trim, warp, rejects"
            accent="var(--color-critical)"
            muted
          />

          {/* Stations. */}
          {laidOut.map((col) =>
            col.rows.map((row, rowIndex) => {
              const machine = row.machine;
              const running = machine
                ? machine.state === "running"
                : col.key === "inputs"
                  ? inputsLive
                  : dispatchLive;
              const accent = machine
                ? STATE_META[machine.state].color
                : running
                  ? "var(--color-state-running)"
                  : "var(--color-ink-muted)";
              const isSelected = machine != null && selected?.machineId === machine.machine_id;

              return (
                <g key={`${col.key}-${rowIndex}`} transform={`translate(${col.x} ${row.y})`}>
                  <g className={running ? undefined : "machine-idle"}>
                    <StationArt colKey={col.key} running={running} accent={accent} />
                  </g>

                  {machine ? (
                    <MachineLabel
                      machine={machine}
                      selected={isSelected}
                      onSelect={() =>
                        setSelected((current) =>
                          current?.machineId === machine.machine_id
                            ? null
                            : { machineId: machine.machine_id, stage: col.stage as Stage },
                        )
                      }
                    />
                  ) : (
                    <StationLabel
                      x={0}
                      y={STATION_H}
                      title={col.title}
                      value={col.sub}
                      accent={accent}
                      muted
                    />
                  )}
                </g>
              );
            }),
          )}
        </svg>
      </div>

      <Legend />

      {selectedMachine && selected ? (
        <MachineHealthPanel
          machine={selectedMachine}
          stage={selected.stage}
          parameters={parameters.filter((p) => p.machine_id === selected.machineId)}
          stageHref={stageHref}
          onClose={() => setSelected(null)}
        />
      ) : (
        <p className="px-1 text-[11.5px] italic text-[var(--color-ink-muted)]">
          Click any machine for its live health.
        </p>
      )}
    </div>
  );
}

function StationArt({
  colKey,
  running,
  accent,
}: {
  colKey: string;
  running: boolean;
  accent: string;
}) {
  switch (colKey) {
    case "inputs":
      return <ReelStand running={running} accent={accent} />;
    case "board_manufacturing":
      return <Corrugator running={running} accent={accent} />;
    case "printing":
      return <FlexoPrinter running={running} accent={accent} />;
    case "bundling":
      return <Bundler running={running} accent={accent} />;
    default:
      return <DispatchBay running={running} accent={accent} />;
  }
}

/** A boundary station's name plate - not a machine, so it is not clickable. */
function StationLabel({
  x,
  y,
  title,
  value,
  accent,
  muted,
}: {
  x: number;
  y: number;
  title: string;
  value: string;
  accent: string;
  muted?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <text
        x={STATION_W / 2}
        y={17}
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="700"
        fill={muted ? "var(--color-ink-2)" : accent}
      >
        {title}
      </text>
      <text
        x={STATION_W / 2}
        y={31}
        textAnchor="middle"
        fontSize="10.5"
        fill="var(--color-ink-muted)"
      >
        {value}
      </text>
    </g>
  );
}

/**
 * A machine's name plate: code, live rate, and state. Clickable, because the
 * next question after "which machine is that" is always "how is it doing,
 * exactly" - and the answer belongs on this screen rather than one navigation
 * away.
 */
function MachineLabel({
  machine,
  selected,
  onSelect,
}: {
  machine: MachineTile;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = STATE_META[machine.state];
  return (
    <g
      transform={`translate(0 ${STATION_H})`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${machine.name}, ${meta.label}. Show live health.`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={6}
        y={4}
        width={STATION_W - 12}
        height={LABEL_H - 8}
        rx={7}
        fill={selected ? "var(--color-series-1-soft)" : "var(--color-surface-1)"}
        stroke={selected ? "var(--color-series-1)" : "var(--color-hairline)"}
        strokeWidth={selected ? 1.6 : 1}
      />
      <text x={15} y={18} fontSize="12" fontWeight="700" fill="var(--color-ink)">
        {machine.machine_code}
      </text>
      <text x={15} y={30} fontSize="10.5" fill={meta.color}>
        {meta.label}
        {machine.state !== "running" && machine.minutes_in_state != null
          ? ` · ${formatMinutes(machine.minutes_in_state)}`
          : ""}
      </text>
      <text
        x={STATION_W - 15}
        y={20}
        textAnchor="end"
        fontSize="13"
        fontWeight="700"
        fill="var(--color-ink)"
      >
        {machine.rate != null ? formatNumber(machine.rate, machine.rate >= 1000 ? 0 : 1) : "--"}
      </text>
      <text
        x={STATION_W - 15}
        y={30}
        textAnchor="end"
        fontSize="9.5"
        fill="var(--color-ink-muted)"
      >
        {machine.rate_unit}
      </text>
    </g>
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
  machine: MachineTile;
  stage: Stage;
  parameters: ParameterStrip[];
  stageHref: (stage: Stage) => string;
  onClose: () => void;
}) {
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
    { label: "Time in state", value: formatMinutes(machine.minutes_in_state) },
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
    <div
      className="rounded-[10px] border p-3"
      style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface-2)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <svg viewBox={`0 0 ${STATION_W} ${STATION_H + 4}`} width="62" height="38" aria-hidden>
            <StationArt colKey={stage} running={machine.state === "running"} accent={meta.color} />
          </svg>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13.5px] font-bold text-[var(--color-ink)]">
              {machine.name}
            </span>
            <span className="truncate text-[11.5px] text-[var(--color-ink-muted)]">
              {machine.machine_code} · {STAGE_LABEL[stage]}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            <span className="truncate text-[10px] text-[var(--color-ink-muted)]">
              {metric.label}
            </span>
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
        className="mt-3 inline-block text-[11.5px] font-semibold text-[var(--color-series-1)] transition hover:underline"
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
        <svg width="18" height="8" aria-hidden>
          <rect
            x="1"
            y="2"
            width="12"
            height="4"
            rx="1"
            fill="var(--color-board)"
            stroke="var(--color-board-edge)"
            strokeWidth="0.8"
          />
        </svg>
        Board on the line
      </span>
      <span className="flex items-center gap-1">
        <svg width="18" height="8" aria-hidden>
          <line
            x1="0"
            y1="4"
            x2="18"
            y2="4"
            stroke="var(--color-critical)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>
        Trim to baler
      </span>
      <span className="italic text-[var(--color-ink-muted)]">
        Anything moving is moving right now.
      </span>
    </div>
  );
}
