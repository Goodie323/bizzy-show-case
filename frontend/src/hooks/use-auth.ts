"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const t = localStorage.getItem("bizzy_token");
    setToken(t);
    setLoading(false);

    const publicPaths = ["/login"];
    if (!t && !publicPaths.includes(pathname)) {
      router.push("/login");
    }
  }, [pathname, router]);

  const login = (newToken: string) => {
    localStorage.setItem("bizzy_token", newToken);
    setToken(newToken);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("bizzy_token");
    setToken(null);
    router.push("/login");
  };

  return { token, loading, login, logout, isAuthenticated: !!token };
}
