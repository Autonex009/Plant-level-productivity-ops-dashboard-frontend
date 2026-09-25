import type { MachineTile, ParameterStrip } from "@/api/types";
import { DEFAULT_MAX, useAnimatedNumber } from "@/components/InstrumentCluster";
import { formatMinutes, formatNumber } from "@/lib/format";

/**
 * Level 2's "live instruments" row: the same radial-dial idea as the plant
 * gauges, but zoomed in on this one stage's own machines and parameters, each
 * with a budget/target triangle and (for parameters) a shaded healthy band -
 * the zone comes straight off the real control band, never an invented
 * alarm threshold the app doesn't otherwise use.
 *
 * A stopped machine doesn't get a fake reading: the needle rests at zero and
 * a coloured pill states why, same rule as every other gauge in this app.
 */

const CX = 110;
const CY = 92;
const RADIUS = 76;
const STROKE = 11;
const START_ANGLE = -125;
const END_ANGLE = 125;
const SWEEP = END_ANGLE - START_ANGLE;

function polar(deg: number, r = RADIUS): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

function arcPath(a0: number, a1: number, r = RADIUS): string {
  const [x0, y0] = polar(a0, r);
  const [x1, y1] = polar(a1, r);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

const STATE_COLOR: Record<"good" | "warn" | "bad" | "neutral", string> = {
  good: "var(--color-good)",
  warn: "var(--color-warning)",
  bad: "var(--color-critical)",
  neutral: "var(--color-ink)",
};

interface DialProps {
  title: string;
  sub: string;
  value: number;
  min?: number;
  max: number;
  unit: string;
  decimals?: number;
  budget?: number | null;
  zone?: [number, number] | null;
  state?: "good" | "warn" | "bad" | "neutral";
  down?: string | null;
}

function Dial({
  title,
  sub,
  value,
  min = 0,
  max,
  unit,
  decimals = 0,
  budget,
  zone,
  state = "neutral",
  down,
}: DialProps) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const angleFor = (v: number) => START_ANGLE + ((clamp(v) - min) / (max - min || 1)) * SWEEP;
  const animated = useAnimatedNumber(down ? min : value, 900);
  const needleAngle = down ? START_ANGLE : angleFor(animated);
  const track = arcPath(START_ANGLE, END_ANGLE);
  const color = down ? "var(--color-critical)" : STATE_COLOR[state];

  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => min + ((max - min) * i) / ticks);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[12.5px] font-semibold text-[var(--color-ink)]">{title}</span>
      <svg viewBox="0 0 220 160" className="w-full max-w-[176px]" role="img" aria-label={`${title} gauge`}>
        <path d={track} fill="none" stroke="var(--color-hairline)" strokeWidth={STROKE} strokeLinecap="round" />
        {zone && (
          <path
            d={arcPath(angleFor(zone[0]), angleFor(zone[1]))}
            fill="none"
            stroke="var(--color-good-soft)"
            strokeWidth={STROKE}
          />
        )}

        {tickVals.map((t, i) => {
          const a = START_ANGLE + (i / ticks) * SWEEP;
          const [ix, iy] = polar(a, RADIUS - STROKE / 2 - 1);
          const [ox, oy] = polar(a, RADIUS + STROKE / 2 + 1);
          // Labels sit inside the ring, not outside it - the budget/target
          // triangle lives just outside the ring, and a tick label near the
          // band's midpoint would otherwise land right under it.
          const [lx, ly] = polar(a, RADIUS - STROKE / 2 - 15);
          return (
            <g key={i}>
              <line x1={ix} y1={iy} x2={ox} y2={oy} stroke="var(--color-surface-1)" strokeWidth={1.5} />
              <text x={lx} y={ly + 3} fontSize="9" textAnchor="middle" fill="var(--color-ink-muted)">
                {formatNumber(t, decimals)}
              </text>
            </g>
          );
        })}

        {budget != null && (
          <path
            d={(() => {
              const a = angleFor(budget);
              const [tx, ty] = polar(a, RADIUS + 5);
              const [lx1, ly1] = polar(a - 4.5, RADIUS + 15);
              const [lx2, ly2] = polar(a + 4.5, RADIUS + 15);
              return `M${tx.toFixed(2)},${ty.toFixed(2)} L${lx1.toFixed(2)},${ly1.toFixed(2)} L${lx2.toFixed(2)},${ly2.toFixed(2)} Z`;
            })()}
            fill="var(--color-ink)"
          >
            <title>budget/target {formatNumber(budget, decimals)}</title>
          </path>
        )}

        <g style={{ transformOrigin: `${CX}px ${CY}px`, transform: `rotate(${needleAngle}deg)` }}>
          <path
            d={`M${CX - 2.6},${CY + 10} L${CX - 1},${CY - RADIUS + 20} L${CX + 1},${CY - RADIUS + 20} L${CX + 2.6},${CY + 10} Z`}
            fill={color}
          />
        </g>
        <circle cx={CX} cy={CY} r={7} fill="var(--color-ink)" />
        <circle cx={CX} cy={CY} r={2.6} fill="var(--color-surface-1)" />

        {down ? (
          <>
            <rect x={CX - 52} y={CY - 40} width={104} height={22} rx={11} fill="var(--color-critical-soft)" />
            <text x={CX} y={CY - 24.5} textAnchor="middle" fontSize="13.5" fontWeight={800} fill={color}>
              {down}
            </text>
          </>
        ) : (
          <text x={CX} y={CY + 34} textAnchor="middle" fontSize="21" fontWeight={800} fill={color}>
            {formatNumber(animated, decimals)}
          </text>
        )}
        <text x={CX} y={CY + 48} textAnchor="middle" fontSize="10.5" fill="var(--color-ink-2)">
          {unit}
        </text>
      </svg>
      <span className="max-w-[176px] text-center text-[11px] leading-tight text-[var(--color-ink-muted)]">
        {sub}
      </span>
    </div>
  );
}

function rateState(pct: number | null): "good" | "warn" | "bad" {
  if (pct == null) return "warn";
  if (pct >= 90) return "good";
  if (pct >= 75) return "warn";
  return "bad";
}

function machineDial(machine: MachineTile) {
  const down = machine.state === "down" ? `Down ${formatMinutes(machine.minutes_in_state)}` : machine.state === "waiting" ? "Waiting" : null;
  // Same three-tier fallback as the Overview gauges: a real rated speed, then
  // a real standard/live reading to guess from, and only as a last resort -
  // every machine on this stage simultaneously stale - a realistic nameplate
  // ballpark, so the scale never collapses to near-zero with duplicate ticks.
  const max =
    machine.rated_speed ??
    (machine.standard_rate
      ? machine.standard_rate * 1.4
      : machine.rate
        ? machine.rate * 1.6
        : DEFAULT_MAX[machine.stage]);
  const decimals = max >= 20 ? 0 : 1;
  return (
    <Dial
      key={machine.machine_id}
      title={machine.name}
      sub={
        machine.standard_rate != null
          ? `standard ${formatNumber(machine.standard_rate, decimals)} ${machine.rate_unit}`
          : machine.reason_code?.description ?? "no standard set"
      }
      value={machine.rate ?? 0}
      max={max}
      unit={machine.rate_unit}
      decimals={decimals}
      budget={machine.standard_rate}
      state={rateState(machine.rate_vs_standard_pct)}
      down={down}
    />
  );
}

function paramDial(strip: ParameterStrip) {
  const hasBand = strip.band_low != null && strip.band_high != null;
  const low = strip.band_low ?? strip.value;
  const high = strip.band_high ?? strip.value;
  const pad = (high - low) * 0.6 || Math.max(Math.abs(strip.value) * 0.15, 1);
  const min = Math.min(low - pad, strip.value);
  const max = Math.max(high + pad, strip.value);
  const decimals = Math.abs(strip.value) < 10 ? 2 : Math.abs(strip.value) < 100 ? 1 : 0;
  const state: "good" | "warn" | "neutral" =
    strip.position === "in_band" ? "good" : strip.position === "unknown" ? "neutral" : "warn";

  return (
    <Dial
      key={`${strip.machine_id}-${strip.metric_code}`}
      title={strip.label}
      sub={`${strip.machine_code} · ${strip.drift}`}
      value={strip.value}
      min={min}
      max={max}
      unit={strip.unit}
      decimals={decimals}
      budget={strip.target}
      zone={hasBand ? [low, high] : null}
      state={state}
    />
  );
}

/** A count against its own real total, as a progress ring - not a percentage
 *  gauge, because the point is the two whole numbers ("14 of 17"), not a
 *  rate. Both numbers are real; nothing here is a rate estimated from one
 *  of them. */
function Ring({
  title,
  sub,
  ok,
  total,
  centerLabel,
  bottomLabel,
  color = "var(--color-good)",
}: {
  title: string;
  sub: string;
  ok: number;
  total: number;
  centerLabel: string;
  bottomLabel?: string;
  color?: string;
}) {
  // Same viewBox and max-width as Dial - not the same circle size, though.
  // The reference draws its ring deliberately smaller than its dial (118px
  // max-width against the dial's 210px, on their respective viewBoxes,
  // which works out to about 62% of the dial's circle diameter): a ring is
  // a simpler instrument than a speedometer and reads fine smaller. r=47
  // reproduces that same ~62% ratio against this Dial's own r=76.
  const r = 47;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.max(0, Math.min(1, ok / total)) : 0;
  const animated = useAnimatedNumber(pct, 900);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[12.5px] font-semibold text-[var(--color-ink)]">{title}</span>
      <svg viewBox="0 0 220 160" className="w-full max-w-[176px]" role="img" aria-label={`${title}: ${centerLabel}`}>
        <circle cx={CX} cy={CY} r={r} fill="none" stroke="var(--color-hairline)" strokeWidth={STROKE} />
        <circle
          cx={CX}
          cy={CY}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - animated)}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
        <text x={CX} y={bottomLabel ? CY - 4 : CY + 4} textAnchor="middle" fontSize={centerLabel.length > 4 ? 21 : 25} fontWeight={800} fill="var(--color-ink)">
          {centerLabel}
        </text>
        {bottomLabel && (
          <text x={CX} y={CY + 18} textAnchor="middle" fontSize={12.5} fill="var(--color-ink-2)">
            {bottomLabel}
          </text>
        )}
      </svg>
      <span className="max-w-[176px] text-center text-[11px] leading-tight text-[var(--color-ink-muted)]">
        {sub}
      </span>
    </div>
  );
}

export function StageInstruments({
  machines,
  parameters,
  stagedOrders,
  countAudits,
}: {
  machines: MachineTile[];
  parameters: ParameterStrip[];
  /** Bundling only, and only when a real "orders due" denominator exists -
   *  never rendered against an invented total. */
  stagedOrders?: { staged: number; due: number } | null;
  /** Bundling only: how many of this period's count audits matched exactly,
   *  derived from the same worker log the Workers & audits panel shows. */
  countAudits?: { exact: number; total: number } | null;
}) {
  // Every machine gets a dial; parameters are capped so the row stays a
  // five-second read rather than a wall of dials duplicating the Parameters
  // panel one level down.
  const shownParams = parameters.slice(0, Math.max(0, 4 - machines.length));
  const hasRings = Boolean(stagedOrders) || Boolean(countAudits);
  if (machines.length === 0 && shownParams.length === 0 && !hasRings) return null;

  return (
    <section className="panel p-4">
      <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">Live instruments</h3>
      <p className="mb-3 text-[12.5px] text-[var(--color-ink-muted)]">
        The needle is now, the black triangle is standard or target, and the shaded arc is the healthy band.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {machines.map(machineDial)}
        {shownParams.map(paramDial)}
        {stagedOrders && (
          <Ring
            title="Orders staged"
            sub={`${stagedOrders.due - stagedOrders.staged} still due today`}
            ok={stagedOrders.staged}
            total={stagedOrders.due}
            centerLabel={`${stagedOrders.staged} of ${stagedOrders.due}`}
            bottomLabel="staged"
            color="var(--color-series-1)"
          />
        )}
        {countAudits && (
          <Ring
            title="Count audits"
            sub="matched exactly, this period"
            ok={countAudits.exact}
            total={countAudits.total}
            centerLabel={`${countAudits.exact} of ${countAudits.total}`}
            bottomLabel="exact"
            color={countAudits.exact === countAudits.total ? "var(--color-good)" : "var(--color-warning)"}
          />
        )}
      </div>
    </section>
  );
}
