"use client";

import { Suspense } from "react";
import { getAdminSettings } from "@/lib/admin-storage";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, LayoutGrid, Loader2, Percent, Receipt, Sparkles, TrendingUp, Wallet } from "lucide-react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceDot,
  ReferenceLine,
  Label,
} from "recharts";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { DigitalTwin } from "@/components/DigitalTwin";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { t as tUtil, yearsWord as yearsWordUtil, timesWord as timesWordUtil } from "@/lib/translations";
import type { ChartRowWithDeposit } from "@/lib/engine/financialEngine";
import { ExpertVerdict } from "@/components/ExpertVerdict";
import { ExpertVerdict as ExpertInsightsVerdict } from "@/components/analytics/ExpertVerdict";
import { ReportTemplate } from "@/components/ReportTemplate";
import {
  useWidgetLogic,
  formatTimestampFromEpoch,
  monthWordUtil,
  type ScenarioKey,
  type SmartInsightData,
} from "./useWidgetLogic";

const STRATEGY_COLORS: Record<ScenarioKey, string> = {
  investor: "#EAB308",
  family: "#007AFF",
  entry: "#10B981",
};

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline mb-4">
        <span className="text-sm font-medium text-zinc-400">{label}</span>
        <span className="text-lg font-semibold tabular-nums text-white">{format(value)}</span>
      </div>
      <div className="relative flex items-center">
        <div className="absolute h-[3px] w-full rounded-full bg-white/15" />
        <div className="absolute h-[3px] rounded-l-full bg-blue-600/50 transition-[width] duration-150" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 h-[3px] w-full appearance-none rounded-full bg-transparent [&::-webkit-slider-runnable-track]:h-0 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-blue-600/30 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-blue-500 [&::-moz-range-track]:h-0 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:shadow-blue-600/30 [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
    </div>
  );
}

function SmartInsights({ locale, insights }: { locale: "ru" | "en"; insights: SmartInsightData }) {
  const xTimesStr = (insights.ratioTimes >= 1 ? insights.ratioTimes : 1.1).toFixed(1);
  const timesWord = timesWordUtil(parseFloat(xTimesStr), locale);
  const yearsWord = yearsWordUtil(insights.horizonYears, locale);
  const paybackText =
    insights.paybackMonths != null
      ? `${tUtil("insightPaybackReached", locale)} ${insights.paybackMonths} ${monthWordUtil(insights.paybackMonths, locale)}.`
      : tUtil("insightPaybackNotReached", locale);
  const peakText =
    insights.peakMonth != null
      ? `${tUtil("insightOptimalExit", locale)} ${insights.peakMonth} ${monthWordUtil(insights.peakMonth, locale)} (пик ROI)`
      : "—";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-white/10 p-6 backdrop-blur-xl"
      style={{
        background: "linear-gradient(135deg, rgba(120,180,255,0.06) 0%, rgba(100,200,150,0.04) 100%)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 40px -12px rgba(120,180,255,0.2)",
      }}
    >
      <div className="flex flex-shrink-0 items-center gap-2">
        <Sparkles className="mr-2 h-5 w-5 flex-shrink-0 text-amber-400/90" aria-hidden />
        <h3 className="mb-0 font-sans text-sm font-medium uppercase tracking-[-0.02em] text-zinc-400 leading-tight">AI-аналитика</h3>
      </div>
      <ul className="flex flex-col gap-4 text-sm leading-relaxed text-zinc-300">
        <li className="min-h-0 leading-relaxed">
          <span className="text-zinc-500">{tUtil("insightComparisonLabel", locale)} </span>
          <span className="font-medium text-white">
            {tUtil("insightComparisonSentence", locale)} {xTimesStr} {timesWord} {tUtil("insightComparisonSuffix", locale)} {insights.horizonYears} {yearsWord}.
          </span>
        </li>
        <li className="min-h-0 leading-relaxed">
          <span className="text-zinc-500">{tUtil("insightPaybackLabel", locale)} </span>
          <span className="font-medium text-white">{paybackText}</span>
        </li>
        <li className="min-h-0 leading-relaxed">
          <span className="text-zinc-500">{tUtil("insightRecommendationLabel", locale)} </span>
          <span className="font-medium text-white">{peakText}</span>
        </li>
        <li className="min-h-0 leading-relaxed">
          <span className="font-medium text-amber-400/90">{tUtil("insightRatesForecast", locale)}</span>
        </li>
        {insights.showDepositDisclaimer && (
          <li className="min-h-0">
            <span className="text-xs leading-relaxed text-amber-400/80">{tUtil("insightDepositDisclaimer", locale)}</span>
          </li>
        )}
        {insights.showRentCapitalization && (
          <li className="min-h-0">
            <span className="text-xs leading-relaxed text-amber-400/80">
              {tUtil("insightRentCapitalization", locale)}
              <span className="font-semibold tabular-nums">{insights.rentCapitalizationPercent.toFixed(1)}</span>
              {tUtil("insightRentCapitalizationSuffix", locale)}
            </span>
          </li>
        )}
      </ul>
    </motion.div>
  );
}

function HomeContent() {
  const {
    isExportView,
    exportTs,
    showTsInReport,
    effectiveBrand,
    configFromStore,
    price,
    downPercent,
    ratePercent,
    termYears,
    rentalYieldPercent,
    setPrice,
    setDownPercent,
    setRatePercent,
    setTermYears,
    setRentalYieldPercent,
    currentScenario,
    setScenario,
    riskScenario,
    setRiskScenario,
    comparisonMode,
    setComparisonMode,
    inputsB,
    setInputsB,
    compareWithScenario,
    setCompareWithScenarioState,
    compareStrategy,
    effectiveLocale,
    formatCurrency,
    valueToDisplay,
    symbol,
    t,
    yearsWordEffective,
    STRATEGY_LABELS,
    isGenerating,
    pdfModalOpen,
    setPdfModalOpen,
    leadName,
    setLeadName,
    leadPhoneCode,
    setLeadPhoneCode,
    leadPhone,
    setLeadPhone,
    objectTab,
    setObjectTab,
    calculated,
    chartDataForChart,
    chartDataWithDeposit,
    chartDataWithDepositB,
    roiBPercent,
    crossoverInsight,
    expertConclusion,
    expertTextForReport,
    finalCapitalForReport,
    liveTime,
    isGeneratingJpg,
    reportTemplateRef,
    leadPartnerId,
    strategyLabelForLead,
    smartInsights,
    handleDownloadReportJpg,
    handleDownloadPDF,
    handlePdfWithLead,
    container,
    cardFloat,
    glassClass,
    exportAccentStyle,
    gradientStyle,
  } = useWidgetLogic();

  const {
    annuity,
    taxDeductions,
    roi,
    totalRent,
    finalValue,
    verdictBenefit,
    benefitDelta,
    compareScenarioLabel,
  } = calculated;

  return (
    <div
      className="min-h-screen bg-[#0c0c0e] font-sans text-zinc-100"
      style={exportAccentStyle}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={
          gradientStyle ?? {
            background:
              "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(59,130,246,0.15), transparent)",
          }
        }
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-7xl p-4 md:p-8 lg:p-12 pb-24 md:pb-12">
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden [.is-exporting_&]:hidden"
        >
          <div className="flex items-start gap-3">
            {effectiveBrand.logoUrl && (
              <img
                src={effectiveBrand.logoUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-xl object-contain object-left sm:h-12 sm:w-12"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                {effectiveBrand.productName}
              </h1>
              <p className="mt-1 text-sm tracking-[-0.01em] text-zinc-500">
                {t("simulatorSubtitle")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {"contactPhone" in effectiveBrand && effectiveBrand.contactPhone && (
              <a
                href={`https://wa.me/${effectiveBrand.contactPhone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/20"
              >
                WhatsApp
              </a>
            )}
            <LanguageSwitcher />
            <CurrencySwitcher />
          </div>
        </motion.header>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8"
        >
          <motion.section
            variants={cardFloat}
            className={`${glassClass} p-5 md:p-6 shadow-2xl print:hidden [.is-exporting_&]:hidden lg:sticky lg:top-8 touch-pan-y`}
          >
            <div className="mb-6 space-y-3">
              <p className="text-xs font-medium text-zinc-500">{t("baseStrategy")}</p>
              <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
                <div className="relative flex flex-1 rounded-[12px]">
                  {(
                    [
                      { key: "investor" as const, label: STRATEGY_LABELS.investor },
                      { key: "family" as const, label: STRATEGY_LABELS.family },
                      { key: "entry" as const, label: STRATEGY_LABELS.entry },
                    ] as const
                  ).map(({ key, label }) => {
                    const isBase = currentScenario === key;
                    const color = STRATEGY_COLORS[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setScenario(key)}
                        className="relative z-10 flex flex-1 items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                      >
                        {isBase && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 rounded-lg"
                            style={{
                              backgroundColor: `${color}33`,
                              border: `1px solid ${color}80`,
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 30,
                            }}
                          />
                        )}
                        <span
                          className={
                            isBase
                              ? "relative font-semibold text-white"
                              : "relative text-zinc-500 hover:text-zinc-300"
                          }
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {!isExportView && (
                <>
                  <p className="text-xs font-medium text-zinc-500">{t("compareWith")}</p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: "investor" as const, label: STRATEGY_LABELS.investor },
                        { key: "family" as const, label: STRATEGY_LABELS.family },
                        { key: "entry" as const, label: STRATEGY_LABELS.entry },
                      ] as const
                    ).map(({ key, label }) => {
                      const isCompare = compareWithScenario === key;
                      const color = STRATEGY_COLORS[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setCompareWithScenarioState((prev) => (prev === key ? null : key))
                          }
                          className={`rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                            isCompare
                              ? "bg-transparent text-white"
                              : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
                          }`}
                          style={
                            isCompare
                              ? { borderColor: color, color: `${color}` }
                              : undefined
                          }
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {!isExportView && (
                <div className="pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setComparisonMode(!comparisonMode)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                      comparisonMode
                        ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-300"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
                    }`}
                  >
                    {t("compareWithAnotherJK")}
                  </button>
                </div>
              )}
            </div>
            {comparisonMode && !isExportView && (
              <div className="mb-4 flex rounded-xl border border-white/10 bg-white/5 p-1">
                {(["A", "B"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setObjectTab(tab)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                      objectTab === tab
                        ? "bg-white/15 text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab === "A" ? t("objectA") : t("objectB")}
                  </button>
                ))}
              </div>
            )}
            <h2 className="mb-4 font-sans text-sm font-medium uppercase tracking-[-0.02em] text-zinc-400">
              {t("parameters")}
            </h2>
            <div className="space-y-6">
              {(!comparisonMode || objectTab === "A") && (
              <>
              <Slider
                label={t("priceLabel")}
                value={price}
                onChange={setPrice}
                min={1_000_000}
                max={100_000_000}
                step={500_000}
                format={(v) => {
                  const d = valueToDisplay(v);
                  const M = d >= 1_000_000;
                  const num = M ? (d / 1_000_000).toFixed(1) : (d / 1_000).toFixed(0);
                  const suffix = M ? (effectiveLocale === "en" ? "M" : "млн") : (effectiveLocale === "en" ? "K" : "тыс.");
                  return `${num} ${suffix} ${symbol.trim()}`;
                }}
              />
              <Slider
                label={t("downPaymentLabel")}
                value={downPercent}
                onChange={setDownPercent}
                min={0}
                max={90}
                step={5}
                format={(v) => `${v}%`}
              />
              <Slider
                label={t("rateLabel")}
                value={ratePercent}
                onChange={setRatePercent}
                min={5}
                max={30}
                step={0.5}
                format={(v) => `${v}%`}
              />
              <Slider
                label={t("termLabel")}
                value={termYears}
                onChange={setTermYears}
                min={1}
                max={30}
                step={1}
                format={(v) => `${v} ${yearsWordEffective(v)}`}
              />
              <Slider
                label={t("rentalYieldLabel")}
                value={rentalYieldPercent}
                onChange={setRentalYieldPercent}
                min={2}
                max={15}
                step={0.5}
                format={(v) => `${v}%`}
              />
              </>
              )}
              {comparisonMode && objectTab === "B" && (
                <>
                  <Slider
                    label={t("priceLabel")}
                    value={inputsB.price}
                    onChange={(v) => setInputsB({ price: v })}
                    min={1_000_000}
                    max={100_000_000}
                    step={500_000}
                    format={(v) => {
                      const d = valueToDisplay(v);
                      const M = d >= 1_000_000;
                      const num = M ? (d / 1_000_000).toFixed(1) : (d / 1_000).toFixed(0);
                      const suffix = M ? (effectiveLocale === "en" ? "M" : "млн") : (effectiveLocale === "en" ? "K" : "тыс.");
                      return `${num} ${suffix} ${symbol.trim()}`;
                    }}
                  />
                  <Slider
                    label={t("downPaymentLabel")}
                    value={inputsB.downPercent}
                    onChange={(v) => setInputsB({ downPercent: v })}
                    min={0}
                    max={90}
                    step={5}
                    format={(v) => `${v}%`}
                  />
                  <Slider
                    label={t("rateLabel")}
                    value={inputsB.ratePercent}
                    onChange={(v) => setInputsB({ ratePercent: v })}
                    min={5}
                    max={30}
                    step={0.5}
                    format={(v) => `${v}%`}
                  />
                  <Slider
                    label={t("termLabel")}
                    value={inputsB.termYears}
                    onChange={(v) => setInputsB({ termYears: v })}
                    min={1}
                    max={30}
                    step={1}
                    format={(v) => `${v} ${yearsWordEffective(v)}`}
                  />
                  <Slider
                    label={t("rentalYieldLabel")}
                    value={inputsB.rentalYieldPercent}
                    onChange={(v) => setInputsB({ rentalYieldPercent: v })}
                    min={2}
                    max={15}
                    step={0.5}
                    format={(v) => `${v}%`}
                  />
                </>
              )}
            </div>
          </motion.section>

          <motion.section
            variants={cardFloat}
            className="flex flex-col gap-6"
          >
            <div
              id="simulation-report"
              className="flex flex-col gap-6 [.is-exporting_&]:bg-black print:bg-black"
            >
            <div
              className="export-only-header grid grid-cols-2 gap-4 border-b border-white/10 mb-6 rounded-2xl bg-white/5 p-4 md:grid-cols-4 md:p-6"
              aria-hidden
            >
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Объект</p>
                <p className="min-w-0 overflow-x-auto text-sm font-medium text-white font-mono tabular-nums whitespace-nowrap">{formatCurrency(price)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Взнос</p>
                <p className="text-sm font-medium text-white">{downPercent}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Ставка</p>
                <p className="text-sm font-medium text-white">{ratePercent}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Срок</p>
                <p className="text-sm font-medium text-white">{termYears} {yearsWordEffective(termYears)}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <motion.div
                layout
                variants={cardFloat}
                className={`${glassClass} min-h-[110px] min-w-0 overflow-visible px-4 py-5 sm:px-5`}
              >
                <div className="flex h-6 shrink-0 items-center gap-2">
                  <Wallet className="h-5 w-5 flex-shrink-0 text-zinc-500" strokeWidth={1.5} />
                  <p className="font-sans text-xs font-medium uppercase tracking-[-0.02em] text-zinc-500 truncate">
                    {t("paymentPerMonth")}
                  </p>
                </div>
                <div className="mt-2 min-w-0 overflow-x-auto">
                  <div className="inline-block min-w-max font-sans font-bold tracking-tighter text-white tabular-nums text-[clamp(1rem,2.5vw,1.875rem)]">
                    <AnimatedNumber value={valueToDisplay(annuity.monthlyPayment)} suffix={symbol} />
                  </div>
                </div>
              </motion.div>
              <motion.div
                layout
                variants={cardFloat}
                className={`${glassClass} min-h-[110px] min-w-0 overflow-visible px-4 py-5 sm:px-5`}
              >
                <div className="flex h-6 shrink-0 items-center gap-2">
                  <TrendingUp className="h-5 w-5 flex-shrink-0 text-zinc-500" strokeWidth={1.5} />
                  <p className="font-sans text-xs font-medium uppercase tracking-[-0.02em] text-zinc-500 truncate">
                    {t("overpayment")}
                  </p>
                </div>
                <div className="mt-2 min-w-0 overflow-x-auto">
                  <div className="inline-block min-w-max font-sans font-bold tracking-tighter text-white tabular-nums text-[clamp(1rem,2.5vw,1.875rem)]">
                    <AnimatedNumber value={valueToDisplay(annuity.totalInterest)} suffix={symbol} />
                  </div>
                </div>
              </motion.div>
              <motion.div
                layout
                variants={cardFloat}
                className={`${glassClass} min-h-[110px] min-w-0 overflow-visible px-4 py-5 sm:px-5`}
              >
                <div className="flex h-6 shrink-0 items-center gap-2">
                  <Receipt className="h-5 w-5 flex-shrink-0 text-zinc-500" strokeWidth={1.5} />
                  <p className="font-sans text-xs font-medium uppercase tracking-[-0.02em] text-zinc-500 truncate">
                    Налоговый вычет
                  </p>
                </div>
                <div className="mt-2 min-w-0 overflow-x-auto">
                  <div className="inline-block min-w-max font-sans font-bold tracking-tighter text-white tabular-nums text-[clamp(1rem,2.5vw,1.875rem)]">
                    <AnimatedNumber value={valueToDisplay(taxDeductions.totalRefund)} suffix={symbol} />
                  </div>
                </div>
              </motion.div>
              <motion.div
                layout
                variants={cardFloat}
                className={`${glassClass} min-h-[110px] min-w-0 overflow-visible px-4 py-5 sm:px-5`}
              >
                <div className="flex h-6 shrink-0 items-center gap-2">
                  <Percent className="h-5 w-5 flex-shrink-0 text-zinc-500" strokeWidth={1.5} />
                  <p className="font-sans text-xs font-medium uppercase tracking-[-0.02em] text-zinc-500 truncate">
                    {t("annualYield")}
                  </p>
                </div>
                <div className="mt-2 min-w-0 overflow-x-auto">
                  <div
                    className={`inline-block min-w-max font-sans font-bold tracking-tighter tabular-nums text-[clamp(1rem,2.5vw,1.875rem)] ${roi.roiPercent > 5 ? "text-emerald-400" : "text-white"}`}
                  >
                    <AnimatedNumber value={roi.roiPercent} suffix="" decimals={1} />
                    <span className="ml-1 text-sm text-zinc-500">%</span>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_minmax(0,340px)]">
              <motion.div variants={cardFloat} className={`${glassClass} min-w-0 px-4 py-6 sm:px-6`}>
                <h3 className="font-sans text-sm font-medium uppercase tracking-[-0.02em] text-zinc-500">
                  {t("taxRefunds")}
                </h3>
                <div className="mt-4 flex min-w-0 flex-wrap gap-6 text-sm">
                  <div className="min-w-0 overflow-x-auto">
                    <span className="text-zinc-400">{t("propertyDeduction")}:</span>{" "}
                    <span className="font-medium text-white tabular-nums whitespace-nowrap">
                      <AnimatedNumber value={valueToDisplay(taxDeductions.propertyRefund)} suffix={symbol} />
                    </span>
                  </div>
                  <div className="min-w-0 overflow-x-auto">
                    <span className="text-zinc-400">{t("interestDeduction")}:</span>{" "}
                    <span className="font-medium text-white tabular-nums whitespace-nowrap">
                      <AnimatedNumber value={valueToDisplay(taxDeductions.interestRefund)} suffix={symbol} />
                    </span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={cardFloat}
                className="flex min-w-0 flex-col gap-1.5"
              >
                <p className="font-sans text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Status: Property Ownership
                </p>
                <motion.div
                  id="pdf-digital-twin-wrap"
                  className="relative aspect-[4/3] min-h-0 w-full overflow-hidden rounded-2xl [&>div]:h-full [&>div]:min-h-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <DigitalTwin
                    progress={downPercent}
                    highlight={
                      currentScenario === "investor"
                        ? "gold"
                        : roi.roiPercent >= 6
                          ? "blue"
                          : "default"
                    }
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded bg-black/50 px-2 py-1 font-mono text-[9px] text-white/90 backdrop-blur-sm">
                    <LayoutGrid className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                    <span>2D / Active</span>
                    <span className="text-white/60">
                      {new Date().toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {!isExportView && (
              <motion.div
                variants={cardFloat}
                className="flex flex-col gap-3 rounded-3xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 backdrop-blur-xl sm:px-5"
                aria-labelledby="risk-block-title"
              >
                <h3
                  id="risk-block-title"
                  className="font-sans text-sm font-medium uppercase tracking-[-0.02em] text-amber-400/90"
                >
                  {t("riskBlockTitle")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: "none" as const, label: t("riskNone"), desc: null },
                      { key: "stagnation" as const, label: t("riskStagnation"), desc: t("riskStagnationDesc") },
                      { key: "hyperinflation" as const, label: t("riskHyperinflation"), desc: t("riskHyperinflationDesc") },
                    ] as const
                  ).map(({ key, label, desc }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRiskScenario(key)}
                      className={`inline-flex flex-col items-start rounded-xl border px-4 py-2.5 text-left text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${
                        riskScenario === key
                          ? "border-amber-400/50 bg-amber-500/20 text-white"
                          : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
                      }`}
                    >
                      <span className="font-medium">{label}</span>
                      {desc && <span className="mt-0.5 text-xs text-zinc-500">{desc}</span>}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              id="pdf-chart-wrap"
              variants={cardFloat}
              className={`${glassClass} min-h-[320px] p-6`}
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h3 className="font-sans text-sm font-medium uppercase tracking-[-0.02em] text-zinc-500">
                  Динамика роста чистого капитала
                </h3>
                {!isExportView && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 font-sans text-[11px] font-medium text-emerald-400/90"
                    title={t("zeroPointBadge")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                    {t("zeroPointValid")}
                  </span>
                )}
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartDataForChart}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="balanceGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#007AFF"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#007AFF"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="balanceGradientB"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient
                        id="balanceGradientEmerald"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.4)"
                      strokeOpacity={0.1}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                      tickFormatter={(m) => (m / 12).toFixed(0)}
                      label={{
                        value: t("chartAxisYears"),
                        position: "insideBottom",
                        offset: -4,
                        fill: "rgba(255,255,255,0.4)",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                      tickFormatter={(v) => {
                        const d = valueToDisplay(v);
                        return d >= 1_000_000 ? `${(d / 1_000_000).toFixed(0)}M` : (d / 1_000).toFixed(0) + "K";
                      }}
                      width={36}
                    />
                    <Tooltip
                      isAnimationActive={false}
                      useTranslate3d
                      contentStyle={{
                        minWidth: 200,
                        maxWidth: "min(90vw, 340px)",
                        width: "max-content",
                        minHeight: 72,
                        backgroundColor: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "12px",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        padding: "12px 16px",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                      }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const netEquityVal = Number(payload.find((e) => e.dataKey === "netEquity")?.value ?? 0);
                        const netEquityBVal = payload.find((e) => e.dataKey === "netEquityB")?.value;
                        const depositVal = Number(payload.find((e) => e.dataKey === "depositAccumulation")?.value ?? 0);
                        const compareVal = payload.find((e) => e.dataKey === "netEquityCompare")?.value;
                        const rowPayload = payload[0]?.payload as ChartRowWithDeposit | undefined;
                        const propertyValueGrowth = Number(rowPayload?.propertyValueGrowth ?? 0);
                        const savedRentIndexed = Number(rowPayload?.savedRentIndexed ?? 0);
                        const currentMonth = typeof label === "number" ? label : 0;
                        const compareWithin10Y = currentMonth <= 120;
                        const chartUpTo120 = chartDataWithDeposit.filter((r) => r.month <= 120);
                        const crossoverRow = chartUpTo120.find((r) => r.netEquity >= r.depositAccumulation);
                        const crossoverMonth = crossoverRow?.month ?? null;
                        const pastInflection = expertConclusion.inflectionMonth != null && currentMonth > expertConclusion.inflectionMonth;
                        const advantage = Math.round(netEquityVal - depositVal);
                        const monthsUntilCatchUp =
                          compareWithin10Y && advantage < 0 && crossoverMonth != null && crossoverMonth > currentMonth
                            ? crossoverMonth - currentMonth
                            : null;
                        return (
                          <motion.div
                            layout
                            className="min-w-[200px] w-max max-w-[min(90vw,340px)] min-h-[72px] rounded-xl border border-white/12 bg-white/10 px-4 py-3 backdrop-blur-xl"
                            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
                          >
                            <p className="mb-2 font-sans text-[11px] text-white/60">
                              {typeof label === "number"
                                ? `${t("monthLabel")} ${label} · ${(label / 12).toFixed(1)} ${t("yearsShort")}`
                                : String(label)}
                            </p>
                            <p className="font-sans text-sm font-semibold tabular-nums text-white font-mono whitespace-nowrap">
                              {formatCurrency(netEquityVal)}
                            </p>
                            <p className="mt-0.5 font-sans text-[11px] text-white/50">
                              {comparisonMode ? t("jkAlpha") : "Ваш капитал в объекте"}
                            </p>
                            {comparisonMode && netEquityBVal != null && (
                              <>
                                <p className="mt-1.5 font-sans text-sm font-semibold tabular-nums font-mono text-indigo-300 whitespace-nowrap">
                                  {formatCurrency(Number(netEquityBVal))}
                                </p>
                                <p className="mt-0.5 font-sans text-[11px] text-white/50">{t("jkBeta")}</p>
                              </>
                            )}
                            <p className="mt-1.5 font-sans text-[11px] text-white/50">
                              {t("tooltipPriceGrowth")}{" "}
                              <span className="font-medium tabular-nums text-white/90">{formatCurrency(propertyValueGrowth)}</span>
                            </p>
                            <p className="mt-0.5 font-sans text-[11px] text-white/50">
                              {t("tooltipRentAccumulated")}{" "}
                              <span className="font-medium tabular-nums text-white/90">{formatCurrency(savedRentIndexed)}</span>
                            </p>
                            <p className={`mt-2 font-sans text-sm font-semibold tabular-nums font-mono whitespace-nowrap ${comparisonMode ? "text-amber-400" : "text-[#8884d8]"}`}>
                              {formatCurrency(depositVal)}
                            </p>
                            <p className="mt-0.5 font-sans text-[11px] text-white/50">
                              {t("depositLabel")}
                            </p>
                            {pastInflection && (
                              <p className="mt-2 flex items-center gap-1.5 font-sans text-[11px] text-red-400">
                                <span aria-hidden>⚠️</span>
                                <span>{t("rentExceedsIncome")}</span>
                              </p>
                            )}
                            {compareWithin10Y ? (
                              <p className="mt-2 font-sans text-[11px] text-white/60">
                                {Math.abs(advantage) > 100_000_000 ? (
                                  <span className="text-zinc-400">{t("tooltipDifferentWeight")}</span>
                                ) : advantage >= 0 ? (
                                  <>
                                    {t("tooltipNetBenefit")}{" "}
                                    <span className="font-semibold text-emerald-400">
                                      {formatCurrency(advantage)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-zinc-400">{t("tooltipAssetAccumulation")}</span>
                                )}
                              </p>
                            ) : (
                              <p className="mt-2 font-sans text-[11px] text-zinc-500">
                                {t("tooltipCompareLimit")}
                              </p>
                            )}
                            {advantage < 0 && compareWithin10Y && (
                              <p className="mt-1 font-sans text-[10px] text-zinc-500">
                                {t("tooltipHorizonNote")}
                              </p>
                            )}
                            {monthsUntilCatchUp != null && monthsUntilCatchUp > 0 && (
                              <p className="mt-2 font-sans text-[11px] text-emerald-400/90">
                                {t("tooltipCatchUpIn")} {monthsUntilCatchUp} {monthWordUtil(monthsUntilCatchUp, effectiveLocale)}.
                              </p>
                            )}
                            {crossoverMonth != null && currentMonth < crossoverMonth && (
                              <p className="mt-2 font-sans text-[10px] text-amber-400/90">
                                {t("tooltipForecastOvertake")} {Math.ceil(crossoverMonth / 12)} {t("tooltipForecastOvertakeSuffix")}
                              </p>
                            )}
                            {compareStrategy &&
                              compareVal != null &&
                              Number(compareVal) > 0 && (
                                <>
                                  <p
                                    className="mt-2 font-sans text-sm font-semibold tabular-nums font-mono"
                                    style={{ color: STRATEGY_COLORS[compareStrategy] }}
                                  >
                                    {formatCurrency(Number(compareVal))}
                                  </p>
                                  <p className="mt-0.5 font-sans text-[11px] text-zinc-500">
                                    {t("alternative")}
                                  </p>
                                </>
                              )}
                          </motion.div>
                        );
                      }}
                      labelStyle={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "11px",
                        marginBottom: "4px",
                      }}
                      itemStyle={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}
                      formatter={(value) => [
                        formatCurrency(Number(value ?? 0)),
                        "Капитал",
                      ]}
                      labelFormatter={(month) =>
                        `${t("monthLabel")} ${month} · ${(Number(month) / 12).toFixed(1)} ${t("yearsShort")}`
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="netEquity"
                      stroke={comparisonMode ? "#10b981" : "#007AFF"}
                      strokeWidth={comparisonMode ? 2.5 : 3}
                      fill={comparisonMode ? "url(#balanceGradientEmerald)" : "url(#balanceGradient)"}
                      activeDot={{ r: 6, strokeWidth: 0, fill: comparisonMode ? "#10b981" : "#007AFF" }}
                      name={comparisonMode ? t("jkAlpha") : "Недвижимость (Чистый актив)"}
                    />
                    {comparisonMode && chartDataWithDepositB && (
                      <Area
                        type="monotone"
                        dataKey="netEquityB"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#balanceGradientB)"
                        activeDot={{ r: 5, strokeWidth: 0, fill: "#6366f1" }}
                        name={t("jkBeta")}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="depositAccumulation"
                      stroke={comparisonMode ? "#f59e0b" : "#8884d8"}
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      name={t("depositLabel")}
                      dot={false}
                      activeDot={{ r: 4, fill: comparisonMode ? "#f59e0b" : "#8884d8", strokeWidth: 0 }}
                    />
                    {expertConclusion.inflectionMonth != null && (() => {
                      const inflectionRow = chartDataWithDeposit.find((r) => r.month === expertConclusion.inflectionMonth);
                      const yVal = inflectionRow?.depositAccumulation ?? 0;
                      return (
                        <ReferenceDot
                          x={expertConclusion.inflectionMonth}
                          y={yVal}
                          r={6}
                          fill="#f59e0b"
                          stroke="#fff"
                          strokeWidth={2}
                        >
                          <Label
                            value={t("inflectionPoint")}
                            position="top"
                            fill="#f59e0b"
                            fontSize={11}
                            fontWeight={600}
                          />
                        </ReferenceDot>
                      );
                    })()}
                    {compareStrategy && (
                      <Line
                        type="monotone"
                        dataKey="netEquityCompare"
                        stroke={STRATEGY_COLORS[compareStrategy]}
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                        activeDot={{
                          r: 4,
                          fill: STRATEGY_COLORS[compareStrategy],
                          strokeWidth: 0,
                        }}
                        name={t("alternative")}
                      />
                    )}
                    {crossoverInsight.crossoverMonth != null && (
                      <ReferenceLine
                        x={crossoverInsight.crossoverMonth}
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                      >
                        <Label
                          value={effectiveLocale === "ru" ? "Точка окупаемости актива" : "Asset payback point"}
                          position="top"
                          fill="#10b981"
                          fontSize={11}
                          fontWeight={600}
                        />
                      </ReferenceLine>
                    )}
                    {(() => {
                      const breakEvenPoint = chartDataWithDeposit.find((r: ChartRowWithDeposit) => r.isBreakEven);
                      return breakEvenPoint ? (
                        <ReferenceDot
                          x={breakEvenPoint.month}
                          y={breakEvenPoint.netEquity}
                          r={10}
                          fill="#22c55e"
                          stroke="#fff"
                          strokeWidth={2}
                        >
                          <Label
                            value="Окупаемость процентов"
                            position="top"
                            fill="#22c55e"
                            fontSize={11}
                            fontWeight={600}
                          />
                        </ReferenceDot>
                      ) : null;
                    })()}
                    <Legend
                      wrapperStyle={{ paddingTop: 8 }}
                      formatter={(value) => (
                        <span className="font-sans text-xs text-zinc-400">{value}</span>
                      )}
                      iconType="line"
                      iconSize={8}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <SmartInsights locale={effectiveLocale} insights={smartInsights} />

            {!isExportView && (
              <motion.div
                variants={cardFloat}
                className="relative flex min-w-0 flex-col gap-3 overflow-visible rounded-3xl border border-emerald-500/20 bg-emerald-500/5 px-4 pt-5 pb-5 backdrop-blur-xl sm:px-6"
                style={{
                  boxShadow: "inset 0 0 0 1px rgba(16,185,129,0.12), 0 0 40px -12px rgba(16,185,129,0.2)",
                }}
              >
                <h3 className="mb-0 font-sans text-sm font-medium uppercase tracking-[-0.02em] leading-tight text-emerald-400/90">
                  {t("expertSummaryTitle")}
                </h3>
                <p className="font-sans text-sm leading-relaxed text-zinc-300">
                  {crossoverInsight.crossoverYear != null ? (
                    t("expertSummaryWithCrossover")
                      .replace("{X}", String(configFromStore.baseRates?.priceGrowthPercent ?? 0))
                      .replace("{N}", String(crossoverInsight.crossoverYear))
                      .replace("{M}", (crossoverInsight.finalCapitalRub / 1_000_000).toFixed(1))
                  ) : (
                    t("expertSummaryNoCrossover")
                  )}
                </p>
              </motion.div>
            )}

            {!isExportView && (
              <ExpertVerdict
                chartData={chartDataWithDeposit}
                termYears={termYears}
                locale={effectiveLocale}
              />
            )}
            {!isExportView && (
              <ExpertInsightsVerdict
                data={calculated}
                formatCurrency={formatCurrency}
                locale={effectiveLocale}
                comparisonMode={comparisonMode}
                chartDataB={chartDataWithDepositB}
                roiBPercent={roiBPercent}
              />
            )}

            <motion.div variants={cardFloat} className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleDownloadReportJpg}
                disabled={isGeneratingJpg}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/20 px-6 py-3 font-sans text-sm font-medium text-emerald-300 transition-all hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:opacity-60"
              >
                {isGeneratingJpg ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {isGeneratingJpg ? (effectiveLocale === "ru" ? "Генерация…" : "Generating…") : t("downloadReportJpgShort")}
              </button>
              <button
                type="button"
                onClick={() => setPdfModalOpen(true)}
                disabled={isGenerating}
                className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-sans text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-60 ${
                  getAdminSettings().security?.pdfButtonAccent
                    ? "bg-amber-500/90 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/25"
                    : "border border-white/20 bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <FileText className="h-4 w-4" aria-hidden />
                )}
                {isGenerating ? (effectiveLocale === "ru" ? "Генерация…" : "Generating…") : t("downloadPdfReport")}
              </button>
            </motion.div>

            <motion.div
              variants={cardFloat}
              className="relative flex min-w-0 flex-col gap-4 overflow-visible rounded-3xl border border-white/10 bg-white/5 px-4 pt-6 pb-6 backdrop-blur-xl sm:px-6"
              style={{
                boxShadow:
                  "inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px -12px rgba(120,180,255,0.25), 0 0 40px -20px rgba(100,200,150,0.2)",
              }}
            >
              <h3 className="mb-0 font-sans text-sm font-medium uppercase tracking-[-0.02em] leading-tight text-zinc-500">
                {t("verdictTitle")}
              </h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="min-w-0 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-5">
                  <p className="font-sans text-xs font-medium uppercase tracking-[-0.02em] text-red-400/90">
                    {t("rentOverTerm")} {termYears} {yearsWordEffective(termYears)}
                  </p>
                  <div className="mt-2 min-w-0 overflow-x-auto">
                    <p className="font-sans font-semibold tracking-[-0.02em] tabular-nums text-red-400 text-[clamp(1.125rem,2vw,1.5rem)]">
                      <AnimatedNumber value={valueToDisplay(totalRent)} suffix={symbol} />
                    </p>
                  </div>
                  <p className="mt-1 leading-relaxed text-sm text-red-300/70">
                    {t("totalLoss")}
                  </p>
                </div>
                <div className="min-w-0 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-5">
                  <p className="font-sans text-xs font-medium uppercase tracking-[-0.02em] text-emerald-400/90">
                    {t("yourCapital")}
                  </p>
                  <div className="mt-2 min-w-0 overflow-x-auto">
                    <p className="font-sans font-semibold tracking-[-0.02em] tabular-nums text-emerald-400 text-[clamp(1.125rem,2vw,1.5rem)]">
                      <AnimatedNumber value={valueToDisplay(finalValue)} suffix={symbol} />
                    </p>
                  </div>
                  <p className="mt-1 leading-relaxed text-sm text-emerald-300/80">
                    {t("valueAfterTerm")} {termYears} {yearsWordEffective(termYears)}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex w-full flex-col items-start gap-2 border-t border-white/10 pt-5">
                <span className="w-full font-sans text-base font-medium leading-none tracking-[-0.02em] text-white">
                  {t("benefitNow")}:
                </span>
                <span className="block w-full leading-none overflow-x-auto font-sans text-emerald-400 text-[clamp(1rem,1.5vw,1.25rem)] tabular-nums">
                  <AnimatedNumber value={valueToDisplay(Math.max(0, verdictBenefit))} suffix={symbol} />
                </span>
              </div>
              {compareStrategy && benefitDelta !== null && (
                <div
                  id="verdict-delta-block"
                  className="mt-5 min-w-0 rounded-2xl border-2 border-emerald-400/40 bg-emerald-500/10 px-4 py-4 backdrop-blur-sm sm:px-5"
                >
                  <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                    {t("benefitDeltaTitle")}
                  </p>
                  <p className="min-w-0 break-words font-sans text-base font-medium tracking-[-0.02em] text-white">
                    {benefitDelta >= 0 ? (
                      <>
                        {t("youSaveMore")}{" "}
                        <span className="font-semibold text-emerald-400">
                          {currentScenario === "custom" ? t("currentScenarioGenitive") : STRATEGY_LABELS[currentScenario]}
                        </span>
                        {t("youSaveMoreSuffix")}{" "}
                        <span className="font-semibold tabular-nums text-emerald-400">
                          <AnimatedNumber value={valueToDisplay(benefitDelta)} suffix={symbol} />
                        </span>{" "}
                        {t("moreThan")} «{compareScenarioLabel ? STRATEGY_LABELS[compareScenarioLabel] : ""}».
                      </>
                    ) : (
                      <>
                        {t("youSaveMore")}{" "}
                        <span className="font-semibold text-amber-400">{compareScenarioLabel ? STRATEGY_LABELS[compareScenarioLabel] : ""}</span>
                        {t("youSaveMoreSuffix")}{" "}
                        <span className="font-semibold tabular-nums text-amber-400">
                          <AnimatedNumber value={valueToDisplay(-benefitDelta)} suffix={symbol} />
                        </span>{" "}
                        {t("moreThan")} «
                        {currentScenario === "custom" ? t("currentScenarioPrepositional") : STRATEGY_LABELS[currentScenario]}».
                      </>
                    )}
                  </p>
                </div>
              )}
            </motion.div>

            {isExportView && (
              <div className="export-only-footer mt-6 border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {effectiveBrand.logoUrl && (
                    <img src={effectiveBrand.logoUrl} alt="" className="h-8 w-auto max-w-[100px] object-contain" />
                  )}
                  <span className="text-sm font-medium text-white">{effectiveBrand.companyName}</span>
                </div>
                {"contactPhone" in effectiveBrand && effectiveBrand.contactPhone && (
                  <a
                    href={`https://wa.me/${effectiveBrand.contactPhone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400 hover:underline"
                  >
                    WhatsApp: {effectiveBrand.contactPhone}
                  </a>
                )}
                {exportTs && showTsInReport && (
                  <div className="text-[10px] font-mono text-zinc-500 w-full">
                    {t("officialCalculation")} {effectiveBrand.companyName}. {t("generatedAt")}: {formatTimestampFromEpoch(Number(exportTs))}
                  </div>
                )}
              </div>
            )}
            </div>

            <motion.div
              variants={cardFloat}
              className="flex flex-col items-center gap-3 pt-2 print:hidden [.is-exporting_&]:hidden"
            >
              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <span
                  className="relative flex h-2 w-2"
                  aria-hidden
                >
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span>{t("dataActual")} {liveTime}</span>
              </div>
              <p className="text-center font-sans text-xs tracking-[-0.01em] text-zinc-500">
                {t("calculationDisclaimer")} {configFromStore.inflationRate}%.
              </p>
            </motion.div>
          </motion.section>
        </motion.div>
      </div>

      <ReportTemplate
        ref={reportTemplateRef}
        brand={{
          logoUrl: effectiveBrand.logoUrl ?? "",
          contactPhone: effectiveBrand.contactPhone ?? "",
          companyName: effectiveBrand.companyName,
        }}
        chartData={chartDataForChart}
        comparisonMode={comparisonMode}
        objectA={{
          price,
          ratePercent,
          finalCapital: finalCapitalForReport,
          roiPercent: roi.roiPercent,
          overpayment: annuity.totalInterest,
        }}
        objectB={
          comparisonMode && chartDataWithDepositB?.length
            ? {
                price: inputsB.price,
                ratePercent: inputsB.ratePercent,
                finalCapital: chartDataWithDepositB[chartDataWithDepositB.length - 1]?.netEquity ?? 0,
              }
            : undefined
        }
        expertText={expertTextForReport}
        formatCurrency={(v, opts) => formatCurrency(v, { ...opts, maximumFractionDigits: opts?.maximumFractionDigits ?? 0 })}
      />

      {pdfModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPdfModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="lead-modal-title" className="mb-4 font-sans text-lg font-semibold text-white">
              {t("leadModalTitleFull")}
            </h2>
            {leadPartnerId ? (
              <input type="hidden" name="partnerId" value={leadPartnerId} readOnly aria-hidden />
            ) : null}
            <div className="space-y-3 mb-5">
              <input
                type="text"
                placeholder={t("leadNamePlaceholder")}
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
                autoFocus
              />
              <div className="flex gap-2">
                <select
                  value={leadPhoneCode}
                  onChange={(e) => setLeadPhoneCode(e.target.value)}
                  className="w-24 shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
                >
                  <option value="+7">+7</option>
                  <option value="+971">+971</option>
                  <option value="+1">+1</option>
                  <option value="+66">+66</option>
                  <option value="+90">+90</option>
                  <option value="+49">+49</option>
                  <option value="+44">+44</option>
                  <option value="+33">+33</option>
                  <option value="+995">+995</option>
                  <option value="+998">+998</option>
                  <option value="+77">+77</option>
                </select>
                <input
                  type="tel"
                  placeholder={t("leadPhonePlaceholder")}
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
                />
              </div>
            </div>
            <motion.button
              type="button"
              disabled={isGenerating}
              onClick={() => handlePdfWithLead(leadName, leadPhone, leadPhoneCode)}
              whileHover={!isGenerating ? { scale: 1.01 } : undefined}
              whileTap={!isGenerating ? { scale: 0.99 } : undefined}
              className="w-full rounded-xl bg-white px-4 py-3 font-sans font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-70"
            >
              {isGenerating ? (effectiveLocale === "ru" ? "Генерация…" : "Generating…") : t("leadSubmitButton")}
            </motion.button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Загрузка…</div>}>
      <HomeContent />
    </Suspense>
  );
}
