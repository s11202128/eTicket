const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function getPasswordError(password: string): string | null {
  if (!password) return "Enter your password.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}
