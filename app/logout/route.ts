import { NextResponse, type NextRequest } from "next/server";

import { getExpiredAuthSessionCookieDescriptor } from "@/lib/auth/session";

function createLogoutResponse(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));

  response.cookies.set(getExpiredAuthSessionCookieDescriptor());

  return response;
}

export async function GET(request: NextRequest) {
  return createLogoutResponse(request);
}

export async function POST(request: NextRequest) {
  return createLogoutResponse(request);
}
