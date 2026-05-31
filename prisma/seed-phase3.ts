/**
 * Phase 3 seed — creates one sample geofence and one default policy.
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-phase3.ts
 *
 * Prerequisites:
 * 1. prisma generate has been run (new models are available)
 * 2. DATABASE_URL points to the real MongoDB instance
 * 3. At least one admin employee exists (used as createdBy)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find any admin to use as creator
  const admin = await prisma.employee.findFirst({ where: { role: "admin" } });
  if (!admin) {
    console.error("No admin found. Create an admin employee first.");
    process.exit(1);
  }

  // Sample circle geofence — centred on the configured office location
  const gf = await prisma.geofence.upsert({
    where: { id: "000000000000000000000001" },
    update: {},
    create: {
      id: "000000000000000000000001",
      name: "Main Office",
      type: "circle",
      geometry: {
        type: "circle",
        lat: 13.962271577211828,
        lng: 75.50897323054004,
        radiusMeters: 300,
      },
      address: "Hubli, Karnataka, India",
      active: true,
      createdBy: admin.id,
    },
  });
  console.log("✔ Geofence seeded:", gf.name);

  // Default soft policy — allows remote work, shows warning if outside
  const policy = await prisma.attendancePolicy.upsert({
    where: { id: "000000000000000000000002" },
    update: {},
    create: {
      id: "000000000000000000000002",
      name: "Default Soft Policy",
      enforcementMode: "soft",
      allowedGeofenceIds: [gf.id],
      allowedDistanceMeters: 50,
      remoteWorkAllowed: true,
      manualOverrideAllowed: true,
      faceVerifyRequired: false,
      photoRetentionDays: 90,
      locationRetentionDays: 365,
      active: true,
      isDefault: true,
      createdBy: admin.id,
    },
  });
  console.log("✔ Policy seeded:", policy.name, "(isDefault:", policy.isDefault, ")");

  // Phase 3 feature flag — OFF by default (admin must explicitly enable)
  await prisma.settings.upsert({
    where: { key: "phase3_policy" },
    update: {},
    create: { key: "phase3_policy", value: { enabled: false } },
  });
  console.log("✔ Phase 3 feature flag seeded (disabled by default)");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
