export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Approximate center lat/lng for a few common zips (fast path)
const ZIP_CENTERS: Record<string, [number, number]> = {
  "90210": [34.0901, -118.4065],
  "10001": [40.7484, -73.9967],
  "20152": [38.8592, -77.4492],
  "60601": [41.8855, -87.6217],
  "94102": [37.779, -122.413],
  "02101": [42.3601, -71.0589],
  "33101": [25.7787, -80.1394],
  "30301": [33.749, -84.388],
};

// Runtime cache so we don't re-fetch the same zip
const zipCache: Record<string, [number, number]> = { ...ZIP_CENTERS };

/** Sync fallback — still used by jitterAround */
export function zipCenter(zip: string): [number, number] {
  return zipCache[zip] || ZIP_CENTERS[zip] || [39.5, -98.35];
}

/** Async: real center for any US zip via free Zippopotam API */
export async function getZipCenter(zip: string): Promise<[number, number]> {
  const cleaned = (zip || "").trim();

  if (zipCache[cleaned]) {
    return zipCache[cleaned];
  }

  if (!/^\d{5}$/.test(cleaned)) {
    return [39.5, -98.35];
  }

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${cleaned}`);
    if (!res.ok) {
      return [39.5, -98.35];
    }
    const data = await res.json();
    const place = data?.places?.[0];
    if (place?.latitude && place?.longitude) {
      const coords: [number, number] = [
        parseFloat(place.latitude),
        parseFloat(place.longitude),
      ];
      zipCache[cleaned] = coords;
      return coords;
    }
  } catch {
    // network error — fall through
  }

  return [39.5, -98.35];
}
export function jitterAround(zip: string, seed?: string): [number, number] {
  const [lat, lng] = zipCenter(zip);
  // Deterministic small offset so the same incident always lands in the same
  // spot. ~0.006 degrees ≈ 0.4 miles — enough to spread pins within a zip
  // without sending them to the wrong neighborhood.
  const hash = seed
    ? Array.from(seed).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100000, 7)
    : Math.random() * 100000;
  const dLat = ((hash % 1000) / 1000 - 0.5) * 0.006;
  const dLng = (((hash / 1000) % 1000) / 1000 - 0.5) * 0.006;
  return [lat + dLat, lng + dLng];
}
