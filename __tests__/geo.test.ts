import { describe, it, expect } from "vitest";
import { haversineDistance, isWithinGeofence } from "@/lib/geofence";

// ── Haversine ──────────────────────────────────────────────────────────────

describe("haversineDistance", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistance(13.96, 75.50, 13.96, 75.50)).toBe(0);
  });

  it("calculates ~111km per degree latitude", () => {
    const dist = haversineDistance(0, 0, 1, 0);
    expect(dist).toBeGreaterThan(110_000);
    expect(dist).toBeLessThan(112_000);
  });

  it("is symmetric", () => {
    const d1 = haversineDistance(13.96, 75.50, 12.97, 77.59);
    const d2 = haversineDistance(12.97, 77.59, 13.96, 75.50);
    expect(Math.abs(d1 - d2)).toBeLessThan(1); // within 1 metre
  });
});

// ── isWithinGeofence (office zone) ──────────────────────────────────────────

describe("isWithinGeofence (circle)", () => {
  const OLat = 13.9622, OLng = 75.5089, radius = 500;

  it("allows check-in at exact centre (distance 0)", () => {
    const { allowed, distance } = isWithinGeofence(OLat, OLng, OLat, OLng, radius);
    expect(allowed).toBe(true);
    expect(distance).toBe(0);
  });

  it("allows check-in ~200m inside radius", () => {
    // Move ~0.002 degrees north ≈ 222m
    const { allowed } = isWithinGeofence(OLat + 0.002, OLng, OLat, OLng, radius);
    expect(allowed).toBe(true);
  });

  it("blocks check-in 2km outside", () => {
    // Move ~0.018 degrees north ≈ 2000m
    const { allowed, distance } = isWithinGeofence(OLat + 0.018, OLng, OLat, OLng, radius);
    expect(allowed).toBe(false);
    expect(distance).toBeGreaterThan(500);
  });
});
