import { NextResponse, type NextRequest } from "next/server";

import {
  isAlwaysAllowedForAuthenticatedUser,
  isBootstrapRoute,
  isPublicRoute,
} from "@/lib/auth/routes";
import { readAuthSessionToken } from "@/lib/auth/session";

function isApiRoute(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function buildUnauthorizedResponse(request: NextRequest) {
  if (isApiRoute(request.nextUrl.pathname)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Authentication is required for this route.",
      },
      { status: 401 },
    );
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // The bootstrap page keeps the first schema initialization reachable before auth exists.
  if (isPublicRoute(pathname) || isBootstrapRoute(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = readAuthSessionToken(request.cookies);

  if (!sessionToken) {
    return buildUnauthorizedResponse(request);
  }

  if (isAlwaysAllowedForAuthenticatedUser(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
