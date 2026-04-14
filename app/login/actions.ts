"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { LoginActionState } from "@/app/login/state";
import { shouldExposeLoginDebug } from "@/lib/auth/config";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/auth/identity";
import {
  createSignedAuthSessionToken,
  getAuthSessionCookieDescriptor,
} from "@/lib/auth/session";
import {
  authenticateUserLogin,
  getLoginPasswordDebugInfo,
} from "@/lib/auth/users";

const INVALID_CREDENTIALS_MESSAGE = "Email ou senha invalidos.";
const AUTH_UNAVAILABLE_MESSAGE = "Autenticacao indisponivel no momento.";

async function buildLoginFailureState(
  errorMessage: string,
  rawEmail: string,
  password: string,
): Promise<LoginActionState> {
  const submittedEmail = normalizeEmailAddress(rawEmail);

  if (!shouldExposeLoginDebug()) {
    return {
      errorMessage,
      submittedEmail,
      debugInfo: null,
    };
  }

  try {
    return {
      errorMessage,
      submittedEmail,
      debugInfo: await getLoginPasswordDebugInfo(submittedEmail, password),
    };
  } catch {
    return {
      errorMessage,
      submittedEmail,
      debugInfo: null,
    };
  }
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const rawEmail = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const submittedEmail = normalizeEmailAddress(rawEmail);

  if (!isValidEmailAddress(rawEmail) || !password.trim()) {
    return buildLoginFailureState(INVALID_CREDENTIALS_MESSAGE, rawEmail, password);
  }

  try {
    const authenticatedUser = await authenticateUserLogin(submittedEmail, password);

    if (!authenticatedUser) {
      return buildLoginFailureState(INVALID_CREDENTIALS_MESSAGE, rawEmail, password);
    }

    const token = await createSignedAuthSessionToken(authenticatedUser);
    const cookieDescriptor = getAuthSessionCookieDescriptor(token);
    const cookieStore = await cookies();

    cookieStore.set(cookieDescriptor);
  } catch {
    return buildLoginFailureState(AUTH_UNAVAILABLE_MESSAGE, rawEmail, password);
  }

  redirect("/");
}
