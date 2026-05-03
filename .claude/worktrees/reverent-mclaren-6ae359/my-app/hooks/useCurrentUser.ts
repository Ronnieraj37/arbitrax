"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface UserData {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  walletAddress: string | null;
  subscription: {
    plan: "FREE" | "PRO" | "ENTERPRISE";
    status: string;
  } | null;
  _count: { bots: number; trades: number };
}

export function useCurrentUser() {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.id && !userData) {
      setLoading(true);
      fetch("/api/user/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.user) setUserData(data.user);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [session?.user?.id, userData]);

  return {
    user: session?.user ?? null,
    userData,
    subscription: userData?.subscription ?? null,
    plan: (userData?.subscription?.plan ?? "FREE") as
      | "FREE"
      | "PRO"
      | "ENTERPRISE",
    isLoading: status === "loading" || loading,
    isAuthenticated: status === "authenticated",
    refetch: () => {
      setUserData(null);
    },
  };
}
