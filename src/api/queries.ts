import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  PlantOverview,
  ReasonPicker,
  Stage,
  StageSpecifics,
  StageView,
  Trends,
} from "./types";

const PLANT_ID = Number(import.meta.env.VITE_PLANT_ID ?? 1);
const BASE = "/api/v1/dashboard";

export const plantId = PLANT_ID;

/**
 * Refresh cadences, straight from the spec.
 *
 * Status lines and machine tiles refresh every 2-3 minutes; KPI cards, charts
 * and alerts every 10-15. The slower cadence is deliberate: faster updating
 * makes numbers flicker and erodes trust without adding information.
 */
export const REFRESH = {
  live: 150_000,
  panels: 600_000,
  // The process-flow diagram exists to be watched, not glanced at once - a
  // demo standing in front of it for ten seconds should see a number move.
  // Scoped to that one view (see useStageView's override param) rather than
  // the spec's 2-3 minute cadence everywhere else, which stays as-is.
  demo: 5_000,
} as const;

export interface RangeParams {
  mode: string;
  from?: string;
  to?: string;
}

function toSearch(range: RangeParams, extra: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams({ range: range.mode });
  if (range.mode === "custom") {
    if (range.from) params.set("date_from", range.from);
    if (range.to) params.set("date_to", range.to);
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value != null) params.set(key, value);
  }
  return params.toString();
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function get<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(body.slice(0, 300) || response.statusText, response.status);
  }
  return response.json() as Promise<T>;
}

export function usePlantOverview(range: RangeParams) {
  return useQuery({
    queryKey: ["overview", PLANT_ID, range],
    queryFn: () => get<PlantOverview>(`${BASE}/plants/${PLANT_ID}/overview?${toSearch(range)}`),
    refetchInterval: REFRESH.panels,
  });
}

export function useTrends(days = 30) {
  return useQuery({
    queryKey: ["trends", PLANT_ID, days],
    queryFn: () => get<Trends>(`${BASE}/plants/${PLANT_ID}/trends?days=${days}`),
    refetchInterval: REFRESH.panels,
  });
}

export function useStageView(
  stage: Stage,
  range: RangeParams,
  options?: { refetchInterval?: number },
) {
  return useQuery({
    queryKey: ["stage", PLANT_ID, stage, range],
    queryFn: () =>
      get<StageView>(`${BASE}/plants/${PLANT_ID}/stages/${stage}?${toSearch(range)}`),
    // This payload carries the status line and machine tiles, which the spec
    // says refresh every 2-3 minutes - the KPIs riding along in the same
    // response don't need to be faster than that to stay honest. A caller
    // that's specifically showing this off live (the process diagram) can
    // ask for a shorter cadence without changing it everywhere else.
    refetchInterval: options?.refetchInterval ?? REFRESH.live,
  });
}

export function useStageSpecifics(stage: Stage, range: RangeParams, reasonCode?: string) {
  return useQuery({
    queryKey: ["specifics", PLANT_ID, stage, range, reasonCode ?? null],
    queryFn: () =>
      get<StageSpecifics>(
        `${BASE}/plants/${PLANT_ID}/stages/${stage}/specifics?${toSearch(range, {
          reason_code: reasonCode,
        })}`,
      ),
    refetchInterval: REFRESH.panels,
  });
}

export function useReasonPicker() {
  return useQuery({
    queryKey: ["reason-picker", PLANT_ID],
    queryFn: () => get<ReasonPicker>(`${BASE}/plants/${PLANT_ID}/reason-picker`),
    // Master data; it does not move during a shift.
    staleTime: 60 * 60_000,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { alertKey: string; by?: string }) => {
      const response = await fetch(`${BASE}/plants/${PLANT_ID}/alerts/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_key: input.alertKey, acknowledged_by: input.by ?? null }),
      });
      if (!response.ok) throw new ApiError(await response.text(), response.status);
      return response.json();
    },
    // Acknowledging changes whether the alert escalates, which every level reads.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      void queryClient.invalidateQueries({ queryKey: ["stage"] });
    },
  });
}

/** Classifying a stop is the dashboard's only write action against the fact
 *  tables: machines measure the time, humans explain it. */
export function useClassifyDowntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { timeLogId: number; reasonCodeId: number }) => {
      const response = await fetch(`/api/v1/time-logs/${input.timeLogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason_code_id: input.reasonCodeId }),
      });
      if (!response.ok) throw new ApiError(await response.text(), response.status);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["specifics"] });
      void queryClient.invalidateQueries({ queryKey: ["stage"] });
    },
  });
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Stateless by design: sends the whole conversation each turn rather than
 *  keeping any server-side session, since the backend itself keeps none. */
export function useChat() {
  return useMutation({
    mutationFn: async (messages: ChatTurn[]) => {
      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (!response.ok) throw new ApiError(await response.text(), response.status);
      return response.json() as Promise<{ reply: string }>;
    },
  });
}
