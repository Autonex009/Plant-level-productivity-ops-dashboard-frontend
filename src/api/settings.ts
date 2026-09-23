/** Read-only reads of the plant's raw configuration - reference data (plant,
 *  machines, metric targets, reason-code catalogs), not the shaped dashboard
 *  views in queries.ts/types.ts. These hit the CRUD API directly rather than
 *  /api/v1/dashboard, since Settings shows what is configured, not a derived
 *  view of it. */
import { useQuery } from "@tanstack/react-query";

import { get, plantId } from "@/api/queries";
import type { Stage } from "@/api/types";

export type MetricCategory = "material" | "throughput" | "quality" | "time" | "parameters";

export interface PlantRecord {
  id: number;
  name: string;
  location: string | null;
  line_type: "automatic" | "semi_automatic";
}

export interface MachineRecord {
  id: number;
  plant_id: number;
  stage: Stage;
  machine_code: string;
  name: string;
  rated_speed: number | null;
  rated_speed_unit: string | null;
  is_active: boolean;
}

export interface MetricDefinitionRecord {
  id: number;
  code: string;
  name: string;
  definition: string;
  unit: string;
  category: MetricCategory;
  stage: Stage | null;
}

export interface PlantMetricTargetRecord {
  id: number;
  plant_id: number;
  metric_definition_id: number;
  target_value: number;
  effective_from: string;
  red_line_value: number | null;
  band_low: number | null;
  band_high: number | null;
  monsoon_band_low: number | null;
  monsoon_band_high: number | null;
}

export interface DowntimeReasonCodeRecord {
  id: number;
  category: string;
  code: string;
  description: string;
}

export interface DefectReasonCodeRecord {
  id: number;
  stage: Stage;
  code: string;
  description: string;
}

export interface ShiftRecord {
  id: number;
  plant_id: number;
  shift_date: string;
  shift_number: number;
}

export interface MachineRunRecord {
  id: number;
  machine_id: number;
  shift_id: number;
}

export interface MaterialFlowRecord {
  machine_run_id: number;
  material_type: string;
  input_qty: number;
  output_qty: number | null;
  unit: string;
}

export interface ShiftReconciliationRow {
  shiftId: number;
  label: string;
  paperInKg: number;
  boardOutKg: number;
  wasteKg: number;
  gapPct: number | null;
  status: "reconciled" | "provisional";
}

const STALE_TIME = 5 * 60_000; // reference data, does not move during a shift

export function usePlantRecord() {
  return useQuery({
    queryKey: ["settings", "plant", plantId],
    queryFn: () => get<PlantRecord>(`/api/v1/plants/${plantId}`),
    staleTime: STALE_TIME,
  });
}

export function useMachineRecords() {
  return useQuery({
    queryKey: ["settings", "machines", plantId],
    queryFn: () => get<MachineRecord[]>(`/api/v1/machines?plant_id=${plantId}&limit=200`),
    staleTime: STALE_TIME,
  });
}

export function useMetricDefinitionRecords() {
  return useQuery({
    queryKey: ["settings", "metric-definitions"],
    queryFn: () => get<MetricDefinitionRecord[]>("/api/v1/metric-definitions?limit=200"),
    staleTime: STALE_TIME,
  });
}

export function usePlantMetricTargetRecords() {
  return useQuery({
    queryKey: ["settings", "plant-metric-targets", plantId],
    queryFn: () =>
      get<PlantMetricTargetRecord[]>(`/api/v1/plant-metric-targets?plant_id=${plantId}&limit=200`),
    staleTime: STALE_TIME,
  });
}

export function useDowntimeReasonCodeRecords() {
  return useQuery({
    queryKey: ["settings", "downtime-reason-codes"],
    queryFn: () => get<DowntimeReasonCodeRecord[]>("/api/v1/downtime-reason-codes?limit=200"),
    staleTime: STALE_TIME,
  });
}

export function useDefectReasonCodeRecords() {
  return useQuery({
    queryKey: ["settings", "defect-reason-codes"],
    queryFn: () => get<DefectReasonCodeRecord[]>("/api/v1/defect-reason-codes?limit=200"),
    staleTime: STALE_TIME,
  });
}

/**
 * Shift reconciliation: paper in vs board out on the corrugator, per recent
 * shift. Computed from real MaterialFlow rows rather than a dedicated
 * endpoint - "paper in = board out + weighed waste" is a mass balance, not a
 * separately stored fact, so this reads the same rows the yield metric does.
 * A shift still in progress today reads "provisional"; anything before today
 * is "reconciled" once its shift has closed.
 */
export function useShiftReconciliation(limit = 5) {
  return useQuery({
    queryKey: ["settings", "shift-reconciliation", plantId, limit],
    queryFn: async (): Promise<ShiftReconciliationRow[]> => {
      const machines = await get<MachineRecord[]>(`/api/v1/machines?plant_id=${plantId}&limit=200`);
      const corrugatorIds = new Set(
        machines.filter((m) => m.stage === "board_manufacturing").map((m) => m.id),
      );

      const shifts = await get<ShiftRecord[]>(
        `/api/v1/shifts?plant_id=${plantId}&limit=${limit * 3}`,
      );
      const recentShifts = [...shifts]
        .sort((a, b) => (a.shift_date < b.shift_date ? 1 : -1))
        .slice(0, limit);

      const today = new Date().toISOString().slice(0, 10);

      const rows = await Promise.all(
        recentShifts.map(async (shift): Promise<ShiftReconciliationRow> => {
          const runs = await get<MachineRunRecord[]>(
            `/api/v1/machine-runs?shift_id=${shift.id}&limit=200`,
          );
          const corrugatorRuns = runs.filter((r) => corrugatorIds.has(r.machine_id));

          const flows = (
            await Promise.all(
              corrugatorRuns.map((run) =>
                get<MaterialFlowRecord[]>(
                  `/api/v1/material-flows?machine_run_id=${run.id}&material_type=kraft_paper&limit=50`,
                ),
              ),
            )
          ).flat();

          const paperInKg = flows.reduce((sum, f) => sum + f.input_qty, 0);
          const boardOutKg = flows.reduce((sum, f) => sum + (f.output_qty ?? 0), 0);
          const wasteKg = paperInKg - boardOutKg;

          return {
            shiftId: shift.id,
            label: `${shift.shift_date}, Shift ${shift.shift_number}`,
            paperInKg,
            boardOutKg,
            wasteKg,
            gapPct: paperInKg ? (wasteKg / paperInKg) * 100 : null,
            status: shift.shift_date < today ? "reconciled" : "provisional",
          };
        }),
      );

      return rows;
    },
    staleTime: STALE_TIME,
  });
}
