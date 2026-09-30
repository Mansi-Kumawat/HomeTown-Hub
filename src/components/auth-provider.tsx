"use client";
// ============================================================================
// AUTH PROVIDER — keeps the logged-in user in memory and exposes
// useAuth() (user, login, register, logout) and useRequireAuth()
// (redirects visitors to /login).
//
// 👉 CONCEPT: a "protected route" is just a page that checks "is there a
//    user?" and bounces anonymous visitors to the login screen.
// ============================================================================

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, saveToken, clearToken, type User } from "@/lib/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;                    // true while we verify the stored token
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { name: string; email: string; password: string; hometown?: string; currentCity?: string }) => Promise<User>;
  logout: () => void;
  setUser: (user: User) => void;
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshNotifications = useCallback(async () => {
    if (!getToken()) { setUnreadCount(0); return; }
    try {
      const { data } = await api<{ unreadCount: number }>("/api/notifications");
      setUnreadCount(data.unreadCount);
    } catch { setUnreadCount(0); }
  }, []);

  // On first load: if we have a token, ask the server who it belongs to.
  useEffect(() => {
    (async () => {
      if (!getToken()) { setLoading(false); return; }
      try {
        const { data } = await api<{ user: User }>("/api/auth/me");
        setUserState(data.user);
      } catch {
        clearToken(); // token was invalid/expired — start fresh
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Keep the bell badge fresh whenever the user changes.
  useEffect(() => {
    if (user) refreshNotifications();
    else setUnreadCount(0);
  }, [user, refreshNotifications]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api<{ token: string; user: User }>("/api/auth/login", {
      method: "POST", body: { email, password },
    });
    saveToken(data.token);
    setUserState(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload: { name: string; email: string; password: string; hometown?: string; currentCity?: string }) => {
    const { data } = await api<{ token: string; user: User }>("/api/auth/register", {
      method: "POST", body: payload,
    });
    saveToken(data.token);
    setUserState(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUserState(null);
  }, []);

  const setUser = useCallback((next: User) => setUserState(next), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, unreadCount, refreshNotifications }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Open the context anywhere: const { user } = useAuth(); */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Protect a page: const user = useRequireAuth(); → null while loading,
 *  redirects anonymous visitors to /login automatically. */
export function useRequireAuth(): User | null {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);
  return user;
}
