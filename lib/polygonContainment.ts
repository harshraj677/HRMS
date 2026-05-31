export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Ray-casting point-in-polygon (even-odd rule).
 * Works correctly for convex and concave polygons in geographic coordinates.
 * For the small scales used in geofencing (< 100 km), treating lat/lng as
 * a flat 2D plane introduces negligible error (~0.1% at 60° latitude).
 */
export function pointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  const px = point.lng;
  const py = point.lat;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const ix = polygon[i].lng;
    const iy = polygon[i].lat;
    const jx = polygon[j].lng;
    const jy = polygon[j].lat;
    const crosses = iy > py !== jy > py && px < ((jx - ix) * (py - iy)) / (jy - iy) + ix;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Approximate centroid of a polygon (arithmetic mean of vertices).
 * Used to estimate "distance to nearest polygon zone" when the point is outside.
 */
export function polygonCentroid(polygon: GeoPoint[]): GeoPoint {
  const sum = polygon.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / polygon.length, lng: sum.lng / polygon.length };
}
