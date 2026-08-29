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
  | "safe_walk";

export type IncidentStatus = "active" | "resolved";

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
  created_at: string;
}
