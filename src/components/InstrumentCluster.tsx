import { Fragment, useEffect, useRef, useState } from "react";

import type { MachineState, PlantTotals, Stage, StatusDot } from "@/api/types";
import { formatNumber } from "@/lib/format";
import { STATE_META } from "@/lib/viz";

// Idle's actual palette colour is a near-white wash - correct for a 6px
// status dot (idle should fade away), wrong for a filled gauge arc (it just
// looks broken/empty). The gauge substitutes a readable neutral for exactly
// those two "nothing wrong, nothing to report" states; every other state
// keeps its real colour.
const GAUGE_COLOR: Partial<Record<MachineState, string>> = {
  idle: "var(--color-ink-muted)",
  no_data: "var(--color-ink-muted)",
};

// Last-resort gauge scale for a stage with no rated_speed, no order target,
// and no live value to even guess from (every machine simultaneously stale)
// - realistic nameplate ballparks, so the dial reads as "no data yet" rather
// than degenerating to a near-zero scale with duplicate rounded ticks.
export const DEFAULT_MAX: Record<Stage, number> = {
  board_manufacturing: 300,
  printing: 8000,
  bundling: 120,
};

const CX = 100;
const CY = 96;
const RADIUS = 72;
const STROKE = 13;
const START_ANGLE = -125;
const END_ANGLE = 125;
const SWEEP = END_ANGLE - START_ANGLE;
const TICKS = 4; // 5 labelled readings: 0, 1/4, 1/2, 3/4, max.
const REDUCED_MOTION =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

/**
 * Ticks a number from wherever it last was up to `target` - starting from 0
 * on the very first mount, exactly like the reference dashboard's needle and
 * odometer both sweep up from rest every time the page loads rather than
 * appearing already at their reading. A CSS transition can't do this (it has
 * no numeric value to interpolate through a text node or a derived angle),
 * so this drives the number itself, once, and the needle/arc/odometer text
 * all read off that same animated number - which is also why the pointer
 * and the figure move in lockstep instead of drifting apart.
 */
export function useAnimatedNumber(target: number, durationMs = 900): number {
  const [display, setDisplay] = useState(REDUCED_MOTION ? target : 0);
  const from = useRef(REDUCED_MOTION ? target : 0);

  useEffect(() => {
    if (REDUCED_MOTION) {
      setDisplay(target);
      from.current = target;
      return;
    }
    const start = from.current;
    const delta = target - start;
    if (Math.abs(delta) < 1e-6) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - (1 - p) ** 3; // ease-out cubic: quick start, gentle settle.
      setDisplay(start + delta * eased);
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        from.current = target;
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return display;
}

/**
 * A speedometer, redrawn as a modern radial gauge rather than a fake physical
 * instrument: a flat progress arc under a slim needle, with labelled
 * readings at even intervals (not just the endpoints) so a value between
 * ticks can be read off, not just estimated.
 *
 * When the stage isn't running, the needle rests at zero and the reading is
 * replaced by the state's own label and colour - the same "a stopped machine
 * doesn't get a fake number" rule as the rest of the dashboard.
 */
function Gauge({ row }: { row: StatusDot }) {
  const meta = STATE_META[row.status];
  const color = GAUGE_COLOR[row.status] ?? meta.color;
  const fallbackMax = row.target
    ? row.target * 1.3
    : row.live_value
      ? row.live_value * 1.6
      : DEFAULT_MAX[row.stage];
  const max = row.rated_speed ?? fallbackMax;
  const target = row.live_value ?? 0;
  const animated = useAnimatedNumber(target);
  const pct = Math.max(0, Math.min(1, animated / max));
  const needleAngle = START_ANGLE + pct * SWEEP;
  const track = arcPath(START_ANGLE, END_ANGLE);

  const targetAngle = row.target != null ? START_ANGLE + Math.min(1, row.target / max) * SWEEP : null;
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => (max * i) / TICKS);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 200 172" className="w-full max-w-[168px]" role="img" aria-label={`${row.label} gauge`}>
        <path
          d={track}
          fill="none"
          stroke="var(--color-hairline)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        <path
          d={track}
          pathLength={100}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={100}
          strokeDashoffset={100 * (1 - pct)}
        />
        {ticks.map((t, i) => {
          const a = START_ANGLE + (i / TICKS) * SWEEP;
          const [ix, iy] = polar(a, RADIUS - STROKE / 2 - 1);
          const [ox, oy] = polar(a, RADIUS + STROKE / 2 + 1);
          const [lx, ly] = polar(a, RADIUS + 17);
          return (
            <g key={i}>
              <line x1={ix} y1={iy} x2={ox} y2={oy} stroke="var(--color-surface-1)" strokeWidth={1.5} />
              <text x={lx} y={ly + 3} fontSize="9.5" textAnchor="middle" fill="var(--color-ink-muted)">
                {formatNumber(t, 0)}
              </text>
            </g>
          );
        })}
        {targetAngle != null && (
          <line
            x1={polar(targetAngle, RADIUS - STROKE / 2 - 2)[0]}
            y1={polar(targetAngle, RADIUS - STROKE / 2 - 2)[1]}
            x2={polar(targetAngle, RADIUS + STROKE / 2 + 2)[0]}
            y2={polar(targetAngle, RADIUS + STROKE / 2 + 2)[1]}
            stroke="var(--color-ink)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}
        <g style={{ transformOrigin: `${CX}px ${CY}px`, transform: `rotate(${needleAngle}deg)` }}>
          <path
            d={`M${CX - 2.6},${CY + 10} L${CX - 1},${CY - RADIUS + 20} L${CX + 1},${CY - RADIUS + 20} L${CX + 2.6},${CY + 10} Z`}
            fill={color}
          />
        </g>
        <circle cx={CX} cy={CY} r={8} fill="var(--color-ink)" />
        <circle cx={CX} cy={CY} r={3} fill="var(--color-surface-1)" />
      </svg>

      <div className="-mt-1 flex flex-col items-center gap-0.5 text-center">
        <span className="font-title text-[13px] font-bold text-[var(--color-ink)]">{row.label}</span>
        {row.live_value != null ? (
          <>
            <span className="tnum text-[20px] font-extrabold leading-none text-[var(--color-ink)]">
              {formatNumber(animated, animated >= 1000 ? 0 : 1)}
              <span className="ml-1 text-[11px] font-medium text-[var(--color-ink-muted)]">
                {row.live_unit}
              </span>
            </span>
            <span className="text-[10.5px] text-[var(--color-ink-muted)]">
              {row.target ? `budget ${formatNumber(row.target, 0)}` : meta.label}
            </span>
          </>
        ) : (
          <>
            <span className="text-[16px] font-bold leading-none" style={{ color }}>
              {meta.label}
            </span>
            <span className="text-[10.5px] text-[var(--color-ink-muted)]">
              {row.worst_machine ?? "no live feed"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// Two turns of 0-9, so a wheel climbing 9 -> 0 rolls forward onto the second
// turn instead of spinning backwards through eight digits, then snaps back
// silently once it has arrived.
const DIGIT_STRIP = "01234567890123456789".split("");
const ROLL_MS = 900;

/** One digit wheel of the odometer, as a strip of numerals behind a window. */
function DigitWheel({
  digit,
  decimal,
  delayMs,
}: {
  digit: number;
  decimal: boolean;
  delayMs: number;
}) {
  const [position, setPosition] = useState(digit);
  const [rolling, setRolling] = useState(true);
  const shown = useRef(digit);

  useEffect(() => {
    if (digit === shown.current) return;
    const previous = shown.current;
    shown.current = digit;
    const target = digit < previous ? digit + 10 : digit;
    setRolling(true);
    setPosition(target);
    if (target < 10) return;
    const timer = setTimeout(() => {
      setRolling(false);
      setPosition(digit);
    }, ROLL_MS + delayMs + 50);
    return () => clearTimeout(timer);
  }, [digit, delayMs]);

  // The snap back onto the first turn must not itself animate; re-arm the
  // transition on the next frame, once the jump has been painted.
  useEffect(() => {
    if (rolling) return;
    const frame = requestAnimationFrame(() => setRolling(true));
    return () => cancelAnimationFrame(frame);
  }, [rolling]);

  return (
    <span
      className="relative block overflow-hidden rounded-[3px] text-center"
      style={{
        width: "0.66em",
        height: "1.2em",
        lineHeight: "1.2em",
        color: "#F3F1E7",
        background: decimal
          ? "linear-gradient(#4E3212,#9C6B2F 32%,#9C6B2F 68%,#4E3212)"
          : "linear-gradient(#0B0D11,#282C36 32%,#282C36 68%,#0B0D11)",
      }}
    >
      <span
        className="block"
        style={{
          transform: `translateY(-${position * 5}%)`,
          transition: rolling && !REDUCED_MOTION ? `transform ${ROLL_MS}ms cubic-bezier(.2,.8,.2,1)` : "none",
          transitionDelay: `${delayMs}ms`,
        }}
      >
        {DIGIT_STRIP.map((numeral, i) => (
          <i key={i} className="block not-italic" style={{ height: "1.2em" }}>
            {numeral}
          </i>
        ))}
      </span>
      {/* The curve of the drum: dark at the top and bottom of the window. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(rgba(0,0,0,.5),transparent 30%,transparent 70%,rgba(0,0,0,.5))" }}
      />
    </span>
  );
}

function wheelDigits(value: number, intDigits: number, decimals: number): number[] {
  const count = intDigits + decimals;
  const scaled = Math.floor(Math.max(value, 0) * 10 ** decimals + 1e-6);
  return String(scaled).padStart(count, "0").slice(-count).split("").map(Number);
}

// A fixed dark bezel, not a token - a digital readout stays dark in both
// light and dark theme, the same way a real one doesn't turn white in a
// bright room. The decimal wheels are amber like the trip meter on a real
// odometer, for the same reason: it marks them as the fast-moving digits.
function Odometer({ label, value, digits, unit }: { label: string; value: number; digits: number; unit: string }) {
  const animated = useAnimatedNumber(value, 1100);
  // Sized off the settled figure, not the sweeping one, so wheels don't
  // appear and shift the readout sideways while it counts up.
  const intDigits = Math.max(4, String(Math.floor(Math.max(value, 0))).length);
  const wheels = wheelDigits(animated, intDigits, digits);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11.5px] font-medium text-[var(--color-ink-2)]">{label}</span>
      <div
        className="inline-flex w-fit items-center gap-[3px] rounded-lg px-[7px] py-[6px]"
        style={{
          background: "#181B20",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,.55), 0 0 0 1px var(--color-hairline)",
          fontSize: "clamp(22px,2.6vw,30px)",
          fontWeight: 700,
        }}
        role="img"
        aria-label={`${label}: ${value.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${unit}`}
      >
        {wheels.map((digit, i) => (
          <Fragment key={i}>
            {i === intDigits && digits > 0 && (
              <span
                aria-hidden
                className="mb-[7px] h-[5px] w-[5px] shrink-0 self-end rounded-full"
                style={{ background: "#C9C6B8" }}
              />
            )}
            <DigitWheel digit={digit} decimal={i >= intDigits} delayMs={i * 90} />
          </Fragment>
        ))}
        <span className="ml-1.5 text-[14px] font-semibold" style={{ color: "#CFCBBC" }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

export function InstrumentCluster({ statusLine, totals }: { statusLine: StatusDot[]; totals: PlantTotals }) {
  return (
    <div className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex shrink-0 flex-row gap-4 sm:flex-col">
        <Odometer label="Board produced" value={totals.tonnes_produced} digits={0} unit="t" />
        <Odometer label="Linear metres run" value={totals.lineal_metres_run} digits={0} unit="lm" />
        <div className="hidden items-center gap-1.5 text-[11px] text-[var(--color-ink-muted)] sm:flex">
          <span
            aria-hidden
            className="relative h-1.5 w-1.5 shrink-0 rounded-full pulse"
            style={{ backgroundColor: "var(--color-good)", color: "var(--color-good)" }}
          />
          Counting live from the corrugator encoder
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
        {statusLine.map((row) => (
          <Gauge key={row.stage} row={row} />
        ))}
      </div>
    </div>
  );
}
