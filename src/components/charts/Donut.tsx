/**
 * A composition as a ring, with the headline share read out in the middle.
 *
 * The same figures always appear as a labelled strip or list beside it - the
 * donut is the glance, not the record, because comparing arc lengths is the
 * one thing a reader cannot do accurately.
 */
export function Donut({
  parts,
  center,
  inner,
  size = 68,
}: {
  parts: { label: string; value: number; color: string }[];
  center: string;
  inner?: string;
  size?: number;
}) {
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (total <= 0) return null;

  // A hairline between segments, so two adjacent slices never read as one.
  const gap = parts.length > 1 ? 1.4 : 0;
  let offset = 0;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={parts.map((part) => `${part.label} ${part.value}`).join(", ")}
    >
      <circle cx={50} cy={50} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={13} />
      {parts.map((part) => {
        const length = (part.value / total) * circumference;
        const dashOffset = -offset;
        offset += length;
        return (
          <circle
            key={part.label}
            cx={50}
            cy={50}
            r={r}
            fill="none"
            stroke={part.color}
            strokeWidth={13}
            strokeDasharray={`${Math.max(0, length - gap).toFixed(2)} ${(circumference - length + gap).toFixed(2)}`}
            strokeDashoffset={dashOffset.toFixed(2)}
            transform="rotate(-90 50 50)"
          >
            <title>{`${part.label} ${part.value}`}</title>
          </circle>
        );
      })}
      <text
        x={50}
        y={inner ? 51 : 55}
        textAnchor="middle"
        fontSize={17}
        fontWeight={800}
        fill="var(--color-ink)"
      >
        {center}
      </text>
      {inner && (
        <text x={50} y={64} textAnchor="middle" fontSize={9.5} fill="var(--color-ink-2)">
          {inner}
        </text>
      )}
    </svg>
  );
}
