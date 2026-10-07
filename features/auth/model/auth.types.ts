export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignupCredentials = {
  email: string;
  password: string;
  fullName: string;
};

// Organizer details sent with signup; the database turns them into a pending
// application as soon as the account exists (see handle_new_user).
export type SignupOrganizerApplication = {
  organization_name: string;
  phone: string;
  city: string | null;
  website: string | null;
  event_types: string[];
  description: string | null;
};

export type AuthResult = {
  ok: boolean;
  errorMessage?: string;
};

export type SignupResult = AuthResult & {
  requiresEmailVerification?: boolean;
};
