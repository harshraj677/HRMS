import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { signToken, buildAuthCookie } from "@/lib/auth";

interface EmployeeRow {
  id: number;
  fullName: string;
  email: string;
  role: string;
  passwordHash: string;
  department: string | null;
  position: string | null;
  mustChangePassword: boolean;
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const ipAddress = getClientIP(req);
    const userAgent = req.headers.get("user-agent") || "unknown";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password must not be empty." },
        { status: 400 }
      );
    }

    // Query employee from DB
    const [rows] = await db.execute<EmployeeRow[]>(
      "SELECT id, fullName, email, role, passwordHash, department, position, mustChangePassword FROM Employee WHERE email = ? LIMIT 1",
      [email]
    );

    const employee = rows[0];

    if (!employee) {
      await bcrypt.hash("dummy", 10);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, employee.passwordHash);

    if (!passwordMatch) {
      // Log failed login attempt
      await db.execute(
        "INSERT INTO LoginHistory (employeeId, ipAddress, device, browser, success) VALUES (?, ?, ?, ?, ?)",
        [employee.id, ipAddress, userAgent, parseBrowser(userAgent), false]
      );

      // Check for frequent failed logins (fraud detection)
      const [failedRows] = await db.execute<{ cnt: number }[]>(
        "SELECT COUNT(*) as cnt FROM LoginHistory WHERE employeeId = ? AND success = 0 AND loginTime > DATE_SUB(NOW(), INTERVAL 30 MINUTE)",
        [employee.id]
      );
      const failedCount = (failedRows as { cnt: number }[])[0].cnt;

      if (failedCount >= 5) {
        await db.execute(
          "INSERT INTO SuspiciousLog (employeeId, type, description, ipAddress) VALUES (?, ?, ?, ?)",
          [employee.id, "frequent_failed_login", `${failedCount} failed login attempts in the last 30 minutes from IP: ${ipAddress}`, ipAddress]
        );
      }

      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Log successful login
    await db.execute(
      "INSERT INTO LoginHistory (employeeId, ipAddress, device, browser, success) VALUES (?, ?, ?, ?, ?)",
      [employee.id, ipAddress, userAgent, parseBrowser(userAgent), true]
    );

    const token = signToken({
      id: employee.id,
      email: employee.email,
      role: employee.role,
      fullName: employee.fullName,
      department: employee.department ?? undefined,
      position: employee.position ?? undefined,
    });

    const response = NextResponse.json({
      user: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        position: employee.position,
        mustChangePassword: !!employee.mustChangePassword,
      },
    });

    response.headers.set("Set-Cookie", buildAuthCookie(token));
    return response;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again." },
      { status: 500 }
    );
  }
}

function parseBrowser(userAgent: string): string {
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
  return "Other";
}
