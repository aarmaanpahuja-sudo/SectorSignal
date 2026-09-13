import { useState, useEffect } from "react";
import { X, MapPin, Loader2, Check, Navigation } from "lucide-react";
import { CATEGORIES, SECURITY_CATEGORIES, VEHICLE_CATEGORIES, RECYCLING_CATEGORIES } from "../lib/categories";
import type { IncidentCategory, RecyclingCategory } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import { getOrCreateClientId } from "../lib/clientId";
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [section, setSection] = useState<"security" | "vehicle" | "recycling" | null>(null);
  const [category, setCategory] = useState<IncidentCategory | null>(null);
  const [recycleCat, setRecycleCat] = useState<RecyclingCategory | null>(null);
  const [quantity, setQuantity] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [preferredAt, setPreferredAt] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [recycleDone, setRecycleDone] = useState(false);
  const [zipLocked, setZipLocked] = useState(false);
  const [areaType, setAreaType] = useState<"pin" | "circle">("pin");
  const [radiusMi, setRadiusMi] = useState(0.25);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [zip, setZip] = useState(zones[0]?.zip_code || "");
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "denied">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);


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
    setSection(null);
    setCategory(null);
    setRecycleCat(null);
    setQuantity("");
    setPickupLocation("");
    setPreferredAt("");
    setPhotoFile(null);
    setPhone("");
    setAddress("");
    setRecycleDone(false);
    setZipLocked(false);
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
        if (detectedZip && !zipLocked) {
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
    const needsTitleDesc = category === "other_security" || category === "other_road" || recycleCat === "other_recyclables";
    if (section !== "recycling" && !category) {
      setErr("Please choose a category.");
      return;
    }
    if (section === "recycling" && !recycleCat) {
      setErr("Please choose a category.");
      return;
    }
    if (needsTitleDesc && !title.trim()) {
      setErr("Title is required for this category.");
      return;
    }
    if (needsTitleDesc && !description.trim()) {
      setErr("Details are required for this category.");
      return;
    }
    if (section === "recycling" && !description.trim()) {
      setErr("Please describe the items for pickup.");
      return;
    }
    if (!zip || !validZip) {
      setErr("Please provide a valid 5-digit zip code.");
      return;
    }
        if (section === "recycling" && (!phone.trim() || !address.trim())) {
      setErr("Phone number and pickup address are required.");
      return;
    }
    if (section !== "recycling" && !coords) {
      setErr("Please capture your location before posting.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const latLng = coords;
      if (section === "recycling") {
        const { data: { user } } = await supabase.auth.getUser();
        let photo_path: string | null = null;
        if (photoFile) {
          const path = `${user?.id || getOrCreateClientId()}/${Date.now()}-${photoFile.name}`;
          const { error: upErr } = await supabase.storage.from("recycling-photos").upload(path, photoFile);
          if (upErr) throw upErr;
          photo_path = path;
        }
        const { error } = await supabase.from("recycling_requests").insert({
          user_id: user?.id ?? null,
          client_id: user ? null : getOrCreateClientId(),
          category: recycleCat,
          title: title.trim() || recycleCat,
          description: description.trim(),
          quantity: quantity.trim() || null,
          pickup_location: address.trim(),
          phone: phone.trim(),
          preferred_at: preferredAt ? new Date(preferredAt).toISOString() : null,
          photo_path,
          zip_code: zip.trim(),
          latitude: null,
          longitude: null,
        });
        if (error) throw error;
        setRecycleDone(true);
        return;
      }
      await onSubmit({
        category: category!,
        title: title.trim() || CATEGORIES[category!].label,
        description: description.trim(),
        location_description: "",
        zip_code: zip.trim(),
        latitude: latLng[0],
        longitude: latLng[1],
        area_type: areaType,
        radius_m: areaType === "circle" ? Math.round(radiusMi * 1609.34) : null,
      } as any);
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
              {step === 1 ? "Step 1 — Choose a section" : step === 2 ? "Step 2 — Choose a category" : "Step 3 — Add details"}
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
          {recycleDone && (
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                Thank you for scheduling a recycling pickup. A member of our team will contact you shortly with this email:{" "}
                <strong className="text-white">sectorsignal339@gmail.com</strong>. We will ask you to confirm your scheduled pickup time or schedule a new pickup time according to our availability.
              </p>
              <button onClick={close} className="rounded-lg bg-white px-4 py-2 text-slate-900">
                Done
              </button>
            </div>
          )}
          {!recycleDone && step === 1 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([
                ["security", "Security", "Garage, packages, vandalism, pets"],
                ["vehicle", "Vehicle & Road Safety", "Potholes, hazards, collisions"],
                ["recycling", "Recycling & Pickup", "Private pickup request"],
              ] as const).map(([id, label, hint]) => (
                <button
                  key={id}
                  onClick={() => {
                    setSection(id);
                    setStep(2);
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left hover:border-slate-600"
                >
                  <div className="text-sm font-semibold text-white">{label}</div>
                  <div className="mt-1 text-xs text-slate-500">{hint}</div>
                </button>
              ))}
            </div>
          )}

          {!recycleDone && step === 2 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(section === "recycling"
                ? RECYCLING_CATEGORIES
                : (section === "vehicle" ? VEHICLE_CATEGORIES : SECURITY_CATEGORIES).map((id) => CATEGORIES[id])
              ).map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                                            if (section === "recycling") {
                        setRecycleCat(c.id as RecyclingCategory);
                        setStep(3);
                      } else {
                        setCategory(c.id as IncidentCategory);
                        setStep(3);
                        requestGeo();
                      }
                    }}
                    className="group flex flex-col items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left hover:border-slate-700"
                  >
                                        <span className={`flex h-10 w-10 items-center justify-center rounded-lg border ${"badge" in c ? c.badge : "border-slate-700 bg-slate-800 text-slate-200"}`}>
                      <Icon size={20} />
                    </span>
                    <span className="text-sm font-medium text-slate-100 leading-tight">{c.label}</span>
                  </button>
                );
              })}
              <button onClick={() => setStep(1)} className="col-span-full text-xs text-slate-500 hover:text-white">
                ← Back to sections
              </button>
            </div>
          )}

                    {!recycleDone && step === 3 && (
            <div className="space-y-5">
              <div>
                                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Title
                  {(category === "other_security" || category === "other_road" || recycleCat === "other_recyclables")
                    ? " — REQUIRED"
                    : " — optional"}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    category === "other_security" || category === "other_road" || recycleCat === "other_recyclables"
                      ? "Required title"
                      : "Brief headline for the alert — optional"
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-700/40"
                />
              </div>
              <div>
                                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Details
                  {(category === "other_security" ||
                    category === "other_road" ||
                    section === "recycling")
                    ? " — REQUIRED"
                    : " — optional"}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder={
                    section === "recycling"
                      ? "Describe the items for pickup — required"
                      : category === "other_security" || category === "other_road"
                      ? "Describe what happened — required"
                      : "Describe what you saw — optional"
                  }
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-700/40"
                />
              </div>
              {section === "recycling" && (
                <>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number — REQUIRED"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white"
                  />
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Pickup address — REQUIRED"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white"
                  />
                  <input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Quantity (optional)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white"
                  />
                  <input
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="Pickup location (optional)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white"
                  />
                  <input
                    type="datetime-local"
                    value={preferredAt}
                    onChange={(e) => setPreferredAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs text-slate-400"
                  />
                </>
              )}
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
                        setZipLocked(true);
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-slate-500"
                    >
                      {zip && !zones.some((z) => z.zip_code === zip) && (
                        <option value={zip}>{zip} — detected from GPS</option>
                      )}
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
    setZipLocked(true);
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
              {section !== "recycling" && geoStatus === "ok" && coords && (
  <>
    <p className="flex items-center gap-1.5 text-xs text-emerald-400/80">
      <MapPin size={12} />
      Pin set to {coords[0].toFixed(4)}, {coords[1].toFixed(4)}
    </p>

    <MiniMap
      lat={coords[0]}
      lng={coords[1]}
      color="#22c55e"
      draggable={areaType === "pin"}
      onMove={(lat, lng) => setCoords([lat, lng])}
      radiusM={areaType === "circle" ? radiusMi * 1609.34 : null}
      hidePin={areaType === "circle"}
    />
    <div className="flex gap-2">
      <button type="button" onClick={() => setAreaType("pin")} className={`rounded-lg border px-3 py-1.5 text-xs ${areaType === "pin" ? "bg-white text-slate-900" : "border-slate-700 text-slate-300"}`}>Pin</button>
      <button type="button" onClick={() => setAreaType("circle")} className={`rounded-lg border px-3 py-1.5 text-xs ${areaType === "circle" ? "bg-white text-slate-900" : "border-slate-700 text-slate-300"}`}>Circle</button>
    </div>
    {areaType === "circle" && (
      <label className="block text-xs text-slate-400">
        Radius: {radiusMi.toFixed(2)} mi
        <input type="range" min={0} max={2} step={0.05} value={radiusMi} onChange={(e) => setRadiusMi(Number(e.target.value))} className="w-full" />
      </label>
    )}
    <p className="text-xs text-slate-500">
      {areaType === "circle" ? "Circle is centered on your GPS point." : "Drag the pin to update its location"}
    </p>
  </>
)}
              {section !== "recycling" && geoStatus === "denied" && (
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={12} />
                  Location permission is required to post.
                </p>
              )}
              {err && <p className="text-sm text-red-400">{err}</p>}
            </div>
          )}
        </div>

                        {!recycleDone && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4">
          {step !== 3 ? (
            <>
              <span className="text-xs text-slate-500">
                {step === 1 ? "Choose a section" : "Choose a category"}
              </span>
              <span className="text-xs text-slate-600"> </span>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(2)}
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
        )}
      </div>
    </div>
  );
}
