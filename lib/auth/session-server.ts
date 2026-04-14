import "server-only";

import { cookies } from "next/headers";

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
