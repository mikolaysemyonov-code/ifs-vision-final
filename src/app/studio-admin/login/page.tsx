"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudioAdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error === "Invalid password" ? "Неверный пароль" : "Ошибка входа");
          setLoading(false);
          return;
        }
        setPassword("");
        router.replace("/studio-admin");
        router.refresh();
      } catch {
        setError("Ошибка сети");
        setLoading(false);
      }
    },
    [router, password]
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="mb-2 text-center font-sans text-lg font-semibold text-white">
          Панель управления
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-400">
          Введите пароль для входа
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit(e as unknown as React.FormEvent)}
            placeholder="Пароль"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
            autoFocus
            autoComplete="current-password"
            disabled={loading}
          />
          {error && (
            <p className="text-center text-sm text-rose-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 px-8 py-3 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 disabled:opacity-70"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
