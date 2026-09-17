export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignupCredentials = {
  fullName: string;
  email: string;
  password: string;
};

export type AuthResult = {
  ok: boolean;
  errorMessage?: string;
};

export type SignupResult = AuthResult & {
  requiresEmailVerification?: boolean;
};
