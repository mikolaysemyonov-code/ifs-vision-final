/**
 * IFS Vision — Financial Engine
 * Расчёты ипотеки, налоговых вычетов и ROI при аренде.
 * Внутри все денежные суммы в копейках; вход/выход в рублях для UI.
 */

import {
  rublesToKopeks,
  kopeksToRubles,
  roundKopeks,
  KOPEKS_PER_RUBLE,
} from "@/lib/money";

/** Лимит имущественного вычета (возврат до 260 000 ₽ при ставке 13%). */
export const PROPERTY_DEDUCTION_LIMIT = 2_000_000;

/** Лимит вычета по процентам (возврат до 390 000 ₽ при ставке 13%). */
export const MORTGAGE_INTEREST_DEDUCTION_LIMIT = 3_000_000;

/** Ставка НДФЛ для расчёта вычетов (13%). */
const INCOME_TAX_RATE = 0.13;

export interface AnnuityInput {
  /** Сумма кредита (₽). */
  principal: number;
  /** Годовая процентная ставка (0–1, например 0.18 = 18%). */
  annualRate: number;
  /** Срок в годах. */
  termYears: number;
}

export interface AnnuityResult {
  /** Ежемесячный платёж (₽). */
  monthlyPayment: number;
  /** Общая сумма выплат (₽). */
  totalPayment: number;
  /** Сумма переплаты по процентам (₽). */
  totalInterest: number;
}

export interface TaxDeductionResult {
  /** Имущественный вычет: сумма к возврату (₽), макс. 260 000. */
  propertyRefund: number;
  /** Вычет по процентам: сумма к возврату (₽), макс. 390 000. */
  interestRefund: number;
  /** Общий возврат (₽). */
  totalRefund: number;
}

export interface ChartDataPoint {
  month: number;
  balance: number;
  interest: number;
}

/** Параметры для расчёта честного ROI (аренда минус расходы, капитализация). */
export interface CalculateROIInput {
  /** Ежемесячная аренда, ₽. */
  monthlyRent: number;
  /** Полная стоимость объекта, ₽. */
  objectPrice: number;
  /** Годовые налоги и расходы, ₽ (если не указано — 20% от годовой аренды). */
  annualTaxesAndExpenses?: number;
}

/** Результат расчёта ROI с учётом денежного потока и капитализации. */
export interface CalculateROIResult {
  /** Чистый ROI по денежному потоку: (аренда − расходы) / цена объекта, %. */
  roiPercent: number;
  /** Годовой денежный поток после налогов и расходов, ₽. */
  annualCashflow: number;
  /** Суммарная годовая доходность с учётом роста цены 5% в год, %. */
  totalAnnualReturnPercent: number;
  /** Годовая доходность от роста стоимости объекта, ₽. */
  annualAppreciation: number;
}

export interface ROIInput {
  /** Цена объекта (₽). */
  price: number;
  /** Первоначальный взнос (₽). */
  downPayment: number;
  /** Годовая арендная доходность (0–1, например 0.06 = 6%). */
  annualRentalYield: number;
  /** Годовые расходы (коммунальные, налог, ремонт) в % от дохода (0–1). */
  expenseRatio?: number;
}

export interface ROIResult {
  /** Годовой доход от аренды (₽). */
  annualRentalIncome: number;
  /** Годовые расходы (₽). */
  annualExpenses: number;
  /** Чистый годовой доход (₽). */
  netAnnualIncome: number;
  /** Инвестиции (первоначальный взнос). */
  investment: number;
  /** ROI в процентах. */
  roiPercent: number;
  /** Окупаемость в годах. */
  paybackYears: number;
}

/** Параметры сравнения аренды и покупки. */
export interface CompareWithRentParams {
  /** Ежемесячная аренда, ₽. */
  monthlyRent: number;
  /** Ежемесячный платёж по ипотеке, ₽. */
  monthlyMortgagePayment: number;
  /** Срок в годах. */
  termYears: number;
  /** Цена объекта сегодня, ₽ (для расчёта будущей стоимости). */
  currentPropertyPrice: number;
  /** Годовая инфляция (по умолчанию 0.04). Задаётся из конфига. */
  inflationRate?: number;
  /** Годовой рост стоимости недвижимости (по умолчанию 0.05). Задаётся из конфига. */
  propertyGrowthRate?: number;
}

/** Результат сравнения: итоги аренды vs капитал владельца. */
export interface CompareWithRentResult {
  /** Суммарные расходы на аренду за срок с учётом инфляции 4% в год, ₽. */
  rentTotal: number;
  /** Стоимость квартиры через срок при росте цены 5% в год, ₽ (капитал владельца). */
  propertyEquity: number;
}

export class FinancialEngine {
  /**
   * Ежемесячный аннуитетный платёж и итоги по кредиту.
   * Внутри: расчёт в копейках, округление на каждом шаге.
   */
  static annuity(input: AnnuityInput): AnnuityResult {
    const { principal, annualRate, termYears } = input;
    if (principal <= 0 || termYears <= 0) {
      return { monthlyPayment: 0, totalPayment: 0, totalInterest: 0 };
    }
    const principalK = rublesToKopeks(principal);
    const n = Math.round(termYears * 12);
    const r = annualRate / 12;
    const monthlyPaymentRub =
      r === 0
        ? principal / n
        : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const monthlyK = rublesToKopeks(monthlyPaymentRub);
    const totalPaymentK = monthlyK * n;
    const totalInterestK = totalPaymentK - principalK;
    return {
      monthlyPayment: kopeksToRubles(monthlyK),
      totalPayment: kopeksToRubles(totalPaymentK),
      totalInterest: kopeksToRubles(totalInterestK),
    };
  }

  /**
   * Общая сумма возврата налога за весь срок ипотеки.
   * Имущественный вычет: 13% от стоимости (макс. 260 000 ₽).
   * Вычет по процентам: 13% от уплаченных процентов (макс. 390 000 ₽).
   * @param purchasePrice — цена приобретения (база для имущественного вычета, макс. 2 000 000 учтено).
   * @param totalInterestPaid — уплаченные проценты по ипотеке за весь срок (база макс. 3 000 000).
   * @returns общая сумма возврата налога, ₽.
   */
  static calculateTaxBenefits(
    purchasePrice: number,
    totalInterestPaid: number
  ): number {
    const result = this.taxDeductions(purchasePrice, totalInterestPaid);
    return result.totalRefund;
  }

  /**
   * Налоговые вычеты: имущественный (до 260 000 ₽) и по процентам (до 390 000 ₽).
   * Расчёт в копейках, результат в рублях.
   */
  static taxDeductions(
    purchasePrice: number,
    totalInterestPaid: number
  ): TaxDeductionResult {
    const propertyBaseK = Math.min(
      rublesToKopeks(purchasePrice),
      rublesToKopeks(PROPERTY_DEDUCTION_LIMIT)
    );
    const interestBaseK = Math.min(
      rublesToKopeks(totalInterestPaid),
      rublesToKopeks(MORTGAGE_INTEREST_DEDUCTION_LIMIT)
    );
    const propertyRefundK = roundKopeks(propertyBaseK * INCOME_TAX_RATE);
    const interestRefundK = roundKopeks(interestBaseK * INCOME_TAX_RATE);
    const capProperty = 260_000 * KOPEKS_PER_RUBLE;
    const capInterest = 390_000 * KOPEKS_PER_RUBLE;
    const propertyRefundCapped = Math.min(propertyRefundK, capProperty);
    const interestRefundCapped = Math.min(interestRefundK, capInterest);
    return {
      propertyRefund: kopeksToRubles(propertyRefundCapped),
      interestRefund: kopeksToRubles(interestRefundCapped),
      totalRefund: kopeksToRubles(propertyRefundCapped + interestRefundCapped),
    };
  }

  /**
   * График погашения: для каждого месяца — остаток долга и проценты в этом месяце.
   * Шаг за шагом в копейках с округлением на каждой итерации.
   */
  static getAmortizationSchedule(input: AnnuityInput): ChartDataPoint[] {
    const { principal, annualRate, termYears } = input;
    const result = this.annuity(input);
    const monthlyK = rublesToKopeks(result.monthlyPayment);
    const principalK = rublesToKopeks(principal);
    const n = Math.round(termYears * 12);
    const r = annualRate / 12;
    const schedule: ChartDataPoint[] = [];
    let balanceK = principalK;

    for (let month = 0; month <= n; month++) {
      const interestK = month === 0 ? 0 : roundKopeks(balanceK * r);
      schedule.push({
        month,
        balance: kopeksToRubles(balanceK),
        interest: kopeksToRubles(interestK),
      });
      if (month < n) {
        const principalPaymentK = monthlyK - interestK;
        balanceK = Math.max(0, balanceK - principalPaymentK);
      }
    }
    return schedule;
  }

  /**
   * Честный ROI по аренде: ((Месячная_аренда × 12) − Налоги_и_расходы) / Полная_стоимость_объекта × 100.
   * Плюс учёт капитализации (рост цены 5% в год) в Total Annual Return.
   */
  static calculateROI(input: CalculateROIInput): CalculateROIResult {
    const { monthlyRent, objectPrice, annualTaxesAndExpenses } = input;
    if (objectPrice <= 0) {
      return {
        roiPercent: 0,
        annualCashflow: 0,
        totalAnnualReturnPercent: 0,
        annualAppreciation: 0,
      };
    }
    const annualGrossRent = monthlyRent * 12;
    const taxesAndExpenses =
      annualTaxesAndExpenses ?? annualGrossRent * 0.2;
    const annualCashflow = annualGrossRent - taxesAndExpenses;
    const roiPercent = (annualCashflow / objectPrice) * 100;

    const PROPERTY_GROWTH_RATE = 0.05;
    const annualAppreciation = objectPrice * PROPERTY_GROWTH_RATE;
    const totalAnnualReturnPercent =
      ((annualCashflow + annualAppreciation) / objectPrice) * 100;

    return {
      roiPercent: Math.round(roiPercent * 100) / 100,
      annualCashflow: kopeksToRubles(rublesToKopeks(annualCashflow)),
      totalAnnualReturnPercent: Math.round(totalAnnualReturnPercent * 100) / 100,
      annualAppreciation: kopeksToRubles(rublesToKopeks(annualAppreciation)),
    };
  }

  /**
   * Сравнение аренды и покупки: через срок у арендатора — только потраченные на аренду деньги,
   * у владельца — капитал в виде выросшей в цене квартиры.
   * 1. Total Rent Cost: аренда × 12 × срок с инфляцией 4% в год.
   * 2. Future Property Value: цена сегодня × рост 5% в год.
   */
  static compareWithRent(params: CompareWithRentParams): CompareWithRentResult {
    const {
      monthlyRent,
      termYears,
      currentPropertyPrice,
      inflationRate = 0.04,
      propertyGrowthRate = 0.05,
    } = params;

    const years = Math.max(0, termYears);
    const annualRentBase = monthlyRent * 12;
    const rentTotal =
      years === 0
        ? 0
        : annualRentBase *
          (Math.pow(1 + inflationRate, years) - 1) /
          inflationRate;

    const propertyEquity =
      currentPropertyPrice * Math.pow(1 + propertyGrowthRate, years);

    return {
      rentTotal: kopeksToRubles(rublesToKopeks(rentTotal)),
      propertyEquity: kopeksToRubles(rublesToKopeks(propertyEquity)),
    };
  }

  /**
   * ROI при сдаче в аренду: доходность на вложенный капитал (взнос) и срок окупаемости.
   */
  static roi(input: ROIInput): ROIResult {
    const {
      price,
      downPayment,
      annualRentalYield,
      expenseRatio = 0.2,
    } = input;
    const annualRentalIncome = price * annualRentalYield;
    const annualExpenses = annualRentalIncome * expenseRatio;
    const netAnnualIncome = annualRentalIncome - annualExpenses;
    const investment = downPayment;
    const roiPercent =
      investment > 0 ? (netAnnualIncome / investment) * 100 : 0;
    const paybackYears =
      netAnnualIncome > 0 ? investment / netAnnualIncome : Infinity;
    return {
      annualRentalIncome: kopeksToRubles(rublesToKopeks(annualRentalIncome)),
      annualExpenses: kopeksToRubles(rublesToKopeks(annualExpenses)),
      netAnnualIncome: kopeksToRubles(rublesToKopeks(netAnnualIncome)),
      investment: kopeksToRubles(rublesToKopeks(investment)),
      roiPercent: Math.round(roiPercent * 100) / 100,
      paybackYears: Math.round(paybackYears * 100) / 100,
    };
  }
}
