export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResult = {
  ok: boolean;
  errorMessage?: string;
};
