"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ChartRowWithDeposit } from "@/lib/engine/financialEngine";
import { t, yearsWord, monthWord } from "@/lib/translations";
import type { Locale } from "@/lib/translations";
import { MessageSquare } from "lucide-react";

export interface ExpertVerdictProps {
  chartData: ChartRowWithDeposit[];
  termYears: number;
  locale: Locale;
}

/**
 * Текстовое резюме на основе итоговых данных графика:
 * точка окупаемости (лет), преимущество ипотеки над вкладом (%).
 */
export function ExpertVerdict({ chartData, termYears, locale }: ExpertVerdictProps) {
  const { breakEvenYears, advantagePercent, hasBreakEven, hasAdvantage } = useMemo(() => {
    const horizonMonths = Math.min(termYears * 12, 120);
    const data = chartData.filter((r) => r.month <= horizonMonths);
    if (!data.length) {
      return {
        breakEvenYears: null as number | null,
        advantagePercent: null as number | null,
        hasBreakEven: false,
        hasAdvantage: false,
      };
    }
    const breakEvenRow = data.find((r) => r.isBreakEven);
    const breakEvenYears =
      breakEvenRow != null ? breakEvenRow.month / 12 : null;
    const last = data[data.length - 1];
    const deposit = last.depositAccumulation;
    const netEquity = last.netEquity;
    let advantagePercent: number | null = null;
    let hasAdvantage = false;
    if (deposit > 0 && Number.isFinite(netEquity)) {
      const raw = ((netEquity - deposit) / deposit) * 100;
      advantagePercent = Number.isFinite(raw) ? Math.round(raw * 10) / 10 : null;
      hasAdvantage = advantagePercent != null && advantagePercent > 0;
    }
    return {
      breakEvenYears,
      advantagePercent,
      hasBreakEven: breakEvenRow != null,
      hasAdvantage,
    };
  }, [chartData, termYears]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-white/10 p-6 backdrop-blur-xl"
      style={{
        background:
          "linear-gradient(135deg, rgba(100,200,150,0.06) 0%, rgba(120,180,255,0.04) 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 40px -12px rgba(100,200,150,0.15)",
      }}
    >
      <div className="flex flex-shrink-0 items-center gap-2">
        <MessageSquare className="h-5 w-5 flex-shrink-0 text-emerald-400/90" aria-hidden />
        <h3 className="mb-0 font-sans text-sm font-medium uppercase tracking-[-0.02em] text-zinc-400 leading-tight">
          {t("expertVerdictTitle", locale)}
        </h3>
      </div>
      <ul className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-300">
        <li className="flex flex-wrap items-baseline gap-2">
          <span className="text-zinc-500">
            {t("expertBreakEvenIn", locale)}:
          </span>
          <span className="font-medium text-white">
            {hasBreakEven && breakEvenYears != null ? (
              breakEvenYears < 1
                ? ` ${Math.round(breakEvenYears * 12)} ${monthWord(Math.round(breakEvenYears * 12), locale)}`
                : ` ${breakEvenYears.toFixed(1)} ${yearsWord(Math.floor(breakEvenYears), locale)}`
            ) : (
              <span className="text-amber-400/90">
                {t("expertNoBreakEven", locale)}.
              </span>
            )}
          </span>
        </li>
        <li className="flex flex-wrap items-baseline gap-2">
          <span className="text-zinc-500">
            {t("expertAdvantageOverDeposit", locale)}:
          </span>
          <span className="font-medium text-white">
            {advantagePercent != null && hasAdvantage ? (
              <span className="text-emerald-400 tabular-nums">
                +{advantagePercent}%
              </span>
            ) : advantagePercent != null && advantagePercent <= 0 ? (
              <span className="text-amber-400/90 tabular-nums">
                {advantagePercent}%
              </span>
            ) : (
              <span className="text-amber-400/90">
                {t("expertNoAdvantage", locale)}.
              </span>
            )}
          </span>
        </li>
      </ul>
    </motion.div>
  );
}
