import { useEffect, useMemo, useRef } from "react";
import * as L from "leaflet";
import { CATEGORIES } from "../lib/categories";
import type { Incident } from "../lib/supabase";
import { getZipCenter } from "../lib/geo";

interface Props {
  incidents: Incident[];
  activeZip: string | null;
  onResolve: (id: string) => Promise<void>;
  selectedIncident?: Incident | null;
}

function buildPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="wt-pin" style="background:${color}"><div class="wt-pin-inner"></div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

export default function MapView({ incidents, activeZip, onResolve, selectedIncident }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  const filtered = useMemo(
    () =>
      incidents.filter(
        (i) => i.status === "active" && (!activeZip || i.zip_code === activeZip)
      ),
    [incidents, activeZip]
  );

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [39.5, -98.35],
      zoom: 4,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Tiles &copy; Esri",
    maxZoom: 16,
  }
).addTo(map);

        mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 50);
    setTimeout(() => map.invalidateSize(), 300);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

    // Recenter when active zip or filtered incidents change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;

    (async () => {
      const withCoords = filtered.filter(
        (i) => i.latitude != null && i.longitude != null
      );

      // 1) Prefer real incident pins in this zip
      if (withCoords.length > 0) {
        const bounds = L.latLngBounds(
          withCoords.map((i) => [i.latitude!, i.longitude!] as [number, number])
        );
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
          return;
        }
      }

      // 2) No pins — fly to the real center of that zip
      if (activeZip) {
        const center = await getZipCenter(activeZip);
        if (!cancelled) {
          map.flyTo(center, 12, { duration: 0.8 });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeZip, filtered]);


  useEffect(() => {
  const map = mapRef.current;

  if (!map || !selectedIncident) return;

  if (
    selectedIncident.latitude != null &&
    selectedIncident.longitude != null
  ) {
    map.flyTo(
      [selectedIncident.latitude, selectedIncident.longitude],
      16,
      { duration: 0.8 }
    );
  }
}, [selectedIncident]);

  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(filtered.map((i) => i.id));

    // Remove stale markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    filtered.forEach((inc) => {
      if (inc.latitude == null || inc.longitude == null) return;

            const meta = CATEGORIES[inc.category] || {
        pinColor: "#94a3b8",
        label: inc.category,
      };
      const icon = buildPinIcon(meta.pinColor);
      const existing = markersRef.current[inc.id];

      if (existing) {
        existing.setIcon(icon);
        existing.setLatLng([inc.latitude, inc.longitude]);
        existing.setPopupContent(popupHtml(inc));
      } else {
                if (inc.area_type === "circle" && inc.radius_m) {
          const circle = L.circle([inc.latitude, inc.longitude], {
            radius: inc.radius_m,
            color: meta.pinColor,
            fillOpacity: 0.12,
          }).addTo(map);
          circle.bindPopup(popupHtml(inc));
        } else {
          const marker = L.marker([inc.latitude, inc.longitude], { icon }).addTo(map);
          marker.bindPopup(popupHtml(inc));
          marker.on("popupopen", (e) => {
            const root = (e.popup.getElement() as HTMLElement)?.querySelector("[data-resolve]");
            root?.addEventListener("click", async () => {
              await onResolve(inc.id);
            });
          });
          markersRef.current[inc.id] = marker;
        }

        marker.on("popupopen", (e) => {
          const root = (e.popup.getElement() as HTMLElement)?.querySelector("[data-resolve]");
          root?.addEventListener("click", async () => {
            await onResolve(inc.id);
          });
        });

        markersRef.current[inc.id] = marker;
      }
    });
  }, [filtered, onResolve]);

  function popupHtml(inc: Incident): string {
        const meta = CATEGORIES[inc.category] || { pinColor: "#94a3b8", label: inc.category };
    const latStr = inc.latitude != null ? inc.latitude.toFixed(5) : "—";
    const lngStr = inc.longitude != null ? inc.longitude.toFixed(5) : "—";

    return `
      <div style="min-width:220px;max-width:260px;font-family:inherit">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-size:11px;font-weight:600;color:${meta.pinColor};text-transform:uppercase;letter-spacing:0.04em">${meta.label}</span>
        </div>
        <div style="font-size:14px;font-weight:600;color:#f1f5f9;margin-bottom:4px">${escapeHtml(inc.title)}</div>
        ${inc.description ? `<div style="font-size:12px;color:#94a3b8;margin-bottom:6px;line-height:1.4">${escapeHtml(inc.description)}</div>` : ""}
        ${inc.location_description ? `<div style="font-size:11px;color:#64748b;margin-bottom:4px">${escapeHtml(inc.location_description)} · ${inc.zip_code}</div>` : ""}
        ${inc.latitude != null && inc.longitude != null ? `
        <div style="font-size:11px;color:#38bdf8;margin-bottom:6px;font-family:monospace">${latStr}, ${lngStr}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
          <a href="https://maps.apple.com/?ll=${inc.latitude},${inc.longitude}&q=${inc.latitude},${inc.longitude}" target="_blank" rel="noreferrer" style="font-size:11px;color:#e2e8f0;background:#1e293b;border:1px solid #334155;border-radius:6px;padding:3px 8px;text-decoration:none">Apple Maps</a>
          <a href="https://www.google.com/maps?q=${inc.latitude},${inc.longitude}" target="_blank" rel="noreferrer" style="font-size:11px;color:#e2e8f0;background:#1e293b;border:1px solid #334155;border-radius:6px;padding:3px 8px;text-decoration:none">Google Maps</a>
          <a href="https://waze.com/ul?ll=${inc.latitude},${inc.longitude}&navigate=yes" target="_blank" rel="noreferrer" style="font-size:11px;color:#e2e8f0;background:#1e293b;border:1px solid #334155;border-radius:6px;padding:3px 8px;text-decoration:none">Waze</a>
        </div>` : ""}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
          <span style="font-size:11px;color:#94a3b8">${inc.verifications} neighbor${inc.verifications === 1 ? "" : "s"} verified</span>
          <button data-resolve style="font-size:12px;font-weight:600;color:#34d399;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:6px;padding:4px 10px;cursor:pointer">Mark as Resolved</button>
        </div>
      </div>
    `;
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full rounded-2xl" />
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-400 backdrop-blur-md">
        {filtered.length} active incident{filtered.length === 1 ? "" : "s"} on map
        {activeZip ? ` · ${activeZip}` : " · all zones"}
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
