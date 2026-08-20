"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  staffCode: string | null;
  roleSlug: string;
  roleName: string;
  teamName: string | null;
  designation: string | null;
  permissions: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  hasPerm: (perm: string) => boolean;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.user) {
          setUser(data.data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (identifier: string, pass: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password: pass }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshUser();
        return { success: true };
      }
      return { success: false, message: data.message || "Invalid credentials" };
    } catch (err: any) {
      return { success: false, message: err.message || "Network error" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const hasPerm = (perm: string) => {
    if (!user) return false;
    if (user.roleSlug === "ADMIN") return true;
    return user.permissions?.includes(perm) || false;
  };

  const isAdmin = user?.roleSlug === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        hasPerm,
        isAdmin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
