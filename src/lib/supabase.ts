import { createClient } from "@supabase/supabase-js";
import { getOrCreateClientId } from "./clientId";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const clientId = getOrCreateClientId();

// Inject app.client_id as a PostgREST GUC on every request so RLS policies
// can evaluate current_setting('app.client_id') for ownership checks.
const postgrestFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers || {});
  headers.set("x-client-config", JSON.stringify({ client_id: clientId }));
  return fetch(input, { ...init, headers });
};

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
  global: { fetch: postgrestFetch },
});

export type IncidentCategory =
  | "open_garage"
  | "unattended_package"
  | "lost_pet"
  | "vandalism"
  | "suspicious_activity"
  | "safe_walk"
  | "other_security"
  | "pothole"
  | "car_on_shoulder"
  | "accident"
  | "disabled_vehicle"
  | "road_debris"
  | "road_hazard"
  | "construction"
  | "road_closure"
  | "traffic_signal"
  | "broken_streetlight"
  | "flooded_road"
  | "icy_road"
  | "fallen_tree"
  | "obstruction"
  | "wrong_way"
  | "dangerous_driving"
  | "pedestrian_hazard"
  | "bike_lane"
  | "railroad"
  | "animal_on_road"
  | "damaged_sign"
  | "other_road"
  | "traffic";

export type RecyclingCategory =
  | "batteries"
  | "glass"
  | "old_electronics"
  | "phones"
  | "computers"
  | "cables"
  | "small_appliances"
  | "printer_cartridges"
  | "cardboard"
  | "scrap_metal"
  | "light_bulbs"
  | "other_recyclables";

export interface RecyclingRequest {
  id: string;
  user_id: string | null;
  client_id: string | null;
  category: string;
  title: string | null;
  description: string;
  quantity: string | null;
  pickup_location: string | null;
  preferred_at: string | null;
  photo_path: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
}

export type IncidentStatus = "active" | "resolved" | "closed";

export interface Incident {
  id: string;
  category: IncidentCategory;
  title: string;
  description: string | null;
  location_description: string | null;
  zip_code: string;
  status: IncidentStatus;
  verifications: number;
  latitude: number | null;
  longitude: number | null;
  reporter_id: string | null;
  user_id: string | null;
  author_name: string | null;
  author_email: string | null;
  closes_at?: string | null;
  resolves_at?: string | null;
  area_type?: "pin" | "circle" | null;
  radius_m?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  incident_id: string;
  author_name: string | null;
  author_id: string | null;
  user_id: string | null;
  body: string;
  created_at: string;
}

export interface WatchZone {
  id: string;
  client_id: string | null;
  user_id: string | null;
  zip_code: string;
  label: string | null;
  created_at: string;
  memberCount?: number;
}

export interface Profile {
  client_id: string | null;
  user_id: string | null;
  display_name: string | null;
  karma: number;
  is_admin?: boolean;
  created_at: string;
}
