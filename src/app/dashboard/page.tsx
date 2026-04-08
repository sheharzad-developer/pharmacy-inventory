"use client";

import { useEffect, useState } from "react";

type Medicine = {
  id: string;
  name: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  price: number;
  createdAt: string;
};

function daysUntil(dateString: string, nowMs: number): number | null {
  const d = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((d.getTime() - nowMs) / msPerDay);
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Medicine[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [insightsSource, setInsightsSource] = useState<"local" | "gemini" | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/medicines", { cache: "no-store" });
        const data = (await res.json()) as { items?: Medicine[]; error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to load inventory.");
        if (!cancelled) setItems(data.items ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalQuantity = items.reduce((sum, m) => sum + (Number.isFinite(m.quantity) ? m.quantity : 0), 0);
  const totalValue = items.reduce(
    (sum, m) => sum + (Number.isFinite(m.quantity) ? m.quantity : 0) * (Number.isFinite(m.price) ? m.price : 0),
    0,
  );

  const lowStockCount = items.filter((m) => m.quantity < 10).length;
  const expiringSoonCount = items.filter((m) => {
    if (nowMs === null) return false;
    const until = daysUntil(m.expiryDate, nowMs);
    return until !== null && until >= 0 && until < 30;
  }).length;

  async function generateInsights() {
    setInsightsLoading(true);
    setInsightsError(null);
    setSuggestions(null);
    setInsightsSource(null);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { suggestions?: string[]; source?: "local" | "gemini"; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to generate insights.");
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : ["No suggestions returned."]);
      setInsightsSource(data.source ?? null);
    } catch (e) {
      setInsightsError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setInsightsLoading(false);
    }
  }

  return (
    <div>
      <h1 className="pageTitle">Dashboard</h1>
      <p className="muted">Quick overview of your current inventory.</p>

      <div style={{ height: 12 }} />

      {error ? (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Couldn’t load inventory</div>
          <div className="muted">{error}</div>
        </div>
      ) : (
        <div>
          <div className="grid2">
            <div className="card">
              <div className="muted">Total medicines</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{loading ? "…" : items.length}</div>
            </div>
            <div className="card">
              <div className="muted">Total quantity</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{loading ? "…" : totalQuantity}</div>
            </div>
            <div className="card">
              <div className="muted">Estimated stock value</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{loading ? "…" : `$${totalValue.toFixed(2)}`}</div>
            </div>
            <div className="card">
              <div className="muted">⚠ Low stock (qty &lt; 10)</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{loading ? "…" : lowStockCount}</div>
            </div>
            <div className="card">
              <div className="muted">⚠ Expiring soon (&lt; 30 days)</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{loading ? "…" : expiringSoonCount}</div>
            </div>
            <div className="card">
              <div className="muted">Shortcuts</div>
              <div style={{ height: 8 }} />
              <div className="row">
                <a className="btn" href="/add-medicine">
                  Add Medicine
                </a>
                <a className="btn btnSecondary" href="/inventory">
                  View Inventory
                </a>
              </div>
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700 }}>AI Insights</div>
                <div className="muted">Generate low stock warnings, expiry warnings, and suggestions.</div>
              </div>
              <button className="btn" type="button" onClick={generateInsights} disabled={loading || insightsLoading}>
                {insightsLoading ? "Generating..." : "Generate Insights"}
              </button>
            </div>

            {insightsError || suggestions ? <div style={{ height: 12 }} /> : null}

            {insightsError ? (
              <div className="card" style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#7f1d1d" }}>
                <div style={{ fontWeight: 600 }}>Error</div>
                <div>{insightsError}</div>
              </div>
            ) : null}

            {suggestions ? (
              <div className="card" style={{ background: "var(--surface)", margin: 0 }}>
                <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                  Source: {insightsSource ?? "unknown"}
                </div>
                <ul style={{ paddingLeft: 18 }}>
                  {suggestions.map((s, idx) => (
                    <li key={`${idx}-${s}`}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

