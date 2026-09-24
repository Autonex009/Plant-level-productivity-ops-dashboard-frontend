import type { ShiftReconciliationRow } from "@/api/settings";
import { formatNumber } from "@/lib/format";

/**
 * A shift's mass balance, drawn rather than tabulated.
 *
 * Paper in = board out + weighed waste. That is an equation, and an equation
 * is a picture: one bar the width of the paper that went in, split into the
 * part that left as board and the part that did not. The gap is the waste, so
 * the reader sees the loss instead of subtracting two tonnages to find it.
 *
 * Bars are scaled against the largest shift in the list, so a light shift
 * reads as a shorter bar rather than as the same bar with different numbers -
 * which is the comparison someone reviewing five shifts is actually making.
 */
export function MassBalanceBar({
  row,
  maxPaperInKg,
}: {
  row: ShiftReconciliationRow;
  maxPaperInKg: number;
}) {
  const scale = maxPaperInKg > 0 ? row.paperInKg / maxPaperInKg : 0;
  const goodShare = row.paperInKg > 0 ? (row.boardOutKg / row.paperInKg) * 100 : 0;
  const wasteShare = Math.max(0, 100 - goodShare);

  // The gap is the number the review exists to look at, so it is the one that
  // gets a verdict colour. Bands mirror the plant's own yield expectation.
  const gap = row.gapPct;
  const gapTone =
    gap == null
      ? "var(--color-ink-muted)"
      : gap <= 8
        ? "var(--color-good)"
        : gap <= 12
          ? "var(--color-warning)"
          : "var(--color-critical)";

  return (
    <div className="flex flex-col gap-1.5 py-[9px]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[12.5px] font-semibold text-[var(--color-ink)]">
          {row.label}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="tnum text-[12.5px] font-bold" style={{ color: gapTone }}>
            {gap != null ? `${formatNumber(gap, 1)}%` : "—"}
          </span>
          <StatusPill status={row.status} />
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* The bar is only as wide as this shift's paper input, against the
            heaviest shift on screen. */}
        <div className="h-[13px] flex-1 overflow-hidden rounded-[4px] bg-[var(--color-surface-3)]">
          <div
            className="flex h-full overflow-hidden rounded-[4px]"
            style={{ width: `${Math.max(scale * 100, 2)}%` }}
          >
            <span
              style={{
                width: `${goodShare}%`,
                backgroundColor: "var(--color-board)",
                borderRight: wasteShare > 0 ? "1.5px solid var(--color-surface-1)" : undefined,
              }}
              title={`Board out ${formatNumber(row.boardOutKg / 1000, 1)} t`}
            />
            <span
              style={{ width: `${wasteShare}%`, backgroundColor: "var(--color-critical)" }}
              title={`Waste ${formatNumber(row.wasteKg / 1000, 2)} t`}
            />
          </div>
        </div>
        <span className="tnum w-[52px] shrink-0 text-right text-[11px] text-[var(--color-ink-muted)]">
          {formatNumber(row.paperInKg / 1000, 1)} t
        </span>
      </div>

      <div className="flex flex-wrap gap-x-3 text-[10.5px] text-[var(--color-ink-muted)]">
        <span className="tnum">
          <Swatch color="var(--color-board)" /> board out{" "}
          {formatNumber(row.boardOutKg / 1000, 1)} t
        </span>
        <span className="tnum">
          <Swatch color="var(--color-critical)" /> waste{" "}
          {formatNumber(row.wasteKg / 1000, 2)} t
        </span>
      </div>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="mr-1 inline-block h-2 w-2 translate-y-[1px] rounded-[2px]"
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Reconciled or still settling. The tilde is the same promise it carries on
 * every KPI card: this number will move when the shift closes, and the
 * dashboard would rather say so than revise it quietly.
 */
function StatusPill({ status }: { status: ShiftReconciliationRow["status"] }) {
  const reconciled = status === "reconciled";
  return (
    <span
      className="rounded-full px-2 py-[2px] text-[10px] font-semibold"
      style={
        reconciled
          ? { backgroundColor: "var(--color-good-soft)", color: "var(--color-good)" }
          : {
              color: "var(--color-ink-2)",
              border: "1px dashed var(--color-hairline-strong)",
            }
      }
    >
      {reconciled ? "reconciled" : "provisional ~"}
    </span>
  );
}
