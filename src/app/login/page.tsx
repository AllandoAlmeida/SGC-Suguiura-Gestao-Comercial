"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("E-mail ou senha invalidos.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  function quickFill(e: string) {
    setEmail(e);
    setPassword("123456");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-brand-700 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">SGC</h1>
          <p className="text-sm text-slate-500">Suguiura Gestao Comercial</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="********"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 border-t pt-4">
          <p className="text-xs text-slate-400 mb-2 text-center">Acesso rapido (demo - senha 123456):</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={() => quickFill("admin@sgc.com")} className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">admin</button>
            <button onClick={() => quickFill("sdr@sgc.com")} className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">sdr</button>
            <button onClick={() => quickFill("closer@sgc.com")} className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">closer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
