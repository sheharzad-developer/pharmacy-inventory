"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  name: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: string; // keep as string for inputs
  price: string; // keep as string for inputs
};

export default function AddMedicinePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    batchNumber: "",
    expiryDate: "",
    quantity: "",
    price: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    setError(null);

    try {
      const quantity = Number.parseInt(form.quantity, 10);
      const price = Number.parseFloat(form.price);
      if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Quantity must be 0 or more.");
      if (!Number.isFinite(price) || price < 0) throw new Error("Price must be 0 or more.");

      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          batchNumber: form.batchNumber,
          expiryDate: form.expiryDate,
          quantity,
          price,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to add medicine.");

      setSuccess("Medicine added successfully.");
      setForm({
        name: "",
        batchNumber: "",
        expiryDate: "",
        quantity: "",
        price: "",
      });
      router.push("/inventory");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="pageTitle">Add Medicine</h1>
      <p className="muted">Fill in the details and submit to add it to inventory.</p>

      <div style={{ height: 12 }} />

      <form className="card" onSubmit={onSubmit}>
        <div className="grid2">
          <div className="field">
            <label htmlFor="name">Medicine Name</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g. Paracetamol"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="batchNumber">Batch Number</label>
            <input
              id="batchNumber"
              value={form.batchNumber}
              onChange={(e) => updateField("batchNumber", e.target.value)}
              placeholder="e.g. BATCH-2026-001"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="expiryDate">Expiry Date</label>
            <input
              id="expiryDate"
              type="date"
              value={form.expiryDate}
              onChange={(e) => updateField("expiryDate", e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="quantity">Quantity</label>
            <input
              id="quantity"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={form.quantity}
              onChange={(e) => updateField("quantity", e.target.value)}
              placeholder="e.g. 50"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="price">Price</label>
            <input
              id="price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => updateField("price", e.target.value)}
              placeholder="e.g. 3.99"
              required
            />
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div className="row">
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Add Medicine"}
          </button>
          <a className="btn btnSecondary" href="/inventory">
            Go to Inventory
          </a>
        </div>

        {(success || error) && <div style={{ height: 12 }} />}

        {success ? (
          <div className="card" style={{ background: "var(--surface)" }}>
            <div style={{ fontWeight: 600 }}>Success</div>
            <div className="muted">{success}</div>
          </div>
        ) : null}

        {error ? (
          <div className="card" style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#7f1d1d" }}>
            <div style={{ fontWeight: 600 }}>Error</div>
            <div>{error}</div>
          </div>
        ) : null}
      </form>
    </div>
  );
}

