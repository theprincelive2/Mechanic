"use client";

import { useState } from "react";

export default function PaystackButton({ invoiceId }: { invoiceId: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/paystack`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      window.location.href = data.authorization_url;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full bg-teal text-graphite text-sm font-semibold rounded py-2 disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Generate Paystack payment link"}
      </button>
      {error && <p className="text-rust text-xs mt-1">{error}</p>}
    </div>
  );
}
