"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="bg-amber text-graphite p-2 rounded-md">
            <Wrench size={22} />
          </div>
          <div>
            <p className="font-display font-bold text-lg leading-none">East Legon Auto Care</p>
            <p className="text-xs text-paper/50 font-mono tracking-wide">SHOP MANAGER</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="ticket rounded-lg pl-6 pr-6 py-8 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-paper/60 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-graphite border border-graphite-line rounded px-3 py-2 outline-none focus:border-amber"
              placeholder="owner@eastlegonauto.com"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-paper/60 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-graphite border border-graphite-line rounded px-3 py-2 outline-none focus:border-amber"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-rust text-sm">{error}</p>}
          <button
            disabled={loading}
            className="w-full bg-amber text-graphite font-semibold rounded py-2 hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-xs text-paper/40 text-center pt-2">
            Demo: owner@eastlegonauto.com / changeme123
          </p>
        </form>
      </div>
    </main>
  );
}
