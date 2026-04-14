export type LoginPasswordDebugInfo = {
  normalizedLogin: string;
  generatedHash: string | null;
  userFound: boolean;
  storedHash: string | null;
  passwordMatchesStoredHash: boolean;
  userIsActive: boolean | null;
  roleName: string | null;
  authDecision: "success" | "user-not-found" | "inactive-user" | "password-mismatch" | "debug-error";
  actionStage: string | null;
  debugError: string | null;
  notes: string[];
};

export type LoginActionState = {
  errorMessage: string | null;
  submittedEmail: string;
  debugInfo: LoginPasswordDebugInfo | null;
};

export const initialLoginActionState: LoginActionState = {
  errorMessage: null,
  submittedEmail: "",
  debugInfo: null,
};
