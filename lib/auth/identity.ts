const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LOGIN_LENGTH = 120;

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmailAddress(value: string) {
  const normalized = normalizeEmailAddress(value);

  return (
    normalized.length > 0 &&
    normalized.length <= MAX_LOGIN_LENGTH &&
    SIMPLE_EMAIL_PATTERN.test(normalized)
  );
}
