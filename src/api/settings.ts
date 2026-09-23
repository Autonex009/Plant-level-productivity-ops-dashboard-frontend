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
