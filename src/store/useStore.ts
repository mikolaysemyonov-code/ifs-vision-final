"use client";

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { getAdminSettings } from "@/lib/admin-storage";
import { config } from "@/lib/config";
import { formatCurrency as formatCurrencyUtil, toDisplayValue } from "@/lib/formatCurrency";
import { t as tUtil, yearsWord as yearsWordUtil, type TranslationKey } from "@/lib/translations";
import { FinancialEngine } from "@/lib/engine";
import type { ChartDataPoint } from "@/lib/engine";

/** Подписывайтесь только на нужные поля (селекторы), чтобы тяжёлые компоненты не ререндерились при изменении других частей стейта. */

export type Currency = "RUB" | "USD" | "AED" | "USDT";

export type Locale = "ru" | "en";

export interface CurrencyConfig {
  symbol: string;
  locale: string;
  /** Курс к базе (RUB): 1 единица валюты = rateFromBase ₽ */
  rateFromBase: number;
}

export interface ExchangeRates {
  USD: number;
  AED: number;
}

function getCurrencyConfigs(
  s: { currencyRates?: { USD: number; AED: number }; usdtFeePercent?: number },
  liveRates?: ExchangeRates | null
): Record<Currency, CurrencyConfig> {
  const rates = liveRates ?? s.currencyRates ?? { USD: 90, AED: 25 };
  const fee = typeof s.usdtFeePercent === "number" ? s.usdtFeePercent / 100 : 0;
  const usdtRate = rates.USD * (1 + fee);
  return {
    RUB: { symbol: "₽", locale: "ru-RU", rateFromBase: 1 },
    USD: { symbol: "$", locale: "en-US", rateFromBase: rates.USD },
    AED: { symbol: "AED", locale: "ar-AE", rateFromBase: rates.AED },
    USDT: { symbol: "USDT", locale: "en-US", rateFromBase: usdtRate },
  };
}

export type ScenarioType = "custom" | "investor" | "family" | "entry";

/** Ключи сценариев, включая 'custom'. В scenarioPresets только пресеты (investor, family, entry), без 'custom'. */
type ScenarioPresetKey = "custom" | "investor" | "family" | "entry";

/** Конфиг бренда и базовых ставок: при инициализации загружается из localStorage, иначе IFS Vision + Apple Blue. */
export interface StoreConfig {
  brand: {
    companyName: string;
    productName: string;
    primaryColor: string;
    logoUrl: string;
  };
  /** Глобальная инфляция, % (например 4). */
  inflationRate: number;
  security: {
    showTimestampInReport: boolean;
  };
  baseRates: {
    defaultRatePercent: number;
    priceGrowthPercent: number;
  };
}

const DEFAULT_STORE_CONFIG: StoreConfig = {
  brand: {
    companyName: "IFS Vision",
    productName: "IFS Vision",
    primaryColor: "#007AFF",
    logoUrl: "/logo.png",
  },
  inflationRate: 4,
  security: { showTimestampInReport: true },
  baseRates: {
    defaultRatePercent: 18,
    priceGrowthPercent: 6,
  },
};

function getConfigFromStorage(): StoreConfig {
  if (typeof window === "undefined") return DEFAULT_STORE_CONFIG;
  const s = getAdminSettings();
  const family = s.rates.family;
  const companyName =
    (s.branding.agencyName && s.branding.agencyName.trim()) || s.branding.companyName || DEFAULT_STORE_CONFIG.brand.companyName;
  const logoUrl =
    (s.branding.agencyLogoUrl && s.branding.agencyLogoUrl.trim()) || s.branding.logoUrl || DEFAULT_STORE_CONFIG.brand.logoUrl;
  return {
    brand: {
      companyName,
      productName: companyName,
      primaryColor: s.branding.primaryColor || DEFAULT_STORE_CONFIG.brand.primaryColor,
      logoUrl,
    },
    inflationRate:
      typeof s.inflationRate === "number" && Number.isFinite(s.inflationRate)
        ? s.inflationRate
        : DEFAULT_STORE_CONFIG.inflationRate,
    security: {
      showTimestampInReport: s.security?.showTimestampInReport ?? DEFAULT_STORE_CONFIG.security.showTimestampInReport,
    },
    baseRates: {
      defaultRatePercent: family.bankRate,
      priceGrowthPercent: family.priceGrowth,
    },
  };
}

export interface FinanceState {
  /** Бренд и базовые ставки из админки (localStorage) или IFS Vision + Apple Blue */
  config: StoreConfig;
  /** Перезагрузить config из localStorage (вызвать при монтировании и после сохранения в админке) */
  loadConfigFromStorage: () => void;
  /** Цена объекта, ₽ */
  price: number;
  /** Первоначальный взнос, % от цены (0–100) */
  downPercent: number;
  /** Годовая ставка, % (0–100) */
  ratePercent: number;
  /** Срок кредита, лет */
  termYears: number;
  /** Годовая доходность от аренды, % (для ROI) */
  rentalYieldPercent: number;
  /** Текущий сценарий: custom при ручной настройке или выбранный пресет */
  currentScenario: ScenarioType;
  /** Выбранная валюта отображения (база расчётов — RUB) */
  currency: Currency;
  /** Метаданные и курсы валют (обновляются при loadConfigFromStorage или fetchRates) */
  currencyConfigs: Record<Currency, CurrencyConfig>;
  /** Живые курсы с /api/rates (при включённом автообновлении подставляются в currencyConfigs) */
  exchangeRates: ExchangeRates | null;
  /** Язык интерфейса (ru | en) */
  locale: Locale;
  /** Сценарий риска Black Swan: none | stagnation (падение цен) | hyperinflation (рост индексации аренды) */
  riskScenario: "none" | "stagnation" | "hyperinflation";
  /** Режим сравнения двух ЖК: Объект А vs Объект Б */
  comparisonMode: boolean;
  /** Входные данные для Объекта Б (цена, ставка, ПВ и т.д.) */
  inputsB: {
    price: number;
    downPercent: number;
    ratePercent: number;
    termYears: number;
    rentalYieldPercent: number;
  };
  /** Загрузить курсы с /api/rates и обновить exchangeRates (и currencyConfigs при ratesAutoUpdate) */
  fetchRates: (opts?: { revalidate?: boolean }) => Promise<void>;
  setPrice: (value: number) => void;
  setDownPercent: (value: number) => void;
  setRatePercent: (value: number) => void;
  setTermYears: (value: number) => void;
  setRentalYieldPercent: (value: number) => void;
  setScenario: (type: ScenarioPresetKey) => void;
  setCurrency: (currency: Currency) => void;
  setLocale: (locale: Locale) => void;
  setRiskScenario: (scenario: "none" | "stagnation" | "hyperinflation") => void;
  setComparisonMode: (enabled: boolean) => void;
  setInputsB: (patch: Partial<FinanceState["inputsB"]>) => void;
}

const { defaults, scenarioPresets } = config;

const initialSettings = typeof window === "undefined" ? null : getAdminSettings();

export const useStore = create<FinanceState>((set) => ({
  config: getConfigFromStorage(),
  loadConfigFromStorage: () => {
    const s = getAdminSettings();
    set({
      config: getConfigFromStorage(),
      currencyConfigs: getCurrencyConfigs(s),
      currency: s.defaultCurrency ?? "RUB",
      locale: s.defaultLocale ?? "ru",
    });
  },
  exchangeRates: null,
  fetchRates: async (opts) => {
    const url = opts?.revalidate ? "/api/rates?revalidate=1" : "/api/rates";
    const res = await fetch(url);
    if (!res.ok) return;
    const data = (await res.json()) as ExchangeRates;
    if (typeof data?.USD !== "number" || typeof data?.AED !== "number") return;
    const s = getAdminSettings();
    if (!s.ratesAutoUpdate) return;
    set({
      exchangeRates: data,
      currencyConfigs: getCurrencyConfigs(s, data),
    });
  },

  price: defaults.price,
  downPercent: defaults.downPercent,
  ratePercent: defaults.ratePercent,
  termYears: defaults.termYears,
  rentalYieldPercent: defaults.rentalYieldPercent,
  currentScenario: "custom",
  currency: initialSettings?.defaultCurrency ?? "RUB",
  locale: initialSettings?.defaultLocale ?? "ru",
  riskScenario: "none",
  comparisonMode: false,
  inputsB: {
    price: defaults.price,
    downPercent: defaults.downPercent,
    ratePercent: defaults.ratePercent,
    termYears: defaults.termYears,
    rentalYieldPercent: defaults.rentalYieldPercent,
  },
  currencyConfigs:
    typeof window === "undefined"
      ? getCurrencyConfigs({ currencyRates: { USD: 90, AED: 25 }, usdtFeePercent: 0 })
      : getCurrencyConfigs(getAdminSettings()),
  setPrice: (value) =>
    set({ price: Math.max(0, value), currentScenario: "custom" }),
  setDownPercent: (value) =>
    set({
      downPercent: Math.max(0, Math.min(100, value)),
      currentScenario: "custom",
    }),
  setRatePercent: (value) =>
    set({
      ratePercent: Math.max(0, Math.min(100, value)),
      currentScenario: "custom",
    }),
  setTermYears: (value) =>
    set({
      termYears: Math.max(1, Math.min(30, value)),
      currentScenario: "custom",
    }),
  setRentalYieldPercent: (value) =>
    set({ rentalYieldPercent: Math.max(0, Math.min(20, value)) }),
  setScenario: (type) =>
    set((state) =>
      type === "custom"
        ? { currentScenario: "custom" }
        : { currentScenario: type, ...scenarioPresets[type] }
    ),
  setCurrency: (currency) => set({ currency }),
  setLocale: (locale) => set({ locale }),
  setRiskScenario: (scenario) => set({ riskScenario: scenario }),
  setComparisonMode: (enabled) => set({ comparisonMode: enabled }),
  setInputsB: (patch) =>
    set((state) => ({
      inputsB: {
        ...state.inputsB,
        ...patch,
        price: Math.max(0, patch.price ?? state.inputsB.price),
        downPercent: Math.max(0, Math.min(100, patch.downPercent ?? state.inputsB.downPercent)),
        ratePercent: Math.max(0, Math.min(100, patch.ratePercent ?? state.inputsB.ratePercent)),
        termYears: Math.max(1, Math.min(30, patch.termYears ?? state.inputsB.termYears)),
        rentalYieldPercent: Math.max(0, Math.min(20, patch.rentalYieldPercent ?? state.inputsB.rentalYieldPercent)),
      },
    })),
}));

/** Первоначальный взнос в рублях */
export function useDownPayment(): number {
  const price = useStore((s) => s.price);
  const downPercent = useStore((s) => s.downPercent);
  return Math.round((price * downPercent) / 100);
}

/** Сумма кредита в рублях */
export function useLoanAmount(): number {
  const price = useStore((s) => s.price);
  const down = useDownPayment();
  return Math.max(0, price - down);
}

/** Хук: форматирование и конвертация для отображения в выбранной валюте (все значения передаются в RUB). */
export function useCurrencyDisplay(): {
  /** Отформатированная строка суммы (например "1 234 567 ₽" или "$13,333.33") */
  formatCurrency: (valueInRub: number, options?: { maximumFractionDigits?: number }) => string;
  /** Значение в выбранной валюте для анимации (AnimatedNumber) */
  valueToDisplay: (valueInRub: number) => number;
  /** Символ валюты с пробелом для суффикса */
  symbol: string;
  currency: Currency;
} {
  const currency = useStore((s) => s.currency);
  const configs = useStore((s) => s.currencyConfigs);
  const cfg = configs[currency];
  return {
    formatCurrency: (valueInRub: number, options?: { maximumFractionDigits?: number }) =>
      formatCurrencyUtil(valueInRub, currency, cfg, options),
    valueToDisplay: (valueInRub: number) => toDisplayValue(valueInRub, cfg.rateFromBase),
    symbol: currency === "USD" ? cfg.symbol : ` ${cfg.symbol}`,
    currency,
  };
}

/** Хук: переводы по текущей локали. */
export function useTranslations(): {
  t: (key: TranslationKey) => string;
  locale: Locale;
  yearsWord: (n: number) => string;
} {
  const locale = useStore((s) => s.locale);
  return {
    t: (key: TranslationKey) => tUtil(key, locale),
    locale,
    yearsWord: (n: number) => yearsWordUtil(n, locale),
  };
}

/** Вычисляемый селектор: данные для графиков { month, balance, interest } */
export function getChartData(state: FinanceState): ChartDataPoint[] {
  const loanAmount = state.price * (1 - state.downPercent / 100);
  return FinancialEngine.getAmortizationSchedule({
    principal: loanAmount,
    annualRate: state.ratePercent / 100,
    termYears: state.termYears,
  });
}

const chartDataInputSelector = (s: FinanceState) => ({
  price: s.price,
  downPercent: s.downPercent,
  ratePercent: s.ratePercent,
  termYears: s.termYears,
});

const chartDataInputBSelector = (s: FinanceState) => ({
  price: s.inputsB.price,
  downPercent: s.inputsB.downPercent,
  ratePercent: s.inputsB.ratePercent,
  termYears: s.inputsB.termYears,
});

/**
 * Хук: данные для графика с отложенным обновлением через requestAnimationFrame,
 * чтобы не блокировать UI-поток (60 FPS). Массив стабилен при неизменных входных данных.
 */
export function useChartData(): ChartDataPoint[] {
  const { price, downPercent, ratePercent, termYears } = useStore(
    useShallow(chartDataInputSelector)
  );
  const chartData = useMemo(
    () =>
      FinancialEngine.getAmortizationSchedule({
        principal: price * (1 - downPercent / 100),
        annualRate: ratePercent / 100,
        termYears,
      }),
    [price, downPercent, ratePercent, termYears]
  );
  const [displayedData, setDisplayedData] = useState<ChartDataPoint[]>(chartData);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDisplayedData(chartData));
    return () => cancelAnimationFrame(id);
  }, [chartData]);

  return displayedData;
}

/** График погашения для Объекта Б (Comparison Mode). */
export function useChartDataB(): ChartDataPoint[] {
  const { price, downPercent, ratePercent, termYears } = useStore(
    useShallow(chartDataInputBSelector)
  );
  return useMemo(
    () =>
      FinancialEngine.getAmortizationSchedule({
        principal: price * (1 - downPercent / 100),
        annualRate: ratePercent / 100,
        termYears,
      }),
    [price, downPercent, ratePercent, termYears]
  );
}

