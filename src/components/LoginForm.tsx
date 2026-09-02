"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Не удалось войти");
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={submit} className="panel rise w-full max-w-sm px-7 py-8">
        <div className="mb-1 font-display text-[22px] font-extrabold leading-none tracking-[.07em] bg-[linear-gradient(96deg,#fff_8%,var(--amber-hi)_58%,var(--amber)_100%)] bg-clip-text text-transparent">
          MITJA<span className="text-[var(--amber)] [-webkit-text-fill-color:var(--amber)]">.</span>
        </div>
        <div className="cap mb-7 text-[8.5px] tracking-[.28em]">outreach control</div>

        <label className="mb-4 block">
          <span className="cap mb-1.5 block">Логин</span>
          <input
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            autoFocus
            className="ctl w-full"
          />
        </label>

        <label className="mb-6 block">
          <span className="cap mb-1.5 block">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="ctl w-full"
          />
        </label>

        {error ? (
          <div className="mb-4 rounded-[3px] border border-[rgba(224,96,63,.35)] bg-[rgba(224,96,63,.1)] px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-[var(--red)]">
            {error}
          </div>
        ) : null}

        <button type="submit" disabled={busy} className="btn btn-primary w-full justify-center disabled:opacity-60">
          {busy ? "проверяем…" : "войти"}
        </button>
      </form>
    </div>
  );
}
