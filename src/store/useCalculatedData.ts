"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { config } from "@/lib/config";
import { getAdminSettings } from "@/lib/admin-storage";
import { FinancialEngine } from "@/lib/engine";
import type { AnnuityResult, ROIResult, TaxDeductionResult } from "@/lib/engine";
import {
  buildChartDataWithDeposit,
  calculateVerdictBenefit,
  calculateCompareBenefit,
  type ChartRowWithDeposit,
} from "@/lib/engine/financialEngine";
import { DEFAULT_DEPOSIT_RATE } from "@/config/constants";
import { useStore } from "./useStore";
import { useChartData } from "./useChartData";

type CompareStrategy = "investor" | "family" | "entry" | null;

const simulatorInputSelector = (s: {
  price: number;
  downPercent: number;
  ratePercent: number;
  termYears: number;
  rentalYieldPercent: number;
  config: { baseRates: { priceGrowthPercent: number } };
}) => ({
  price: s.price,
  downPercent: s.downPercent,
  ratePercent: s.ratePercent,
  termYears: s.termYears,
  rentalYieldPercent: s.rentalYieldPercent,
  priceGrowthPercent: s.config.baseRates.priceGrowthPercent,
  growthRate: s.config.baseRates.priceGrowthPercent / 100,
});

export interface CalculatedData {
  chartDataWithDeposit: ChartRowWithDeposit[];
  annuity: AnnuityResult;
  taxDeductions: TaxDeductionResult;
  roi: ROIResult;
  rentMonthly: number;
  totalRent: number;
  finalValue: number;
  totalPayments: number;
  taxRefunds: number;
  verdictBenefit: number;
  verdictBenefitCompare: number | null;
  benefitDelta: number | null;
  compareScenarioLabel: CompareStrategy;
}

export function useCalculatedData(
  compareStrategy: CompareStrategy
): CalculatedData {
  const chartData = useChartData();
  const {
    price,
    downPercent,
    ratePercent,
    termYears,
    rentalYieldPercent,
    priceGrowthPercent,
    growthRate,
  } = useStore(useShallow(simulatorInputSelector));

  const downPayment = useMemo(
    () => price * (downPercent / 100),
    [price, downPercent]
  );
  const loanAmount = useMemo(
    () => price - price * (downPercent / 100),
    [price, downPercent]
  );

  const compareChartData = useMemo(() => {
    if (!compareStrategy) return null;
    const preset = config.scenarioPresets[compareStrategy];
    const principal = preset.price * (1 - preset.downPercent / 100);
    return FinancialEngine.getAmortizationSchedule({
      principal,
      annualRate: preset.ratePercent / 100,
      termYears: preset.termYears,
    });
  }, [compareStrategy]);

  const mergedChartData = useMemo(() => {
    if (!compareChartData) return chartData;
    const byMonth = new Map(compareChartData.map((p) => [p.month, p.balance]));
    return chartData.map((p) => ({
      ...p,
      balanceCompare: byMonth.get(p.month) ?? undefined,
    }));
  }, [chartData, compareChartData]);

  const depositRate =
    typeof window !== "undefined"
      ? getAdminSettings().depositRate ?? DEFAULT_DEPOSIT_RATE
      : DEFAULT_DEPOSIT_RATE;
  const appreciationPercent = priceGrowthPercent;

  const chartDataWithDeposit = useMemo(
    () =>
      buildChartDataWithDeposit({
        mergedChartData,
        price,
        downPercent,
        ratePercent,
        termYears,
        depositRate,
        appreciationPercent,
        rentalYieldPercent,
        compareStrategy,
        comparePreset: compareStrategy
          ? config.scenarioPresets[compareStrategy]
          : null,
      }),
    [
      mergedChartData,
      price,
      downPercent,
      ratePercent,
      termYears,
      depositRate,
      appreciationPercent,
      rentalYieldPercent,
      compareStrategy,
    ]
  );

  const annuity = useMemo(
    () =>
      FinancialEngine.annuity({
        principal: loanAmount,
        annualRate: ratePercent / 100,
        termYears,
      }),
    [loanAmount, ratePercent, termYears]
  );

  const taxDeductions = useMemo(
    () => FinancialEngine.taxDeductions(price, annuity.totalInterest),
    [price, annuity.totalInterest]
  );

  const roi = useMemo(
    () =>
      FinancialEngine.roi({
        price,
        downPayment,
        annualRentalYield: rentalYieldPercent / 100,
        expenseRatio: 0.2,
      }),
    [price, downPayment, rentalYieldPercent]
  );

  const rentMonthly = useMemo(
    () => (price * (rentalYieldPercent / 100)) / 12,
    [price, rentalYieldPercent]
  );
  const totalRent = useMemo(
    () => rentMonthly * 12 * termYears,
    [rentMonthly, termYears]
  );
  const finalValue = useMemo(
    () => price * Math.pow(1 + growthRate, termYears),
    [price, growthRate, termYears]
  );
  const totalPayments = annuity.totalPayment;
  const taxRefunds = taxDeductions.totalRefund;

  const verdictBenefit = useMemo(
    () =>
      calculateVerdictBenefit({
        price,
        termYears,
        downPayment,
        totalPayments,
        totalRent,
        taxRefunds,
        growthRate,
      }),
    [
      price,
      termYears,
      downPayment,
      totalPayments,
      totalRent,
      taxRefunds,
      growthRate,
    ]
  );

  const compareResult = useMemo(() => {
    if (!compareStrategy) {
      return {
        verdictBenefitCompare: null as number | null,
        benefitDelta: null as number | null,
      };
    }
    const preset = config.scenarioPresets[compareStrategy];
    const result = calculateCompareBenefit({
      preset,
      rentalYieldPercent,
      growthRate,
      mainVerdictBenefit: verdictBenefit,
    });
    return {
      verdictBenefitCompare: result.verdictBenefitCompare,
      benefitDelta: result.benefitDelta,
    };
  }, [compareStrategy, rentalYieldPercent, growthRate, verdictBenefit]);

  return {
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
    verdictBenefitCompare: compareResult.verdictBenefitCompare,
    benefitDelta: compareResult.benefitDelta,
    compareScenarioLabel: compareStrategy,
  };
}
