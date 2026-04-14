import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { readAuthSessionToken, verifySignedAuthSessionToken } from "@/lib/auth/session";

export async function getCurrentAuthSession() {
  try {
    const cookieStore = await cookies();
    const token = readAuthSessionToken(cookieStore);

    if (!token) {
      return null;
    }

    return await verifySignedAuthSessionToken(token);
  } catch {
    return null;
  }
}

export async function requireAuthenticatedSession() {
  const authSession = await getCurrentAuthSession();

  if (!authSession) {
    redirect("/login");
  }

  return authSession;
}

export async function requireAdminSession() {
  const authSession = await requireAuthenticatedSession();

  if (authSession.roleName !== "adm") {
    redirect("/");
  }

  return authSession;
}
