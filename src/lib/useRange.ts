import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import type { RangeParams } from "@/api/queries";
import type { RangeMode } from "@/api/types";

/**
 * The time selector lives in the URL.
 *
 * One selector switches the time base of the whole screen and inherits
 * downward, so it has to survive a drill-down and a back button. Keeping it in
 * the query string makes every view shareable and makes an alert deep-link a
 * plain URL rather than a piece of app state.
 */
export const RANGE_MODES: { mode: RangeMode; label: string; hint: string }[] = [
  { mode: "today", label: "Today", hint: "runs the shift" },
  { mode: "week", label: "Week", hint: "runs the review" },
  { mode: "month", label: "Month", hint: "runs the business" },
  { mode: "custom", label: "Custom", hint: "answers any question" },
];

export function useRange() {
  const [searchParams, setSearchParams] = useSearchParams();

  const mode = (searchParams.get("range") as RangeMode | null) ?? "today";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const range: RangeParams = useMemo(() => ({ mode, from, to }), [mode, from, to]);

  const setRange = useCallback(
    (next: RangeMode, bounds?: { from?: string; to?: string }) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          params.set("range", next);
          if (next === "custom") {
            if (bounds?.from) params.set("from", bounds.from);
            if (bounds?.to) params.set("to", bounds.to);
          } else {
            params.delete("from");
            params.delete("to");
          }
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /** Carries the current time base into a drill-down link. */
  const withRange = useCallback(
    (path: string, extra: Record<string, string | undefined> = {}) => {
      const params = new URLSearchParams();
      params.set("range", mode);
      if (mode === "custom") {
        if (from) params.set("from", from);
        if (to) params.set("to", to);
      }
      for (const [key, value] of Object.entries(extra)) {
        if (value != null) params.set(key, value);
      }
      return `${path}?${params.toString()}`;
    },
    [mode, from, to],
  );

  return { range, mode, from, to, setRange, withRange };
}

export function isCustomIncomplete(range: RangeParams): boolean {
  return range.mode === "custom" && (!range.from || !range.to);
}
