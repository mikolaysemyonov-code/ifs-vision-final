/**
 * Chart & verdict calculation layer. Pure functions only.
 * Все денежные расчёты в копейках; округление на каждом шаге. Выход в рублях для UI.
 */

import { FinancialEngine } from "@/lib/engine";
import type { ChartDataPoint } from "@/lib/engine";
import {
  rublesToKopeks,
  kopeksToRubles,
  roundKopeks,
} from "@/lib/money";
import {
  DEPOSIT_PHASE_MONTHS,
  TAX_DRAG_COEFFICIENT,
  RENT_INFLATION_RATE,
  TARGET_DEPOSIT_RATE_AFTER_PHASE,
  DEFAULT_APPRECIATION_PERCENT,
  STAGNATION_DROP_PERCENT,
  STAGNATION_MONTHS,
  HYPERINFLATION_RENT_RATE,
  INFLATION_RATE_FOR_RENT,
  DEPOSIT_TAX_RATE,
  DEPOSIT_INTEREST_EXEMPTION_PER_YEAR_RUB,
} from "@/config/constants";

export interface ChartRowWithDeposit {
  month: number;
  balance: number;
  interest: number;
  balanceCompare?: number;
  netEquity: number;
  depositAccumulation: number;
  isBreakEven: boolean;
  propertyValueGrowth: number;
  savedRentIndexed: number;
  netEquityCompare?: number;
}

export type RiskScenario = "none" | "stagnation" | "hyperinflation";

export interface ChartWithDepositInput {
  mergedChartData: Array<ChartDataPoint & { balanceCompare?: number }>;
  price: number;
  downPercent: number;
  ratePercent: number;
  termYears: number;
  depositRate: number;
  appreciationPercent: number;
  rentalYieldPercent: number;
  compareStrategy: "investor" | "family" | "entry" | null;
  comparePreset: { price: number; downPercent: number; ratePercent: number; termYears: number } | null;
  /** Сценарий риска: стагнация (падение цен), гиперинфляция (рост индексации аренды). */
  riskScenario?: RiskScenario;
  /** Zero-Point Sync: при сравнении двух объектов — общая точка входа капитала (рубли). Для Объекта Б передать price Объекта А. */
  initialTotalCapitalOverride?: number;
}

/**
 * Накопленная индексированная аренда за monthsCount месяцев (аренда растёт на rate в год).
 * Результат в рублях; внутреннее округление через копейки.
 * @param rentInflationRateOverride — при сценарии «гиперинфляция» задаёт повышенную индексацию (например HYPERINFLATION_RENT_RATE).
 */
export function accumulatedIndexedRent(
  rentMonthlyBase: number,
  monthsCount: number,
  rentInflationRateOverride?: number
): number {
  if (monthsCount <= 0) return 0;
  const rate = rentInflationRateOverride ?? RENT_INFLATION_RATE;
  const fullYears = Math.floor(monthsCount / 12);
  const remMonths = monthsCount % 12;
  const rawRub =
    rate === 0
      ? rentMonthlyBase * monthsCount
      : rentMonthlyBase *
        (12 * (Math.pow(1 + rate, fullYears) - 1) / rate +
          remMonths * Math.pow(1 + rate, fullYears));
  return kopeksToRubles(roundKopeks(rublesToKopeks(rawRub)));
}

/** Опции для честного сравнения «Вклад»: аренда индексируется, проценты облагаются НДФЛ. */
export interface DepositAccumulationOptions {
  /** Ежемесячная аренда в начале (руб). */
  rentMonthlyBase: number;
  /** Годовая инфляция для индексации аренды (0.05 = 5%). */
  inflationRate: number;
  /** Ставка НДФЛ на проценты (0.13). */
  taxRate: number;
  /** Необлагаемая сумма процентов в год, ₽. */
  exemptionPerYearRub: number;
}

/**
 * Накопление по вкладу с учётом:
 * - двух фаз ставки (высокая 36 мес, затем целевая);
 * - при options: ежемесячное списание аренды (индексация по инфляции) и годовой налог на проценты сверх лимита.
 * Пошаговый расчёт в копейках.
 */
export function depositAccumulation(
  initialTotalCapital: number,
  depositRate: number,
  month: number,
  options?: DepositAccumulationOptions
): number {
  const initialK = rublesToKopeks(initialTotalCapital);
  if (month <= 0) return kopeksToRubles(initialK);

  const monthlyRate1 = depositRate / 12;
  const monthlyRate2 = (TARGET_DEPOSIT_RATE_AFTER_PHASE / 12) * TAX_DRAG_COEFFICIENT;
  const exemptionK = rublesToKopeks(options?.exemptionPerYearRub ?? DEPOSIT_INTEREST_EXEMPTION_PER_YEAR_RUB);
  const taxRate = options?.taxRate ?? DEPOSIT_TAX_RATE;
  const inflationRate = options?.inflationRate ?? INFLATION_RATE_FOR_RENT;
  const rentBaseK = options ? rublesToKopeks(options.rentMonthlyBase) : 0;
  const useRentAndTax = options != null && rentBaseK >= 0;

  let balanceK = initialK;
  let interestEarnedThisYearK = 0;

  for (let m = 1; m <= month; m++) {
    const monthlyRate = m <= DEPOSIT_PHASE_MONTHS ? monthlyRate1 : monthlyRate2;
    const interestK = roundKopeks(balanceK * monthlyRate);
    balanceK = roundKopeks(balanceK + interestK);

    if (useRentAndTax) {
      const yearIndex = Math.floor((m - 1) / 12);
      const rentMultiplier = yearIndex <= 0 ? 1 : Math.pow(1 + inflationRate, yearIndex);
      const rentK = roundKopeks(rentBaseK * rentMultiplier);
      balanceK = roundKopeks(Math.max(0, balanceK - rentK));
      interestEarnedThisYearK += interestK;
    }

    if (useRentAndTax && m > 0 && m % 12 === 0) {
      const taxK = roundKopeks(
        Math.max(0, interestEarnedThisYearK - exemptionK) * taxRate
      );
      balanceK = roundKopeks(Math.max(0, balanceK - taxK));
      interestEarnedThisYearK = 0;
    }
  }

  return kopeksToRubles(balanceK);
}

/**
 * Строит строки графика с netEquity, вкладом и опциональным сравнением.
 * Все суммы считаются в копейках с округлением на каждом шаге; на выходе — рубли для UI.
 */
export function buildChartDataWithDeposit(
  input: ChartWithDepositInput
): ChartRowWithDeposit[] {
  const {
    mergedChartData,
    price,
    downPercent,
    ratePercent,
    termYears,
    depositRate,
    appreciationPercent,
    rentalYieldPercent,
    comparePreset,
    riskScenario = "none",
    initialTotalCapitalOverride,
  } = input;
  const appreciationRate =
    (appreciationPercent > 0 ? appreciationPercent : DEFAULT_APPRECIATION_PERCENT) / 100;
  const downPaymentRub = price * (downPercent / 100);
  const loanAmountRub = price - downPaymentRub;
  const annuity = FinancialEngine.annuity({
    principal: loanAmountRub,
    annualRate: ratePercent / 100,
    termYears,
  });

  const initialTotalCapital = initialTotalCapitalOverride ?? price;
  const priceK = rublesToKopeks(price);
  const downPaymentK = rublesToKopeks(downPaymentRub);
  const initialCashK = rublesToKopeks(initialTotalCapital) - downPaymentK;
  const monthlyPaymentK = rublesToKopeks(annuity.monthlyPayment);
  const rentMonthlyBaseRub = (price * (rentalYieldPercent / 100)) / 12;
  const useStagnation = riskScenario === "stagnation";
  const useHyperinflation = riskScenario === "hyperinflation";

  let cumulativeInterestRub = 0;
  let breakEvenAssigned = false;

  return mergedChartData.map((row) => {
    cumulativeInterestRub += row.interest;
    const years = row.month / 12;
    const balanceK = rublesToKopeks(row.balance);
    let propertyValueK: number;
    if (useStagnation) {
      if (row.month <= STAGNATION_MONTHS) {
        const dropFactor = 1 - STAGNATION_DROP_PERCENT * (row.month / STAGNATION_MONTHS);
        propertyValueK = roundKopeks(priceK * dropFactor);
      } else {
        const yearsAfterStagnation = (row.month - STAGNATION_MONTHS) / 12;
        const valueAt24 = priceK * (1 - STAGNATION_DROP_PERCENT);
        propertyValueK = roundKopeks(
          valueAt24 * Math.pow(1 + appreciationRate, yearsAfterStagnation)
        );
      }
    } else {
      propertyValueK = roundKopeks(
        priceK * Math.pow(1 + appreciationRate, years)
      );
    }
    const equityInPropertyK = Math.max(0, propertyValueK - balanceK);
    const cumulativePaymentK = monthlyPaymentK * row.month;
    const remainingCashK = Math.max(0, initialCashK - cumulativePaymentK);
    const savedRentTotalRub = accumulatedIndexedRent(
      rentMonthlyBaseRub,
      row.month,
      useHyperinflation ? HYPERINFLATION_RENT_RATE : undefined
    );
    const savedRentK = rublesToKopeks(savedRentTotalRub);
    const netEquityK =
      equityInPropertyK + remainingCashK + savedRentK;
    const depositAccRub = depositAccumulation(initialTotalCapital, depositRate, row.month, {
      rentMonthlyBase: rentMonthlyBaseRub,
      inflationRate: useHyperinflation ? HYPERINFLATION_RENT_RATE : INFLATION_RATE_FOR_RENT,
      taxRate: DEPOSIT_TAX_RATE,
      exemptionPerYearRub: DEPOSIT_INTEREST_EXEMPTION_PER_YEAR_RUB,
    });
    const depositAccK = rublesToKopeks(depositAccRub);
    const totalProfitRub =
      kopeksToRubles(propertyValueK - priceK) + savedRentTotalRub;
    const isBreakEven =
      !breakEvenAssigned &&
      totalProfitRub > cumulativeInterestRub &&
      (breakEvenAssigned = true);

    const out: ChartRowWithDeposit = {
      ...row,
      netEquity: kopeksToRubles(netEquityK),
      depositAccumulation: kopeksToRubles(depositAccK),
      isBreakEven: !!isBreakEven,
      propertyValueGrowth: kopeksToRubles(propertyValueK - priceK),
      savedRentIndexed: kopeksToRubles(savedRentK),
    };

    if (comparePreset && "balanceCompare" in row && row.balanceCompare != null) {
      const comparePriceK = rublesToKopeks(comparePreset.price);
      let comparePropertyValueK: number;
      if (useStagnation) {
        if (row.month <= STAGNATION_MONTHS) {
          const dropFactor = 1 - STAGNATION_DROP_PERCENT * (row.month / STAGNATION_MONTHS);
          comparePropertyValueK = roundKopeks(comparePriceK * dropFactor);
        } else {
          const yearsAfter = (row.month - STAGNATION_MONTHS) / 12;
          comparePropertyValueK = roundKopeks(
            comparePriceK * (1 - STAGNATION_DROP_PERCENT) * Math.pow(1 + appreciationRate, yearsAfter)
          );
        }
      } else {
        comparePropertyValueK = roundKopeks(
          comparePriceK * Math.pow(1 + appreciationRate, years)
        );
      }
      const balanceCompareK = rublesToKopeks(row.balanceCompare);
      out.netEquityCompare = kopeksToRubles(
        Math.max(0, comparePropertyValueK - balanceCompareK)
      );
    }

    return out;
  });
}

export interface VerdictBenefitInput {
  price: number;
  termYears: number;
  downPayment: number;
  totalPayments: number;
  totalRent: number;
  taxRefunds: number;
  growthRate: number;
}

/**
 * Выгода вердикта: finalValue + totalRent - totalPayments - downPayment + taxRefunds.
 * Расчёт в копейках; результат в рублях.
 */
export function calculateVerdictBenefit(input: VerdictBenefitInput): number {
  const {
    price,
    termYears,
    downPayment,
    totalPayments,
    totalRent,
    taxRefunds,
    growthRate,
  } = input;
  const finalValueRub = price * Math.pow(1 + growthRate, termYears);
  const finalValueK = rublesToKopeks(finalValueRub);
  const totalRentK = rublesToKopeks(totalRent);
  const totalPaymentsK = rublesToKopeks(totalPayments);
  const downPaymentK = rublesToKopeks(downPayment);
  const taxRefundsK = rublesToKopeks(taxRefunds);
  const rawK =
    finalValueK + totalRentK - totalPaymentsK - downPaymentK + taxRefundsK;
  if (!Number.isFinite(rawK)) return 0;
  return kopeksToRubles(roundKopeks(rawK));
}

export interface CompareBenefitInput {
  preset: { price: number; downPercent: number; ratePercent: number; termYears: number };
  rentalYieldPercent: number;
  growthRate: number;
  mainVerdictBenefit: number;
}

export interface CompareBenefitResult {
  verdictBenefitCompare: number;
  benefitDelta: number;
}

/**
 * Вердикт сценария сравнения и дельта с основным. Все суммы в копейках внутри; выход в рублях.
 */
export function calculateCompareBenefit(
  input: CompareBenefitInput
): CompareBenefitResult {
  const { preset, rentalYieldPercent, growthRate, mainVerdictBenefit } = input;
  const principalCompareRub =
    preset.price * (1 - preset.downPercent / 100);
  const annuityCompare = FinancialEngine.annuity({
    principal: principalCompareRub,
    annualRate: preset.ratePercent / 100,
    termYears: preset.termYears,
  });
  const taxCompare = FinancialEngine.taxDeductions(
    preset.price,
    annuityCompare.totalInterest
  );
  const downCompareRub = preset.price * (preset.downPercent / 100);
  const rentMonthlyCompareRub =
    (preset.price * (rentalYieldPercent / 100)) / 12;
  const totalRentCompareRub =
    rentMonthlyCompareRub * 12 * preset.termYears;
  const finalValueCompareRub =
    preset.price * Math.pow(1 + growthRate, preset.termYears);

  const finalValueK = rublesToKopeks(finalValueCompareRub);
  const totalRentK = rublesToKopeks(totalRentCompareRub);
  const totalPaymentK = rublesToKopeks(annuityCompare.totalPayment);
  const downK = rublesToKopeks(downCompareRub);
  const taxK = rublesToKopeks(taxCompare.totalRefund);
  const benefitCompareK =
    finalValueK + totalRentK - totalPaymentK - downK + taxK;
  const benefitCompareRub = kopeksToRubles(benefitCompareK);
  const mainK = rublesToKopeks(mainVerdictBenefit);
  const benefitDeltaK = mainK - benefitCompareK;

  return {
    verdictBenefitCompare: benefitCompareRub,
    benefitDelta: kopeksToRubles(benefitDeltaK),
  };
}

/** Default appreciation when not from config (percent, e.g. 12). */
export { DEFAULT_APPRECIATION_PERCENT };
