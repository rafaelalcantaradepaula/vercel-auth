"use server";

import { redirect } from "next/navigation";

import {
  AdminRolesError,
  createAdminManagedRole,
  updateAdminManagedRole,
} from "@/lib/auth/admin-roles";
import { requireAdminSession } from "@/lib/auth/session-server";

type AdminRolesActionResult =
  | "role-created"
  | "role-updated"
  | "INVALID_ROLE_NAME"
  | "INVALID_PERMISSIONS"
  | "ROLE_NOT_FOUND"
  | "ROLE_NAME_IN_USE"
  | "SYSTEM_ROLE_RENAME"
  | "UNEXPECTED_ERROR";

function buildRedirectUrl(result: AdminRolesActionResult, isError = false) {
  const searchParam = isError ? "error" : "status";
  return `/admin/roles?${searchParam}=${encodeURIComponent(result)}`;
}

function getErrorResult(error: unknown): AdminRolesActionResult {
  if (error instanceof AdminRolesError) {
    return error.code;
  }

  return "UNEXPECTED_ERROR";
}

function parseNumericFormValue(formData: FormData, fieldName: string) {
  const rawValue = String(formData.get(fieldName) ?? "");
  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue)) {
    throw new AdminRolesError("ROLE_NOT_FOUND", `${fieldName} is invalid.`);
  }

  return parsedValue;
}

function readPermissionValues(formData: FormData) {
  return formData.getAll("permissions").map((value) => String(value));
}

export async function createRoleAction(formData: FormData) {
  await requireAdminSession();

  let redirectUrl = buildRedirectUrl("role-created");

  try {
    await createAdminManagedRole({
      name: String(formData.get("name") ?? ""),
      permissions: readPermissionValues(formData),
    });
  } catch (error) {
    redirectUrl = buildRedirectUrl(getErrorResult(error), true);
  }

  redirect(redirectUrl);
}

export async function updateRoleAction(formData: FormData) {
  await requireAdminSession();

  let redirectUrl = buildRedirectUrl("role-updated");

  try {
    await updateAdminManagedRole({
      roleId: parseNumericFormValue(formData, "roleId"),
      name: String(formData.get("name") ?? ""),
      permissions: readPermissionValues(formData),
    });
  } catch (error) {
    redirectUrl = buildRedirectUrl(getErrorResult(error), true);
  }

  redirect(redirectUrl);
}
