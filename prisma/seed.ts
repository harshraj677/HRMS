import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import "dotenv/config";

const SALT_ROUNDS = 12;

const users = [
  // ── Admin ──────────────────────────────────────────────────────────────────
  {
    fullName: "Harish Gadagin",
    email: "harish@anvesana.org",
    department: "Management",
    position: "Admin",
    role: "admin",
    password: "Admin@123",
    leaveBalance: 18,
  },
  // ── Employees ──────────────────────────────────────────────────────────────
  {
    fullName: "Bharath Kumar K R",
    email: "bharath@anvesana.org",
    department: "Incubation",
    position: "Incubation Manager",
    role: "employee",
    password: "Employee@123",
    leaveBalance: 18,
  },
  {
    fullName: "Pavan M Naik",
    email: "pavan@anvesana.org",
    department: "Programs",
    position: "Program Associate",
    role: "employee",
    password: "Employee@123",
    leaveBalance: 18,
  },
  {
    fullName: "Vishwa H M",
    email: "vishwa@anvesana.org",
    department: "Design",
    position: "Graphic Designer",
    role: "employee",
    password: "Employee@123",
    leaveBalance: 18,
  },
  {
    fullName: "Sarvesh Kumar",
    email: "sarvesh@anvesana.org",
    department: "Technology",
    position: "Software Developer",
    role: "employee",
    password: "Employee@123",
    leaveBalance: 18,
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  const connection = await mysql.createConnection(databaseUrl);
  console.log("🌱  Seeding Anvesana Employee Management database...\n");

  try {
    // Clear existing data in correct order (foreign keys)
    await connection.execute("DELETE FROM LeaveRequest");
    await connection.execute("DELETE FROM Attendance");
    await connection.execute("DELETE FROM Message");
    await connection.execute("DELETE FROM Employee");
    console.log("🗑️   Cleared existing data.\n");

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

      await connection.execute(
        "INSERT INTO Employee (fullName, email, department, position, role, passwordHash, leaveBalance) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [user.fullName, user.email, user.department, user.position, user.role, passwordHash, user.leaveBalance]
      );

      console.log(`✅  Created  – ${user.fullName} <${user.email}> [${user.role}] (${user.position})`);
    }

    console.log("\n🎉  Seeding complete. 4 users created.");
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error("❌  Seed failed:", e);
  process.exit(1);
});
