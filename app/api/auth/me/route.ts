import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: payload.id,
      fullName: payload.fullName,
      email: payload.email,
      role: payload.role,
    },
  });
}
