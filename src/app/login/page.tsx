"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const raw = await res.text();
      let data: { error?: string } = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as { error?: string };
        } catch {
          throw new Error("Server error: invalid response. Check Vercel logs and DATABASE_URL.");
        }
      } else if (!res.ok) {
        throw new Error(`Request failed (${res.status}). Check deployment logs.`);
      }
      if (!res.ok) throw new Error(data.error || "Login failed.");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="pageTitle">Login</h1>
      <p className="muted">Staff/Admin login.</p>

      <div style={{ height: 12 }} />

      <form className="card" onSubmit={onSubmit}>
        <div className="grid2">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
            />
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div className="row">
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </button>
          <a className="btn btnSecondary" href="/signup">
            Create account
          </a>
        </div>

        {error ? (
          <>
            <div style={{ height: 12 }} />
            <div className="card" style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#7f1d1d" }}>
              <div style={{ fontWeight: 600 }}>Error</div>
              <div>{error}</div>
            </div>
          </>
        ) : null}
      </form>
    </div>
  );
}

