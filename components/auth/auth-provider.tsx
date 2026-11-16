"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  authSessionSchema,
  type AuthSession,
} from "@/lib/auth/client-session";

type AuthContextValue = {
  session: AuthSession | null;
  isLoading: boolean;
  establishSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRevision = useRef(0);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const establishSession = useCallback(
    (nextSession: AuthSession) => {
      sessionRevision.current += 1;
      clearRefreshTimer();
      setSession(nextSession);
      setIsLoading(false);
    },
    [clearRefreshTimer],
  );

  const refreshSession = useCallback(async (): Promise<AuthSession | null> => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        if (response.status !== 401) {
          throw new Error(`Session refresh failed with status ${response.status}.`);
        }
        return null;
      }

      const parsed = authSessionSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error("Session refresh returned an invalid response.");
      }
      return parsed.data;
    } catch (error) {
      console.error("Unable to refresh the authentication session.", error);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const revisionAtStart = sessionRevision.current;

    void refreshSession().then((restoredSession) => {
      if (!active || sessionRevision.current !== revisionAtStart) {
        return;
      }
      if (restoredSession) {
        establishSession(restoredSession);
      } else {
        setSession(null);
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, establishSession, refreshSession]);

  useEffect(() => {
    clearRefreshTimer();
    if (!session) {
      return;
    }

    const refreshDelay = Math.max(1000, session.expiresIn * 1000 - 60_000);
    refreshTimer.current = setTimeout(() => {
      void refreshSession().then((refreshedSession) => {
        if (refreshedSession) {
          establishSession(refreshedSession);
        } else {
          setSession(null);
        }
      });
    }, refreshDelay);

    return clearRefreshTimer;
  }, [clearRefreshTimer, establishSession, refreshSession, session]);

  const logout = useCallback(async () => {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("We couldn't sign you out. Please try again.");
    }

    sessionRevision.current += 1;
    clearRefreshTimer();
    setSession(null);
  }, [clearRefreshTimer]);

  const value = useMemo(
    () => ({ session, isLoading, establishSession, logout }),
    [session, isLoading, establishSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
