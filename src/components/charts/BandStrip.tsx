import type { ParameterStrip } from "@/api/types";
import { formatClock, formatNumber } from "@/lib/format";

/**
 * Is this parameter healthy?
 *
 * A value-in-band strip with a drift arrow. These do not measure output - they
 * predict the next period's quality and waste, which is why they get their own
 * form and sit in their own panel.
 *
 * A drift in roll temperature precedes warp and delamination by a significant
 * interval, so the arrow and the recent trace matter as much as the current
 * value: the point is to act before the defect, not to confirm it afterwards.
 */
export function BandStrip({
  strip,
  highlighted,
}: {
  strip: ParameterStrip;
  highlighted?: boolean;
}) {
  const hasBand = strip.band_low != null && strip.band_high != null;

  // Render the band with a margin either side so an out-of-band value still has
  // somewhere to sit on the track.
  const low = strip.band_low ?? 0;
  const high = strip.band_high ?? 1;
  const pad = (high - low) * 0.35 || 1;
  const min = Math.min(low - pad, strip.value);
  const max = Math.max(high + pad, strip.value);
  const toPct = (value: number) => ((value - min) / (max - min || 1)) * 100;

  const tone =
    strip.position === "in_band"
      ? "var(--color-good)"
      : strip.position === "unknown"
        ? "var(--color-ink-muted)"
        : "var(--color-warning)";

  const driftGlyph =
    strip.drift === "rising" ? "↗" : strip.drift === "falling" ? "↘" : "→";

  const positionLabel = {
    in_band: "in band",
    above: "above band",
    below: "below band",
    unknown: "no band set",
  }[strip.position];

  return (
    <div
      className={[
        "rounded-xl border px-3 py-2.5 transition",
        highlighted
          ? "border-[var(--color-warning)] bg-[var(--color-surface-2)]"
          : "border-[var(--color-hairline)] bg-[var(--color-surface-1)]",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[12px] font-medium text-[var(--color-ink)]">
          {strip.label}
          <span className="ml-1.5 text-[11px] font-normal text-[var(--color-ink-muted)]">
            {strip.machine_code}
          </span>
        </span>
        <span className="tnum shrink-0 text-[15px] font-semibold text-[var(--color-ink)]">
          {formatNumber(strip.value, 2)}
          <span className="ml-1 text-[11px] font-normal text-[var(--color-ink-2)]">
            {strip.unit}
          </span>
        </span>
      </div>

      {hasBand ? (
        <div className="relative mt-2.5 h-6">
          {/* Track */}
          <div className="absolute inset-x-0 top-[9px] h-1.5 rounded-full bg-[var(--color-surface-3)]" />
          {/* The control band */}
          <div
            className="absolute top-[9px] h-1.5 rounded-full"
            style={{
              left: `${toPct(low)}%`,
              width: `${toPct(high) - toPct(low)}%`,
              backgroundColor: "rgb(12 163 12 / 0.35)",
            }}
          />
          {/* Current value */}
          {/* The marker is ink when the value sits inside the band: a green
              tick on a green band is the one thing here that must be findable. */}
          <div
            className="absolute top-[3px] h-[18px] w-[3px] -translate-x-1/2 rounded-full"
            style={{
              left: `${toPct(strip.value)}%`,
              backgroundColor: strip.position === "in_band" ? "var(--color-ink)" : tone,
              boxShadow: "0 0 0 1.5px var(--color-surface-1)",
            }}
            title={`${formatNumber(strip.value, 2)} ${strip.unit} — ${positionLabel}`}
          />
          <span
            className="tnum absolute top-[19px] text-[9px] text-[var(--color-ink-muted)]"
            style={{ left: `${toPct(low)}%`, transform: "translateX(-50%)" }}
          >
            {formatNumber(low, 1)}
          </span>
          <span
            className="tnum absolute top-[19px] text-[9px] text-[var(--color-ink-muted)]"
            style={{ left: `${toPct(high)}%`, transform: "translateX(-50%)" }}
          >
            {formatNumber(high, 1)}
          </span>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-[var(--color-ink-muted)]">
          No control band configured for this parameter.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        {/* State is a word and a glyph, not only a colour. */}
        <span style={{ color: tone }}>● {positionLabel}</span>
        <span className="tnum text-[var(--color-ink-2)]">
          {driftGlyph} {strip.drift}
          {strip.change !== 0 && (
            <span className="ml-1 text-[var(--color-ink-muted)]">
              {strip.change > 0 ? "+" : ""}
              {formatNumber(strip.change, 2)} over the window
            </span>
          )}
        </span>
        <span className="ml-auto text-[var(--color-ink-muted)]">
          {formatClock(strip.last_checked_at)}
        </span>
      </div>

      <Sparkline
        series={strip.series}
        tone={tone}
        bandLow={strip.band_low}
        bandHigh={strip.band_high}
      />
    </div>
  );
}

/** The last few hours of the parameter, so the arrow has something to stand
 *  on - with the healthy band shaded behind it at the same scale, so a value
 *  drifting toward the edge of the strip above is visibly drifting toward
 *  the edge of its band here too, not just moving. */
function Sparkline({
  series,
  tone,
  bandLow,
  bandHigh,
}: {
  series: { at: string; value: number }[];
  tone: string;
  bandLow: number | null;
  bandHigh: number | null;
}) {
  // Two QA samples drawn as a line is a straight segment implying a trend
  // nobody measured.
  if (series.length < 4) return null;
  const values = series.map((point) => point.value);
  const hasBand = bandLow != null && bandHigh != null;
  const min = Math.min(...values, ...(hasBand ? [bandLow] : []));
  const max = Math.max(...values, ...(hasBand ? [bandHigh] : []));
  const span = max - min || 1;
  const width = 100;
  const height = 22;
  const toY = (v: number) => height - ((v - min) / span) * height;

  const path = series
    .map((point, index) => {
      const x = (index / (series.length - 1)) * width;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${toY(point.value).toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="mt-2 h-6 w-full"
      aria-hidden
    >
      {hasBand && (
        <rect
          x={0}
          y={toY(bandHigh)}
          width={width}
          height={Math.max(toY(bandLow) - toY(bandHigh), 0.5)}
          fill="var(--color-good-soft)"
        />
      )}
      <path d={path} fill="none" stroke={tone} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
