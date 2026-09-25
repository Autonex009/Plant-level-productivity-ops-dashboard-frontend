/**
 * Small inline visualisations for the Overview rollup cards - the same idea
 * as the reference dashboard's card icons (a half-donut for a single figure
 * against its band, concentric rings for a composite's three factors, a
 * segmented bar for actual-vs-plan spend), redrawn with our own tokens and,
 * where the reference invents a number to make the picture prettier (its
 * waste bar splits cost into a fixed splice/trim/warp/other ratio that isn't
 * real data), built from figures we actually have instead.
 */

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function domePath(cx: number, cy: number, r: number): string {
  const [x0, y0] = polar(cx, cy, r, -90);
  const [x1, y1] = polar(cx, cy, r, 90);
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

/** A single figure against its band, as a half-donut with a target tick -
 *  beside the value, not replacing it. */
export function MiniArc({
  value,
  min,
  max,
  target,
  color,
  size = 60,
}: {
  value: number | null;
  min: number;
  max: number;
  target?: number | null;
  color: string;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size * 0.54;
  const r = size * 0.4;
  const stroke = size * 0.15;
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const pct = value != null ? (clamp(value) - min) / (max - min) : 0;
  const path = domePath(cx, cy, r);

  // The round caps paint about half a stroke beyond each geometric end, so a
  // target near the top of the scale (99.5% on a 0-100 axis, say) would
  // otherwise land past the visible band and read as a stray dash floating
  // beside the arc. Hold the tick that far inside each end.
  const capDegrees = (Math.atan2(stroke / 2, r) * 180) / Math.PI;
  const targetAngle =
    target != null
      ? Math.max(
          -90 + capDegrees,
          Math.min(90 - capDegrees, -90 + ((clamp(target) - min) / (max - min)) * 180),
        )
      : null;

  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`} aria-hidden>
      <path d={path} fill="none" stroke="var(--color-hairline)" strokeWidth={stroke} strokeLinecap="round" />
      <path
        d={path}
        pathLength={100}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={100}
        strokeDashoffset={100 * (1 - pct)}
      />
      {targetAngle != null && (
        <line
          x1={polar(cx, cy, r - stroke / 2 - 1, targetAngle)[0]}
          y1={polar(cx, cy, r - stroke / 2 - 1, targetAngle)[1]}
          x2={polar(cx, cy, r + stroke / 2 + 1, targetAngle)[0]}
          y2={polar(cx, cy, r + stroke / 2 + 1, targetAngle)[1]}
          stroke="var(--color-ink)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/** Utilisation / Rate / Quality as three concentric rings instead of three
 *  small numbers - the same U x R x Q the text line already states, so this
 *  never says anything the card doesn't already say in words. */
export function TripleRing({
  items,
  size = 52,
}: {
  items: { value: number | null; color: string }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const stroke = size * 0.13;
  const radii = [size * 0.44, size * 0.31, size * 0.18];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {items.slice(0, 3).map((item, i) => {
        const r = radii[i];
        const c = 2 * Math.PI * r;
        const pct = Math.max(0, Math.min(1, (item.value ?? 0) / 100));
        return (
          <g key={i} transform={`rotate(-90 ${cx} ${cy})`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-hairline)" strokeWidth={stroke} />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={item.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Actual spend against plan, as a bar rather than a sentence: green up to
 *  plan, red for the excess, with a tick marking the plan line itself. Real
 *  numbers only - no invented cause split. */
export function PlanBar({ actual, planned }: { actual: number; planned: number }) {
  const max = Math.max(actual, planned, 1) * 1.15;
  const within = Math.min(actual, planned);
  const excess = Math.max(actual - planned, 0);
  const planPct = (planned / max) * 100;

  return (
    <div className="relative mt-2 h-[7px] w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: `${(within / max) * 100}%`, background: "var(--color-good)" }}
      />
      {excess > 0 && (
        <div
          className="absolute inset-y-0"
          style={{
            left: `${(within / max) * 100}%`,
            width: `${(excess / max) * 100}%`,
            background: "var(--color-critical)",
          }}
        />
      )}
      <div
        className="absolute top-1/2 h-2.5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--color-ink)]"
        style={{ left: `${planPct}%` }}
        title="plan"
      />
    </div>
  );
}
