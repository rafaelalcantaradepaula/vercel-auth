const AUTH_SESSION_COOKIE_NAME = "vercel-sample-app-auth-session";
const DEFAULT_AUTH_SESSION_TTL_HOURS = 12;
const MIN_AUTH_SESSION_SECRET_LENGTH = 32;
const AUTH_DEBUG_LOGIN_HASH=true;

export type AuthEnvironmentStatus = {
  cookieName: string;
  sessionTtlHours: number;
  sessionMaxAgeSeconds: number;
  secureCookies: boolean;
  hasSessionSecret: boolean;
  sessionSecretMinLengthSatisfied: boolean;
};

function parseSessionTtlHours(rawValue: string | undefined) {
  const parsed = Number.parseInt(rawValue?.trim() ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_AUTH_SESSION_TTL_HOURS;
  }

  return parsed;
}

function readRawSessionSecret() {
  return process.env.AUTH_SESSION_SECRET?.trim() ?? "";
}

export function getAuthSessionCookieName() {
  return AUTH_SESSION_COOKIE_NAME;
}

export function getAuthSessionTtlHours() {
  return parseSessionTtlHours(process.env.AUTH_SESSION_TTL_HOURS);
}

export function getAuthSessionMaxAgeSeconds() {
  return getAuthSessionTtlHours() * 60 * 60;
}

export function useSecureAuthCookies() {
  return process.env.NODE_ENV === "production";
}

export function shouldExposeLoginDebug() {
  return process.env.AUTH_DEBUG_LOGIN_HASH?.trim() === "true" || process.env.NODE_ENV !== "production";
}

export function getAuthEnvironmentStatus(): AuthEnvironmentStatus {
  const sessionSecret = readRawSessionSecret();

  return {
    cookieName: getAuthSessionCookieName(),
    sessionTtlHours: getAuthSessionTtlHours(),
    sessionMaxAgeSeconds: getAuthSessionMaxAgeSeconds(),
    secureCookies: useSecureAuthCookies(),
    hasSessionSecret: Boolean(sessionSecret),
    sessionSecretMinLengthSatisfied:
      sessionSecret.length >= MIN_AUTH_SESSION_SECRET_LENGTH,
  };
}

export function getAuthSessionSecret() {
  const sessionSecret = readRawSessionSecret();

  if (!sessionSecret) {
    throw new Error("AUTH_SESSION_SECRET is required.");
  }

  if (sessionSecret.length < MIN_AUTH_SESSION_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SESSION_SECRET must be at least ${MIN_AUTH_SESSION_SECRET_LENGTH} characters long.`,
    );
  }

  return sessionSecret;
}
