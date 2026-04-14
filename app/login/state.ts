export type LoginPasswordDebugInfo = {
  normalizedLogin: string;
  generatedHash: string | null;
  userFound: boolean;
  storedHash: string | null;
  passwordMatchesStoredHash: boolean;
  userIsActive: boolean | null;
  roleName: string | null;
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
