"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/auth/identity";
import {
  createSignedAuthSessionToken,
  getAuthSessionCookieDescriptor,
} from "@/lib/auth/session";
import { authenticateUserLogin } from "@/lib/auth/users";

export type LoginActionState = {
  errorMessage: string | null;
  submittedEmail: string;
};

export const initialLoginActionState: LoginActionState = {
  errorMessage: null,
  submittedEmail: "",
};

const INVALID_CREDENTIALS_MESSAGE = "Email ou senha invalidos.";
const AUTH_UNAVAILABLE_MESSAGE = "Autenticacao indisponivel no momento.";

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const rawEmail = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const submittedEmail = normalizeEmailAddress(rawEmail);

  if (!isValidEmailAddress(rawEmail) || !password.trim()) {
    return {
      errorMessage: INVALID_CREDENTIALS_MESSAGE,
      submittedEmail,
    };
  }

  try {
    const authenticatedUser = await authenticateUserLogin(submittedEmail, password);

    if (!authenticatedUser) {
      return {
        errorMessage: INVALID_CREDENTIALS_MESSAGE,
        submittedEmail,
      };
    }

    const token = await createSignedAuthSessionToken(authenticatedUser);
    const cookieDescriptor = getAuthSessionCookieDescriptor(token);
    const cookieStore = await cookies();

    cookieStore.set(cookieDescriptor);
  } catch {
    return {
      errorMessage: AUTH_UNAVAILABLE_MESSAGE,
      submittedEmail,
    };
  }

  redirect("/");
}
