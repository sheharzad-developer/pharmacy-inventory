"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type MeResponse = {
  user:
    | {
        id: string;
        email: string;
        name?: string;
        role?: "staff" | "admin" | "pharmacist";
      }
    | null;
};

export function AuthNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await res.json()) as MeResponse;
        if (!cancelled) setMe(data.user ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    // Re-check auth on navigation changes
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <a className="navLink" href="/login" aria-disabled="true">
        …
      </a>
    );
  }

  if (!me) {
    return (
      <a className="navLink" href="/login">
        Login
      </a>
    );
  }

  return (
    <div className="row">
      <span className="muted" style={{ fontSize: 14 }}>
        Hi, <strong>{me.name || "Staff"}</strong>
      </span>
      <button className="navLink" type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

