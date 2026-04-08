"use client";

import { useEffect, useMemo, useState } from "react";

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
  // dateString is expected as YYYY-MM-DD (from <input type="date">)
  const d = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((d.getTime() - nowMs) / msPerDay);
}

function getAlerts(m: Medicine, nowMs: number | null): string[] {
  const alerts: string[] = [];

  if (m.quantity < 10) alerts.push("⚠ Low Stock");

  if (nowMs !== null) {
    const until = daysUntil(m.expiryDate, nowMs);
    if (until !== null && until >= 0 && until < 30) alerts.push("⚠ Expiring Soon");
  }

  return alerts;
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Medicine[]>([]);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);
  const [sellSuccess, setSellSuccess] = useState<string | null>(null);
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
        if (!res.ok) throw new Error(data.error || "Failed to fetch medicines.");

        if (!cancelled) setItems(data.items ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function sell(id: string, amount: number) {
    setSellingId(id);
    setSellError(null);
    setSellSuccess(null);
    try {
      const res = await fetch("/api/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, amount }),
      });
      const data = (await res.json()) as { item?: Medicine; error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || "Failed to sell medicine.");
      if (!data.item) throw new Error("Server did not return updated item.");

      setItems((prev) => prev.map((m) => (m.id === id ? data.item! : m)));
      setSellSuccess(data.message || "Sale completed.");
    } catch (e) {
      setSellError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSellingId(null);
    }
  }

  function promptAndSell(m: Medicine) {
    if (m.quantity <= 0) return;

    setSellError(null);
    setSellSuccess(null);

    const raw = window.prompt(`Sell how many units of "${m.name}"? (Available: ${m.quantity})`, "1");
    if (raw === null) return;

    const amount = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      setSellError("Sell quantity must be a whole number (1 or more).");
      return;
    }
    if (amount > m.quantity) {
      setSellError(`Not enough stock. Available: ${m.quantity}.`);
      return;
    }

    void sell(m.id, amount);
  }

  const totalItems = items.length;
  const totalQuantity = useMemo(() => items.reduce((sum, m) => sum + (Number.isFinite(m.quantity) ? m.quantity : 0), 0), [
    items,
  ]);

  return (
    <div>
      <h1 className="pageTitle">Inventory</h1>
      <p className="muted">All medicines currently stored in the system.</p>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="muted">
            {loading ? "Loading…" : `Medicines: ${totalItems} • Total quantity: ${totalQuantity}`}
          </div>
          <a className="btn btnSecondary" href="/add-medicine">
            Add Medicine
          </a>
        </div>

        <div style={{ height: 12 }} />

        {error ? (
          <div className="card" style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#7f1d1d" }}>
            <div style={{ fontWeight: 600 }}>Error</div>
            <div>{error}</div>
          </div>
        ) : loading ? (
          <div className="muted">Fetching medicines…</div>
        ) : items.length === 0 ? (
          <div className="muted">No medicines yet. Add your first one.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {sellSuccess ? (
              <div
                className="card"
                style={{ borderColor: "#86efac", background: "#f0fdf4", color: "#14532d", marginBottom: 12 }}
              >
                <div style={{ fontWeight: 600 }}>Success</div>
                <div>{sellSuccess}</div>
              </div>
            ) : null}

            {sellError ? (
              <div
                className="card"
                style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#7f1d1d", marginBottom: 12 }}
              >
                <div style={{ fontWeight: 600 }}>Sell failed</div>
                <div>{sellError}</div>
              </div>
            ) : null}
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Batch Number</th>
                  <th>Expiry Date</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Alerts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => {
                  const alerts = getAlerts(m, nowMs);
                  return (
                    <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.batchNumber}</td>
                    <td>{m.expiryDate}</td>
                    <td>{m.quantity}</td>
                    <td>${m.price.toFixed(2)}</td>
                    <td>
                      {alerts.length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        <div className="row">
                          {alerts.map((a) => (
                            <span
                              key={a}
                              style={{
                                padding: "4px 8px",
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                background: "var(--surface)",
                                fontSize: 12,
                              }}
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btnSecondary"
                        type="button"
                        onClick={() => promptAndSell(m)}
                        disabled={m.quantity <= 0 || sellingId === m.id}
                        aria-disabled={m.quantity <= 0 || sellingId === m.id}
                      >
                        {m.quantity <= 0 ? "Out of stock" : sellingId === m.id ? "Selling..." : "Sell"}
                      </button>
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

