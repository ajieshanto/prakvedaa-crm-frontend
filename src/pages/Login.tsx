// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("sales@crm.com");
  const [password, setPassword] = useState("abc123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email, password);
      nav("/", { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 380, margin: "80px auto" }}>
        <h2>Prakvedaa CRM — Login</h2>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="password" />
          <button disabled={loading}>{loading ? "…" : "Login"}</button>
          {err && <div style={{ color: "crimson" }}>{err}</div>}
          <small>Try sales@crm.com / doc@crm.com (abc123)</small>
        </form>
      </div>
    </div>
  );
}
