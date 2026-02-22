"use client";

/**
 * Настройки админ-панели (MVP: localStorage).
 * Главная страница может читать переопределения через getAdminOverrides() на клиенте.
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "ifsVisionAdmin";

export interface AdminBranding {
  companyName: string;
  primaryColor: string;
  logoUrl: string;
  /** Название агентства: заголовок симулятора и имя файла PDF */
  agencyName: string;
  /** Ссылка на логотип агентства: шапка симулятора и хедер PDF */
  agencyLogoUrl: string;
  /** Телефон для WhatsApp брокера: шапка сайта и подвал PDF */
  contactPhone: string;
}

export interface AdminTelegram {
  botToken: string;
  chatId: string;
}

/** Один финансовый профиль: ставка банка, налог, рост цен (в %). */
export interface AdminRatesProfile {
  bankRate: number;
  taxRate: number;
  priceGrowth: number;
}

/** Три профиля: инвестиция, семья, старт. */
export interface AdminRates {
  investment: AdminRatesProfile;
  family: AdminRatesProfile;
  start: AdminRatesProfile;
}

export type AutoLockMinutes = 0 | 5 | 15 | 30;

export interface AdminSecurity {
  /** Автоблокировка: 0 = выкл, иначе минуты неактивности */
  autoLockMinutes: AutoLockMinutes;
  /** Показывать дату/время формирования в PDF-отчёте */
  showTimestampInReport: boolean;
  /** Водяной знак на PDF-отчёте */
  pdfWatermark: boolean;
  /** Акцентная кнопка «Скачать PDF» (золотая/синяя), напр. в режиме презентации */
  pdfButtonAccent: boolean;
}

/** Валюта отображения в симуляторе (база расчётов — RUB). */
export type AdminCurrency = "RUB" | "USD" | "AED";

/** Курсы валют к базе (RUB): сколько ₽ за 1 единицу валюты (например 1 USD = 90 ₽). */
export interface AdminCurrencyRates {
  USD: number;
  AED: number;
}

/** Включить автообновление курсов с API (при выключении — только ручной ввод). */
export type AdminCurrencyRatesAutoUpdate = boolean;

/** Комиссия USDT к USD, % (0–10). Обычно 0, можно 1–2. */
export type AdminUsdtFeePercent = number;

/** Язык интерфейса по умолчанию */
export type AdminLocale = "ru" | "en";

export interface AdminSettings {
  branding: AdminBranding;
  telegram: AdminTelegram;
  /** Глобальная инфляция, % (например 4) */
  inflationRate: number;
  /** Пароль входа в админку (для отображения/смены в UI); проверка входа только через API */
  adminPassword: string;
  /** Время последнего успешного входа (ISO строка) */
  lastLogin: string;
  security: AdminSecurity;
  rates: AdminRates;
  /** Основная валюта по умолчанию в симуляторе */
  defaultCurrency: AdminCurrency;
  /** Курсы к рублю: 1 USD = N ₽, 1 AED = M ₽ */
  currencyRates: AdminCurrencyRates;
  /** Автообновление курсов с /api/rates (при выключении — только ручной ввод) */
  ratesAutoUpdate: boolean;
  /** Комиссия USDT к USD, % (0–10) */
  usdtFeePercent: number;
  /** Язык интерфейса по умолчанию */
  defaultLocale: AdminLocale;
  /** Годовая ставка по банковскому вкладу для графика сравнения (0–1, например 0.18 = 18%) */
  depositRate: number;
}

const defaultRatesProfile = (): AdminRatesProfile => ({
  bankRate: 18,
  taxRate: 13,
  priceGrowth: 5,
});

const defaultSettings: AdminSettings = {
  branding: {
    companyName: "Digital Twin Studio",
    primaryColor: "#007AFF",
    logoUrl: "/logo.png",
    agencyName: "",
    agencyLogoUrl: "",
    contactPhone: "",
  },
  telegram: {
    botToken: "",
    chatId: "",
  },
  inflationRate: 4,
  adminPassword: "",
  lastLogin: "",
  security: { autoLockMinutes: 5, showTimestampInReport: true, pdfWatermark: false, pdfButtonAccent: false },
  rates: {
    investment: defaultRatesProfile(),
    family: defaultRatesProfile(),
    start: defaultRatesProfile(),
  },
  defaultCurrency: "RUB",
  currencyRates: { USD: 90, AED: 25 },
  ratesAutoUpdate: false,
  usdtFeePercent: 0,
  defaultLocale: "ru",
  depositRate: 0.18,
};

function mergeRates(parsed: unknown): AdminRates {
  const def = defaultSettings.rates;
  if (!parsed || typeof parsed !== "object") return def;
  const p = parsed as Record<string, unknown>;
  const mergeProfile = (key: keyof AdminRates): AdminRatesProfile => {
    const raw = p[key];
    if (!raw || typeof raw !== "object") return def[key];
    const r = raw as Record<string, unknown>;
    return {
      bankRate: Number(r.bankRate) || def[key].bankRate,
      taxRate: Number(r.taxRate) || def[key].taxRate,
      priceGrowth: Number(r.priceGrowth) || def[key].priceGrowth,
    };
  };
  return {
    investment: mergeProfile("investment"),
    family: mergeProfile("family"),
    start: mergeProfile("start"),
  };
}

/** Миграция: старые данные с baseRates превращаем в rates (все три профиля из одного). */
function migrateFromBaseRates(parsed: Record<string, unknown>): AdminSettings | null {
  const base = parsed.baseRates as Record<string, unknown> | undefined;
  if (!base || typeof base !== "object") return null;
  const profile: AdminRatesProfile = {
    bankRate: Number(base.defaultRatePercent) ?? 18,
    taxRate: Number(base.taxPercent) ?? 13,
    priceGrowth: Number(base.priceGrowthPercent) ?? 5,
  };
  return {
    branding: { ...defaultSettings.branding, ...(parsed.branding as object), agencyName: defaultSettings.branding.agencyName, agencyLogoUrl: defaultSettings.branding.agencyLogoUrl, contactPhone: defaultSettings.branding.contactPhone },
    telegram: { ...defaultSettings.telegram, ...(parsed.telegram as object) },
    inflationRate: defaultSettings.inflationRate,
    adminPassword: defaultSettings.adminPassword,
    lastLogin: defaultSettings.lastLogin,
    security: defaultSettings.security,
    rates: { investment: { ...profile }, family: { ...profile }, start: { ...profile } },
    defaultCurrency: defaultSettings.defaultCurrency,
    currencyRates: defaultSettings.currencyRates,
    ratesAutoUpdate: defaultSettings.ratesAutoUpdate,
    usdtFeePercent: defaultSettings.usdtFeePercent,
    defaultLocale: defaultSettings.defaultLocale,
    depositRate: defaultSettings.depositRate,
  };
}

export function getAdminSettings(): AdminSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const inflationRate =
      typeof parsed.inflationRate === "number" && Number.isFinite(parsed.inflationRate)
        ? parsed.inflationRate
        : defaultSettings.inflationRate;
    const sec = parsed.security && typeof parsed.security === "object" ? (parsed.security as Record<string, unknown>) : null;
    const validMinutes = [0, 5, 15, 30] as const;
    const rawMinutes = sec?.autoLockMinutes;
    const autoLockMinutes = typeof rawMinutes === "number" && validMinutes.includes(rawMinutes as 0 | 5 | 15 | 30)
      ? (rawMinutes as AdminSecurity["autoLockMinutes"])
      : typeof sec?.autoLockEnabled === "boolean"
        ? (sec.autoLockEnabled ? 5 : 0)
        : defaultSettings.security.autoLockMinutes;
    const security: AdminSecurity = {
      autoLockMinutes,
      showTimestampInReport: typeof sec?.showTimestampInReport === "boolean" ? sec.showTimestampInReport : defaultSettings.security.showTimestampInReport,
      pdfWatermark: typeof sec?.pdfWatermark === "boolean" ? sec.pdfWatermark : defaultSettings.security.pdfWatermark,
      pdfButtonAccent: typeof sec?.pdfButtonAccent === "boolean" ? sec.pdfButtonAccent : defaultSettings.security.pdfButtonAccent,
    };
    const adminPassword = typeof parsed.adminPassword === "string" ? parsed.adminPassword : defaultSettings.adminPassword;
    const lastLogin = typeof parsed.lastLogin === "string" ? parsed.lastLogin : defaultSettings.lastLogin;
    const defaultCurrency: AdminCurrency =
      parsed.defaultCurrency === "USD" || parsed.defaultCurrency === "AED"
        ? parsed.defaultCurrency
        : defaultSettings.defaultCurrency;
    const rawRates = parsed.currencyRates;
    const currencyRates: AdminCurrencyRates =
      rawRates && typeof rawRates === "object" && typeof (rawRates as Record<string, unknown>).USD === "number" && typeof (rawRates as Record<string, unknown>).AED === "number"
        ? {
            USD: Math.max(0.001, Number((rawRates as Record<string, unknown>).USD)),
            AED: Math.max(0.001, Number((rawRates as Record<string, unknown>).AED)),
          }
        : defaultSettings.currencyRates;
    const defaultLocale: AdminLocale =
      parsed.defaultLocale === "en" ? "en" : defaultSettings.defaultLocale;
    const ratesAutoUpdate =
      typeof parsed.ratesAutoUpdate === "boolean" ? parsed.ratesAutoUpdate : defaultSettings.ratesAutoUpdate;
    const usdtFeePercent =
      typeof parsed.usdtFeePercent === "number" && parsed.usdtFeePercent >= 0 && parsed.usdtFeePercent <= 10
        ? parsed.usdtFeePercent
        : defaultSettings.usdtFeePercent;
    const depositRate =
      typeof parsed.depositRate === "number" && parsed.depositRate >= 0 && parsed.depositRate <= 1
        ? parsed.depositRate
        : defaultSettings.depositRate;

    const brandingRaw = parsed.branding && typeof parsed.branding === "object" ? (parsed.branding as Record<string, unknown>) : {};
    const branding: AdminBranding = {
      ...defaultSettings.branding,
      ...(parsed.branding as object),
      agencyName: typeof brandingRaw.agencyName === "string" ? brandingRaw.agencyName : defaultSettings.branding.agencyName,
      agencyLogoUrl: typeof brandingRaw.agencyLogoUrl === "string" ? brandingRaw.agencyLogoUrl : defaultSettings.branding.agencyLogoUrl,
      contactPhone: typeof brandingRaw.contactPhone === "string" ? brandingRaw.contactPhone : defaultSettings.branding.contactPhone,
    };
    if (parsed.rates && typeof parsed.rates === "object") {
      return {
        branding,
        telegram: { ...defaultSettings.telegram, ...(parsed.telegram as object) },
        inflationRate,
        adminPassword,
        lastLogin,
        security,
        rates: mergeRates(parsed.rates),
        defaultCurrency,
        currencyRates,
        ratesAutoUpdate,
        usdtFeePercent,
        defaultLocale,
        depositRate,
      };
    }
    const migrated = migrateFromBaseRates(parsed);
    if (migrated) return { ...migrated, inflationRate, adminPassword, lastLogin, security, defaultCurrency, currencyRates, ratesAutoUpdate, usdtFeePercent, defaultLocale, depositRate };
    return defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function setAdminSettings(settings: AdminSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event("ifsVisionAdminUpdated"));
  } catch {
    // ignore storage errors
  }
}

export type AdminOverrides = Partial<{
  brand: Partial<AdminBranding & { productName: string }>;
  defaults: { ratePercent?: number };
  economics: { propertyGrowthRate?: number; inflationRate?: number };
}>;

/**
 * Переопределения для слияния с config на главной (только на клиенте).
 */
export function getAdminOverrides(): AdminOverrides {
  const s = getAdminSettings();
  const overrides: AdminOverrides = {};
  const companyName = (s.branding.agencyName ?? s.branding.companyName) || "";
  const logoUrl = (s.branding.agencyLogoUrl ?? s.branding.logoUrl) || "";
  if (companyName || s.branding.companyName || s.branding.primaryColor || logoUrl || s.branding.logoUrl) {
    overrides.brand = {
      companyName: companyName || s.branding.companyName,
      productName: companyName || s.branding.companyName,
      primaryColor: s.branding.primaryColor,
      logoUrl: logoUrl || s.branding.logoUrl,
    };
  }
  const familyRates = s.rates.family;
  const defFamily = defaultSettings.rates.family;
  if (familyRates.bankRate !== defFamily.bankRate) {
    overrides.defaults = { ratePercent: familyRates.bankRate };
  }
  if (
    familyRates.priceGrowth !== defFamily.priceGrowth ||
    s.inflationRate !== defaultSettings.inflationRate
  ) {
    overrides.economics = {
      ...overrides.economics,
      propertyGrowthRate: familyRates.priceGrowth / 100,
      inflationRate: s.inflationRate / 100,
    };
  }
  return overrides;
}

/** Хук: переопределения из админки; обновляется при событии ifsVisionAdminUpdated. */
export function useAdminOverrides(): AdminOverrides {
  const [overrides, setOverrides] = useState<AdminOverrides>(
    () => (typeof window === "undefined" ? {} : getAdminOverrides())
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setOverrides(getAdminOverrides());
    window.addEventListener("ifsVisionAdminUpdated", handler);
    return () => window.removeEventListener("ifsVisionAdminUpdated", handler);
  }, []);
  return overrides;
}
