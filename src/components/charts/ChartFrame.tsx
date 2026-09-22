import type { ReactNode } from "react";

/**
 * The frame every chart sits in.
 *
 * Title states the question the chart answers, because a chart whose title is
 * just a noun makes the reader work out what they are looking at. The legend
 * lives here rather than inside the plot, so identity is never carried by
 * colour alone and never floats over the marks.
 */
export function ChartFrame({
  title,
  question,
  legend,
  note,
  children,
  action,
  height = 220,
}: {
  title: string;
  question?: string;
  legend?: { label: string; color: string; dashed?: boolean; planned?: boolean }[];
  note?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  /** "auto" lets the content set the height. A list-shaped chart (a Pareto)
   *  cannot have its height guessed from a row count without eventually
   *  clipping or overlapping its own labels. */
  height?: number | "auto";
}) {
  return (
    <section className="panel flex flex-col p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">{title}</h3>
          {question && (
            <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">{question}</p>
          )}
        </div>
        {action}
      </div>

      {legend && legend.length > 0 && (
        <ul className="mb-2 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          {legend.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-2)]"
            >
              {item.dashed ? (
                <svg width="14" height="8" aria-hidden>
                  <line
                    x1="0"
                    y1="4"
                    x2="14"
                    y2="4"
                    stroke={item.color}
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                </svg>
              ) : (
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span>{item.label}</span>
              {item.planned && (
                <span className="text-[var(--color-ink-muted)]">(planned)</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div style={height === "auto" ? undefined : { height }} className="min-w-0">
        {children}
      </div>

      {note ? (
        <div className="mt-2 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
          {note}
        </div>
      ) : null}
    </section>
  );
}

/** A shared tooltip shell so every chart's hover layer looks and reads alike. */
export function TooltipShell({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-hairline-strong)] bg-[var(--color-surface-2)] px-3 py-2 shadow-lg">
      <p className="mb-1 text-[11px] font-semibold text-[var(--color-ink)]">{title}</p>
      <ul className="space-y-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-[11px]">
            {row.color && (
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: row.color }}
              />
            )}
            <span className="text-[var(--color-ink-muted)]">{row.label}</span>
            <span className="tnum ml-auto text-[var(--color-ink)]">{row.value}</span>
          </li>
        ))}
      </ul>
      {footer ? (
        <p className="mt-1.5 border-t border-[var(--color-hairline)] pt-1.5 text-[11px] text-[var(--color-ink-2)]">
          {footer}
        </p>
      ) : null}
    </div>
  );
}

export function EmptyPlot({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[var(--color-hairline)] px-4 text-center text-[12px] text-[var(--color-ink-muted)]">
      {children}
    </div>
  );
}
