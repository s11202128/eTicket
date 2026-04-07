export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignupCredentials = {
  email: string;
  password: string;
};

export type AuthResult = {
  ok: boolean;
  errorMessage?: string;
};
