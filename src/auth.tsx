// src/auth.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import api, { setAuth } from "./lib/api";

type Role = "sales" | "doctor";
type User = { email: string; role: Role };

type AuthCtx = {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => setAuth(token), [token]);

  async function login(email: string, password: string) {
    const { data } = await api.post("/login", { email, password });
    const bearer = data.authorization as string; // "Bearer <jwt>"
    setToken(bearer);
    setAuth(bearer);
    localStorage.setItem("token", bearer);

    // decode role/email from JWT payload
    const payload = JSON.parse(atob(bearer.split(".")[1]));
    const usr: User = { email: payload.sub, role: payload.role };
    setUser(usr);
    localStorage.setItem("user", JSON.stringify(usr));
  }

  function logout() {
  setToken(null);
  setUser(null);
  setAuth(null);
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  setTimeout(() => {
    window.location.replace("/"); // ✅ Force redirect to login
  }, 100);
}


  return <Ctx.Provider value={{ token, user, login, logout }}>{children}</Ctx.Provider>;
}
