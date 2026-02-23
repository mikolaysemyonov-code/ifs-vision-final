"use client";

import { forwardRef } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { ChartRowWithDeposit } from "@/lib/engine/financialEngine";

/** Бренд для шапки отчёта (логотип и телефон; при ?partner=... подставляется партнёр). */
export interface ReportBrand {
  logoUrl: string;
  contactPhone: string;
  companyName?: string;
}

/** Сводка по одному объекту для таблицы отчёта. */
export interface ReportObjectSummary {
  price: number;
  ratePercent: number;
  finalCapital: number;
}

/** Данные графика для отчёта: базовые поля + опционально netEquityB при сравнении. */
export type ReportChartRow = ChartRowWithDeposit & { netEquityB?: number };

export interface ReportTemplateProps {
  brand: ReportBrand;
  /** Данные графика (при сравнении — с netEquityB для ЖК Бета). */
  chartData: ReportChartRow[];
  /** Режим сравнения двух ЖК: таблица по обоим объектам, на графике две области. */
  comparisonMode?: boolean;
  /** Объект А: цена, ставка, итоговый капитал (и при одиночном режиме — ROI, переплата для таблицы). */
  objectA: ReportObjectSummary & { roiPercent?: number; overpayment?: number };
  /** Объект Б (только при comparisonMode). */
  objectB?: ReportObjectSummary;
  expertText: string;
  formatCurrency: (value: number, opts?: { maximumFractionDigits?: number }) => string;
}

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const JK_ALPHA = "ЖК Альфа";
const JK_BETA = "ЖК Бета";

/**
 * Скрытый слой A4 для захвата html2canvas.
 * Header (логотип + телефон), график (ЖК Альфа, ЖК Бета, Вклад), сводка по объектам, вывод эксперта.
 */
export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(
  function ReportTemplate(
    {
      brand,
      chartData,
      comparisonMode = false,
      objectA,
      objectB,
      expertText,
      formatCurrency,
    },
    ref
  ) {
    const hasB = comparisonMode && objectB != null;

    return (
      <div
        id="report-container"
        ref={ref}
        style={{
          position: "fixed",
          top: "0",
          left: "-10000px",
          width: "794px",
          minHeight: "1123px",
          backgroundColor: "#ffffff",
          color: "#000000",
          border: "1px solid #e4e4e7",
          boxSizing: "border-box",
          backgroundImage: "linear-gradient(#f4f4f5 1px, transparent 1px), linear-gradient(90deg, #f4f4f5 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          fontFamily: "Inter, Geist, system-ui, sans-serif",
          fontFeatureSettings: '"cv11", "ss01"',
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header: логотип и телефон из White Label */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e4e4e7",
            padding: "16px 32px",
          }}
        >
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt=""
              crossOrigin="anonymous"
              style={{ height: 48, maxWidth: 180, objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: 18, fontWeight: 600, color: "#000000" }}>
              {brand.companyName || "Инвест-отчёт"}
            </span>
          )}
          {brand.contactPhone ? (
            <span style={{ fontSize: 14, color: "#000000", fontFamily: "monospace" }}>
              WhatsApp: {brand.contactPhone}
            </span>
          ) : null}
        </header>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            gap: 20,
            padding: "20px 32px",
          }}
        >
          {/* Chart: текущий график со всеми линиями (ЖК Альфа, ЖК Бета, Вклад) */}
          <section>
            <h2
              style={{
                marginBottom: 12,
                marginTop: 4,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#000000",
              }}
            >
              Динамика роста чистого капитала
            </h2>
            <div style={{ width: 760, height: 300, backgroundColor: "#ffffff" }}>
              <AreaChart
                width={760}
                height={300}
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="reportBalanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="reportBalanceBGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis
                  dataKey="month"
                  stroke="#9ca3af"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickFormatter={(m) => (m / 12).toFixed(0)}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : (v / 1_000).toFixed(0) + "K"
                  }
                  width={32}
                />
                <Area
                  type="monotone"
                  dataKey="netEquity"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#reportBalanceGradient)"
                  name={hasB ? JK_ALPHA : "Капитал"}
                  isAnimationActive={false}
                />
                {hasB && (
                  <Area
                    type="monotone"
                    dataKey="netEquityB"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#reportBalanceBGradient)"
                    name={JK_BETA}
                    isAnimationActive={false}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="depositAccumulation"
                  stroke="#d97706"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                  name="Вклад"
                  isAnimationActive={false}
                />
              </AreaChart>
            </div>
          </section>

          {/* Table: сводка по обоим объектам (Цена, Ставка, Итоговый профит) */}
          <section>
            <h2
              style={{
                marginBottom: 12,
                marginTop: 4,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#000000",
              }}
            >
              Сводка по объектам
            </h2>
            {hasB ? (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid #e4e4e7",
                  fontSize: 14,
                  fontFamily: "monospace",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f4f4f5" }}>
                    <th style={{ border: "1px solid #e4e4e7", padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#000000" }}>
                      Показатель
                    </th>
                    <th style={{ border: "1px solid #e4e4e7", padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#000000" }}>
                      {JK_ALPHA}
                    </th>
                    <th style={{ border: "1px solid #e4e4e7", padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#000000" }}>
                      {JK_BETA}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 12px", color: "#000000" }}>Цена</td>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", color: "#000000" }}>
                      {formatCurrency(objectA.price)}
                    </td>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", color: "#000000" }}>
                      {formatCurrency(objectB!.price)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 12px", color: "#000000" }}>Ставка, %</td>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", color: "#000000" }}>
                      {objectA.ratePercent.toFixed(1)}%
                    </td>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", color: "#000000" }}>
                      {objectB!.ratePercent.toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 12px", color: "#000000" }}>Итоговый профит</td>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", color: "#000000" }}>
                      {formatCurrency(objectA.finalCapital)}
                    </td>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", color: "#000000" }}>
                      {formatCurrency(objectB!.finalCapital)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid #e4e4e7",
                  fontSize: 14,
                  fontFamily: "monospace",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f4f4f5" }}>
                    <th style={{ border: "1px solid #e4e4e7", padding: "8px 16px", textAlign: "left", fontWeight: 600, color: "#000000" }}>
                      Показатель
                    </th>
                    <th style={{ border: "1px solid #e4e4e7", padding: "8px 16px", textAlign: "right", fontWeight: 600, color: "#000000" }}>
                      Значение
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 16px", color: "#000000" }}>Цена</td>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", color: "#000000" }}>
                      {formatCurrency(objectA.price)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 16px", color: "#000000" }}>Ставка, %</td>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", color: "#000000" }}>
                      {objectA.ratePercent.toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 16px", color: "#000000" }}>Итоговый капитал</td>
                    <td style={{ border: "1px solid #e4e4e7", padding: "8px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", color: "#000000" }}>
                      {formatCurrency(objectA.finalCapital)}
                    </td>
                  </tr>
                  {objectA.roiPercent != null && (
                    <tr>
                      <td style={{ border: "1px solid #e4e4e7", padding: "8px 16px", color: "#000000" }}>ROI, %</td>
                      <td style={{ border: "1px solid #e4e4e7", padding: "8px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", color: "#000000" }}>
                        {objectA.roiPercent.toFixed(1)}%
                      </td>
                    </tr>
                  )}
                  {objectA.overpayment != null && (
                    <tr>
                      <td style={{ border: "1px solid #e4e4e7", padding: "8px 16px", color: "#000000" }}>Переплата по процентам</td>
                      <td style={{ border: "1px solid #e4e4e7", padding: "8px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", color: "#000000" }}>
                        {formatCurrency(objectA.overpayment)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </section>

          {/* Insights: текстовый блок из ExpertVerdict */}
          <section>
            <h2
              style={{
                marginBottom: 12,
                marginTop: 4,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#000000",
              }}
            >
              Резюме эксперта
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#000000" }}>{expertText}</p>
          </section>

          {/* Подпись: премиальный футер */}
          <footer
            style={{
              marginTop: "auto",
              paddingTop: 24,
              paddingBottom: 16,
              borderTop: "1px solid #e4e4e7",
              fontSize: 9,
              color: "#71717a",
              letterSpacing: "0.02em",
            }}
          >
            Generated by IFS Vision Terminal // Digital Twin Studio ecosystem
          </footer>
        </div>
      </div>
    );
  }
);
