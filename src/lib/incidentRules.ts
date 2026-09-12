import type { IncidentCategory } from "./supabase";

export const SECURITY_IDS = new Set<string>([
  "open_garage",
  "unattended_package",
  "vandalism",
  "suspicious_activity",
  "lost_pet",
  "other_security",
  "safe_walk",
]);

export function isSecurity(cat: string) {
  return SECURITY_IDS.has(cat);
}

export function isVehicle(cat: string) {
  return !isSecurity(cat);
}

export const SECURITY_CLOSE_MS = 7 * 24 * 60 * 60 * 1000;
export const DONT_CLOSE_EXTEND_MS = 7 * 24 * 60 * 60 * 1000;
export const DONT_RESOLVE_EXTEND_MS = 24 * 60 * 60 * 1000;

export function vehicleResolveMs(cat: IncidentCategory): number {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const map: Partial<Record<IncidentCategory, number>> = {
    traffic: 2 * hour,
    pothole: 6 * day,
    car_on_shoulder: 1 * hour,
    accident: 2 * hour,
    disabled_vehicle: 3 * hour,
    road_debris: 4 * hour,
    road_hazard: 6 * hour,
    construction: 7 * day,
    road_closure: 2 * day,
    traffic_signal: 2 * day,
    broken_streetlight: 5 * day,
    flooded_road: 1 * day,
    icy_road: 12 * hour,
    fallen_tree: 1 * day,
    obstruction: 6 * hour,
    wrong_way: 1 * hour,
    dangerous_driving: 2 * hour,
    pedestrian_hazard: 3 * hour,
    bike_lane: 6 * hour,
    railroad: 4 * hour,
    animal_on_road: 2 * hour,
    damaged_sign: 5 * day,
    other_road: 2 * day,
  };
  return map[cat] ?? 2 * day;
}

export function votesNeeded(cat: string): number {
  if (cat === "vandalism" || cat === "suspicious_activity") return 3;
  return 2;
}

export function formatRemain(ms: number): string {
  if (ms <= 0) return "0m";
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${min}m`;
  return `${min}m`;
}
