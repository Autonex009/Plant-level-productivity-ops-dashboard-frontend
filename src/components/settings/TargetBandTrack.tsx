/**
 * A target, drawn as the band it actually is.
 *
 * A table row saying "target 88, red line 84" makes the reader hold the RAG
 * rule in their head and apply it. The same two numbers on a track show it:
 * where green starts, how much room amber leaves, and which side of the
 * target is the bad side - which is the whole point of the rule and the thing
 * a plain number pair never says out loud.
 *
 * Direction comes from the API rather than a second copy of the
 * higher-is-better list here, so this can never disagree with the verdicts
 * shown on the KPI cards.
 */

export function TargetBandTrack({
  target,
  redLine,
  lowerIsBetter,
  format,
  formatBare,
  monsoon,
}: {
  target: number;
  redLine: number | null;
  lowerIsBetter: boolean;
  format: (value: number) => string;
  /** The same value without its unit. The unit is already on the target, and
   *  repeating "tonnes/shift" on the red line wrapped the row onto two lines
   *  for no extra meaning. */
  formatBare: (value: number) => string;
  /** The wider band the monsoon months are judged against, where one is set. */
  monsoon?: { low: number; high: number } | null;
}) {
  // With no red line there is no amber zone to draw - just mark the target.
  const red = redLine ?? (lowerIsBetter ? target * 1.1 : target * 0.9);

  // Give the band about a third of its own width of breathing room on each
  // side, so the target and red line never sit hard against the track ends.
  const lo = Math.min(target, red);
  const hi = Math.max(target, red);
  const pad = Math.max((hi - lo) * 0.85, Math.abs(target) * 0.04) || 1;
  const min = Math.min(lo - pad, monsoon?.low ?? Infinity);
  const max = Math.max(hi + pad, monsoon?.high ?? -Infinity);
  const span = max - min || 1;
  const pct = (value: number) => ((value - min) / span) * 100;

  const targetPct = pct(target);
  const redPct = pct(red);

  // Higher-is-better runs red → amber → green from left to right; lower-is-
  // better is the same three zones mirrored.
  const zones = lowerIsBetter
    ? [
        { color: "var(--color-good)", from: 0, to: targetPct },
        { color: "var(--color-warning)", from: targetPct, to: redPct },
        { color: "var(--color-critical)", from: redPct, to: 100 },
      ]
    : [
        { color: "var(--color-critical)", from: 0, to: redPct },
        { color: "var(--color-warning)", from: redPct, to: targetPct },
        { color: "var(--color-good)", from: targetPct, to: 100 },
      ];

  return (
    <div className="w-[214px] shrink-0">
      <div className="relative h-[22px]">
        {/* Zones */}
        <div className="absolute inset-x-0 top-[7px] flex h-[7px] overflow-hidden rounded-full">
          {zones.map((zone) => (
            <span
              key={zone.color}
              style={{
                width: `${Math.max(zone.to - zone.from, 0)}%`,
                backgroundColor: zone.color,
                opacity: 0.32,
              }}
            />
          ))}
        </div>

        {/* The monsoon band, where the metric has one - drawn as a second,
            thinner track beneath, because it is a different rule for the same
            metric rather than a different metric. */}
        {monsoon && (
          <div
            className="absolute top-[17px] h-[3px] rounded-full"
            style={{
              left: `${pct(monsoon.low)}%`,
              width: `${Math.max(pct(monsoon.high) - pct(monsoon.low), 1)}%`,
              backgroundColor: "var(--color-kraft)",
              opacity: 0.8,
            }}
            title={`Monsoon band ${format(monsoon.low)} to ${format(monsoon.high)}`}
          />
        )}

        {/* Red line first, so the target marker wins if they nearly coincide. */}
        {redLine != null && <Marker pct={redPct} color="var(--color-critical)" label="red" />}
        <Marker pct={targetPct} color="var(--color-good)" label="target" strong />
      </div>

      <div className="mt-[3px] flex items-baseline justify-between gap-2 text-[10.5px] leading-none">
        <span className="tnum font-semibold text-[var(--color-good)]">{format(target)}</span>
        <span className="text-[var(--color-ink-muted)]">
          {lowerIsBetter ? "lower is better" : "higher is better"}
        </span>
        <span className="tnum text-[var(--color-critical)]">
          {redLine != null ? formatBare(redLine) : "—"}
        </span>
      </div>
    </div>
  );
}

function Marker({
  pct,
  color,
  label,
  strong,
}: {
  pct: number;
  color: string;
  label: string;
  strong?: boolean;
}) {
  return (
    <span
      className="absolute top-[3px] -translate-x-1/2 rounded-full"
      style={{
        left: `${Math.min(Math.max(pct, 0), 100)}%`,
        width: strong ? 3 : 2,
        height: 15,
        backgroundColor: color,
        boxShadow: "0 0 0 1.5px var(--color-surface-1)",
      }}
      title={label}
    />
  );
}

/** The one legend for every track in the section - repeating it per row would
 *  cost more than it explains. */
export function BandLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-[var(--color-ink-2)]">
      <LegendSwatch color="var(--color-good)" label="at or better than target" />
      <LegendSwatch color="var(--color-warning)" label="between target and red line" />
      <LegendSwatch color="var(--color-critical)" label="past the red line" />
      <span className="flex items-center gap-1">
        <span
          aria-hidden
          className="h-[3px] w-4 rounded-full"
          style={{ backgroundColor: "var(--color-kraft)" }}
        />
        monsoon band, Jun–Sep
      </span>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        aria-hidden
        className="h-2 w-4 rounded-full"
        style={{ backgroundColor: color, opacity: 0.32 }}
      />
      {label}
    </span>
  );
}
