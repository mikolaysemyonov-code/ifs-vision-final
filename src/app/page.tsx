"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { config } from "@/lib/config";
import { getAdminSettings } from "@/lib/admin-storage";
import { motion } from "framer-motion";
import { FileText, LayoutGrid, Loader2, Percent, Receipt, Sparkles, TrendingUp, Wallet } from "lucide-react";
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
  Label,
} from "recharts";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { DigitalTwin } from "@/components/DigitalTwin";
import {
  useStore,
  useDownPayment,
  useLoanAmount,
  useCurrencyDisplay,
  useTranslations,
} from "@/store/useStore";
import { useCalculatedData } from "@/store/useCalculatedData";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { t as tUtil, yearsWord as yearsWordUtil, timesWord as timesWordUtil, monthWord as monthWordUtil } from "@/lib/translations";
import type { Currency } from "@/store/useStore";
import { formatCurrency as formatCurrencyUtil, toDisplayValue } from "@/lib/formatCurrency";
import { RENT_REINVEST_RATE } from "@/config/constants";
import type { ChartRowWithDeposit } from "@/lib/engine/financialEngine";

/** Цвета стратегий для графика и UI (Золото, Синий, Изумруд). */
const STRATEGY_COLORS: Record<"investor" | "family" | "entry", string> = {
  investor: "#EAB308",
  family: "#007AFF",
  entry: "#10B981",
};

function parseExportBrandFromUrl(searchParams: URLSearchParams): {
  primaryColor: string;
  companyName: string;
  productName: string;
  logoUrl: string;
  contactPhone: string;
} | null {
  const accent = searchParams.get("accentColor");
  const company = searchParams.get("companyName");
  const logo = searchParams.get("logoUrl");
  const contact = searchParams.get("contactPhone");
  if (!accent && !company && !logo && !contact) return null;
  try {
    const primaryColor =
      (accent && decodeURIComponent(accent).trim()) || "#007AFF";
    const companyName =
      (company && decodeURIComponent(company).trim()) || "";
    const productName = companyName || "IFS Vision";
    const logoUrl = (logo && decodeURIComponent(logo).trim()) || "";
    const contactPhone = (contact && decodeURIComponent(contact).trim()) || "";
    return { primaryColor, companyName, productName, logoUrl, contactPhone };
  } catch {
    return null;
  }
}

/** Hex в rgba с заданной альфой для градиента. */
function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace(/^#/, "").match(/^(..)(..)(..)$/);
  if (!m) return `rgba(59,130,246,${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Текущее время в формате "21.02.2026, 22:32 (МСК)" в момент вызова. */
function getCurrentTimestamp(): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
    hour12: false,
  }).format(new Date()) + " (МСК)";
}

function formatTimestampFromEpoch(epochMs: number): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
    hour12: false,
  }).format(new Date(epochMs)) + " (МСК)";
}

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
        <span className="text-lg font-semibold tabular-nums text-white">
          {format(value)}
        </span>
      </div>
      <div className="relative flex items-center">
        <div className="absolute h-[3px] w-full rounded-full bg-white/15" />
        <div
          className="absolute h-[3px] rounded-l-full bg-blue-600/50 transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
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

function SmartInsights({
  chartData,
  termYears,
  locale,
  initialTotalCapital = 0,
  rentMonthly = 0,
}: {
  chartData: ChartRowWithDeposit[];
  termYears: number;
  locale: "ru" | "en";
  initialTotalCapital?: number;
  rentMonthly?: number;
}) {
  const insights = useMemo(() => {
    const dataUpTo120 = chartData.filter((r) => r.month <= 120);
    const horizonYears = Math.min(termYears, 10);
    if (!dataUpTo120.length) {
      return {
        ratioTimes: 1.1,
        horizonYears,
        paybackMonths: null as number | null,
        peakMonth: null as number | null,
        showDepositDisclaimer: false,
        showRentCapitalization: false,
        rentCapitalizationPercent: 0,
      };
    }
    const last = dataUpTo120[dataUpTo120.length - 1];
    const lastDeposit = last.depositAccumulation;
    let ratioTimes: number;
    if (lastDeposit === 0 || !Number.isFinite(lastDeposit)) {
      ratioTimes = 1.1;
    } else {
      const raw = last.netEquity / lastDeposit;
      ratioTimes = !Number.isFinite(raw) || raw <= 0 ? 1.1 : raw;
    }
    const breakEvenRow = dataUpTo120.find((r) => r.isBreakEven);
    const paybackMonths = breakEvenRow ? breakEvenRow.month : null;
    let bestDiff = -Infinity;
    let peakMonth: number | null = null;
    const fromMonth24 = dataUpTo120.filter((r) => r.month >= 24);
    for (const r of fromMonth24) {
      const diff = r.netEquity - r.depositAccumulation;
      if (diff > bestDiff) {
        bestDiff = diff;
        peakMonth = r.month;
      }
    }
    const atEnd = chartData[chartData.length - 1];
    const showDepositDisclaimer =
      atEnd != null &&
      atEnd.depositAccumulation > 0 &&
      atEnd.depositAccumulation > 10 * atEnd.netEquity;
    // Точка пересечения: если на 10 годах вклад всё ещё выше недвижимости — показываем подсказку про капитализацию аренды.
    let showRentCapitalization = false;
    let rentCapitalizationPercent = 0;
    if (
      initialTotalCapital > 0 &&
      rentMonthly > 0 &&
      last.depositAccumulation > last.netEquity
    ) {
      const r = RENT_REINVEST_RATE / 12;
      const n = 120;
      const fvRent = rentMonthly * ((Math.pow(1 + r, n) - 1) / r);
      const savedRentTotal = rentMonthly * n;
      const extra = fvRent - savedRentTotal;
      rentCapitalizationPercent = (extra / initialTotalCapital / 10) * 100;
      showRentCapitalization = rentCapitalizationPercent > 0 && Number.isFinite(rentCapitalizationPercent);
    }
    return {
      ratioTimes,
      horizonYears,
      paybackMonths,
      peakMonth,
      showDepositDisclaimer,
      showRentCapitalization,
      rentCapitalizationPercent,
    };
  }, [chartData, termYears, initialTotalCapital, rentMonthly]);

  const xTimesStr = (insights.ratioTimes >= 1 ? insights.ratioTimes : 1.1).toFixed(1);
  const timesWord = timesWordUtil(parseFloat(xTimesStr), locale);
  const yearsWord = yearsWordUtil(insights.horizonYears, locale);
  const showDepositDisclaimer = insights.showDepositDisclaimer ?? false;
  const horizonYears = insights.horizonYears;
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
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 40px -12px rgba(120,180,255,0.2)",
      }}
    >
      <div className="flex flex-shrink-0 items-center gap-2">
        <Sparkles className="mr-2 h-5 w-5 flex-shrink-0 text-amber-400/90" aria-hidden />
        <h3 className="mb-0 font-sans text-sm font-medium uppercase tracking-[-0.02em] text-zinc-400 leading-tight">
          AI-аналитика
        </h3>
      </div>
      <ul className="flex flex-col gap-4 text-sm leading-relaxed text-zinc-300">
        <li className="min-h-0 leading-relaxed">
          <span className="text-zinc-500">{tUtil("insightComparisonLabel", locale)} </span>
          <span className="font-medium text-white">
            {tUtil("insightComparisonSentence", locale)} {xTimesStr} {timesWord} {tUtil("insightComparisonSuffix", locale)} {horizonYears} {yearsWord}.
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
          <span className="font-medium text-amber-400/90">
            {tUtil("insightRatesForecast", locale)}
          </span>
        </li>
        {showDepositDisclaimer && (
          <li className="min-h-0">
            <span className="text-xs leading-relaxed text-amber-400/80">
              {tUtil("insightDepositDisclaimer", locale)}
            </span>
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
  const searchParams = useSearchParams();
  const configFromStore = useStore((s) => s.config);
  const loadConfigFromStorage = useStore((s) => s.loadConfigFromStorage);
  const fetchRates = useStore((s) => s.fetchRates);
  const { brand } = configFromStore;
  const exportTs = searchParams.get("ts");
  const showTsInReport = searchParams.get("showTs") !== "0";
  const isExportView = searchParams.get("export") === "1";

  const exportBrandFromUrl = isExportView
    ? parseExportBrandFromUrl(searchParams)
    : null;
  const adminBranding = typeof window !== "undefined" ? getAdminSettings().branding : null;
  const effectiveBrand = exportBrandFromUrl
    ? {
        companyName: exportBrandFromUrl.companyName || brand.companyName,
        productName: exportBrandFromUrl.productName || brand.productName,
        primaryColor: exportBrandFromUrl.primaryColor,
        logoUrl: exportBrandFromUrl.logoUrl || brand.logoUrl,
        contactPhone: exportBrandFromUrl.contactPhone ?? "",
      }
    : {
        ...brand,
        contactPhone: adminBranding?.contactPhone?.trim() ?? "",
      };

  useEffect(() => {
    loadConfigFromStorage();
    const handler = () => loadConfigFromStorage();
    window.addEventListener("ifsVisionAdminUpdated", handler);
    return () => window.removeEventListener("ifsVisionAdminUpdated", handler);
  }, [loadConfigFromStorage]);

  useEffect(() => {
    if (typeof window === "undefined" || isExportView) return;
    if (getAdminSettings().ratesAutoUpdate) {
      fetchRates();
    }
  }, [fetchRates, isExportView]);

  const price = useStore((s) => s.price);
  const downPercent = useStore((s) => s.downPercent);
  const ratePercent = useStore((s) => s.ratePercent);
  const termYears = useStore((s) => s.termYears);
  const rentalYieldPercent = useStore((s) => s.rentalYieldPercent);
  const setPrice = useStore((s) => s.setPrice);
  const setDownPercent = useStore((s) => s.setDownPercent);
  const setRatePercent = useStore((s) => s.setRatePercent);
  const setTermYears = useStore((s) => s.setTermYears);
  const setRentalYieldPercent = useStore((s) => s.setRentalYieldPercent);
  const currentScenario = useStore((s) => s.currentScenario);
  const setScenario = useStore((s) => s.setScenario);
  const setCurrency = useStore((s) => s.setCurrency);

  useEffect(() => {
    if (isExportView || typeof window === "undefined") return;
    const b = searchParams.get("b");
    const c = searchParams.get("c");
    const s = searchParams.get("s");
    const strategyKeys: Array<"investor" | "family" | "entry"> = ["investor", "family", "entry"];
    if (s !== null && s !== "") {
      const idx = parseInt(s, 10);
      if (Number.isFinite(idx) && idx >= 0 && idx <= 2) {
        setScenario(strategyKeys[idx]);
      }
    }
    if (b !== null && b !== "") {
      const num = parseInt(b, 10);
      if (Number.isFinite(num) && num >= 1_000_000 && num <= 100_000_000) {
        setPrice(num);
      }
    }
    if (c !== null && c !== "") {
      const cur = c.toUpperCase();
      if (cur === "RUB" || cur === "USD" || cur === "AED" || cur === "USDT") {
        setCurrency(cur as Currency);
      }
    }
  }, [searchParams, isExportView, setScenario, setPrice, setCurrency]);

  const exportCompare = searchParams.get("compare");
  const compareFromUrl =
    isExportView && exportCompare && ["investor", "family", "entry"].includes(exportCompare)
      ? (exportCompare as "investor" | "family" | "entry")
      : null;
  const [compareWithScenario, setCompareWithScenarioState] = useState<
    "investor" | "family" | "entry" | null
  >(null);
  const compareStrategy = compareWithScenario ?? compareFromUrl;

  const { formatCurrency: formatCurrencyStore, valueToDisplay: valueToDisplayStore, symbol: symbolStore, currency: storeCurrency } = useCurrencyDisplay();
  const { locale: storeLocale } = useTranslations();
  const currencyConfigs = useStore((s) => s.currencyConfigs);
  const urlLocale = searchParams.get("locale");
  const urlCurrency = searchParams.get("currency");
  const effectiveLocale = isExportView && urlLocale === "en" ? "en" : storeLocale;
  const effectiveCurrency: Currency = isExportView && (urlCurrency === "USD" || urlCurrency === "AED" || urlCurrency === "RUB" || urlCurrency === "USDT") ? urlCurrency : storeCurrency;
  const formatCurrency = (v: number, opt?: { maximumFractionDigits?: number }) =>
    isExportView && urlCurrency ? formatCurrencyUtil(v, effectiveCurrency, currencyConfigs[effectiveCurrency], opt) : formatCurrencyStore(v, opt);
  const valueToDisplay = (v: number) =>
    isExportView && urlCurrency ? toDisplayValue(v, currencyConfigs[effectiveCurrency].rateFromBase) : valueToDisplayStore(v);
  const symbol = effectiveCurrency === "USD" ? currencyConfigs[effectiveCurrency].symbol : ` ${currencyConfigs[effectiveCurrency].symbol}`;
  const t = (key: Parameters<typeof tUtil>[0]) => tUtil(key, effectiveLocale);
  const yearsWordEffective = (n: number) => yearsWordUtil(n, effectiveLocale);
  const STRATEGY_LABELS = { investor: t("strategyInvestor"), family: t("strategyFamily"), entry: t("strategyEntry") };

  const downPayment = useDownPayment();
  const loanAmount = useLoanAmount();
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhoneCode, setLeadPhoneCode] = useState("+7");
  const [leadPhone, setLeadPhone] = useState("");

  const calculated = useCalculatedData(compareStrategy);
  const {
    chartDataWithDeposit,
    annuity,
    taxDeductions,
    roi,
    rentMonthly,
    totalRent,
    finalValue,
    totalPayments,
    taxRefunds,
    verdictBenefit,
    verdictBenefitCompare,
    benefitDelta,
    compareScenarioLabel,
  } = calculated;

  const [liveTime, setLiveTime] = useState(() => getCurrentTimestamp());
  useEffect(() => {
    const id = setInterval(() => setLiveTime(getCurrentTimestamp()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (isGenerating) return;
    setIsGenerating(true);
    const root = document.documentElement;
    root.classList.add("is-exporting");
    try {
      const pageUrl = new URL(window.location.href);
      pageUrl.searchParams.set("export", "1");
      pageUrl.searchParams.set("ts", String(Date.now()));
      pageUrl.searchParams.set("showTs", configFromStore.security?.showTimestampInReport !== false ? "1" : "0");
      if (compareWithScenario) {
        pageUrl.searchParams.set("compare", compareWithScenario);
      }
      pageUrl.searchParams.set("locale", storeLocale);
      pageUrl.searchParams.set("currency", storeCurrency);
      pageUrl.searchParams.set("accentColor", encodeURIComponent(brand.primaryColor));
      pageUrl.searchParams.set("companyName", encodeURIComponent(brand.companyName));
      pageUrl.searchParams.set("logoUrl", encodeURIComponent(brand.logoUrl || ""));
      const contactPhone = getAdminSettings().branding.contactPhone?.trim() ?? "";
      if (contactPhone) pageUrl.searchParams.set("contactPhone", encodeURIComponent(contactPhone));
      const agencyName = brand.companyName || "Report";
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: pageUrl.toString(),
          agencyName,
          agencyLogoUrl: brand.logoUrl || undefined,
          locale: storeLocale,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "Неизвестная ошибка");
        let errorMessage: string;
        try {
          const json = JSON.parse(text) as { error?: string };
          errorMessage = typeof json?.error === "string" ? json.error : text;
        } catch {
          errorMessage = text || "Ошибка генерации отчёта";
        }
        alert(errorMessage);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Investment_Report.jpg";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setIsGenerating(false);
    } finally {
      root.classList.remove("is-exporting");
      setIsGenerating(false);
    }
  }, [isGenerating, configFromStore.security?.showTimestampInReport, compareWithScenario, storeLocale, storeCurrency, brand.primaryColor, brand.companyName, brand.logoUrl, brand.productName]);

  const strategyLabelForLead =
    currentScenario === "custom" ? t("currentScenario") : STRATEGY_LABELS[currentScenario];

  const handlePdfWithLead = useCallback(
    async (name: string, phone: string, countryCode: string) => {
      const fullPhone = (countryCode.trim() + (phone || "").replace(/\D/g, "")).trim() || undefined;
      try {
        const res = await fetch("/api/telegram/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || undefined,
            phone: fullPhone,
            strategy: strategyLabelForLead,
            roi: roi.roiPercent,
            companyName: brand.companyName || "Digital Twin",
            price,
            currency: storeCurrency,
            benefit: Math.max(0, verdictBenefit),
            magicLink: typeof window !== "undefined" ? window.location.href : "",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(typeof err?.error === "string" ? err.error : "Не удалось отправить заявку. Попробуйте позже.");
          return;
        }
      } catch {
        alert("Ошибка сети. Проверьте подключение и попробуйте снова.");
        return;
      }
      setPdfModalOpen(false);
      setLeadName("");
      setLeadPhone("");
      setLeadPhoneCode("+7");
      handleDownloadPDF();
    },
    [strategyLabelForLead, roi.roiPercent, brand.companyName, price, storeCurrency, verdictBenefit, handleDownloadPDF]
  );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.08 },
    },
  };

  const cardFloat = {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.search.includes("export=1")) {
      document.documentElement.classList.add("is-exporting");
    }
  }, []);

  const glassClass =
    "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl";

  const exportAccentStyle =
    isExportView && exportBrandFromUrl
      ? ({ ["--accent-color" as string]: effectiveBrand.primaryColor } as React.CSSProperties)
      : undefined;

  const gradientStyle =
    isExportView && exportBrandFromUrl
      ? {
          background: `radial-gradient(ellipse 80% 60% at 50% -20%, ${hexToRgba(effectiveBrand.primaryColor, 0.15)}, transparent)`,
        }
      : undefined;

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
            </div>
            <h2 className="mb-4 font-sans text-sm font-medium uppercase tracking-[-0.02em] text-zinc-400">
              {t("parameters")}
            </h2>
            <div className="space-y-6">
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

            <motion.div
              id="pdf-chart-wrap"
              variants={cardFloat}
              className={`${glassClass} min-h-[320px] p-6`}
            >
              <h3 className="mb-4 font-sans text-sm font-medium uppercase tracking-[-0.02em] text-zinc-500">
                Динамика роста чистого капитала
              </h3>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartDataWithDeposit}
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
                        const depositVal = Number(payload.find((e) => e.dataKey === "depositAccumulation")?.value ?? 0);
                        const compareVal = payload.find((e) => e.dataKey === "netEquityCompare")?.value;
                        const rowPayload = payload[0]?.payload as { propertyValueGrowth?: number; savedRentIndexed?: number } | undefined;
                        const propertyValueGrowth = Number(rowPayload?.propertyValueGrowth ?? 0);
                        const savedRentIndexed = Number(rowPayload?.savedRentIndexed ?? 0);
                        const currentMonth = typeof label === "number" ? label : 0;
                        const compareWithin10Y = currentMonth <= 120;
                        const chartUpTo120 = chartDataWithDeposit.filter((r) => r.month <= 120);
                        const crossoverRow = chartUpTo120.find((r) => r.netEquity >= r.depositAccumulation);
                        const crossoverMonth = crossoverRow?.month ?? null;
                        // Преимущество = разница между синхронизированными линиями (netEquity − depositAccumulation). В 0-й месяц = 0 ₽ (единая точка старта).
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
                              Ваш капитал в объекте
                            </p>
                            <p className="mt-1.5 font-sans text-[11px] text-white/50">
                              {t("tooltipPriceGrowth")}{" "}
                              <span className="font-medium tabular-nums text-white/90">{formatCurrency(propertyValueGrowth)}</span>
                            </p>
                            <p className="mt-0.5 font-sans text-[11px] text-white/50">
                              {t("tooltipRentAccumulated")}{" "}
                              <span className="font-medium tabular-nums text-white/90">{formatCurrency(savedRentIndexed)}</span>
                            </p>
                            <p className="mt-2 font-sans text-sm font-semibold tabular-nums font-mono text-[#8884d8] whitespace-nowrap">
                              {formatCurrency(depositVal)}
                            </p>
                            <p className="mt-0.5 font-sans text-[11px] text-white/50">
                              Банковский вклад
                            </p>
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
                      stroke="#007AFF"
                      strokeWidth={3}
                      fill="url(#balanceGradient)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: "#007AFF" }}
                      name="Недвижимость (Чистый актив)"
                    />
                    <Line
                      type="monotone"
                      dataKey="depositAccumulation"
                      stroke="#8884d8"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      name="Банковский вклад"
                      dot={false}
                      activeDot={{ r: 4, fill: "#8884d8", strokeWidth: 0 }}
                    />
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
                    {(() => {
                      const breakEvenPoint = chartDataWithDeposit.find(
                        (r: { isBreakEven?: boolean }) => r.isBreakEven
                      );
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

            <SmartInsights
              chartData={chartDataWithDeposit}
              termYears={termYears}
              locale={effectiveLocale}
              initialTotalCapital={price}
              rentMonthly={(price * (rentalYieldPercent / 100)) / 12}
            />

            <motion.div variants={cardFloat} className="flex justify-center">
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
                        {t("moreThan")} «{STRATEGY_LABELS[compareScenarioLabel as keyof typeof STRATEGY_LABELS]}».
                      </>
                    ) : (
                      <>
                        {t("youSaveMore")}{" "}
                        <span className="font-semibold text-amber-400">{STRATEGY_LABELS[compareScenarioLabel as keyof typeof STRATEGY_LABELS]}</span>
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
