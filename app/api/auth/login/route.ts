import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import { signToken, buildAuthCookie } from "@/lib/auth";

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

    const employee = await prisma.employee.findUnique({ where: { email } });

    if (!employee) {
      await bcrypt.hash("dummy", 10);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, employee.passwordHash);

    if (!passwordMatch) {
      await prisma.loginHistory.create({
        data: {
          employeeId: employee.id,
          ipAddress,
          device: userAgent,
          browser: parseBrowser(userAgent),
          success: false,
        },
      });

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const failedCount = await prisma.loginHistory.count({
        where: {
          employeeId: employee.id,
          success: false,
          loginTime: { gte: thirtyMinutesAgo },
        },
      });

      if (failedCount >= 5) {
        await prisma.suspiciousLog.create({
          data: {
            employeeId: employee.id,
            type: "frequent_failed_login",
            description: `${failedCount} failed login attempts in the last 30 minutes from IP: ${ipAddress}`,
            ipAddress,
          },
        });
      }

      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await prisma.loginHistory.create({
      data: {
        employeeId: employee.id,
        ipAddress,
        device: userAgent,
        browser: parseBrowser(userAgent),
        success: true,
      },
    });

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
        mustChangePassword: employee.mustChangePassword,
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
