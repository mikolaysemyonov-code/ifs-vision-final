"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertCircle, BarChart3, TrendingUp } from "lucide-react";
import {
  generateComparisonVerdict,
  generateExpertConclusion,
  getExpertConclusionMessage,
  getFinancialVerdict,
  type ExpertConclusion,
} from "@/services/finance";
import type { ChartRowWithDeposit } from "@/lib/engine/financialEngine";
import type { CalculatedData } from "@/store/useCalculatedData";

export interface ExpertVerdictProps {
  data: CalculatedData;
  /** Форматирование сумм (рубли). */
  formatCurrency: (value: number, opts?: { maximumFractionDigits?: number }) => string;
  locale?: "ru" | "en";
  /** Режим сравнения двух ЖК: при true показывается блок "Анализ эффективности". */
  comparisonMode?: boolean;
  /** Данные графика объекта Б (при comparisonMode). */
  chartDataB?: ChartRowWithDeposit[] | null;
  /** ROI объекта Б, % (при comparisonMode). */
  roiBPercent?: number;
}

function formatMillionsRub(value: number): string {
  const millions = value / 1_000_000;
  if (Math.abs(millions) < 0.01) return "0 млн ₽";
  return `${millions >= 0 ? "" : "−"}${Math.abs(millions).toFixed(2)} млн ₽`;
}

function StatusBar({
  label,
  value,
  max,
  colorClass,
}: {
  label: string;
  value: number;
  max: number;
  colorClass: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between font-mono text-[11px] text-zinc-500">
        <span>{label}</span>
        <span className="tabular-nums text-zinc-400">{value.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className={`h-full rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function getVerdictStatus(crossOverYear: number | null, locale: "ru" | "en"): string | null {
  if (crossOverYear == null) return null;
  if (crossOverYear > 15) return locale === "ru" ? "Рискованная стратегия" : "Risky strategy";
  if (crossOverYear < 10) return locale === "ru" ? "Высокая эффективность" : "High efficiency";
  return locale === "ru" ? "Умеренная эффективность" : "Moderate efficiency";
}

const JK_ALPHA = "ЖК Альфа";
const JK_BETA = "ЖК Бета";

export function ExpertVerdict({
  data,
  formatCurrency,
  locale = "ru",
  comparisonMode = false,
  chartDataB = null,
  roiBPercent = 0,
}: ExpertVerdictProps) {
  const conclusion = useMemo(
    () => generateExpertConclusion({ chartDataWithDeposit: data.chartDataWithDeposit }),
    [data.chartDataWithDeposit]
  );

  const verdict = useMemo(
    () => getFinancialVerdict(data),
    [data]
  );

  const comparisonVerdict = useMemo(() => {
    if (!comparisonMode || !chartDataB?.length) return null;
    return generateComparisonVerdict({
      chartDataWithDeposit: data.chartDataWithDeposit,
      chartDataWithDepositB: chartDataB,
      roiAPercent: data.roi.roiPercent,
      roiBPercent,
    });
  }, [comparisonMode, chartDataB, data.chartDataWithDeposit, data.roi.roiPercent, roiBPercent]);

  const crossOverYear =
    verdict.crossOverMonth != null ? Math.floor(verdict.crossOverMonth / 12) : null;
  const statusLabel = getVerdictStatus(crossOverYear, locale);

  const { finalNetEquity, finalDeposit } = conclusion;
  const totalMax = Math.max(finalNetEquity, finalDeposit, 1);
  const mortgagePct = (finalNetEquity / totalMax) * 100;
  const depositPct = (finalDeposit / totalMax) * 100;

  const yieldPeakYear =
    conclusion.yieldPeakMonth != null
      ? Math.floor(conclusion.yieldPeakMonth / 12) +
        (conclusion.yieldPeakMonth % 12 > 0 ? 1 : 0)
      : null;

  const mainVerdictText =
    crossOverYear != null
      ? locale === "ru"
        ? `Недвижимость становится выгоднее вклада на ${crossOverYear} году. Итоговое преимущество капитала: ${verdict.finalAdvantage.toFixed(2)} млн ₽.`
        : `Property becomes more profitable than deposit in year ${crossOverYear}. Final capital advantage: ${verdict.finalAdvantage.toFixed(2)} m ₽.`
      : locale === "ru"
        ? "На выбранном горизонте недвижимость не обгоняет вклад."
        : "Property does not overtake deposit within the selected horizon.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900/50 font-mono"
      style={{
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px -8px rgba(0,0,0,0.6)",
      }}
    >
      <div className="border-b border-zinc-700/80 bg-zinc-900/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-amber-400/90" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {locale === "ru" ? "Аналитика" : "Analytics"}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {comparisonVerdict != null && (
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4 font-mono">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400/90">
                {locale === "ru" ? "Анализ эффективности" : "Efficiency analysis"}
              </span>
            </div>
            <p className="mb-2 text-[13px] leading-relaxed text-zinc-300 tabular-nums">
              {comparisonVerdict.leader === "A"
                ? locale === "ru"
                  ? `${JK_ALPHA} эффективнее ${JK_BETA} на ${Math.abs(comparisonVerdict.roiDiffPercent).toFixed(1)}%. Суммарная разница в капитале: ${comparisonVerdict.capitalDiffMillions.toFixed(2)} млн ₽.`
                  : `${JK_ALPHA} outperforms ${JK_BETA} by ${Math.abs(comparisonVerdict.roiDiffPercent).toFixed(1)}%. Total capital difference: ${comparisonVerdict.capitalDiffMillions.toFixed(2)} m ₽.`
                : locale === "ru"
                  ? `${JK_BETA} эффективнее ${JK_ALPHA} на ${Math.abs(comparisonVerdict.roiDiffPercent).toFixed(1)}%. Суммарная разница в капитале: ${comparisonVerdict.capitalDiffMillions.toFixed(2)} млн ₽.`
                  : `${JK_BETA} outperforms ${JK_ALPHA} by ${Math.abs(comparisonVerdict.roiDiffPercent).toFixed(1)}%. Total capital difference: ${comparisonVerdict.capitalDiffMillions.toFixed(2)} m ₽.`}
            </p>
            <p className="flex items-center gap-2 text-[12px] text-emerald-400/90">
              <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
              <span className="font-mono tabular-nums">
                {locale === "ru"
                  ? `Оптимальный выбор для долгосрочного инвестирования — ${comparisonVerdict.leader === "A" ? JK_ALPHA : JK_BETA}.`
                  : `Optimal choice for long-term investment — ${comparisonVerdict.leader === "A" ? JK_ALPHA : JK_BETA}.`}
              </span>
            </p>
            {comparisonVerdict.crossoverPointYear != null && (
              <p className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                <span className="font-mono">
                  {locale === "ru"
                    ? `Точка обгона вклада (лидер): ${comparisonVerdict.crossoverPointYear} ${locale === "ru" ? "год" : "y"}.`
                    : `Deposit crossover (leader): year ${comparisonVerdict.crossoverPointYear}.`}
                </span>
              </p>
            )}
          </div>
        )}
        <p className="text-[13px] leading-relaxed text-zinc-300 tabular-nums">
          {mainVerdictText}
        </p>
        {statusLabel != null && (
          <p
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              crossOverYear != null && crossOverYear > 15
                ? "text-amber-400/90"
                : crossOverYear != null && crossOverYear < 10
                  ? "text-emerald-400/90"
                  : "text-zinc-400"
            }`}
          >
            {statusLabel}
          </p>
        )}
        <p className="text-[12px] leading-relaxed text-zinc-500">
          {getExpertConclusionMessage(conclusion, locale)}
        </p>
        {conclusion.inflationWarning != null && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 font-mono">
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              {conclusion.inflationWarning}
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/50 p-3">
            <p className="mb-3 text-[10px] uppercase tracking-wider text-zinc-500">
              {locale === "ru" ? "Итог 20 лет" : "20Y outcome"}
            </p>
            <StatusBar
              label={locale === "ru" ? "Недвижимость" : "Property"}
              value={mortgagePct}
              max={100}
              colorClass="bg-emerald-500/80"
            />
            <StatusBar
              label={locale === "ru" ? "Вклад" : "Deposit"}
              value={depositPct}
              max={100}
              colorClass="bg-amber-500/70"
            />
          </div>
          <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/50 p-3">
            <p className="mb-3 text-[10px] uppercase tracking-wider text-zinc-500">
              {locale === "ru" ? "Метрики" : "Metrics"}
            </p>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between text-zinc-500">
                <span>{locale === "ru" ? "Кроссовер" : "Crossover"}</span>
                <span className="tabular-nums text-zinc-300">
                  {conclusion.crossoverPointYear != null
                    ? `${conclusion.crossoverPointYear} ${locale === "ru" ? "год" : "y"}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>{locale === "ru" ? "Пик вклада (мес.)" : "Deposit peak (mo)"}</span>
                <span className="tabular-nums text-zinc-300">
                  {conclusion.yieldPeakMonth ?? "—"}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>{locale === "ru" ? "Вклад впереди (мес.)" : "Deposit ahead (mo)"}</span>
                <span className="tabular-nums text-zinc-300">
                  {verdict.peakDepositPeriod}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>{locale === "ru" ? "Выигрыш" : "Advantage"}</span>
                <span
                  className={`tabular-nums ${
                    conclusion.finalAdvantageRub >= 0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {formatMillionsRub(conclusion.finalAdvantageRub)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {yieldPeakYear != null && conclusion.yieldPeakGapRub > 0 && (
          <p className="text-[11px] text-zinc-500">
            {locale === "ru"
              ? `Максимальное опережение вклада в фазе высокой ставки ЦБ: ${formatCurrency(conclusion.yieldPeakGapRub)} (${yieldPeakYear} год).`
              : `Max deposit lead in high-rate phase: ${formatCurrency(conclusion.yieldPeakGapRub)} (year ${yieldPeakYear}).`}
          </p>
        )}
      </div>
    </motion.div>
  );
}
