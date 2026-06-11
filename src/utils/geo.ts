export interface Coords {
  latitude: number;
  longitude: number;
}

/** Great-circle distance in kilometres between two lat/lng points (haversine). */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Round a distance for display: "0.8 km", "3.2 km". */
export function fmtKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

// Bengaluru city centre — fallback when location permission is denied.
export const DEFAULT_CENTER: Coords = { latitude: 12.9716, longitude: 77.5946 };
