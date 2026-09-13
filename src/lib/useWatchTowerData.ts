import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, type Incident, type Comment, type WatchZone, type Profile } from "./supabase";
import { isSecurity, isVehicle, SECURITY_CLOSE_MS, vehicleResolveMs, votesNeeded, DONT_CLOSE_EXTEND_MS, DONT_RESOLVE_EXTEND_MS } from "./incidentRules";
import { getOrCreateClientId } from "./clientId";

export interface DataState {
  incidents: Incident[];
  comments: Comment[];
  zones: WatchZone[];
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export function useWatchTowerData(userId: string | null) {
  const clientIdRef = useRef<string>(getOrCreateClientId());
  const clientId = clientIdRef.current;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [resolveVotes, setResolveVotes] = useState<Record<string, number>>({});
  const [zones, setZones] = useState<WatchZone[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load — re-runs when auth state changes (userId flips)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const zoneQuery = userId
        ? supabase.from("watch_zones").select("*").eq("user_id", userId)
        : supabase.from("watch_zones").select("*").eq("client_id", clientId);
      const profileQuery = userId
        ? supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle()
        : supabase.from("profiles").select("*").eq("client_id", clientId).maybeSingle();

      const [inc, com, zn, pf] = await Promise.all([
        supabase.from("incidents").select("*").order("created_at", { ascending: false }),
        supabase.from("comments").select("*").order("created_at", { ascending: true }),
        zoneQuery,
        profileQuery,
      ]);

      if (cancelled) return;
      if (inc.error || com.error || zn.error) {
        setError(inc.error?.message || com.error?.message || zn.error?.message || "Load failed");
      }

      setIncidents((inc.data as Incident[]) || []);
      setComments((com.data as Comment[]) || []);
      setZones((zn.data as WatchZone[]) || []);
      setProfile((pf.data as Profile) || null);
      setLoading(false);

      const { data: votes } = await supabase.from("incident_resolves").select("incident_id");
      if (!cancelled && votes) {
        const counts: Record<string, number> = {};
        for (const v of votes) counts[v.incident_id] = (counts[v.incident_id] || 0) + 1;
        setResolveVotes(counts);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, userId]);

  useEffect(() => {
    const incChannel = supabase
      .channel("incidents-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "incidents" },
        (payload) => {
          setIncidents((prev) => {
            if (prev.some((i) => i.id === payload.new.id)) return prev;
            return [payload.new as Incident, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "incidents" },
        (payload) => {
          setIncidents((prev) => prev.map((i) => (i.id === payload.new.id ? (payload.new as Incident) : i)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "incidents" },
        (payload) => {
          setIncidents((prev) => prev.filter((i) => i.id !== payload.old.id));
        }
      )
      .subscribe();

    const comChannel = supabase
      .channel("comments-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload) => {
          setComments((prev) => {
            if (prev.some((c) => c.id === payload.new.id)) return prev;
            return [...prev, payload.new as Comment];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "comments" },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incChannel);
      supabase.removeChannel(comChannel);
    };
  }, []);

  // Actions
  const addIncident = useCallback(
    async (input: Omit<Incident, "id" | "created_at" | "updated_at" | "status" | "verifications" | "reporter_id" | "user_id">) => {
      const { data: authData } = await supabase.auth.getUser();
            const row: Record<string, unknown> = {
        ...input,
        reporter_id: clientId,
        author_name: profile?.display_name || "Neighbor",
        author_email: authData.user?.email ?? null,
        closes_at: isSecurity(input.category)
          ? new Date(Date.now() + SECURITY_CLOSE_MS).toISOString()
          : null,
        resolves_at: isVehicle(input.category)
          ? new Date(Date.now() + vehicleResolveMs(input.category)).toISOString()
          : null,
      };
      if (userId) row.user_id = userId;

      const { data: insertedIncident, error } = await supabase
        .from("incidents")
        .insert(row)
        .select("*")
        .single();

      if (error) throw error;

      setIncidents((prev) => {
        const filtered = prev.filter((i) => i.id !== insertedIncident.id);
        return [insertedIncident as Incident, ...filtered];
      });

      // Update karma
      await supabase.rpc("bump_karma", { p_client: clientId, p_user: userId ?? null });
      setProfile((prev) => (prev ? { ...prev, karma: prev.karma + 10 } : prev));

      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-incident-push`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              zip_code: input.zip_code,
              title: input.title,
              category: input.category,
            }),
          }
        );
      } catch (e) {
        console.log("Push notification failed (non-blocking):", e);
      }

      return insertedIncident as Incident;
    },
    [clientId, userId, profile?.display_name]
  );

  const resolveIncident = useCallback(async (id: string) => {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "resolved" } : i))
    );
    try {
      const { error } = await supabase
        .from("incidents")
        .update({ status: "resolved", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    } catch (err) {
      setIncidents((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "active" } : i))
      );
      throw err;
    }
  }, []);

  const unresolveIncident = useCallback(async (id: string) => {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "active" } : i))
    );
    try {
      const { error } = await supabase
        .from("incidents")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    } catch (err) {
      setIncidents((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "resolved" } : i))
      );
      throw err;
    }
  }, []);

  const verifyIncident = useCallback(async (id: string) => {
    const { data, error } = await supabase.rpc("toggle_verification", {
      p_id: id,
      p_client: clientId,
      p_user: userId ?? null,
    });
    if (error) throw error;
    const newCount = data as number;
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, verifications: newCount } : i))
    );

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-incident-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          kind: "verify",
          incident_id: id,
          title: "Someone verified your report",
        }),
      });
    } catch {
      // non-blocking
    }
  }, [clientId, userId]);

  const addComment = useCallback(
    async (incidentId: string, body: string, authorName: string) => {
      const row: Record<string, unknown> = {
        incident_id: incidentId,
        body,
        author_name: authorName || "Neighbor",
        author_id: clientId,
      };
      if (userId) row.user_id = userId;
      const { data, error } = await supabase
        .from("comments")
        .insert(row)
        .select("*")
        .single();
      if (error) throw error;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-incident-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            kind: "comment",
            incident_id: incidentId,
            title: "New comment on your report",
          }),
        });
      } catch {
        // non-blocking
      }

      return data as Comment;
    },
    [clientId, userId]
  );

  const addZone = useCallback(
    async (zip: string, label: string) => {
      const row: Record<string, unknown> = { zip_code: zip, label };
      if (userId) {
        row.user_id = userId;
      } else {
        row.client_id = clientId;
      }
      const { data, error } = await supabase
        .from("watch_zones")
        .insert(row)
        .select("*")
        .single();
      if (error) throw error;
      setZones((prev) => [...prev, data as WatchZone]);
      return data as WatchZone;
    },
    [clientId, userId]
  );

  const removeZone = useCallback(async (zoneId: string) => {
    const { error } = await supabase.from("watch_zones").delete().eq("id", zoneId);
    if (error) throw error;
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
  }, []);

  const updateProfileName = useCallback(
    async (name: string) => {
      if (userId) {
        const { data: existing, error: selErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (selErr) throw selErr;
        let data, error;
        if (existing) {
          ({ data, error } = await supabase
            .from("profiles")
            .update({ display_name: name })
            .eq("user_id", userId)
            .select("*")
            .single());
        } else {
          ({ data, error } = await supabase
            .from("profiles")
            .insert({ user_id: userId, display_name: name })
            .select("*")
            .single());
        }
        if (error) throw error;
        setProfile(data as Profile);
      } else {
        const { data: existing, error: selErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("client_id", clientId)
          .maybeSingle();
        if (selErr) throw selErr;
        let data, error;
        if (existing) {
          ({ data, error } = await supabase
            .from("profiles")
            .update({ display_name: name })
            .eq("client_id", clientId)
            .select("*")
            .single());
        } else {
          ({ data, error } = await supabase
            .from("profiles")
            .insert({ client_id: clientId, display_name: name })
            .select("*")
            .single());
        }
        if (error) throw error;
        setProfile(data as Profile);
      }
    },
    [clientId, userId]
  );

    const voteResolve = useCallback(async (id: string, category: string) => {
    const row: Record<string, unknown> = { incident_id: id };
    if (userId) row.user_id = userId;
    else row.client_id = clientId;
    const { error } = await supabase.from("incident_resolves").insert(row);
    if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
    const next = (resolveVotes[id] || 0) + (error ? 0 : 1);
    setResolveVotes((prev) => ({ ...prev, [id]: next }));
    if (next >= votesNeeded(category)) {
      await supabase.from("incidents").update({ status: "resolved" }).eq("id", id);
      setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status: "resolved" } : i)));
    }
  }, [clientId, userId, resolveVotes]);

  const extendClose = useCallback(async (id: string, current: string | null | undefined) => {
    const base = current ? new Date(current).getTime() : Date.now();
    const next = new Date(Math.max(base, Date.now()) + DONT_CLOSE_EXTEND_MS).toISOString();
    await supabase.from("incidents").update({ closes_at: next, status: "active" }).eq("id", id);
    setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, closes_at: next, status: "active" } : i)));
  }, []);

  const extendResolve = useCallback(async (id: string, current: string | null | undefined) => {
    const next = new Date(Date.now() + DONT_RESOLVE_EXTEND_MS).toISOString();
    await supabase.from("incidents").update({ resolves_at: next, status: "active" }).eq("id", id);
    setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, resolves_at: next, status: "active" } : i)));
  }, []);
  
  return {
    clientId,
    incidents,
    comments,
    zones,
    profile,
    loading,
    error,
    addIncident,
    resolveIncident,
    unresolveIncident,
    resolveVotes,
    voteResolve,
    extendClose,
    extendResolve,
    verifyIncident,
    addComment,
    addZone,
    removeZone,
    updateProfileName,
  };
}
