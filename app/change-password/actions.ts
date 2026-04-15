"use server";

import { redirect } from "next/navigation";

import { ChangePasswordError, changeAuthenticatedUserPassword } from "@/lib/auth/change-password";
import { requireAuthenticatedSession } from "@/lib/auth/session-server";

type ChangePasswordActionResult =
  | "password-updated"
  | "USER_NOT_FOUND"
  | "CURRENT_PASSWORD_INVALID"
  | "INVALID_PASSWORD"
  | "PASSWORD_CONFIRMATION_MISMATCH"
  | "UNEXPECTED_ERROR";

function buildRedirectUrl(result: ChangePasswordActionResult, isError = false) {
  const searchParam = isError ? "error" : "status";
  return `/change-password?${searchParam}=${encodeURIComponent(result)}`;
}

function getErrorResult(error: unknown): ChangePasswordActionResult {
  if (error instanceof ChangePasswordError) {
    return error.code;
  }

  return "UNEXPECTED_ERROR";
}

export async function changePasswordAction(formData: FormData) {
  const authSession = await requireAuthenticatedSession();

  let redirectUrl = buildRedirectUrl("password-updated");

  try {
    await changeAuthenticatedUserPassword({
      userId: authSession.userId,
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });
  } catch (error) {
    redirectUrl = buildRedirectUrl(getErrorResult(error), true);
  }

  redirect(redirectUrl);
}
