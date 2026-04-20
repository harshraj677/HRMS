// Office location — Anvesana Innovation & Entrepreneurial Forum
export const OFFICE_LOCATION = {
  latitude: 15.3647,   // Update with actual office latitude
  longitude: 75.1240,  // Update with actual office longitude
  radiusMeters: 200,
};

// Office start time for late detection
export const OFFICE_START_TIME = { hour: 9, minute: 30 };
export const LATE_GRACE_TIME = { hour: 9, minute: 45 };
export const ABSENT_CUTOFF_TIME = { hour: 10, minute: 0 };

/**
 * Calculate distance between two lat/lng points using the Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a given point is within the office geofence.
 */
export function isWithinGeofence(latitude: number, longitude: number): {
  allowed: boolean;
  distance: number;
} {
  const distance = haversineDistance(
    latitude,
    longitude,
    OFFICE_LOCATION.latitude,
    OFFICE_LOCATION.longitude
  );
  return {
    allowed: distance <= OFFICE_LOCATION.radiusMeters,
    distance: Math.round(distance),
  };
}

/**
 * Determine attendance status based on check-in time.
 */
export function getAttendanceStatus(checkInTime: Date): "present" | "late" | "absent" {
  const hours = checkInTime.getHours();
  const minutes = checkInTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const startMinutes = OFFICE_START_TIME.hour * 60 + OFFICE_START_TIME.minute;
  const lateMinutes = LATE_GRACE_TIME.hour * 60 + LATE_GRACE_TIME.minute;
  const absentMinutes = ABSENT_CUTOFF_TIME.hour * 60 + ABSENT_CUTOFF_TIME.minute;

  if (totalMinutes <= startMinutes) return "present";
  if (totalMinutes <= lateMinutes) return "late";
  if (totalMinutes >= absentMinutes) return "absent";
  return "late";
}
