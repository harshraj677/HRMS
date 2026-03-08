import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const AUTH_COOKIE = "anvesana_auth";
const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_TTL = "8h";

export interface JWTPayload {
  id: number;
  email: string;
  role: string;
  fullName: string;
  department?: string;
  position?: string;
}

/** Sign a new JWT and return the token string. */
export function signToken(payload: JWTPayload): string {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured.");
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

/** Verify a JWT string. Returns the decoded payload or null if invalid. */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/** Read the auth token from the request cookie header. */
export function getTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(AUTH_COOKIE)?.value ?? null;
}

/** Read and verify the auth payload from the current request cookies (server component / route handler). */
export async function getAuthPayload(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Build the Set-Cookie header value for the auth token. */
export function buildAuthCookie(token: string): string {
  const maxAge = 8 * 60 * 60; // 8 hours in seconds
  return `${AUTH_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

/** Build a cookie header that clears the auth token. */
export function buildClearCookie(): string {
  return `${AUTH_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
