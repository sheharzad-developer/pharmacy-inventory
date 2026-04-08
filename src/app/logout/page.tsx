"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        if (!cancelled) router.replace("/login");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="card">
      <div style={{ fontWeight: 700 }}>Logging out…</div>
      <div className="muted">You will be redirected shortly.</div>
    </div>
  );
}

