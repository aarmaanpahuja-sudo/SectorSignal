import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { RecyclingRequest } from "../lib/supabase";

export default function PickupPage({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<RecyclingRequest[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("recycling_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) setErr(error.message);
      else setRows((data || []) as RecyclingRequest[]);
    })();
  }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("recycling_requests").update({ status }).eq("id", id);
    if (error) setErr(error.message);
    else setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Recycling & Pickup</h2>
        <p className="mt-1 text-sm text-slate-400">
          {isAdmin
            ? "Admin view — all pickup requests. These never appear on the public feed or map."
            : "Only your pickup requests. Other neighbors cannot see these."}
        </p>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      {rows.length === 0 && <p className="text-sm text-slate-500">No pickup requests yet.</p>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-200">{r.category}</span>
            <span>{r.zip_code}</span>
            <span className="ml-auto">{r.status}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-white">{r.title || r.category}</p>
          <p className="mt-1 text-sm text-slate-400">{r.description}</p>
          {r.quantity && <p className="mt-1 text-xs text-slate-500">Qty: {r.quantity}</p>}
          {r.pickup_location && <p className="mt-1 text-xs text-slate-500">Pickup: {r.pickup_location}</p>}
          {r.preferred_at && (
            <p className="mt-1 text-xs text-slate-500">Preferred: {new Date(r.preferred_at).toLocaleString()}</p>
          )}
          {isAdmin && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => setStatus(r.id, "scheduled")} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">
                Scheduled
              </button>
              <button onClick={() => setStatus(r.id, "done")} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">
                Done
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
