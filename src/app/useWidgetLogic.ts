"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAdminSettings, getPartnerData } from "@/lib/admin-storage";
import { formatCurrency as formatCurrencyUtil, toDisplayValue } from "@/lib/formatCurrency";
import { t as tUtil, yearsWord as yearsWordUtil, monthWord as monthWordUtil, type TranslationKey } from "@/lib/translations";
import { useStore, useCurrencyDisplay, useTranslations } from "@/store/useStore";
import { useCalculatedData } from "@/store/useCalculatedData";
import { FinancialEngine } from "@/lib/engine";
import type { Currency, StoreConfig } from "@/store/useStore";
import type { ChartRowWithDeposit } from "@/lib/engine/financialEngine";
import { generateExpertConclusion, getExpertConclusionMessage } from "@/services/finance";
import { RENT_REINVEST_RATE } from "@/config/constants";

export type ScenarioKey = "investor" | "family" | "entry";

export interface ExportBrand {
  primaryColor: string;
  companyName: string;
  productName: string;
  logoUrl: string;
  contactPhone: string;
}

export interface SmartInsightData {
  ratioTimes: number;
  horizonYears: number;
  paybackMonths: number | null;
  peakMonth: number | null;
  showDepositDisclaimer: boolean;
  showRentCapitalization: boolean;
  rentCapitalizationPercent: number;
}

export interface ChartRowForChart extends ChartRowWithDeposit {
  netEquityB?: number;
}

function parseExportBrandFromUrl(searchParams: URLSearchParams): ExportBrand | null {
  const accent = searchParams.get("accentColor");
  const company = searchParams.get("companyName");
  const logo = searchParams.get("logoUrl");
  const contact = searchParams.get("contactPhone");
  if (!accent && !company && !logo && !contact) return null;
  try {
    const primaryColor = (accent && decodeURIComponent(accent).trim()) || "#007AFF";
    const companyName = (company && decodeURIComponent(company).trim()) || "";
    const productName = companyName || "IFS Vision";
    const logoUrl = (logo && decodeURIComponent(logo).trim()) || "";
    const contactPhone = (contact && decodeURIComponent(contact).trim()) || "";
    return { primaryColor, companyName, productName, logoUrl, contactPhone };
  } catch {
    return null;
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace(/^#/, "").match(/^(..)(..)(..)$/);
  if (!m) return `rgba(59,130,246,${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getCurrentTimestamp(): string {
  return (
    new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Moscow",
      hour12: false,
    }).format(new Date()) + " (МСК)"
  );
}

export function formatTimestampFromEpoch(epochMs: number): string {
  return (
    new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Moscow",
      hour12: false,
    }).format(new Date(epochMs)) + " (МСК)"
  );
}

function rentStreamFv(rentMonthly: number, monthlyRate: number, n: number): number {
  if (monthlyRate === 0) return rentMonthly * n;
  return rentMonthly * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate);
}

function computeSmartInsights(
  chartData: ChartRowWithDeposit[],
  termYears: number,
  initialTotalCapital: number,
  rentMonthly: number
): SmartInsightData {
  const dataUpTo120 = chartData.filter((r) => r.month <= 120);
  const horizonYears = Math.min(termYears, 10);
  if (!dataUpTo120.length) {
    return {
      ratioTimes: 1.1,
      horizonYears,
      paybackMonths: null,
      peakMonth: null,
      showDepositDisclaimer: false,
      showRentCapitalization: false,
      rentCapitalizationPercent: 0,
    };
  }
  const last = dataUpTo120[dataUpTo120.length - 1];
  const lastDeposit = last.depositAccumulation;
  const ratioTimes =
    lastDeposit === 0 || !Number.isFinite(lastDeposit)
      ? 1.1
      : !Number.isFinite(last.netEquity / lastDeposit) || last.netEquity / lastDeposit <= 0
        ? 1.1
        : last.netEquity / lastDeposit;
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
  let showRentCapitalization = false;
  let rentCapitalizationPercent = 0;
  if (initialTotalCapital > 0 && rentMonthly > 0 && last.depositAccumulation > last.netEquity) {
    const r = RENT_REINVEST_RATE / 12;
    const n = 120;
    const fvRent = rentStreamFv(rentMonthly, r, n);
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
}

export interface UseWidgetLogicReturn {
  isExportView: boolean;
  exportTs: string | null;
  showTsInReport: boolean;
  effectiveBrand: ExportBrand;
  configFromStore: StoreConfig;
  price: number;
  downPercent: number;
  ratePercent: number;
  termYears: number;
  rentalYieldPercent: number;
  setPrice: (v: number) => void;
  setDownPercent: (v: number) => void;
  setRatePercent: (v: number) => void;
  setTermYears: (v: number) => void;
  setRentalYieldPercent: (v: number) => void;
  currentScenario: "custom" | ScenarioKey;
  setScenario: (s: ScenarioKey) => void;
  riskScenario: "none" | "stagnation" | "hyperinflation";
  setRiskScenario: (s: "none" | "stagnation" | "hyperinflation") => void;
  comparisonMode: boolean;
  setComparisonMode: (v: boolean) => void;
  inputsB: { price: number; downPercent: number; ratePercent: number; termYears: number; rentalYieldPercent: number };
  setInputsB: (patch: Partial<{ price: number; downPercent: number; ratePercent: number; termYears: number; rentalYieldPercent: number }>) => void;
  compareWithScenario: ScenarioKey | null;
  setCompareWithScenarioState: React.Dispatch<React.SetStateAction<ScenarioKey | null>>;
  compareStrategy: ScenarioKey | null;
  effectiveLocale: "ru" | "en";
  formatCurrency: (v: number, opt?: { maximumFractionDigits?: number }) => string;
  valueToDisplay: (v: number) => number;
  symbol: string;
  t: (key: TranslationKey) => string;
  yearsWordEffective: (n: number) => string;
  STRATEGY_LABELS: Record<ScenarioKey, string>;
  isGenerating: boolean;
  pdfModalOpen: boolean;
  setPdfModalOpen: (v: boolean) => void;
  leadName: string;
  setLeadName: (v: string) => void;
  leadPhoneCode: string;
  setLeadPhoneCode: (v: string) => void;
  leadPhone: string;
  setLeadPhone: (v: string) => void;
  objectTab: "A" | "B";
  setObjectTab: (v: "A" | "B") => void;
  calculated: ReturnType<typeof useCalculatedData>;
  chartDataForChart: ChartRowForChart[];
  chartDataWithDeposit: ChartRowWithDeposit[];
  chartDataWithDepositB: ChartRowWithDeposit[] | null;
  roiBPercent: number;
  crossoverInsight: { crossoverMonth: number | null; crossoverYear: number | null; finalCapitalRub: number };
  expertConclusion: ReturnType<typeof generateExpertConclusion>;
  expertTextForReport: string;
  finalCapitalForReport: number;
  liveTime: string;
  isGeneratingJpg: boolean;
  reportTemplateRef: React.RefObject<HTMLDivElement | null>;
  leadPartnerId: string | null;
  strategyLabelForLead: string;
  smartInsights: SmartInsightData;
  handleDownloadReportJpg: () => Promise<void>;
  handleDownloadPDF: () => Promise<void>;
  handlePdfWithLead: (name: string, phone: string, countryCode: string) => Promise<void>;
  container: { hidden: { opacity: number }; show: { opacity: number; transition: { staggerChildren: number; delayChildren: number } } };
  cardFloat: { hidden: { opacity: number; y: number }; show: { opacity: number; y: number; transition: { duration: number; ease: readonly number[] } } };
  glassClass: string;
  exportAccentStyle: React.CSSProperties | undefined;
  gradientStyle: { background: string } | undefined;
}

export function useWidgetLogic(): UseWidgetLogicReturn {
  const searchParams = useSearchParams();
  const configFromStore = useStore((s) => s.config);
  const loadConfigFromStorage = useStore((s) => s.loadConfigFromStorage);
  const fetchRates = useStore((s) => s.fetchRates);
  const { brand } = configFromStore;
  const exportTs = searchParams.get("ts");
  const showTsInReport = searchParams.get("showTs") !== "0";
  const isExportView = searchParams.get("export") === "1";

  const exportBrandFromUrl = isExportView ? parseExportBrandFromUrl(searchParams) : null;
  const partnerIdFromUrl = searchParams.get("partner");
  const partnerData =
    !isExportView && typeof window !== "undefined" && partnerIdFromUrl
      ? getPartnerData(partnerIdFromUrl)
      : null;
  const adminBranding = typeof window !== "undefined" ? getAdminSettings().branding : null;
  const effectiveBrand = useMemo(() => {
    if (exportBrandFromUrl) {
      return {
        companyName: exportBrandFromUrl.companyName || brand.companyName,
        productName: exportBrandFromUrl.productName || brand.productName,
        primaryColor: exportBrandFromUrl.primaryColor,
        logoUrl: exportBrandFromUrl.logoUrl || brand.logoUrl,
        contactPhone: exportBrandFromUrl.contactPhone ?? "",
      };
    }
    if (partnerData) {
      return {
        companyName: partnerData.companyName,
        productName: partnerData.companyName,
        primaryColor: partnerData.primaryColor ?? brand.primaryColor,
        logoUrl: partnerData.logoUrl || brand.logoUrl,
        contactPhone: partnerData.contactPhone ?? "",
      };
    }
    return {
      ...brand,
      contactPhone: adminBranding?.contactPhone?.trim() ?? "",
    };
  }, [exportBrandFromUrl, partnerData, brand, adminBranding?.contactPhone]);

  const leadPartnerId = partnerData ? partnerData.id : null;
  const leadPartnerChatId = partnerData?.telegramChatId?.trim() ?? null;

  useEffect(() => {
    loadConfigFromStorage();
    const handler = () => loadConfigFromStorage();
    window.addEventListener("ifsVisionAdminUpdated", handler);
    return () => window.removeEventListener("ifsVisionAdminUpdated", handler);
  }, [loadConfigFromStorage]);

  useEffect(() => {
    if (typeof window === "undefined" || isExportView) return;
    if (getAdminSettings().ratesAutoUpdate) fetchRates();
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
  const riskScenario = useStore((s) => s.riskScenario);
  const setRiskScenario = useStore((s) => s.setRiskScenario);
  const comparisonMode = useStore((s) => s.comparisonMode);
  const setComparisonMode = useStore((s) => s.setComparisonMode);
  const inputsB = useStore((s) => s.inputsB);
  const setInputsB = useStore((s) => s.setInputsB);
  const setCurrency = useStore((s) => s.setCurrency);

  useEffect(() => {
    if (isExportView || typeof window === "undefined") return;
    const b = searchParams.get("b");
    const c = searchParams.get("c");
    const s = searchParams.get("s");
    const strategyKeys: ScenarioKey[] = ["investor", "family", "entry"];
    if (s !== null && s !== "") {
      const idx = parseInt(s, 10);
      if (Number.isFinite(idx) && idx >= 0 && idx <= 2) setScenario(strategyKeys[idx]);
    }
    if (b !== null && b !== "") {
      const num = parseInt(b, 10);
      if (Number.isFinite(num) && num >= 1_000_000 && num <= 100_000_000) setPrice(num);
    }
    if (c !== null && c !== "") {
      const cur = c.toUpperCase();
      if (cur === "RUB" || cur === "USD" || cur === "AED" || cur === "USDT") setCurrency(cur as Currency);
    }
  }, [searchParams, isExportView, setScenario, setPrice, setCurrency]);

  const exportCompare = searchParams.get("compare");
  const compareFromUrl =
    isExportView && exportCompare && (["investor", "family", "entry"] as const).includes(exportCompare as ScenarioKey)
      ? (exportCompare as ScenarioKey)
      : null;
  const [compareWithScenario, setCompareWithScenarioState] = useState<ScenarioKey | null>(null);
  const compareStrategy = compareWithScenario ?? compareFromUrl;

  const { formatCurrency: formatCurrencyStore, valueToDisplay: valueToDisplayStore, currency: storeCurrency } = useCurrencyDisplay();
  const { locale: storeLocale } = useTranslations();
  const currencyConfigs = useStore((s) => s.currencyConfigs);
  const urlLocale = searchParams.get("locale");
  const urlCurrency = searchParams.get("currency");
  const effectiveLocale = isExportView && urlLocale === "en" ? "en" : storeLocale;
  const effectiveCurrency: Currency =
    isExportView && (urlCurrency === "USD" || urlCurrency === "AED" || urlCurrency === "RUB" || urlCurrency === "USDT")
      ? (urlCurrency as Currency)
      : storeCurrency;
  const formatCurrency = useCallback(
    (v: number, opt?: { maximumFractionDigits?: number }) =>
      isExportView && urlCurrency
        ? formatCurrencyUtil(v, effectiveCurrency, currencyConfigs[effectiveCurrency], opt)
        : formatCurrencyStore(v, opt),
    [isExportView, urlCurrency, effectiveCurrency, currencyConfigs, formatCurrencyStore]
  );
  const valueToDisplay = useCallback(
    (v: number) =>
      isExportView && urlCurrency ? toDisplayValue(v, currencyConfigs[effectiveCurrency].rateFromBase) : valueToDisplayStore(v),
    [isExportView, urlCurrency, currencyConfigs, effectiveCurrency, valueToDisplayStore]
  );
  const symbol = effectiveCurrency === "USD" ? currencyConfigs[effectiveCurrency].symbol : ` ${currencyConfigs[effectiveCurrency].symbol}`;
  const t = useCallback((key: TranslationKey) => tUtil(key, effectiveLocale), [effectiveLocale]);
  const yearsWordEffective = useCallback((n: number) => yearsWordUtil(n, effectiveLocale), [effectiveLocale]);
  const STRATEGY_LABELS = useMemo(
    () => ({ investor: t("strategyInvestor"), family: t("strategyFamily"), entry: t("strategyEntry") }),
    [t]
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhoneCode, setLeadPhoneCode] = useState("+7");
  const [leadPhone, setLeadPhone] = useState("");
  const [objectTab, setObjectTab] = useState<"A" | "B">("A");
  const [liveTime, setLiveTime] = useState(getCurrentTimestamp);
  const [isGeneratingJpg, setIsGeneratingJpg] = useState(false);
  const reportTemplateRef = useRef<HTMLDivElement>(null);

  const calculated = useCalculatedData(compareStrategy);
  const { chartDataWithDeposit, chartDataWithDepositB, verdictBenefit } = calculated;

  const chartDataForChart = useMemo((): ChartRowForChart[] => {
    if (!comparisonMode || !chartDataWithDepositB?.length) return chartDataWithDeposit;
    const byMonthB = new Map(chartDataWithDepositB.map((r) => [r.month, r.netEquity]));
    return chartDataWithDeposit.map((row) => ({
      ...row,
      netEquityB: byMonthB.get(row.month) ?? row.netEquity,
    }));
  }, [comparisonMode, chartDataWithDeposit, chartDataWithDepositB]);

  const roiBPercent = useMemo(() => {
    if (!comparisonMode) return 0;
    const downB = inputsB.price * (inputsB.downPercent / 100);
    return FinancialEngine.roi({
      price: inputsB.price,
      downPayment: downB,
      annualRentalYield: inputsB.rentalYieldPercent / 100,
      expenseRatio: 0.2,
    }).roiPercent;
  }, [comparisonMode, inputsB.price, inputsB.downPercent, inputsB.rentalYieldPercent]);

  const crossoverInsight = useMemo(() => {
    if (!chartDataWithDeposit.length)
      return { crossoverMonth: null as number | null, crossoverYear: null as number | null, finalCapitalRub: 0 };
    const crossoverRow = chartDataWithDeposit.find((r) => r.month > 0 && r.netEquity >= r.depositAccumulation);
    const crossoverMonth = crossoverRow?.month ?? null;
    const crossoverYear = crossoverMonth != null ? Math.ceil(crossoverMonth / 12) : null;
    const lastRow = chartDataWithDeposit[chartDataWithDeposit.length - 1];
    const finalCapitalRub = lastRow?.netEquity ?? 0;
    return { crossoverMonth, crossoverYear, finalCapitalRub };
  }, [chartDataWithDeposit]);

  const expertConclusion = useMemo(() => generateExpertConclusion({ chartDataWithDeposit }), [chartDataWithDeposit]);
  const expertTextForReport = useMemo(
    () => getExpertConclusionMessage(expertConclusion, effectiveLocale),
    [expertConclusion, effectiveLocale]
  );
  const finalCapitalForReport =
    chartDataWithDeposit.length > 0 ? (chartDataWithDeposit[chartDataWithDeposit.length - 1]?.netEquity ?? 0) : 0;

  const rentMonthly = (price * (rentalYieldPercent / 100)) / 12;
  const smartInsights = useMemo(
    () => computeSmartInsights(chartDataWithDeposit, termYears, price, rentMonthly),
    [chartDataWithDeposit, termYears, price, rentMonthly]
  );

  useEffect(() => {
    const id = setInterval(() => setLiveTime(getCurrentTimestamp()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleDownloadReportJpg = useCallback(async () => {
    if (typeof window === "undefined" || !reportTemplateRef.current || isGeneratingJpg) return;
    const html2canvas = (await import("html2canvas")).default;
    setIsGeneratingJpg(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const canvas = await html2canvas(reportTemplateRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById("report-container");
          if (el) (el as HTMLElement).style.left = "0";
        },
      });
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "IFS_Report.jpg";
      a.click();
    } catch (err) {
      alert("Ошибка: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGeneratingJpg(false);
    }
  }, [isGeneratingJpg]);

  const handleDownloadPDF = useCallback(async () => {
    if (typeof window === "undefined" || isGenerating) return;
    setIsGenerating(true);
    const root = document.documentElement;
    root.classList.add("is-exporting");
    try {
      const pageUrl = new URL(window.location.href);
      pageUrl.searchParams.set("export", "1");
      pageUrl.searchParams.set("ts", String(Date.now()));
      pageUrl.searchParams.set("showTs", configFromStore.security?.showTimestampInReport !== false ? "1" : "0");
      if (compareWithScenario) pageUrl.searchParams.set("compare", compareWithScenario);
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
    } finally {
      root.classList.remove("is-exporting");
      setIsGenerating(false);
    }
  }, [
    isGenerating,
    configFromStore.security?.showTimestampInReport,
    compareWithScenario,
    storeLocale,
    storeCurrency,
    brand.primaryColor,
    brand.companyName,
    brand.logoUrl,
  ]);

  const strategyLabelForLead = currentScenario === "custom" ? t("currentScenario") : STRATEGY_LABELS[currentScenario as ScenarioKey];

  const handlePdfWithLead = useCallback(
    async (name: string, phone: string, countryCode: string) => {
      const fullPhone = (countryCode.trim() + (phone || "").replace(/\D/g, "")).trim() || undefined;
      try {
        const body: Record<string, unknown> = {
          name: name.trim() || undefined,
          phone: fullPhone,
          strategy: strategyLabelForLead,
          roi: calculated.roi.roiPercent,
          companyName: effectiveBrand.companyName || "Digital Twin",
          price,
          currency: storeCurrency,
          benefit: Math.max(0, verdictBenefit),
          magicLink: typeof window !== "undefined" ? window.location.href : "",
        };
        if (leadPartnerId) body.partnerId = leadPartnerId;
        if (leadPartnerChatId) body.chatId = leadPartnerChatId;
        const res = await fetch("/api/telegram/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
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
    [
      strategyLabelForLead,
      calculated.roi.roiPercent,
      effectiveBrand.companyName,
      price,
      storeCurrency,
      verdictBenefit,
      handleDownloadPDF,
      leadPartnerId,
      leadPartnerChatId,
    ]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.search.includes("export=1")) document.documentElement.classList.add("is-exporting");
  }, []);

  const container = useMemo(
    () => ({
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
    }),
    []
  );
  const cardFloat = useMemo(
    () => ({
      hidden: { opacity: 0, y: 24 },
      show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } },
    }),
    []
  );

  const glassClass = "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl";
  const exportAccentStyle =
    isExportView && exportBrandFromUrl
      ? ({ ["--accent-color" as string]: effectiveBrand.primaryColor } as React.CSSProperties)
      : undefined;
  const gradientStyle =
    isExportView && exportBrandFromUrl
      ? { background: `radial-gradient(ellipse 80% 60% at 50% -20%, ${hexToRgba(effectiveBrand.primaryColor, 0.15)}, transparent)` }
      : undefined;

  return {
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
  };
}

export { monthWordUtil };
