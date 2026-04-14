import { NextResponse, type NextRequest } from "next/server";

import {
  hasRoutePermission,
  isAlwaysAllowedForAuthenticatedUser,
  isBootstrapRoute,
  isPublicRoute,
} from "@/lib/auth/routes";
import {
  getExpiredAuthSessionCookieDescriptor,
  readAuthSessionToken,
  readAuthSessionPayloadWithoutVerification,
} from "@/lib/auth/session";

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

function buildForbiddenResponse(request: NextRequest) {
  if (isApiRoute(request.nextUrl.pathname)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Your session does not have permission for this route.",
      },
      { status: 403 },
    );
  }

  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("access", "denied");

  return NextResponse.redirect(redirectUrl);
}

function attachExpiredSessionCookie(response: NextResponse) {
  response.cookies.set(getExpiredAuthSessionCookieDescriptor());
  return response;
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

  const authSession = readAuthSessionPayloadWithoutVerification(sessionToken);

  if (!authSession) {
    return attachExpiredSessionCookie(buildUnauthorizedResponse(request));
  }

  if (isAlwaysAllowedForAuthenticatedUser(pathname)) {
    return NextResponse.next();
  }

  if (!hasRoutePermission(pathname, authSession.permissions)) {
    return buildForbiddenResponse(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
