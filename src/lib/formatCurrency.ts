/**
 * Форматирование сумм в выбранной валюте.
 * Все расчёты в симуляторе ведутся в RUB; конвертация только при отображении.
 */

import type { Currency, CurrencyConfig } from "@/store/useStore";

/**
 * Конвертирует значение в рублях в целевую валюту по курсу (rateFromBase: 1 единица валюты = N ₽).
 */
export function toDisplayValue(valueInRub: number, rateFromBase: number): number {
  if (rateFromBase <= 0) return valueInRub;
  return valueInRub / rateFromBase;
}

/**
 * Форматирует сумму: конвертация из RUB в выбранную валюту и вывод по локали.
 * Для целых сумм без копеек используйте maximumFractionDigits: 0.
 */
export function formatCurrency(
  valueInRub: number,
  currency: Currency,
  config: CurrencyConfig,
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number }
): string {
  const { symbol, locale, rateFromBase } = config;
  const displayValue = toDisplayValue(valueInRub, rateFromBase);
  const formatted = new Intl.NumberFormat(locale, {
    style: "decimal",
    useGrouping: true,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(displayValue);

  if (currency === "USD") return `${symbol}${formatted}`;
  if (currency === "AED" || currency === "USDT") return `${formatted} ${symbol}`;
  return `${formatted} ${symbol}`;
}
