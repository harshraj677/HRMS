import { NextRequest, NextResponse } from "next/server";

/**
 * NOTE: Do NOT import from lib/auth.ts here.
 * Middleware runs on the Edge Runtime; lib/auth.ts uses jsonwebtoken and
 * next/headers which are Node.js-only APIs and will crash at the edge.
 * A simple cookie-presence check is sufficient for redirect guards —
 * actual JWT verification still happens in every API route handler.
 */

const AUTH_COOKIE = "anvesana_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasAuthCookie = req.cookies.has(AUTH_COOKIE);

  // -----------------------------------------------------------------
  // 1. Protect all /dashboard routes → redirect to login if not authed
  // -----------------------------------------------------------------
  if (pathname.startsWith("/dashboard") && !hasAuthCookie) {
    const loginUrl = new URL("/login", req.url);
    // Preserve the originally requested path so we can redirect back after login
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // -----------------------------------------------------------------
  // 2. Redirect already-authenticated users away from /login
  // -----------------------------------------------------------------
  if (pathname === "/login" && hasAuthCookie) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // -----------------------------------------------------------------
  // 3. Redirect root "/" based on auth state
  // -----------------------------------------------------------------
  if (pathname === "/") {
    const target = hasAuthCookie ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match every route EXCEPT:
   *  - Next.js static files (_next/static, _next/image)
   *  - public folder assets (favicon.ico, images, etc.)
   *  - API routes (they handle auth internally)
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
