"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type FeatureFlags = {
  stopLoss: boolean;
  takeProfit: boolean;
  trailingStop: boolean;
  maxDailyTrades: boolean;
  slippageControl: boolean;
};

type User = {
  id: string;
  email?: string;
  plan: "free" | "pro" | "enterprise";
  features: FeatureFlags;
};

type UserContextValue = {
  user: User | null;
  signIn: (email: string) => void;
  signOut: () => void;
  updateFeatures: (next: Partial<FeatureFlags>) => void;
  setPlan: (plan: User["plan"]) => void;
};

const defaultFeatures: FeatureFlags = {
  stopLoss: false,
  takeProfit: false,
  trailingStop: false,
  maxDailyTrades: false,
  slippageControl: false,
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      const raw = localStorage.getItem("poly_user");
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) localStorage.setItem("poly_user", JSON.stringify(user));
      else localStorage.removeItem("poly_user");
    } catch {
      /* ignore */
    }
  }, [user]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      signIn: (email: string) => {
        const uid = `user_${Math.random().toString(36).slice(2, 8)}`;
        setUser({
          id: uid,
          email,
          plan: "free",
          features: { ...defaultFeatures },
        });
      },
      signOut: () => setUser(null),
      updateFeatures: (next) =>
        setUser((u) =>
          u ? { ...u, features: { ...u.features, ...next } } : u,
        ),
      setPlan: (plan) => setUser((u) => (u ? { ...u, plan } : u)),
    }),
    [user],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
