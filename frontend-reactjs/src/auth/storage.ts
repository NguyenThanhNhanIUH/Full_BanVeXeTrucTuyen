const TOKEN_KEY = 'banvexe_admin_token';
const EMAIL_KEY = 'banvexe_admin_email';
const ROLE_KEY = 'banvexe_admin_role';
const NAME_KEY = 'banvexe_admin_name';
const PHONE_KEY = 'banvexe_admin_phone';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token: string, email: string, role: string, name?: string, phone?: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
  localStorage.setItem(ROLE_KEY, role);
  if (name) {
    localStorage.setItem(NAME_KEY, name);
  } else {
    localStorage.removeItem(NAME_KEY);
  }
  if (phone) {
    localStorage.setItem(PHONE_KEY, phone);
  } else {
    localStorage.removeItem(PHONE_KEY);
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(PHONE_KEY);
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function getStoredRole(): string | null {
  return localStorage.getItem(ROLE_KEY);
}

export function getStoredName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function getStoredPhone(): string | null {
  return localStorage.getItem(PHONE_KEY);
}
