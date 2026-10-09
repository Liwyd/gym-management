"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, isUnauthorized } from "@/lib/api";
import type { CurrentUser, Role } from "@/lib/types";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (capability: Capability) => boolean;
}

export type Capability =
  | "members:list"
  | "members:write"
  | "plans:write"
  | "memberships:manage"
  | "memberships:refund"
  | "classes:write"
  | "sessions:write"
  | "attendance:manage"
  | "payments:write"
  | "payments:refund"
  | "facilities:write"
  | "users:manage"
  | "trainers:list"
  | "trainers:edit";

const CAPABILITIES: Record<Capability, Role[]> = {
  "members:list": ["ADMIN", "MANAGER", "RECEPTIONIST"],
  "members:write": ["ADMIN", "MANAGER", "RECEPTIONIST"],
  "plans:write": ["ADMIN"],
  "memberships:manage": ["ADMIN", "MANAGER", "RECEPTIONIST", "MEMBER"],
  "memberships:refund": ["ADMIN", "MANAGER"],
  "classes:write": ["ADMIN", "MANAGER"],
  "sessions:write": ["ADMIN", "MANAGER", "TRAINER"],
  "attendance:manage": ["ADMIN", "MANAGER", "TRAINER"],
  "payments:write": ["ADMIN", "MANAGER", "RECEPTIONIST"],
  "payments:refund": ["ADMIN", "MANAGER"],
  "facilities:write": ["ADMIN"],
  "users:manage": ["ADMIN"],
  "trainers:list": ["ADMIN", "MANAGER", "RECEPTIONIST"],
  "trainers:edit": ["ADMIN", "MANAGER", "RECEPTIONIST", "TRAINER"],
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<CurrentUser>("/auth/me");
      setUser(me);
    } catch (err) {
      if (isUnauthorized(err) || (err as { status?: number }).status === 401) {
        setUser(null);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: CurrentUser }>("/auth/login", {
      email,
      password,
    });
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const can = useCallback(
    (capability: Capability) => {
      if (!user) return false;
      return CAPABILITIES[capability]?.includes(user.role) ?? false;
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh, can }),
    [user, loading, login, logout, refresh, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Client-side route guard: redirects to /login when signed out. */
export function useRequireAuth(requirement?: (auth: AuthContextValue) => boolean) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) {
      router.replace("/login");
      return;
    }
    if (requirement && !requirement(auth)) {
      router.replace("/");
    }
  }, [auth, router, requirement]);

  return auth;
}
