import { describe, it, expect } from "vitest";
import { haversineDistance, isWithinGeofence } from "@/lib/geofence";
import { pointInPolygon, polygonCentroid } from "@/lib/polygonContainment";

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

// ── isWithinGeofence ───────────────────────────────────────────────────────

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

// ── pointInPolygon ─────────────────────────────────────────────────────────

describe("pointInPolygon", () => {
  // Unit square: (0,0) → (1,0) → (1,1) → (0,1)
  const square = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 1, lng: 1 },
    { lat: 1, lng: 0 },
  ];

  it("detects a point clearly inside a square", () => {
    expect(pointInPolygon({ lat: 0.5, lng: 0.5 }, square)).toBe(true);
  });

  it("detects a point clearly outside a square", () => {
    expect(pointInPolygon({ lat: 2, lng: 2 }, square)).toBe(false);
  });

  it("detects a point to the left of the square as outside", () => {
    expect(pointInPolygon({ lat: 0.5, lng: -0.1 }, square)).toBe(false);
  });

  it("returns false for degenerate polygon (< 3 vertices)", () => {
    expect(pointInPolygon({ lat: 0, lng: 0 }, [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }])).toBe(false);
  });

  it("works with a larger office-shaped polygon", () => {
    // A rough polygon around Hubli city centre
    const hubliBlock = [
      { lat: 15.355, lng: 75.130 },
      { lat: 15.365, lng: 75.130 },
      { lat: 15.365, lng: 75.140 },
      { lat: 15.355, lng: 75.140 },
    ];
    // Point inside
    expect(pointInPolygon({ lat: 15.360, lng: 75.135 }, hubliBlock)).toBe(true);
    // Point outside
    expect(pointInPolygon({ lat: 15.350, lng: 75.125 }, hubliBlock)).toBe(false);
  });
});

// ── polygonCentroid ────────────────────────────────────────────────────────

describe("polygonCentroid", () => {
  it("returns centre of unit square", () => {
    const square = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 2 },
      { lat: 2, lng: 2 },
      { lat: 2, lng: 0 },
    ];
    const c = polygonCentroid(square);
    expect(c.lat).toBeCloseTo(1);
    expect(c.lng).toBeCloseTo(1);
  });
});

// ── Policy evaluation integration (pure logic, no DB) ────────────────────
// These test the geometry helpers used by policyEngine.ts

describe("policy evaluation geometry helpers — combined", () => {
  it("correctly identifies inside for an office circle", () => {
    // Office at (13.96, 75.50), radius 300m
    const insidePoint = { lat: 13.9615, lng: 75.5015 }; // ~200m away
    const outsidePoint = { lat: 13.9700, lng: 75.5200 }; // ~2km away

    const distIn = haversineDistance(insidePoint.lat, insidePoint.lng, 13.96, 75.50);
    const distOut = haversineDistance(outsidePoint.lat, outsidePoint.lng, 13.96, 75.50);

    expect(distIn).toBeLessThan(300);
    expect(distOut).toBeGreaterThan(300);
  });

  it("inside polygon geofence → treated as 'ok'", () => {
    const officeBlock = [
      { lat: 13.960, lng: 75.508 },
      { lat: 13.965, lng: 75.508 },
      { lat: 13.965, lng: 75.512 },
      { lat: 13.960, lng: 75.512 },
    ];
    expect(pointInPolygon({ lat: 13.962, lng: 75.510 }, officeBlock)).toBe(true);
  });

  it("outside polygon geofence → treated as 'outside'", () => {
    const officeBlock = [
      { lat: 13.960, lng: 75.508 },
      { lat: 13.965, lng: 75.508 },
      { lat: 13.965, lng: 75.512 },
      { lat: 13.960, lng: 75.512 },
    ];
    // Employee 2 km north
    expect(pointInPolygon({ lat: 13.980, lng: 75.510 }, officeBlock)).toBe(false);
  });
});
