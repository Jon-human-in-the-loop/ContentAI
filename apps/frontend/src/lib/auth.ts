const TOKEN_KEY = 'contentai_token';
const USER_KEY = 'contentai_user';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthOrg {
  id: string;
  name: string;
  plan?: string;
}

export interface AuthSession {
  user: AuthUser;
  organization: AuthOrg;
  token: string;
}

export function saveSession(session: AuthSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify({ user: session.user, organization: session.organization }));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getSession(): { user: AuthUser; organization: AuthOrg } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
