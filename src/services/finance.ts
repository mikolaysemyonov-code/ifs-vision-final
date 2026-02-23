/**
 * ExpertInsights — сервисный слой анализа результатов симулятора.
 * Анализирует график netEquity vs deposit и выдаёт кроссовер, итоговое преимущество и пик эффективности вклада.
 */

import type { ChartRowWithDeposit } from "@/lib/engine/financialEngine";
import { DEPOSIT_PHASE_MONTHS } from "@/config/constants";

const HORIZON_YEARS = 20;
const HORIZON_MONTHS = HORIZON_YEARS * 12;

/** Результат анализа для модуля ExpertInsights (кроссовер, итог на 240 мес., период лидерства вклада). */
export interface FinancialVerdict {
  /** Месяц, когда капитал в недвижимости впервые превышает вклад (propertyCapital > depositCapital). */
  crossOverMonth: number | null;
  /** Разница в капитале (Net Equity) на 240-й месяц, в млн ₽ (положительная = недвижимость выгоднее). */
  finalAdvantage: number;
  /** Сколько месяцев вклад выгоднее недвижимости (период высокой ставки ЦБ и после). */
  peakDepositPeriod: number;
}

/**
 * Анализирует массив calculatedData (chartDataWithDeposit) и возвращает:
 * - crossOverMonth: месяц первого пересечения (propertyCapital > depositCapital),
 * - finalAdvantage: разница капитала на 240-й месяц в млн ₽,
 * - peakDepositPeriod: число месяцев, когда вклад впереди недвижимости.
 */
export function getFinancialVerdict(calculatedData: {
  chartDataWithDeposit: ChartRowWithDeposit[];
}): FinancialVerdict {
  const chart = calculatedData.chartDataWithDeposit;
  const upTo240 = chart.filter((r) => r.month <= HORIZON_MONTHS);

  let crossOverMonth: number | null = null;
  for (const row of upTo240) {
    if (row.month > 0 && row.netEquity > row.depositAccumulation) {
      crossOverMonth = row.month;
      break;
    }
  }

  const rowAt240 = upTo240.find((r) => r.month === HORIZON_MONTHS) ?? upTo240[upTo240.length - 1];
  const finalAdvantageRub = rowAt240
    ? rowAt240.netEquity - rowAt240.depositAccumulation
    : 0;
  const finalAdvantage = finalAdvantageRub / 1_000_000;

  let peakDepositPeriod = 0;
  for (const row of upTo240) {
    if (row.depositAccumulation > row.netEquity) peakDepositPeriod += 1;
  }

  return {
    crossOverMonth,
    finalAdvantage,
    peakDepositPeriod,
  };
}

/** Входные данные для генерации экспертного вывода (минимальный срез CalculatedData). */
export interface ExpertConclusionInput {
  chartDataWithDeposit: ChartRowWithDeposit[];
}

export interface ExpertConclusion {
  /** Месяц, в который капитал в недвижимости обгоняет вклад (первое пересечение). */
  crossoverPointMonth: number | null;
  /** Год кроссовера (для вывода). */
  crossoverPointYear: number | null;
  /** Разница в итоговом капитале через 20 лет: положительная = ипотека выгоднее, отрицательная = вклад. */
  finalAdvantageRub: number;
  /** Какая стратегия выигрывает на горизонте 20 лет. */
  winningStrategy: "mortgage" | "deposit";
  /** Период максимальной эффективности вклада: месяц, когда разрыв (вклад − недвижимость) максимален в фазе высокой ставки (1..36 мес). */
  yieldPeakMonth: number | null;
  /** Разрыв в рублях в момент yieldPeak (насколько вклад впереди). */
  yieldPeakGapRub: number;
  /** Итоговый капитал по недвижимости на горизонте. */
  finalNetEquity: number;
  /** Итоговый капитал по вкладу на горизонте. */
  finalDeposit: number;
  /** Месяц локального максимума вклада, после которого значение вклада начинает уменьшаться (инфляционный перегиб). */
  inflectionMonth: number | null;
  /** Год перегиба для вывода. */
  inflectionYear: number | null;
  /** Предупреждение об инфляционном перегибе (если найден). */
  inflationWarning: string | null;
}

/**
 * Анализирует массив результатов и находит:
 * - Cross-over Point: месяц, когда капитал в недвижимости обгоняет вклад.
 * - Final Advantage: разница в итоговом капитале через 20 лет.
 * - Yield Peak: период максимальной эффективности вклада (пока ставка ЦБ высока).
 */
export function generateExpertConclusion(
  data: ExpertConclusionInput
): ExpertConclusion {
  const chart = data.chartDataWithDeposit;
  const upToHorizon = chart.filter((r) => r.month <= HORIZON_MONTHS);
  const lastRow =
    upToHorizon.length > 0
      ? upToHorizon[upToHorizon.length - 1]
      : null;

  let crossoverPointMonth: number | null = null;
  for (const row of upToHorizon) {
    if (row.month > 0 && row.netEquity >= row.depositAccumulation) {
      crossoverPointMonth = row.month;
      break;
    }
  }

  const crossoverPointYear =
    crossoverPointMonth != null
      ? Math.floor(crossoverPointMonth / 12) +
        (crossoverPointMonth % 12 > 0 ? 1 : 0)
      : null;

  const finalNetEquity = lastRow?.netEquity ?? 0;
  const finalDeposit = lastRow?.depositAccumulation ?? 0;
  const finalAdvantageRub = finalNetEquity - finalDeposit;
  const winningStrategy: "mortgage" | "deposit" =
    finalAdvantageRub >= 0 ? "mortgage" : "deposit";

  let yieldPeakMonth: number | null = null;
  let yieldPeakGapRub = 0;
  const highRatePhase = upToHorizon.filter(
    (r) => r.month >= 1 && r.month <= DEPOSIT_PHASE_MONTHS
  );
  for (const row of highRatePhase) {
    const gap = row.depositAccumulation - row.netEquity;
    if (gap > yieldPeakGapRub) {
      yieldPeakGapRub = gap;
      yieldPeakMonth = row.month;
    }
  }

  let inflectionMonth: number | null = null;
  let inflectionYear: number | null = null;
  let inflationWarning: string | null = null;
  if (upToHorizon.length >= 2) {
    let maxDeposit = upToHorizon[0].depositAccumulation;
    let maxDepositMonth = upToHorizon[0].month;
    for (const row of upToHorizon) {
      if (row.depositAccumulation > maxDeposit) {
        maxDeposit = row.depositAccumulation;
        maxDepositMonth = row.month;
      }
    }
    const peakIndex = upToHorizon.findIndex((r) => r.month === maxDepositMonth);
    const afterPeak = upToHorizon.slice(peakIndex + 1);
    const decreasesAfterPeak = afterPeak.some((r) => r.depositAccumulation < maxDeposit);
    if (decreasesAfterPeak) {
      inflectionMonth = maxDepositMonth;
      inflectionYear =
        Math.floor(maxDepositMonth / 12) + (maxDepositMonth % 12 > 0 ? 1 : 0);
      inflationWarning = `Внимание: на ${inflectionYear}-м году расходы на индексируемую аренду превышают доходность вклада. Система начинает изымать средства из тела депозита для оплаты жилья.`;
    }
  }

  return {
    crossoverPointMonth,
    crossoverPointYear,
    finalAdvantageRub,
    winningStrategy,
    yieldPeakMonth,
    yieldPeakGapRub,
    finalNetEquity,
    finalDeposit,
    inflectionMonth,
    inflectionYear,
    inflationWarning,
  };
}

function formatMillionsRub(value: number): string {
  const millions = value / 1_000_000;
  if (Math.abs(millions) < 0.01) return "0 млн ₽";
  return `${millions >= 0 ? "" : "−"}${Math.abs(millions).toFixed(2)} млн ₽`;
}

/** Входные данные для сравнения двух объектов (режим Multi-Property Battle). */
export interface ComparisonVerdictInput {
  chartDataWithDeposit: ChartRowWithDeposit[];
  chartDataWithDepositB: ChartRowWithDeposit[];
  /** ROI объекта А, % */
  roiAPercent: number;
  /** ROI объекта Б, % */
  roiBPercent: number;
}

/** Результат сравнения двух ЖК: лидер по капиталу, разница ROI, кроссовер лучшего. */
export interface ComparisonVerdict {
  /** Кто лидирует по финальному Net Equity */
  leader: "A" | "B";
  /** Финальный Net Equity объекта А (рубли) */
  finalNetEquityA: number;
  /** Финальный Net Equity объекта Б (рубли) */
  finalNetEquityB: number;
  /** Суммарная разница в капитале, млн ₽ (всегда ≥ 0) */
  capitalDiffMillions: number;
  /** Разница доходности ROI (A − B), в п.п. Положительная = А выгоднее по ROI */
  roiDiffPercent: number;
  /** Точка обгона вклада для лучшего объекта (месяц); null если нет */
  crossoverPointMonth: number | null;
  /** Год кроссовера для лучшего объекта */
  crossoverPointYear: number | null;
}

/**
 * Сравнивает два объекта (А и Б): кто лидирует по финальному Net Equity,
 * разница ROI (A − B), общая точка обгона вклада для лучшего из объектов.
 */
export function generateComparisonVerdict(
  input: ComparisonVerdictInput
): ComparisonVerdict {
  const { chartDataWithDeposit, chartDataWithDepositB, roiAPercent, roiBPercent } = input;
  const lastA = chartDataWithDeposit.length > 0 ? chartDataWithDeposit[chartDataWithDeposit.length - 1] : null;
  const lastB = chartDataWithDepositB.length > 0 ? chartDataWithDepositB[chartDataWithDepositB.length - 1] : null;
  const finalNetEquityA = lastA?.netEquity ?? 0;
  const finalNetEquityB = lastB?.netEquity ?? 0;

  const leader: "A" | "B" = finalNetEquityA >= finalNetEquityB ? "A" : "B";
  const capitalDiffRub = Math.abs(finalNetEquityA - finalNetEquityB);
  const capitalDiffMillions = capitalDiffRub / 1_000_000;
  const roiDiffPercent = roiAPercent - roiBPercent;

  const chartBest = leader === "A" ? chartDataWithDeposit : chartDataWithDepositB;
  let crossoverPointMonth: number | null = null;
  for (const row of chartBest) {
    if (row.month > 0 && row.netEquity >= row.depositAccumulation) {
      crossoverPointMonth = row.month;
      break;
    }
  }
  const crossoverPointYear =
    crossoverPointMonth != null
      ? Math.floor(crossoverPointMonth / 12) + (crossoverPointMonth % 12 > 0 ? 1 : 0)
      : null;

  return {
    leader,
    finalNetEquityA,
    finalNetEquityB,
    capitalDiffMillions,
    roiDiffPercent,
    crossoverPointMonth,
    crossoverPointYear,
  };
}

/** Текст вывода эксперта для отчёта и ExpertVerdict (RU/EN). */
export function getExpertConclusionMessage(
  c: ExpertConclusion,
  locale: "ru" | "en"
): string {
  const absAdvantage = Math.abs(c.finalAdvantageRub);
  const advantageStr = formatMillionsRub(absAdvantage);
  const strategyName =
    c.winningStrategy === "mortgage"
      ? locale === "ru"
        ? "недвижимость"
        : "property"
      : locale === "ru"
        ? "вклад"
        : "deposit";
  const crossoverStr =
    c.crossoverPointYear != null
      ? `${c.crossoverPointYear} ${locale === "ru" ? "год" : "year"}`
      : locale === "ru"
        ? "не достигнута"
        : "not reached";
  if (locale === "ru") {
    return `На горизонте 20 лет стратегия «${strategyName}» выгоднее на ${advantageStr}. Точка окупаемости банковских процентов — ${crossoverStr}.`;
  }
  return `Over 20 years, «${strategyName}» is ahead by ${advantageStr}. Deposit interest payback point — ${crossoverStr}.`;
}
