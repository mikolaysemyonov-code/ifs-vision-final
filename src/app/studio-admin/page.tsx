"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Heart, Rocket, Eye, Gauge, MonitorPlay, X, ShieldCheck, Lock, Shield, Key, Clock, RefreshCw, Link2 } from "lucide-react";
import {
  getAdminSettings,
  setAdminSettings,
  type AdminSettings,
} from "@/lib/admin-storage";
import { config } from "@/lib/config";

/** Системные настройки 2026: РФ (семья), ОАЭ (инвестиция), льготная РФ (старт). Apple-дизайн админки. */
const DEFAULT_SETTINGS: AdminSettings = {
  branding: {
    companyName: "Digital Twin Studio",
    primaryColor: "#007AFF",
    logoUrl: "/logo.png",
    agencyName: "",
    agencyLogoUrl: "",
    contactPhone: "",
  },
  telegram: { botToken: "", chatId: "" },
  inflationRate: 4,
  adminPassword: "",
  lastLogin: "",
  security: { autoLockMinutes: 5, showTimestampInReport: true, pdfWatermark: false, pdfButtonAccent: false },
  rates: {
    investment: { bankRate: 4.5, taxRate: 0, priceGrowth: 5 },
    family: { bankRate: 21, taxRate: 13, priceGrowth: 5 },
    start: { bankRate: 6, taxRate: 13, priceGrowth: 5 },
  },
  defaultCurrency: "RUB",
  currencyRates: { USD: 90, AED: 25 },
  ratesAutoUpdate: false,
  usdtFeePercent: 0,
  defaultLocale: "ru",
  depositRate: 0.18,
};

const panelGlow =
  "inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px -12px rgba(120,180,255,0.2)";
const inputIos =
  "w-full rounded-sm bg-transparent py-2.5 font-sans text-white tracking-[-0.02em] tabular-nums placeholder-zinc-500 outline-none border-b border-white/5 focus:border-transparent focus:ring-1 focus:ring-[#007AFF] transition-all";

const PRESETS = {
  bankRate: [
    { label: "Льготная (6%)", value: 6 },
    { label: "Ключевая РФ (21%)", value: 21 },
    { label: "ОАЭ (4.5%)", value: 4.5 },
  ],
  taxRate: [
    { label: "РФ (13%)", value: 13 },
    { label: "ОАЭ (0%)", value: 0 },
    { label: "Тайланд (15%)", value: 15 },
  ],
  priceGrowth: [
    { label: "Консервативный (5%)", value: 5 },
    { label: "Умеренный (10%)", value: 10 },
    { label: "Агрессивный (20%)", value: 20 },
  ],
} as const;

const badgeClass =
  "text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-zinc-500 transition-colors hover:text-white hover:bg-white/10 cursor-pointer";

type RatesField = "bankRate" | "taxRate" | "priceGrowth";
type ProfileKey = "investment" | "family" | "start";

function AdminPanel({
  settings,
  setSettings,
  onSave,
  onReset,
  onLogout,
  saved,
}: {
  settings: AdminSettings;
  setSettings: (patch: Partial<AdminSettings>) => void;
  onSave: () => void;
  onReset: () => void;
  onLogout: () => void;
  saved: boolean;
}) {
  const [focusedField, setFocusedField] = useState<{
    profileKey: ProfileKey;
    field: RatesField;
  } | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordUpdatedToast, setPasswordUpdatedToast] = useState(false);
  const [ratesRefreshing, setRatesRefreshing] = useState(false);
  type TabId = "settings" | "integrations" | "security";
  const [activeTab, setActiveTab] = useState<TabId>("settings");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsPresentationMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const prevRoiRef = useRef<Record<ProfileKey, number>>({
    investment: NaN,
    family: NaN,
    start: NaN,
  });

  const applyPreset = useCallback(
    (profileKey: ProfileKey, field: RatesField, value: number) => {
      const profile = settings.rates[profileKey];
      setSettings({
        rates: {
          ...settings.rates,
          [profileKey]: { ...profile, [field]: value },
        },
      });
    },
    [settings.rates, setSettings]
  );

  const strategyMeta = {
    investment: {
      label: "Инвестиция",
      emoji: "🏆",
      description: "Параметры для высокодоходных объектов",
      Icon: TrendingUp,
      iconClass: "text-yellow-500/80 drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]",
    },
    family: {
      label: "Семья",
      emoji: "🏠",
      description: "Льготные программы для семей",
      Icon: Heart,
      iconClass: "text-[#007AFF] drop-shadow-[0_0_12px_rgba(0,122,255,0.4)]",
    },
    start: {
      label: "Старт",
      emoji: "🚀",
      description: "Условия для первого жилья",
      Icon: Rocket,
      iconClass: "text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]",
    },
  } as const;

  function calculatePreviewROI(
    bankRate: number,
    taxRate: number,
    priceGrowth: number,
    inflationRate: number
  ): number {
    if (!bankRate) return 0;
    const nominalGrowth = inflationRate + priceGrowth;
    return ((nominalGrowth - taxRate) / bankRate) * 1.5;
  }

  const BASE_CAPITAL = 10_000_000;
  const TERM_YEARS = 20;
  const SPARKLINE_POINTS = 10;

  function getEquityCurve(
    bankRate: number,
    priceGrowth: number,
    inflationRate: number
  ): number[] {
    const loanRatio = 0.8;
    const P = BASE_CAPITAL * loanRatio;
    const r = bankRate / 100;
    const n = TERM_YEARS;
    const annualPayment =
      r <= 0
        ? P / n
        : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    /** Номинальный рост = инфляция + премия (Рост цен задаёт премию над инфляцией). */
    const growth = (inflationRate + priceGrowth) / 100;
    const points: number[] = [];
    for (let i = 0; i < SPARKLINE_POINTS; i++) {
      const year = (i / (SPARKLINE_POINTS - 1)) * TERM_YEARS;
      const propertyValue = BASE_CAPITAL * Math.pow(1 + growth, year);
      const remainingDebt =
        r <= 0
          ? Math.max(0, P - annualPayment * year)
          : P * Math.pow(1 + r, year) -
            annualPayment * ((Math.pow(1 + r, year) - 1) / r);
      const equity = propertyValue - Math.max(0, remainingDebt);
      points.push(equity);
    }
    return points;
  }

  const SPARKLINE_COLORS: Record<ProfileKey, string> = {
    investment: "#EAB308",
    family: "#007AFF",
    start: "#10B981",
  };

  const previewData = (["investment", "family", "start"] as const).map(
    (key) => {
      const r = settings.rates[key];
      const roi = calculatePreviewROI(
        r.bankRate,
        r.taxRate,
        r.priceGrowth,
        settings.inflationRate
      );
      const growth5y = (settings.inflationRate + r.priceGrowth) / 100;
      const capital5y = BASE_CAPITAL * Math.pow(1 + growth5y, 5);
      const equityCurve = getEquityCurve(
        r.bankRate,
        r.priceGrowth,
        settings.inflationRate
      );
      const finalEquity = equityCurve[equityCurve.length - 1] ?? 0;
      const lineColor =
        finalEquity < 0 ? "#f43f5e" : SPARKLINE_COLORS[key];
      const prev = prevRoiRef.current[key];
      const trend =
        Number.isNaN(prev) ? 0 : roi > prev ? 1 : roi < prev ? -1 : 0;
      return {
        key,
        label: strategyMeta[key].label.toUpperCase(),
        roi,
        capital5y,
        trend,
        equityCurve,
        lineColor,
      };
    }
  );

  useEffect(() => {
    prevRoiRef.current = {
      investment: previewData[0].roi,
      family: previewData[1].roi,
      start: previewData[2].roi,
    };
  });

  const transition = { type: "tween" as const, duration: 0.5, ease: "easeInOut" as const };

  const renderPresentationMode = () => {
    return (
    <motion.div
            key="presentation"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={transition}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                background:
                  "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(ellipse 80% 50% at 80% 80%, rgba(16,185,129,0.08) 0%, transparent 45%), radial-gradient(ellipse 60% 40% at 20% 100%, rgba(234,179,8,0.06) 0%, transparent 40%)",
              }}
            />
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(ellipse_120%_100%_at_50%_-30%,rgba(120,180,255,0.12)_0%,transparent_55%)]"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            <button
              type="button"
              onClick={() => setIsPresentationMode(false)}
              className="absolute right-6 top-6 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-400 backdrop-blur-xl transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
              aria-label="Выход из режима презентации"
            >
              <X className="h-6 w-6" strokeWidth={2} />
            </button>

            <div className="absolute left-6 top-6 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
              <Gauge className="h-4 w-4 text-zinc-500" strokeWidth={2} />
              <span className="text-xs font-medium text-zinc-400">
                Глобальная инфляция: {settings.inflationRate}%
              </span>
            </div>

            <div className="relative z-0 flex w-[90vw] max-w-[1200px] flex-col items-stretch gap-8 px-6 py-12 sm:w-[85vw] md:w-[80vw]">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Eye className="h-6 w-6 text-zinc-500" strokeWidth={2} />
                <span className="text-sm font-medium uppercase tracking-wider text-zinc-500">
                  Live ROI Preview
                </span>
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {previewData.map(
                  ({
                    key,
                    label,
                    roi,
                    capital5y,
                    trend,
                    equityCurve,
                    lineColor,
                  }) => {
                    const w = 240;
                    const h = 96;
                    const pad = 6;
                    const minE = Math.min(...equityCurve);
                    const maxE = Math.max(...equityCurve);
                    const range = maxE - minE || 1;
                    const toY = (v: number) =>
                      h - pad - ((v - minE) / range) * (h - 2 * pad);
                    const toX = (i: number) =>
                      (i / (SPARKLINE_POINTS - 1)) * (w - 1);
                    const pathD = equityCurve
                      .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`)
                      .join(" ");
                    const areaD = `${pathD} L ${toX(SPARKLINE_POINTS - 1)} ${h - pad} L ${toX(0)} ${h - pad} Z`;
                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...transition, delay: 0.1 }}
                        className="flex flex-col rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-2xl"
                      >
                        <span className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                          {label}
                        </span>
                        <div className="mb-4 flex items-baseline gap-3">
                          <span
                            className={`font-sans text-3xl font-bold tabular-nums tracking-tight ${
                              trend === 1
                                ? "text-emerald-400"
                                : trend === -1
                                  ? "text-rose-400"
                                  : "text-white"
                            }`}
                          >
                            ROI {(roi * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="mb-4 flex h-24 w-full max-w-[240px] items-center justify-center">
                          <svg
                            width={w}
                            height={h}
                            viewBox={`0 0 ${w} ${h}`}
                            preserveAspectRatio="xMidYMid meet"
                            className="h-full w-full"
                            aria-hidden
                          >
                            <path
                              d={areaD}
                              fill={lineColor}
                              fillOpacity={0.15}
                            />
                            <path
                              d={pathD}
                              fill="none"
                              stroke={lineColor}
                              strokeWidth={3}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <span className="font-sans text-base tabular-nums text-zinc-400">
                          ~{(capital5y / 1_000_000).toFixed(1)} млн ₽ через 5 лет
                        </span>
                      </motion.div>
                    );
                  }
                )}
              </div>
              <p className="text-center text-xs text-zinc-500">
                Нажмите Esc или кнопку ✕ для выхода из режима презентации
              </p>
            </div>
          </motion.div>
    );
  };

  const renderRoiPreview = () => (
    <div
      className="fixed bottom-8 right-8 z-40 w-64 rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl"
      aria-label="Предпросмотр ROI"
    >
      <div className="mb-3 flex items-center gap-2">
        <Eye className="h-4 w-4 text-zinc-500" strokeWidth={2} />
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Live ROI Preview
        </span>
      </div>
      <div className="space-y-3 border-t border-white/10 pt-3">
        {previewData.map(
          ({
            key,
            label,
            roi,
            capital5y,
            trend,
            equityCurve,
            lineColor,
          }) => {
            const w = 80;
            const h = 32;
            const pad = 2;
            const minE = Math.min(...equityCurve);
            const maxE = Math.max(...equityCurve);
            const range = maxE - minE || 1;
            const toY = (v: number) =>
              h - pad - ((v - minE) / range) * (h - 2 * pad);
            const toX = (i: number) =>
              (i / (SPARKLINE_POINTS - 1)) * (w - 1);
            const pathD = equityCurve
              .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`)
              .join(" ");
            const areaD = `${pathD} L ${toX(SPARKLINE_POINTS - 1)} ${h - pad} L ${toX(0)} ${h - pad} Z`;
            return (
              <div key={key} className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {label}
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`shrink-0 font-sans text-sm font-semibold tabular-nums tracking-[-0.02em] ${
                      trend === 1
                        ? "text-emerald-400"
                        : trend === -1
                          ? "text-rose-400"
                          : "text-white"
                    }`}
                  >
                    ROI {(roi * 100).toFixed(1)}%
                  </span>
                  <svg
                    width={w}
                    height={h}
                    className="shrink-0"
                    aria-hidden
                  >
                    <path
                      d={areaD}
                      fill={lineColor}
                      fillOpacity={0.1}
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="font-sans text-xs tabular-nums text-zinc-500">
                  ~{(capital5y / 1_000_000).toFixed(1)} млн ₽ через 5 лет
                </span>
              </div>
            );
          }
        )}
      </div>
    </div>
  );

  const renderAdminContent = () => {
    return (
    <motion.div
            key="normal"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={transition}
            className="mx-auto max-w-4xl px-4 py-10"
          >
            <div className="relative">
            <div className="contents-wrapper">
            <div className="min-h-0">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-white">
            Панель управления IFS Vision
          </h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPresentationMode(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-white/20 hover:text-white hover:shadow-[0_0_20px_-4px_rgba(120,180,255,0.3)]"
              title="Режим презентации"
              aria-label="Режим презентации"
            >
              <MonitorPlay className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-2xl bg-transparent px-4 py-2 text-sm font-sans text-zinc-500 transition-colors hover:text-red-400"
            >
              Выход
            </button>
            <Link
              href="/"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-sans text-white tracking-[-0.02em] transition hover:bg-white/10 backdrop-blur-xl"
            >
              На главную
            </Link>
            <button
              type="button"
              onClick={() => {
                const settings = getAdminSettings();
                const strategyIndex = 1;
                const preset = config.scenarioPresets.family;
                const b = preset.price;
                const c = settings.defaultCurrency;
                const base = typeof window !== "undefined" ? window.location.origin : "";
                const url = `${base}/?b=${b}&c=${c}&s=${strategyIndex}`;
                navigator.clipboard.writeText(url).then(
                  () => alert("Ссылка скопирована в буфер обмена"),
                  () => alert("Не удалось скопировать")
                );
              }}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-sans text-white tracking-[-0.02em] transition hover:bg-white/10 backdrop-blur-xl"
              title="Скопировать Magic Link (текущая конфигурация)"
            >
              <Link2 className="h-4 w-4" strokeWidth={2} />
              Скопировать Magic Link
            </button>
          </div>
        </div>

        <div className="mb-6 flex rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
          {(
            [
              { id: "settings" as const, label: "Настройки" },
              { id: "integrations" as const, label: "Интеграции" },
              { id: "security" as const, label: "Безопасность" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
                activeTab === id
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8"
          style={{ boxShadow: panelGlow }}
        >
          <AnimatePresence mode="wait">
            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
            <section className="rounded-2xl bg-zinc-900/50 p-5">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
                Брендинг
              </h2>
              <div className="space-y-4 border-t border-white/5 pt-4">
                <div className="border-b border-white/5 pb-3">
                  <label className="mb-1 block text-sm text-zinc-400">
                    Название компании
                  </label>
                  <input
                    type="text"
                    value={settings.branding.companyName}
                    onChange={(e) =>
                      setSettings({
                        branding: { ...settings.branding, companyName: e.target.value },
                      })
                    }
                    className={inputIos}
                    placeholder="Digital Twin Studio"
                  />
                </div>
                <div className="border-b border-white/5 pb-3">
                  <label className="mb-1 block text-sm text-zinc-400">
                    Название агентства (заголовок симулятора и PDF)
                  </label>
                  <input
                    type="text"
                    value={settings.branding.agencyName ?? ""}
                    onChange={(e) =>
                      setSettings({
                        branding: { ...settings.branding, agencyName: e.target.value },
                      })
                    }
                    className={inputIos}
                    placeholder="Оставьте пустым — будет использовано название компании"
                  />
                </div>
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm text-zinc-400">
                      Цвет акцента (HEX)
                    </label>
                    <input
                      type="text"
                      value={settings.branding.primaryColor}
                      onChange={(e) =>
                        setSettings({
                          branding: { ...settings.branding, primaryColor: e.target.value },
                        })
                      }
                      className={`${inputIos} font-mono`}
                      placeholder="#007AFF"
                    />
                  </div>
                  <div
                    className="mt-6 h-10 w-10 shrink-0 rounded-full border border-white/10 shadow-inner"
                    style={{ backgroundColor: settings.branding.primaryColor || "#007AFF" }}
                    title="Предпросмотр"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">
                    Ссылка на лого
                  </label>
                  <input
                    type="text"
                    value={settings.branding.logoUrl}
                    onChange={(e) =>
                      setSettings({
                        branding: { ...settings.branding, logoUrl: e.target.value },
                      })
                    }
                    className={inputIos}
                    placeholder="/logo.png"
                  />
                </div>
                <div className="border-b border-white/5 pb-3">
                  <label className="mb-1 block text-sm text-zinc-400">
                    Ссылка на логотип агентства (шапка и PDF)
                  </label>
                  <input
                    type="text"
                    value={settings.branding.agencyLogoUrl ?? ""}
                    onChange={(e) =>
                      setSettings({
                        branding: { ...settings.branding, agencyLogoUrl: e.target.value },
                      })
                    }
                    className={inputIos}
                    placeholder="Оставьте пустым — будет использован лого выше"
                  />
                </div>
                <div className="border-b border-white/5 pb-3">
                  <label className="mb-1 block text-sm text-zinc-400">
                    Телефон для WhatsApp брокера (шапка и подвал PDF)
                  </label>
                  <input
                    type="text"
                    value={settings.branding.contactPhone ?? ""}
                    onChange={(e) =>
                      setSettings({
                        branding: { ...settings.branding, contactPhone: e.target.value },
                      })
                    }
                    className={inputIos}
                    placeholder="+7 999 123-45-67"
                  />
                </div>
                <div className="border-b border-white/5 pb-3 pt-3">
                  <label className="mb-1 block text-sm text-zinc-400">
                    Язык интерфейса по умолчанию
                  </label>
                  <select
                    value={settings.defaultLocale}
                    onChange={(e) =>
                      setSettings({
                        defaultLocale: e.target.value as "ru" | "en",
                      })
                    }
                    className={`${inputIos} rounded-xl border border-white/10 bg-white/5 px-3 py-2 w-full font-mono`}
                  >
                    <option value="ru">RU — Русский</option>
                    <option value="en">EN — English</option>
                  </select>
                </div>
                  {settings.branding.logoUrl && (
                    <div className="mt-3 flex items-end gap-2">
                      <img
                        src={settings.branding.logoUrl}
                        alt="Лого"
                        className="h-8 w-auto max-w-[120px] object-contain object-left"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div
                        className="h-3 w-8 max-w-[120px] flex-1 scale-y-[-1] opacity-40"
                        style={{
                          background: `url(${settings.branding.logoUrl}) no-repeat bottom center/contain`,
                          maskImage: "linear-gradient(to bottom, black, transparent)",
                          WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
                        }}
                        aria-hidden
                      />
                    </div>
                  )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
                ГЛОБАЛЬНЫЕ НАСТРОЙКИ
              </h2>
              <div className="space-y-4 border-t border-white/5 pt-4">
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">
                    Валюта симулятора по умолчанию
                  </label>
                  <select
                    value={settings.defaultCurrency}
                    onChange={(e) =>
                      setSettings({
                        defaultCurrency: e.target.value as "RUB" | "USD" | "AED",
                      })
                    }
                    className={`${inputIos} rounded-xl border border-white/10 bg-white/5 px-3 py-2 w-full font-mono`}
                  >
                    <option value="RUB">₽ RUB</option>
                    <option value="USD">$ USD</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">
                      Курс USD (в рублях)
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      step={0.1}
                      value={settings.currencyRates.USD}
                      onChange={(e) =>
                        setSettings({
                          currencyRates: {
                            ...settings.currencyRates,
                            USD: Math.max(0.01, Number(e.target.value) || 0),
                          },
                        })
                      }
                      placeholder="90"
                      className={`${inputIos} rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono tabular-nums`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">
                      Курс AED (в рублях)
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      step={0.1}
                      value={settings.currencyRates.AED}
                      onChange={(e) =>
                        setSettings({
                          currencyRates: {
                            ...settings.currencyRates,
                            AED: Math.max(0.01, Number(e.target.value) || 0),
                          },
                        })
                      }
                      placeholder="25"
                      className={`${inputIos} rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono tabular-nums`}
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  После сохранения симулятор подхватит валюту и курсы через событие обновления.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5 backdrop-blur-xl">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
                Экономика
              </h2>
              <div className="space-y-4 border-t border-white/5 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400">
                    <Gauge className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-sm text-zinc-400">
                      Глобальная инфляция, %
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={0.5}
                      value={settings.inflationRate}
                      onChange={(e) =>
                        setSettings({
                          inflationRate: Math.max(
                            0,
                            Math.min(30, Number(e.target.value) || 0)
                          ),
                        })
                      }
                      className={`${inputIos} rounded-xl border border-white/10 bg-white/5 px-3 py-2`}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">
                    Ставка по вкладу для графика (0–1, например 0.18 = 18%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={settings.depositRate}
                    onChange={(e) =>
                      setSettings({
                        depositRate: Math.max(
                          0,
                          Math.min(1, Number(e.target.value) || 0)
                        ),
                      })
                    }
                    className={`${inputIos} rounded-xl border border-white/10 bg-white/5 px-3 py-2`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">
                    Базовая валюта проекта
                  </label>
                  <select
                    value={settings.defaultCurrency}
                    onChange={(e) =>
                      setSettings({
                        defaultCurrency: e.target.value as "RUB" | "USD" | "AED",
                      })
                    }
                    className={`${inputIos} rounded-xl border border-white/10 bg-white/5 px-3 py-2 w-full font-mono`}
                  >
                    <option value="RUB">₽ RUB</option>
                    <option value="USD">$ USD</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Курсы валют
                  </p>
                  <p className="mb-2 font-mono text-sm text-white">
                    1 USD = {settings.currencyRates.USD.toFixed(2)} ₽
                  </p>
                  <p className="mb-4 font-mono text-sm text-white">
                    1 AED = {settings.currencyRates.AED.toFixed(2)} ₽
                  </p>
                  <div className="mb-4 flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.ratesAutoUpdate}
                      onClick={() =>
                        setSettings({ ratesAutoUpdate: !settings.ratesAutoUpdate })
                      }
                      className={`relative h-7 w-12 rounded-full transition-colors ${
                        settings.ratesAutoUpdate ? "bg-emerald-500/60" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          settings.ratesAutoUpdate ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                    <span className="text-sm text-zinc-400">
                      Автообновление курсов
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={ratesRefreshing}
                    onClick={async () => {
                      setRatesRefreshing(true);
                      try {
                        const res = await fetch("/api/rates?revalidate=1");
                        const data = await res.json();
                        if (data?.USD != null && data?.AED != null) {
                          const updatedRates = {
                            USD: Number(data.USD),
                            AED: Number(data.AED),
                          };
                          const updated = {
                            ...settings,
                            currencyRates: updatedRates,
                          };
                          setSettings(updated);
                          setAdminSettings(updated);
                        }
                      } finally {
                        setRatesRefreshing(false);
                      }
                    }}
                    className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/15 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${ratesRefreshing ? "animate-spin" : ""}`} strokeWidth={2} />
                    Обновить сейчас
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">
                      Курс конвертации: 1 USD = (₽)
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      step={0.1}
                      value={settings.currencyRates.USD}
                      onChange={(e) =>
                        setSettings({
                          currencyRates: {
                            ...settings.currencyRates,
                            USD: Math.max(0.01, Number(e.target.value) || 0),
                          },
                        })
                      }
                      placeholder="90"
                      disabled={settings.ratesAutoUpdate}
                      className={`${inputIos} rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono tabular-nums disabled:opacity-60`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">
                      Курс конвертации: 1 AED = (₽)
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      step={0.1}
                      value={settings.currencyRates.AED}
                      onChange={(e) =>
                        setSettings({
                          currencyRates: {
                            ...settings.currencyRates,
                            AED: Math.max(0.01, Number(e.target.value) || 0),
                          },
                        })
                      }
                      placeholder="25"
                      disabled={settings.ratesAutoUpdate}
                      className={`${inputIos} rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono tabular-nums disabled:opacity-60`}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">
                    Комиссия USDT к USD, % (0–10)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={settings.usdtFeePercent}
                    onChange={(e) =>
                      setSettings({
                        usdtFeePercent: Math.max(0, Math.min(10, Number(e.target.value) || 0)),
                      })
                    }
                    placeholder="0"
                    className={`${inputIos} rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono tabular-nums`}
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
                Базовые ставки
              </h2>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {(["investment", "family", "start"] as const).map((profileKey) => {
                  const profile = settings.rates[profileKey];
                  const meta = strategyMeta[profileKey];
                  const StrategyIcon = meta.Icon;
                  const fields: { key: RatesField; label: string; presets: readonly { label: string; value: number }[] }[] = [
                    { key: "bankRate", label: "Ставка банка, %", presets: PRESETS.bankRate },
                    { key: "taxRate", label: "Налог, %", presets: PRESETS.taxRate },
                    { key: "priceGrowth", label: "Рост цен, %", presets: PRESETS.priceGrowth },
                  ];
                  return (
                    <div
                      key={profileKey}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <span className="text-xl" aria-hidden>{meta.emoji}</span>
                        <StrategyIcon
                          className={`h-5 w-5 shrink-0 ${meta.iconClass}`}
                          strokeWidth={2}
                        />
                        <h3 className="font-sans text-lg font-semibold tracking-[-0.02em] text-white">
                          {meta.label.toUpperCase()}
                        </h3>
                      </div>
                      <p className="mb-4 text-xs leading-relaxed text-zinc-500">
                        {meta.description}
                      </p>
                      <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-4">
                        {fields.map(({ key, label, presets }) => (
                          <div key={key} className="min-w-0">
                            <label className="mb-0.5 block text-xs text-zinc-500">
                              {label}
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={profile[key]}
                              onChange={(e) =>
                                setSettings({
                                  rates: {
                                    ...settings.rates,
                                    [profileKey]: {
                                      ...profile,
                                      [key]: Number(e.target.value) || 0,
                                    },
                                  },
                                })
                              }
                              onFocus={() =>
                                setFocusedField({ profileKey, field: key })
                              }
                              onBlur={() =>
                                setTimeout(() => setFocusedField(null), 150)
                              }
                              className={inputIos}
                            />
                            <div
                              className={`mt-1.5 flex flex-wrap gap-1 transition-opacity duration-200 ${
                                focusedField?.profileKey === profileKey &&
                                focusedField?.field === key
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            >
                              {presets.map(({ label: presetLabel, value }) => (
                                <button
                                  key={presetLabel}
                                  type="button"
                                  className={badgeClass}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() =>
                                    applyPreset(profileKey, key, value)
                                  }
                                >
                                  {presetLabel}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="flex items-center justify-between border-t border-white/5 pt-6">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="rounded-full border border-white/5 bg-transparent px-6 py-2 text-sm text-zinc-500 transition-colors hover:border-red-400/20 hover:bg-red-400/5 hover:text-red-400"
              >
                Сброс к системным
              </button>
              <button
                type="button"
                onClick={onSave}
                className="rounded-full bg-[#007AFF] px-8 py-2 font-medium text-white transition-all hover:bg-blue-500"
              >
                {saved ? "Сохранено" : "Сохранить"}
              </button>
            </div>
              </motion.div>
            )}

            {activeTab === "integrations" && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
                    Телеграм-лиды
                  </h2>
                  <div className="space-y-0 border-t border-white/5 pt-4">
                    <div className="border-b border-white/5 py-3">
                      <label className="mb-1 block text-sm text-zinc-400">Bot Token</label>
                      <input
                        type="password"
                        value={settings.telegram.botToken}
                        onChange={(e) =>
                          setSettings({
                            telegram: { ...settings.telegram, botToken: e.target.value },
                          })
                        }
                        className={`${inputIos} font-mono`}
                        placeholder="123456:ABC..."
                        autoComplete="off"
                      />
                    </div>
                    <div className="py-3">
                      <label className="mb-1 block text-sm text-zinc-400">Chat ID</label>
                      <input
                        type="text"
                        value={settings.telegram.chatId}
                        onChange={(e) =>
                          setSettings({
                            telegram: { ...settings.telegram, chatId: e.target.value },
                          })
                        }
                        className={`${inputIos} font-mono`}
                        placeholder="-1001234567890"
                      />
                    </div>
                  </div>
                </section>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onSave}
                    className="rounded-full bg-[#007AFF] px-8 py-2 font-medium text-white transition-all hover:bg-blue-500"
                  >
                    {saved ? "Сохранено" : "Сохранить"}
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <div className="mb-4 flex items-center gap-2">
                    <Key className="h-5 w-5 text-zinc-500" strokeWidth={2} />
                    <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
                      Управление паролем
                    </h2>
                  </div>
                  <div className="space-y-4 border-t border-white/5 pt-4">
                    <div>
                      <label className="mb-1 block text-sm text-zinc-400">Текущий пароль</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`${inputIos} rounded-xl border border-white/10 bg-white/5 px-3 py-2`}
                        autoComplete="current-password"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-zinc-400">Новый пароль</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`${inputIos} rounded-xl border border-white/10 bg-white/5 px-3 py-2`}
                        autoComplete="new-password"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!currentPassword.trim()) {
                          alert("Введите текущий пароль");
                          return;
                        }
                        if (!newPassword.trim()) {
                          alert("Введите новый пароль");
                          return;
                        }
                        const verifyRes = await fetch("/api/verify-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ password: currentPassword }),
                          credentials: "include",
                        });
                        if (!verifyRes.ok) {
                          alert("Текущий пароль неверен");
                          return;
                        }
                        const updated = { ...settings, adminPassword: newPassword.trim() };
                        setSettings({ adminPassword: updated.adminPassword });
                        setAdminSettings(updated);
                        setCurrentPassword("");
                        setNewPassword("");
                        setPasswordUpdatedToast(true);
                        setTimeout(() => setPasswordUpdatedToast(false), 3000);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007AFF] py-2.5 font-medium text-white transition-colors hover:bg-[#0066DD]"
                    >
                      <Lock className="h-4 w-4" strokeWidth={2} />
                      Обновить доступ
                    </button>
                  </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <div className="mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-zinc-500" strokeWidth={2} />
                    <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
                      Автоматическая блокировка
                    </h2>
                  </div>
                  <p className="mb-4 text-xs text-zinc-500">
                    Автоматически завершать сессию при отсутствии активности.
                  </p>
                  <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
                    {([{ v: 5, l: "5 мин" }, { v: 15, l: "15 мин" }, { v: 30, l: "30 мин" }, { v: 0, l: "Выкл" }] as const).map(
                      ({ v, l }) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() =>
                            setSettings({
                              security: { ...settings.security, autoLockMinutes: v },
                            })
                          }
                          className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                            settings.security.autoLockMinutes === v
                              ? "border-[#007AFF]/50 bg-[#007AFF]/20 text-white"
                              : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-300"
                          }`}
                        >
                          {l}
                        </button>
                      )
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <div className="mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-zinc-500" strokeWidth={2} />
                    <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
                      Приватность и logs
                    </h2>
                  </div>
                  <div className="space-y-4 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="pdf-watermark" className="cursor-pointer text-sm text-zinc-300">
                        Защита PDF
                      </label>
                      <button
                        id="pdf-watermark"
                        type="button"
                        role="switch"
                        aria-checked={settings.security.pdfWatermark}
                        onClick={() =>
                          setSettings({
                            security: {
                              ...settings.security,
                              pdfWatermark: !settings.security.pdfWatermark,
                            },
                          })
                        }
                        className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors duration-200 ${
                          settings.security.pdfWatermark
                            ? "border-[#007AFF]/50 bg-[#007AFF]"
                            : "border-white/15 bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute top-1 block h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 ${
                            settings.security.pdfWatermark ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {settings.security.pdfWatermark
                        ? "Водяной знак будет добавлен на отчёт."
                        : "Включите для добавления водяного знака на отчёт."}
                    </p>
                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <label htmlFor="show-ts-report" className="cursor-pointer text-sm text-zinc-300">
                        Отображать время в отчёте
                      </label>
                      <button
                        id="show-ts-report"
                        type="button"
                        role="switch"
                        aria-checked={settings.security.showTimestampInReport}
                        onClick={() =>
                          setSettings({
                            security: {
                              ...settings.security,
                              showTimestampInReport: !settings.security.showTimestampInReport,
                            },
                          })
                        }
                        className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors duration-200 ${
                          settings.security.showTimestampInReport
                            ? "border-[#007AFF]/50 bg-[#007AFF]"
                            : "border-white/15 bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute top-1 block h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 ${
                            settings.security.showTimestampInReport ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <label htmlFor="pdf-button-accent" className="cursor-pointer text-sm text-zinc-300">
                        Акцентная кнопка «Скачать PDF» (режим презентации)
                      </label>
                      <button
                        id="pdf-button-accent"
                        role="switch"
                        aria-checked={settings.security.pdfButtonAccent}
                        onClick={() =>
                          setSettings({
                            security: {
                              ...settings.security,
                              pdfButtonAccent: !settings.security.pdfButtonAccent,
                            },
                          })
                        }
                        className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors duration-200 ${
                          settings.security.pdfButtonAccent
                            ? "border-amber-400/50 bg-amber-500"
                            : "border-white/15 bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute top-1 block h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 ${
                            settings.security.pdfButtonAccent ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                    {settings.lastLogin && (
                      <p className="text-xs text-zinc-500">
                        Последний вход:{" "}
                        {new Intl.DateTimeFormat("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(settings.lastLogin))}
                      </p>
                    )}
                  </div>
                </section>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onSave}
                    className="rounded-full bg-[#007AFF] px-8 py-2 font-medium text-white transition-all hover:bg-blue-500"
                  >
                    {saved ? "Сохранено" : "Сохранить"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showResetModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowResetModal(false)}
            aria-hidden
          >
            <div
              className="max-w-sm rounded-3xl border border-white/10 bg-[#1c1c1e]/80 p-6 backdrop-blur-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-labelledby="reset-dialog-title"
              aria-describedby="reset-dialog-desc"
            >
              <h3
                id="reset-dialog-title"
                className="font-sans text-lg font-semibold text-white"
              >
                Сбросить настройки?
              </h3>
              <p
                id="reset-dialog-desc"
                className="mt-2 text-sm leading-relaxed text-zinc-400"
              >
                Все ваши кастомные ставки и брендинг будут заменены на стандартные
                значения 2026 года. Это действие необратимо.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 rounded-full border border-white/10 bg-white/5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setShowResetModal(false);
                  }}
                  className="flex-1 rounded-full bg-red-500/90 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-center font-sans text-xs tracking-[-0.01em] text-zinc-500">
          Настройки сохраняются в localStorage. Обновите главную страницу, чтобы
          применить брендинг и ставки.
        </p>
      </div>
            {renderRoiPreview()}
            </div>
            </div>
          </motion.div>
    );
  };

  return (
    <main className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(59,130,246,0.08),transparent)] text-white font-sans selection:bg-blue-500/30">
      <AnimatePresence mode="wait">
        {isPresentationMode ? renderPresentationMode() : renderAdminContent()}
      </AnimatePresence>

      {passwordUpdatedToast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/15 bg-zinc-900/95 px-6 py-4 shadow-2xl backdrop-blur-xl">
          <p className="text-center text-sm font-medium text-white">
            Доступ обновлен. Используйте новый пароль при следующем входе.
          </p>
        </div>
      )}
    </main>
  );
}

const WARNING_THRESHOLD_SEC = 30;

export default function StudioAdminPage() {
  const router = useRouter();
  const [settings, setSettingsState] = useState<AdminSettings | null>(null);
  const [saved, setSaved] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isLockingPhase, setIsLockingPhase] = useState(false);

  const handleLogout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    router.push("/");
    router.refresh();
  }, [router]);

  useEffect(() => {
    setSettingsState(getAdminSettings());
  }, []);

  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity, true);
    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity, true);
    };
  }, []);

  useEffect(() => {
    const minutes = settings?.security?.autoLockMinutes ?? 0;
    if (minutes <= 0) {
      setRemainingSeconds(null);
      return;
    }
    const autoLockMs = minutes * 60 * 1000;
    const id = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remainingMs = autoLockMs - elapsed;
      const sec = Math.ceil(remainingMs / 1000);
      setRemainingSeconds(sec > 0 ? sec : 0);
      if (remainingMs <= 0) setIsLockingPhase(true);
    }, 1000);
    return () => clearInterval(id);
  }, [settings?.security?.autoLockMinutes]);

  const setSettings = useCallback((patch: Partial<AdminSettings>) => {
    setSettingsState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        branding: { ...prev.branding, ...(patch.branding ?? {}) },
        telegram: { ...prev.telegram, ...(patch.telegram ?? {}) },
        inflationRate: patch.inflationRate ?? prev.inflationRate,
        adminPassword: patch.adminPassword ?? prev.adminPassword,
        lastLogin: patch.lastLogin ?? prev.lastLogin,
        security: { ...prev.security, ...(patch.security ?? {}) },
        rates: {
          ...prev.rates,
          ...(patch.rates ?? {}),
          investment: { ...prev.rates.investment, ...(patch.rates?.investment ?? {}) },
          family: { ...prev.rates.family, ...(patch.rates?.family ?? {}) },
          start: { ...prev.rates.start, ...(patch.rates?.start ?? {}) },
        },
        depositRate: patch.depositRate ?? prev.depositRate,
      };
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!settings) return;
    setAdminSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const handleReset = useCallback(() => {
    setAdminSettings(DEFAULT_SETTINGS);
    window.location.reload();
  }, []);

  return settings === null ? (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <span className="text-zinc-500">Загрузка…</span>
    </div>
  ) : (
    <>
      <AdminPanel
        settings={settings}
        setSettings={setSettings}
        onSave={handleSave}
        onReset={handleReset}
        onLogout={handleLogout}
        saved={saved}
      />
      {remainingSeconds !== null &&
        remainingSeconds <= WARNING_THRESHOLD_SEC &&
        remainingSeconds > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-2xl border border-white/15 bg-zinc-900/90 px-5 py-3 shadow-xl backdrop-blur-xl"
          >
            <p className="text-center text-sm text-zinc-200">
              Сессия истекает через {remainingSeconds}с… Двигайте мышью, чтобы
              продолжить.
            </p>
          </motion.div>
        )}
      {isLockingPhase && (
        <motion.div
          initial={{ backdropFilter: "blur(0px)" }}
          animate={{ backdropFilter: "blur(24px)" }}
          transition={{ duration: 1.2, ease: "easeInOut" as const }}
          onAnimationComplete={() => void handleLogout()}
          className="fixed inset-0 z-[100] bg-black/30"
          aria-hidden
        />
      )}
    </>
  );
}
