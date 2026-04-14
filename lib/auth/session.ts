import {
  getAuthSessionCookieName,
  getAuthSessionMaxAgeSeconds,
  getAuthSessionSecret,
  useSecureAuthCookies,
} from "@/lib/auth/config";
import { normalizeEmailAddress } from "@/lib/auth/identity";
import { normalizeRoutePermissions } from "@/lib/auth/routes";

const AUTH_SESSION_VERSION = 1;
const ADMIN_ROLE_NAME = "adm";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type AuthSessionPayload = {
  version: number;
  userId: number;
  login: string;
  name: string;
  roleName: string;
  permissions: string[];
  issuedAt: number;
  expiresAt: number;
};

export type AuthSessionInput = {
  userId: number;
  login: string;
  name: string;
  roleName: string;
  permissions: string[];
};

export type AuthSessionCookieDescriptor = {
  name: string;
  value: string;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
  expires: Date;
};

export type CookieValueReader = {
  get(name: string): { value: string } | undefined;
};

function encodeBase64Url(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(encodedPayload: string, secret: string) {
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(encodedPayload));

  return encodeBase64Url(new Uint8Array(signature));
}

async function verifyPayloadSignature(
  encodedPayload: string,
  encodedSignature: string,
  secret: string,
) {
  const key = await importSigningKey(secret);

  return crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64Url(encodedSignature),
    textEncoder.encode(encodedPayload),
  );
}

function createSessionPayload(input: AuthSessionInput, now: number): AuthSessionPayload {
  const maxAgeSeconds = getAuthSessionMaxAgeSeconds();
  const normalizedRoleName = input.roleName.trim();
  const normalizedRoleKey = normalizedRoleName.toLowerCase();

  return {
    version: AUTH_SESSION_VERSION,
    userId: input.userId,
    login: normalizeEmailAddress(input.login),
    name: input.name.trim(),
    roleName: normalizedRoleName,
    permissions:
      normalizedRoleKey === ADMIN_ROLE_NAME
        ? ["*"]
        : normalizeRoutePermissions(input.permissions),
    issuedAt: now,
    expiresAt: now + maxAgeSeconds * 1000,
  };
}

function isAuthSessionPayload(value: unknown): value is AuthSessionPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<AuthSessionPayload>;

  return (
    payload.version === AUTH_SESSION_VERSION &&
    typeof payload.userId === "number" &&
    Number.isFinite(payload.userId) &&
    typeof payload.login === "string" &&
    typeof payload.name === "string" &&
    typeof payload.roleName === "string" &&
    Array.isArray(payload.permissions) &&
    payload.permissions.every((permission) => typeof permission === "string") &&
    typeof payload.issuedAt === "number" &&
    Number.isFinite(payload.issuedAt) &&
    typeof payload.expiresAt === "number" &&
    Number.isFinite(payload.expiresAt)
  );
}

function normalizeSessionPayloadPermissions(roleName: string, permissions: readonly string[]) {
  return roleName.trim().toLowerCase() === ADMIN_ROLE_NAME
    ? ["*"]
    : normalizeRoutePermissions(permissions);
}

export async function createSignedAuthSessionToken(
  input: AuthSessionInput,
  options?: {
    now?: number;
    secret?: string;
  },
) {
  const now = options?.now ?? Date.now();
  const secret = options?.secret ?? getAuthSessionSecret();
  const payload = createSessionPayload(input, now);
  const encodedPayload = encodeBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const encodedSignature = await signPayload(encodedPayload, secret);

  return `${encodedPayload}.${encodedSignature}`;
}

export async function verifySignedAuthSessionToken(
  token: string,
  options?: {
    now?: number;
    secret?: string;
  },
) {
  const [encodedPayload, encodedSignature, ...extraParts] = token.split(".");

  if (!encodedPayload || !encodedSignature || extraParts.length > 0) {
    return null;
  }

  const secret = options?.secret ?? getAuthSessionSecret();
  const isValid = await verifyPayloadSignature(encodedPayload, encodedSignature, secret);

  if (!isValid) {
    return null;
  }

  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(textDecoder.decode(decodeBase64Url(encodedPayload)));
  } catch {
    return null;
  }

  if (!isAuthSessionPayload(parsedPayload)) {
    return null;
  }

  const now = options?.now ?? Date.now();

  if (parsedPayload.expiresAt <= now) {
    return null;
  }

  return {
    ...parsedPayload,
    login: normalizeEmailAddress(parsedPayload.login),
    name: parsedPayload.name.trim(),
    roleName: parsedPayload.roleName.trim(),
    permissions: normalizeSessionPayloadPermissions(
      parsedPayload.roleName.trim(),
      parsedPayload.permissions,
    ),
  };
}

export function readAuthSessionPayloadWithoutVerification(
  token: string,
  options?: {
    now?: number;
  },
) {
  const [encodedPayload, encodedSignature, ...extraParts] = token.split(".");

  if (!encodedPayload || !encodedSignature || extraParts.length > 0) {
    return null;
  }

  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(textDecoder.decode(decodeBase64Url(encodedPayload)));
  } catch {
    return null;
  }

  if (!isAuthSessionPayload(parsedPayload)) {
    return null;
  }

  const now = options?.now ?? Date.now();

  if (parsedPayload.expiresAt <= now) {
    return null;
  }

  return {
    ...parsedPayload,
    login: normalizeEmailAddress(parsedPayload.login),
    name: parsedPayload.name.trim(),
    roleName: parsedPayload.roleName.trim(),
    permissions: normalizeSessionPayloadPermissions(
      parsedPayload.roleName.trim(),
      parsedPayload.permissions,
    ),
  };
}

export function getAuthSessionCookieDescriptor(token: string): AuthSessionCookieDescriptor {
  const maxAge = getAuthSessionMaxAgeSeconds();
  const expires = new Date(Date.now() + maxAge * 1000);

  return {
    name: getAuthSessionCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureAuthCookies(),
    path: "/",
    maxAge,
    expires,
  };
}

export function getExpiredAuthSessionCookieDescriptor(): AuthSessionCookieDescriptor {
  return {
    name: getAuthSessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureAuthCookies(),
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
}

export function readAuthSessionToken(cookieStore: CookieValueReader | null | undefined) {
  return cookieStore?.get(getAuthSessionCookieName())?.value ?? null;
}
