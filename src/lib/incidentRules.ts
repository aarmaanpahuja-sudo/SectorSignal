import type { Incident, IncidentCategory } from "./supabase";

export const SECURITY_IDS = new Set<string>([
  "open_garage", "unattended_package", "vandalism", "suspicious_activity",
  "lost_pet", "other_security", "safe_walk",
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
  const h = 60 * 60 * 1000;
  const d = 24 * h;
  const map: Partial<Record<IncidentCategory, number>> = {
    traffic: 2 * h, pothole: 6 * d, car_on_shoulder: 1 * h, accident: 2 * h,
    disabled_vehicle: 3 * h, road_debris: 4 * h, road_hazard: 6 * h,
    construction: 7 * d, road_closure: 2 * d, traffic_signal: 2 * d,
    broken_streetlight: 5 * d, flooded_road: 1 * d, icy_road: 12 * h,
    fallen_tree: 1 * d, obstruction: 6 * h, wrong_way: 1 * h,
    dangerous_driving: 2 * h, pedestrian_hazard: 3 * h, bike_lane: 6 * h,
    railroad: 4 * h, animal_on_road: 2 * h, damaged_sign: 5 * d, other_road: 2 * d,
  };
  return map[cat] ?? 2 * d;
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

/** Display status only — does not write to the database */
export function displayStatus(inc: Incident): "active" | "resolved" | "closed" {
  if (inc.status === "resolved") return "resolved";
  if (inc.status === "closed") return "closed";
  const now = Date.now();
  if (inc.closes_at && new Date(inc.closes_at).getTime() < now) return "closed";
  if (inc.resolves_at && new Date(inc.resolves_at).getTime() < now) return "resolved";
  return inc.status === "active" ? "active" : (inc.status as "active");
}
