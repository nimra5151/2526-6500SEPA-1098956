import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from"react";
import { useLocation } from"wouter";
import type { User } from"@shared/schema";
import type { signupSchema } from"@shared/schema";
import type { z } from"zod";
import { queryClient } from"@/lib/queryClient";

interface AuthError extends Error {
  code?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: z.infer<typeof signupSchema>) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // #64: decode JWT payload without a library; returns exp in seconds (0 if invalid)
  const getTokenExpiry = (t: string): number => {
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      return typeof payload.exp === "number" ? payload.exp : 0;
    } catch {
      return 0;
    }
  };

  const fetchUser = useCallback(async () => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    // #64: reject expired tokens immediately without hitting the server
    const exp = getTokenExpiry(storedToken);
    if (exp > 0 && Date.now() / 1000 > exp) {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setToken(storedToken);
      } else {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method:"POST",
      headers: {"Content-Type":"application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      const error: AuthError = new Error(err.message || "Login failed");
      error.code = err.code;
      throw error;
    }
    const data = await res.json();
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    // Navigation is handled by the caller (login page useEffect) after state commits
  };

  const signup = async (formData: z.infer<typeof signupSchema>) => {
    const res = await fetch("/api/auth/signup", {
      method:"POST",
      headers: {"Content-Type":"application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ||"Signup failed");
    }
    // No token returned — user must verify email before logging in
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    queryClient.clear();
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
