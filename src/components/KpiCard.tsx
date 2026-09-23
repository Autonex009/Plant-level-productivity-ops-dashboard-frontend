import type { ReactNode } from "react";

import type { Rag } from "@/api/types";
import { formatMetric } from "@/lib/format";
import { deltaTone, RAG_META } from "@/lib/viz";

/**
 * Every number carries its target and a verdict.
 *
 * A bare figure invites an argument; the same figure next to its target invites
 * a question. So the card is never just a value: it is value + unit + target +
 * a RAG verdict that names itself in words, because colour alone is not a
 * statement a colour-blind reader can read.
 */
export function RagPill({ rag, compact = false }: { rag: Rag; compact?: boolean }) {
  const meta = RAG_META[rag];
  if (compact) {
    return (
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.color }}
        title={meta.label}
      />
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-[7px] py-[1px] text-[11px] font-bold leading-[1.6] whitespace-nowrap"
      style={{ color: meta.color, backgroundColor: meta.wash }}
    >
      {meta.label}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  target,
  rag,
  provisional,
  lowerIsBetter,
  seasonAdjusted,
  sub,
  delta,
  deltaDirection,
  onClick,
  footer,
}: {
  label: string;
  value: number | null;
  unit: string;
  target: number | null;
  rag: Rag;
  provisional?: boolean;
  lowerIsBetter?: boolean;
  seasonAdjusted?: boolean;
  sub?: ReactNode;
  delta?: number | null;
  deltaDirection?: string | null;
  onClick?: () => void;
  footer?: ReactNode;
}) {
  const tone = deltaTone(deltaDirection);
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      {...(onClick ? { onClick, type: "button" as const } : {})}
      className={[
        "panel group relative flex w-full flex-col px-[13px] py-[11px] text-left transition",
        onClick ? "cursor-pointer hover:border-[var(--color-hairline-strong)]" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-[var(--color-ink-2)]">{label}</span>
        <RagPill rag={rag} />
      </div>

      <div className="mt-[1px] flex items-baseline gap-1.5">
        <span className="text-[clamp(19px,2.3vw,25px)] font-extrabold leading-none tracking-[-0.01em] text-[var(--color-ink)]">
          {formatMetric(value, unit)}
        </span>
        {unit !== "INR" && (
          <span className="text-[13px] font-semibold text-[var(--color-ink-2)]">{unit}</span>
        )}
        {/* The tilde is a promise: this number is still settling and will be
            reconciled at shift close. The dashboard never silently revises. */}
        {provisional && (
          <span
            title="Provisional until the shift is reconciled against weighed waste"
            className="text-[14px] font-bold leading-none text-[var(--color-ink-muted)]"
          >
            ~
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[11.5px] text-[var(--color-ink-2)]">
        {delta != null ? (
          <span className="tnum font-bold" style={{ color: tone.color }}>
            {tone.glyph} {formatMetric(Math.abs(delta), unit)}
            <span className="font-normal text-[var(--color-ink-2)]"> vs prior</span>
          </span>
        ) : target != null ? (
          <span className="tnum">
            target {formatMetric(target, unit)}
            {lowerIsBetter ? " or less" : " or better"}
          </span>
        ) : (
          <span>{sub}</span>
        )}
        {seasonAdjusted && (
          <span className="rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[10.5px]" title="Monsoon band applied - a seasonal dip here is expected, not a failure">
            monsoon band
          </span>
        )}
      </div>

      {delta != null && sub ? (
        <div className="mt-1 text-[11px] text-[var(--color-ink-2)]">{sub}</div>
      ) : null}
      {footer}
    </Wrapper>
  );
}

/** The three factors of U x R x Q, small beneath the composite, so the weak
 *  lever is visible before anyone drills. */
export function FactorStrip({
  items,
}: {
  items: { label: string; value: number | null; unit: string }[];
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="tnum text-[11px] text-[var(--color-ink-2)]">
          <span className="text-[var(--color-ink-muted)]">{item.label} </span>
          {formatMetric(item.value, item.unit)}
          {item.unit === "%" ? "%" : ` ${item.unit}`}
        </span>
      ))}
    </div>
  );
}
