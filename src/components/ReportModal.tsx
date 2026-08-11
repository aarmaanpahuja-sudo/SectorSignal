import { useState, useEffect } from "react";
import { X, MapPin, Loader2, Check, Navigation } from "lucide-react";
import { CATEGORY_LIST } from "../lib/categories";
import type { IncidentCategory } from "../lib/supabase";
import { jitterAround, reverseGeocodeZip } from "../lib/geo";
import MiniMap from "./MiniMap";

interface Props {
  open: boolean;
  onClose: () => void;
  zones: { zip_code: string; label: string | null }[];
  onSubmit: (input: {
    category: IncidentCategory;
    title: string;
    description: string;
    location_description: string;
    zip_code: string;
    latitude: number;
    longitude: number;
  }) => Promise<unknown>;
}

export default function ReportModal({ open, onClose, zones, onSubmit }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [category, setCategory] = useState<IncidentCategory | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [zip, setZip] = useState(zones[0]?.zip_code || "");
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "denied">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Auto-fill zip from first watch zone when it becomes available (fixes race where
  // modal opens before zones load from Supabase, leaving zip="" and validZip=false)
  useEffect(() => {
    if (zones.length > 0 && zip === "") {
      setZip(zones[0].zip_code);
      setCoords(null);
      setGeoStatus("idle");
    }
  }, [zones]);

  if (!open) return null;

  const validZip = /^\d{5}$/.test((zip || "").trim());

  const reset = () => {
    setStep(1);
    setCategory(null);
    setTitle("");
    setDescription("");
    setLocation("");
    setZip(zones[0]?.zip_code || "");
    setCoords(null);
    setGeoStatus("idle");
    setErr(null);
  };

  const close = () => {
    reset();
    onClose();
  };

    const requestGeo = () => {
    setGeoStatus("loading");
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords([lat, lng]);
        setGeoStatus("ok");

        const detectedZip = await reverseGeocodeZip(lat, lng);
        if (detectedZip) {
          setZip(detectedZip);
          setErr(null);
        }
      },
      () => {
        setGeoStatus("denied");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const submit = async () => {
    if (!category) {
      setErr("Please choose a category.");
      return;
    }

    if (!zip || !validZip) {
      setErr("Please provide a valid 5-digit zip code.");
      return;
    }

    if (!coords) {
      setErr("Please capture your location before posting.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      let latLng = coords;
      if (!latLng) {
        latLng = jitterAround(zip, title.trim());
      }
      await onSubmit({
        category,
        title: title.trim() || category,
description: description.trim(),
location_description: "",
        zip_code: zip.trim(),
        latitude: latLng[0],
        longitude: latLng[1],
      });
      close();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        onClick={close}
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl wt-fade-up">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">File a Report</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === 1 ? "Step 1 — What's happening?" : "Step 2 — Add details"}
            </p>
          </div>
          <button
            onClick={close}
            className="rounded-lg p-2 text-slate-400 transition-all duration-200 hover:bg-slate-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORY_LIST.map((c) => {
                const Icon = c.icon;
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
  setCategory(c.id);
  setStep(2);
  requestGeo();
}}
                    className={`group flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                      active
                        ? "border-slate-600 bg-slate-800/80 " + c.glow
                        : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/50"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border ${c.badge}`}
                    >
                      <Icon size={20} />
                    </span>
                    <span className="text-sm font-medium text-slate-100 leading-tight">
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief headline for the alert - OPTIONAL"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-700/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Details
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe what you saw, any safety concerns, or what neighbors should know - OPTIONAL"
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-700/40"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
      Zip code community
    </label>
    {zones.length > 0 ? (
      <select
                      value={zip}
                      onChange={(e) => {
                        setZip(e.target.value);
                        setCoords(null);
                        setGeoStatus("idle");
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-slate-500"
                    >
                      {zones.map((z) => (
                        <option key={z.zip_code} value={z.zip_code}>
                          {z.zip_code}
                          {z.label ? ` — ${z.label}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
  value={zip}
  onChange={(e) => {
    setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
    setCoords(null);
    setGeoStatus("idle");
    setErr(null);
  }}
  placeholder="Enter 5-digit zip"
                      inputMode="numeric"
                      className={`w-full rounded-lg border bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-slate-700/40 ${
                        zip && !validZip ? "border-red-500/50" : "border-slate-700 focus:border-slate-500"
                      }`}
                    />
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Capture location
                  </label>
                  <button
                    onClick={requestGeo}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-200 transition-all duration-200 hover:border-slate-500 hover:bg-slate-800/60"
                  >
                    {geoStatus === "loading" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : geoStatus === "ok" ? (
                      <Check size={16} className="text-emerald-400" />
                    ) : (
                      <Navigation size={16} />
                    )}
                    {geoStatus === "ok"
                      ? "GPS captured"
                      : geoStatus === "denied"
                      ? "Using approx. location"
                      : "Capture my location"}
                  </button>
                </div>
              </div>
              {geoStatus === "ok" && coords && (
  <>
    <p className="flex items-center gap-1.5 text-xs text-emerald-400/80">
      <MapPin size={12} />
      Pin set to {coords[0].toFixed(4)}, {coords[1].toFixed(4)}
    </p>

            <MiniMap
      lat={coords[0]}
      lng={coords[1]}
      color="#22c55e"
      draggable
      onMove={(lat, lng) => setCoords([lat, lng])}
    />
  </>
)}
              {geoStatus === "denied" && (
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={12} />
                  Location permission is required to post.
                </p>
              )}
              {err && <p className="text-sm text-red-400">{err}</p>}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4">
          {step === 1 ? (
            <>
              <span className="text-xs text-slate-500">Select a category to continue</span>
              <button
                disabled={!category}
                onClick={() => setStep(2)}
                className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-all duration-200 hover:bg-slate-800"
              >
                Back
              </button>
              <button
                disabled={submitting}
                onClick={submit}
                className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Posting…" : "Post report"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
