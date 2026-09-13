import { useEffect, useRef } from "react";
import * as L from "leaflet";

interface Props {
  lat: number;
  lng: number;
  color: string;
  label?: string;

  draggable?: boolean;
    onMove?: (lat: number, lng: number) => void;
  radiusM?: number | null;
}

export default function MiniMap({
  lat,
  lng,
  color,
  label,
  draggable = false,
  onMove,
  radiusM,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });

        L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
        maxZoom: 16,
      }
    ).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div class="wt-pin" style="background:${color}"><div class="wt-pin-inner"></div></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    });

    const marker = L.marker([lat, lng], {
  icon,
  draggable,
}).addTo(map);

markerRef.current = marker;

if (radiusM && radiusM > 0) {
      L.circle([lat, lng], { radius: radiusM, color, fillOpacity: 0.15 }).addTo(map);
    }

if (draggable && onMove) {
  marker.on("dragend", () => {
    const pos = marker.getLatLng();
    onMove(pos.lat, pos.lng);
  });
}

    if (label) {
      marker.bindPopup(label);
    }

    mapRef.current = map;

    return () => {
  map.remove();
  mapRef.current = null;
  markerRef.current = null;
};
  }, [color, label]);

  useEffect(() => {
  if (!mapRef.current || !markerRef.current) return;

  markerRef.current.setLatLng([lat, lng]);
  mapRef.current.panTo([lat, lng], { animate: false });
}, [lat, lng]);
  
  return (
    <div
      ref={containerRef}
      className="h-48 w-full overflow-hidden rounded-xl border border-slate-800"
    />
  );
}
