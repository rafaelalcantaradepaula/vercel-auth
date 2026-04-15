"use server";

import { redirect } from "next/navigation";

import {
  AdminUsersError,
  createAdminManagedUser,
  resetAdminManagedUserPassword,
  updateAdminManagedUser,
} from "@/lib/auth/admin-users";
import { requireAdminSession } from "@/lib/auth/session-server";

type AdminUsersActionResult =
  | "user-created"
  | "user-updated"
  | "password-reset"
  | "INVALID_EMAIL"
  | "INVALID_NAME"
  | "INVALID_PASSWORD"
  | "ROLE_NOT_FOUND"
  | "LOGIN_IN_USE"
  | "USER_NOT_FOUND"
  | "SELF_DEACTIVATE"
  | "SELF_ROLE_CHANGE"
  | "LAST_ACTIVE_ADMIN"
  | "UNEXPECTED_ERROR";

function buildRedirectUrl(result: AdminUsersActionResult, isError = false) {
  const searchParam = isError ? "error" : "status";
  return `/admin/users?${searchParam}=${encodeURIComponent(result)}`;
}

function getErrorResult(error: unknown): AdminUsersActionResult {
  if (error instanceof AdminUsersError) {
    return error.code;
  }

  return "UNEXPECTED_ERROR";
}

function parseNumericFormValue(formData: FormData, fieldName: string) {
  const rawValue = String(formData.get(fieldName) ?? "");
  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue)) {
    throw new AdminUsersError(
      fieldName === "roleId" ? "ROLE_NOT_FOUND" : "USER_NOT_FOUND",
      `${fieldName} is invalid.`,
    );
  }

  return parsedValue;
}

export async function createUserAction(formData: FormData) {
  await requireAdminSession();

  let redirectUrl = buildRedirectUrl("user-created");

  try {
    await createAdminManagedUser({
      login: String(formData.get("login") ?? ""),
      name: String(formData.get("name") ?? ""),
      roleId: parseNumericFormValue(formData, "roleId"),
      password: String(formData.get("password") ?? ""),
    });
  } catch (error) {
    redirectUrl = buildRedirectUrl(getErrorResult(error), true);
  }

  redirect(redirectUrl);
}

export async function updateUserAction(formData: FormData) {
  const adminSession = await requireAdminSession();

  let redirectUrl = buildRedirectUrl("user-updated");

  try {
    await updateAdminManagedUser({
      userId: parseNumericFormValue(formData, "userId"),
      actingUserId: adminSession.userId,
      name: String(formData.get("name") ?? ""),
      roleId: parseNumericFormValue(formData, "roleId"),
      isActive: formData.getAll("status").some((value) => String(value) === "active"),
    });
  } catch (error) {
    redirectUrl = buildRedirectUrl(getErrorResult(error), true);
  }

  redirect(redirectUrl);
}

export async function resetUserPasswordAction(formData: FormData) {
  await requireAdminSession();

  let redirectUrl = buildRedirectUrl("password-reset");

  try {
    await resetAdminManagedUserPassword({
      userId: parseNumericFormValue(formData, "userId"),
      password: String(formData.get("password") ?? ""),
    });
  } catch (error) {
    redirectUrl = buildRedirectUrl(getErrorResult(error), true);
  }

  redirect(redirectUrl);
}
