/**
 * Reverse geocoding using OpenStreetMap Nominatim (free, no API key required).
 * Returns a short human-readable address from lat/lng coordinates.
 * Safe to call on the server; uses AbortSignal for timeouts.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Anvesync HRMS/1.0 (contact@anvesana.org)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`Nominatim ${res.status}`);

    const data = await res.json();
    const a = data.address ?? {};

    // Build a short, meaningful address string
    const road     = a.road || a.pedestrian || a.footway || a.path || "";
    const locality = a.suburb || a.neighbourhood || a.quarter || a.hamlet || "";
    const city     = a.city || a.town || a.village || a.county || "";
    const state    = a.state || "";

    const parts = [road, locality, city, state].filter(Boolean);
    if (parts.length >= 2) return parts.slice(0, 3).join(", ");

    // Fallback: use first 3 comma-segments of display_name
    if (data.display_name) {
      return data.display_name.split(",").slice(0, 3).map((s: string) => s.trim()).join(", ");
    }

    return `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
  } catch {
    return `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
  }
}
