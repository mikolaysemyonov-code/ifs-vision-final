"use client";

import { motion } from "framer-motion";
import { useStore, type Currency } from "@/store/useStore";

const OPTIONS: { key: Currency; label: string }[] = [
  { key: "RUB", label: "₽ RUB" },
  { key: "USD", label: "$ USD" },
  { key: "AED", label: "AED" },
  { key: "USDT", label: "USDT" },
];

export function CurrencySwitcher() {
  const currency = useStore((s) => s.currency);
  const setCurrency = useStore((s) => s.setCurrency);

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl"
      role="group"
      aria-label="Выбор валюты"
    >
      <div className="relative flex rounded-[10px]">
        {OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setCurrency(key)}
            className="relative z-10 flex flex-1 items-center justify-center rounded-lg py-2 px-3 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 min-w-0"
          >
            {currency === key && (
              <motion.div
                layoutId="currencyTab"
                className="absolute inset-0 rounded-lg bg-white/15"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
            <span
              className={
                currency === key
                  ? "relative text-white font-mono tabular-nums"
                  : "relative text-zinc-500 hover:text-zinc-300 font-mono tabular-nums"
              }
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
