import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { apiClient } from '../lib/api';
import { AuthSession, clearSession, readSession, writeSession } from './session';

interface LoginInput {
  email: string;
  password: string;
}

interface SignupInput {
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapToSession(session: { token: string; user: { id: string; email: string; name: string; isVerified: boolean } }): AuthSession {
  return {
    token: session.token,
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    isVerified: session.user.isVerified,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());

  const login = async (input: LoginInput) => {
    if (!input.email.trim()) {
      throw new Error('Email is required.');
    }

    if (!input.password || input.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const session = await apiClient.login({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });

    const nextSession = mapToSession(session);
    writeSession(nextSession);
    setSession(nextSession);
  };

  const signup = async (input: SignupInput) => {
    if (!input.name.trim()) {
      throw new Error('Name is required.');
    }

    if (!input.email.trim()) {
      throw new Error('Email is required.');
    }

    if (!input.password || input.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const session = await apiClient.signup({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });

    const nextSession = mapToSession(session);
    writeSession(nextSession);
    setSession(nextSession);
  };

  const logout = () => {
    clearSession();
    setSession(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.token),
      login,
      signup,
      logout,
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
