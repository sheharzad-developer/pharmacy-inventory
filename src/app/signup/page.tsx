"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"staff" | "admin" | "pharmacist">("staff");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Signup failed.");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="pageTitle">Create Account</h1>
      <p className="muted">Register staff, pharmacist, or admin access.</p>

      <div style={{ height: 12 }} />

      <form className="card" onSubmit={onSubmit}>
        <div className="grid2">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Alex" />
          </div>
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
              placeholder="Minimum 8 characters"
            />
          </div>
          <div className="field">
            <label htmlFor="role">Role (optional)</label>
            <select
              id="role"
              value={role}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "admin" || v === "pharmacist" || v === "staff") setRole(v);
              }}
              style={{
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 14,
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              <option value="staff">staff</option>
              <option value="pharmacist">pharmacist</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div className="row">
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create account"}
          </button>
          <a className="btn btnSecondary" href="/login">
            Back to login
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

