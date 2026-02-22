/**
 * Chart & verdict calculation layer. Pure functions only.
 * Uses FinancialEngine (annuity, schedule) and constants.
 */

import { FinancialEngine } from "@/lib/engine";
import type { ChartDataPoint } from "@/lib/engine";
import {
  DEPOSIT_PHASE_MONTHS,
  TAX_DRAG_COEFFICIENT,
  RENT_INFLATION_RATE,
  TARGET_DEPOSIT_RATE_AFTER_PHASE,
  DEFAULT_APPRECIATION_PERCENT,
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
}

/** Accumulated indexed rent by month (rent grows RENT_INFLATION_RATE per year). */
export function accumulatedIndexedRent(
  rentMonthlyBase: number,
  monthsCount: number
): number {
  if (monthsCount <= 0) return 0;
  const fullYears = Math.floor(monthsCount / 12);
  const remMonths = monthsCount % 12;
  return (
    rentMonthlyBase *
    (12 * (Math.pow(1 + RENT_INFLATION_RATE, fullYears) - 1) / RENT_INFLATION_RATE +
      remMonths * Math.pow(1 + RENT_INFLATION_RATE, fullYears))
  );
}

/** Deposit accumulation: phase 1 (full rate) then phase 2 (target rate × tax drag). */
export function depositAccumulation(
  initialTotalCapital: number,
  depositRate: number,
  month: number
): number {
  if (month <= DEPOSIT_PHASE_MONTHS) {
    return initialTotalCapital * Math.pow(1 + depositRate / 12, month);
  }
  const depositAt36 =
    initialTotalCapital * Math.pow(1 + depositRate / 12, DEPOSIT_PHASE_MONTHS);
  return (
    depositAt36 *
    Math.pow(
      1 + (TARGET_DEPOSIT_RATE_AFTER_PHASE / 12) * TAX_DRAG_COEFFICIENT,
      month - DEPOSIT_PHASE_MONTHS
    )
  );
}

/** Build full chart rows with netEquity, deposit, optional compare. */
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
    compareStrategy,
    comparePreset,
  } = input;
  const appreciationRate = appreciationPercent / 100;
  const downPayment = price * (downPercent / 100);
  const loanAmount = price - downPayment;
  const annuity = FinancialEngine.annuity({
    principal: loanAmount,
    annualRate: ratePercent / 100,
    termYears,
  });
  const initialTotalCapital = price;
  const initialCash = initialTotalCapital - downPayment;
  const rentMonthlyBase = (price * (rentalYieldPercent / 100)) / 12;

  let cumulativeInterest = 0;
  let breakEvenAssigned = false;

  return mergedChartData.map((row) => {
    cumulativeInterest += row.interest;
    const years = row.month / 12;
    const propertyValue = price * Math.pow(1 + appreciationRate, years);
    const equityInProperty = Math.max(0, propertyValue - row.balance);
    const cumulativePayment = annuity.monthlyPayment * row.month;
    const remainingCash = Math.max(0, initialCash - cumulativePayment);
    const savedRentTotalIndexed = accumulatedIndexedRent(
      rentMonthlyBase,
      row.month
    );
    const netEquity =
      equityInProperty + remainingCash + savedRentTotalIndexed;
    const depositAcc = depositAccumulation(
      initialTotalCapital,
      depositRate,
      row.month
    );
    const totalProfit =
      propertyValue - price + savedRentTotalIndexed;
    const isBreakEven =
      !breakEvenAssigned &&
      totalProfit > cumulativeInterest &&
      (breakEvenAssigned = true);

    const out: ChartRowWithDeposit = {
      ...row,
      netEquity,
      depositAccumulation: depositAcc,
      isBreakEven: !!isBreakEven,
      propertyValueGrowth: propertyValue - price,
      savedRentIndexed: savedRentTotalIndexed,
    };

    if (comparePreset && "balanceCompare" in row && row.balanceCompare != null) {
      const comparePropertyValue =
        comparePreset.price *
        Math.pow(1 + appreciationRate, years);
      out.netEquityCompare = Math.max(
        0,
        comparePropertyValue - row.balanceCompare
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

/** Verdict benefit: finalValue + totalRent - totalPayments - downPayment + taxRefunds. */
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
  const finalValue = price * Math.pow(1 + growthRate, termYears);
  const raw =
    finalValue + totalRent - totalPayments - downPayment + taxRefunds;
  return Number.isFinite(raw) ? raw : 0;
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

/** Compare scenario verdict benefit and delta vs main. */
export function calculateCompareBenefit(
  input: CompareBenefitInput
): CompareBenefitResult {
  const { preset, rentalYieldPercent, growthRate, mainVerdictBenefit } = input;
  const principalCompare =
    preset.price * (1 - preset.downPercent / 100);
  const annuityCompare = FinancialEngine.annuity({
    principal: principalCompare,
    annualRate: preset.ratePercent / 100,
    termYears: preset.termYears,
  });
  const taxCompare = FinancialEngine.taxDeductions(
    preset.price,
    annuityCompare.totalInterest
  );
  const downCompare = preset.price * (preset.downPercent / 100);
  const rentMonthlyCompare =
    (preset.price * (rentalYieldPercent / 100)) / 12;
  const totalRentCompare =
    rentMonthlyCompare * 12 * preset.termYears;
  const finalValueCompare =
    preset.price * Math.pow(1 + growthRate, preset.termYears);
  const benefitCompare =
    finalValueCompare +
    totalRentCompare -
    annuityCompare.totalPayment -
    downCompare +
    taxCompare.totalRefund;
  return {
    verdictBenefitCompare: benefitCompare,
    benefitDelta: mainVerdictBenefit - benefitCompare,
  };
}

/** Default appreciation when not from config (percent, e.g. 12). */
export { DEFAULT_APPRECIATION_PERCENT };
