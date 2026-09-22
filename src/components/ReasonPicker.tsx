import { useEffect, useState } from "react";

import { useClassifyDowntime, useReasonPicker } from "@/api/queries";
import type { DowntimeEvent } from "@/api/types";
import { formatClock, formatMinutes } from "@/lib/format";
import { TIME_CATEGORY_META } from "@/lib/viz";

/**
 * The system's only write action: reason classification.
 *
 * Machines measure time - start, end and duration come from the PLC - and
 * humans explain it. The picker follows the reason-code design: two levels,
 * planned and unplanned never mixed, so a changeover can never be filed as a
 * breakdown by a mis-tap.
 */
export function ReasonPickerDialog({
  event,
  onClose,
}: {
  event: DowntimeEvent;
  onClose: () => void;
}) {
  const picker = useReasonPicker();
  const classify = useClassifyDowntime();
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    if (selected == null) return;
    classify.mutate(
      { timeLogId: event.time_log_id, reasonCodeId: selected },
      { onSuccess: onClose },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Classify this stop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel w-full max-w-lg overflow-hidden bg-[var(--color-surface-1)]">
        <div className="border-b border-[var(--color-hairline)] px-4 py-3">
          <h2 className="text-[14px] font-semibold text-[var(--color-ink)]">
            Classify this stop
          </h2>
          <p className="tnum mt-0.5 text-[12px] text-[var(--color-ink-2)]">
            {event.machine_code} · {formatClock(event.start_time)} ·{" "}
            {formatMinutes(event.duration_minutes)}
            {event.order_number ? ` · while running ${event.order_number}` : ""}
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
            The machine recorded the time. Say what it was.
          </p>
        </div>

        <div className="max-h-[52vh] overflow-y-auto px-4 py-3">
          {picker.isPending && (
            <p className="text-[12px] text-[var(--color-ink-muted)]">Loading reason codes…</p>
          )}
          {picker.isError && (
            <p className="text-[12px] text-[var(--color-critical)]">
              Could not load the reason-code catalog.
            </p>
          )}
          {picker.data?.groups.map((group) => (
            <fieldset key={group.category} className="mb-4">
              <legend className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-[2px]"
                  style={{ backgroundColor: TIME_CATEGORY_META[group.category].color }}
                />
                {TIME_CATEGORY_META[group.category].label}
                {/* Planned and unplanned are never mixed in one list. */}
                {group.planned && (
                  <span className="rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[9px] normal-case tracking-normal">
                    planned
                  </span>
                )}
              </legend>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {group.codes.map((code) => (
                  <label
                    key={code.id}
                    className={[
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] transition",
                      selected === code.id
                        ? "border-[var(--color-series-1)] bg-[var(--color-surface-2)] text-[var(--color-ink)]"
                        : "border-[var(--color-hairline)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={code.id}
                      checked={selected === code.id}
                      onChange={() => setSelected(code.id)}
                      className="sr-only"
                    />
                    <span aria-hidden className="text-[var(--color-ink-muted)]">
                      {selected === code.id ? "◉" : "○"}
                    </span>
                    <span className="min-w-0 truncate">{code.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-hairline)] px-4 py-3">
          {classify.isError && (
            <span className="mr-auto text-[11px] text-[var(--color-critical)]">
              Could not save. Try again.
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-[12px] text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink-2)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={selected == null || classify.isPending}
            className="rounded-full bg-[var(--color-series-1)] px-3.5 py-1.5 text-[12px] font-medium text-white transition disabled:opacity-40"
          >
            {classify.isPending ? "Saving…" : "Save reason"}
          </button>
        </div>
      </div>
    </div>
  );
}
