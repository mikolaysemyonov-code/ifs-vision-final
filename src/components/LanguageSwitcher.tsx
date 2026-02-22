"use client";

import { motion } from "framer-motion";
import { useStore, type Locale } from "@/store/useStore";

const OPTIONS: { key: Locale; label: string }[] = [
  { key: "ru", label: "RU" },
  { key: "en", label: "EN" },
];

export function LanguageSwitcher() {
  const locale = useStore((s) => s.locale);
  const setLocale = useStore((s) => s.setLocale);

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl"
      role="group"
      aria-label="Language"
    >
      <div className="relative flex rounded-[10px]">
        {OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setLocale(key)}
            className="relative z-10 flex flex-1 items-center justify-center rounded-lg py-2 px-3 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 min-w-0"
          >
            {locale === key && (
              <motion.div
                layoutId="localeTab"
                className="absolute inset-0 rounded-lg bg-white/15"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span
              className={
                locale === key
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
