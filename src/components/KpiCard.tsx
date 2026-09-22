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
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none"
      style={{ color: meta.color, backgroundColor: meta.wash }}
    >
      <span aria-hidden>{meta.glyph}</span>
      {!compact && <span>{meta.label}</span>}
      <span className="sr-only">{meta.label}</span>
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
        "panel group relative flex w-full flex-col gap-2 p-4 text-left transition",
        onClick ? "cursor-pointer hover:border-[var(--color-hairline-strong)]" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
          {label}
        </span>
        <RagPill rag={rag} />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-[30px] font-semibold leading-none tracking-tight text-[var(--color-ink)]">
          {formatMetric(value, unit)}
        </span>
        {unit !== "INR" && (
          <span className="text-[13px] text-[var(--color-ink-2)]">{unit}</span>
        )}
        {/* The tilde is a promise: this number is still settling and will be
            reconciled at shift close. The dashboard never silently revises. */}
        {provisional && (
          <span
            title="Provisional until the shift is reconciled against weighed waste"
            className="ml-0.5 text-[15px] leading-none text-[var(--color-ink-muted)]"
          >
            ~
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-ink-muted)]">
        {target != null && (
          <span className="tnum">
            target {formatMetric(target, unit)}
            {lowerIsBetter ? " or less" : " or better"}
          </span>
        )}
        {delta != null && (
          <span className="tnum inline-flex items-center gap-1" style={{ color: tone.color }}>
            <span aria-hidden>{tone.glyph}</span>
            {/* A delta wears the same unit as the value it moved, or a rupee
                delta prints as a bare seven-digit number. */}
            {formatMetric(Math.abs(delta), unit)}
            <span className="text-[var(--color-ink-muted)]">vs prior</span>
          </span>
        )}
        {seasonAdjusted && (
          <span
            title="Monsoon band applied - a seasonal dip here is expected, not a failure"
            className="rounded bg-[var(--color-surface-3)] px-1.5 py-0.5"
          >
            monsoon band
          </span>
        )}
      </div>

      {sub ? <div className="text-[11px] text-[var(--color-ink-2)]">{sub}</div> : null}
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
