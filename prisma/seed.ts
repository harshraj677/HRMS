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
    position: "COO",
    role: "admin",
    password: "Admin@123",
    leaveBalance: 18,
    phone: "+91-9876543210",
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
    phone: "+91-9876543211",
  },
  {
    fullName: "Pavan M Naik",
    email: "pavan@anvesana.org",
    department: "Programs",
    position: "Program Associate",
    role: "employee",
    password: "Employee@123",
    leaveBalance: 18,
    phone: "+91-9876543212",
  },
  {
    fullName: "Vishwa H M",
    email: "vishwa@anvesana.org",
    department: "Design",
    position: "Graphic Designer",
    role: "employee",
    password: "Employee@123",
    leaveBalance: 18,
    phone: "+91-9876543213",
  },
  {
    fullName: "Anu",
    email: "anu@anvesana.org",
    department: "Management",
    position: "Manager",
    role: "admin",
    password: "Admin@123",
    leaveBalance: 18,
    phone: "+91-9876543215",
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  const url = new URL(databaseUrl);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  });
  console.log("🌱  Seeding Anvesana Workforce Management database...\n");

  try {
    // Clear existing data in correct order (foreign keys)
    await connection.execute("DELETE FROM SuspiciousLog");
    await connection.execute("DELETE FROM LoginHistory");
    await connection.execute("DELETE FROM LeaveRequest");
    await connection.execute("DELETE FROM Attendance");
    await connection.execute("DELETE FROM Employee");
    console.log("🗑️   Cleared existing data.\n");

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

      await connection.execute(
        `INSERT INTO Employee (fullName, email, department, position, role, passwordHash, leaveBalance, phone, mustChangePassword, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.fullName, user.email, user.department, user.position, user.role, passwordHash, user.leaveBalance, user.phone, false, "active"]
      );

      console.log(`✅  Created  – ${user.fullName} <${user.email}> [${user.role}] (${user.position})`);
    }

    console.log("\n🎉  Seeding complete. 5 users created.");
    console.log("   Admin: harish@anvesana.org / Admin@123");
    console.log("   Employees: bharath/pavan/vishwa/sarvesh@anvesana.org / Employee@123");
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error("❌  Seed failed:", e);
  process.exit(1);
});
