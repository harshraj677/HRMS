import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import "dotenv/config";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

const users = [
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
  console.log("🌱  Seeding Anvesana Workforce Management database...\n");

  await prisma.suspiciousLog.deleteMany();
  await prisma.loginHistory.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.employee.deleteMany();
  console.log("🗑️   Cleared existing data.\n");

  for (const user of users) {
    const { password, ...data } = user;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.employee.create({
      data: { ...data, passwordHash, mustChangePassword: false, status: "active" },
    });
    console.log(
      `✅  Created  – ${user.fullName} <${user.email}> [${user.role}] (${user.position})`
    );
  }

  console.log("\n🎉  Seeding complete. 5 users created.");
  console.log("   Admins:    harish@anvesana.org / Admin@123");
  console.log("   Employees: bharath/pavan/vishwa@anvesana.org / Employee@123");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
