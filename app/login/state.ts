export type LoginActionState = {
  errorMessage: string | null;
  submittedEmail: string;
};

export const initialLoginActionState: LoginActionState = {
  errorMessage: null,
  submittedEmail: "",
};
