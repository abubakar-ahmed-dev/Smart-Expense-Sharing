export interface AuthSession {
  token: string;
  userId: string;
  email: string;
  name: string;
  isVerified: boolean;
}

const SESSION_KEY = 'smart-expense-sharing:session';

export function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.token || !parsed.userId || !parsed.email || !parsed.name || typeof parsed.isVerified !== 'boolean') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
