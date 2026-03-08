import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { signToken, buildAuthCookie } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

interface EmployeeRow extends RowDataPacket {
  id: number;
  fullName: string;
  email: string;
  role: string;
  passwordHash: string;
  department: string | null;
  position: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    // [DEBUG] Log the incoming request payload (remove in production)
    console.log("[auth/login] Request payload:", {
      email: body?.email,
      passwordProvided: !!body?.password,
    });

    if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password must not be empty." },
        { status: 400 }
      );
    }

    // [DEBUG] Log the normalised email being looked up
    console.log("[auth/login] Looking up employee:", email);

    // Query employee from DB
    const [rows] = await db.execute<EmployeeRow[]>(
      "SELECT id, fullName, email, role, passwordHash, department, position FROM Employee WHERE email = ? LIMIT 1",
      [email]
    );

    const employee = rows[0];

    // [DEBUG] Log whether the employee was found
    console.log("[auth/login] Employee found:", employee ? `YES (id=${employee.id}, role=${employee.role})` : "NO");

    if (!employee) {
      // Use a constant-time response to prevent user enumeration
      await bcrypt.hash("dummy", 10);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, employee.passwordHash);

    // [DEBUG] Log bcrypt comparison result
    console.log("[auth/login] Password match:", passwordMatch);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = signToken({
      id: employee.id,
      email: employee.email,
      role: employee.role,
      fullName: employee.fullName,
      department: employee.department ?? undefined,
      position: employee.position ?? undefined,
    });

    // [DEBUG] Log successful JWT creation
    console.log("[auth/login] JWT created for employee id:", employee.id);

    const response = NextResponse.json({
      user: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        position: employee.position,
      },
      role: employee.role,
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
