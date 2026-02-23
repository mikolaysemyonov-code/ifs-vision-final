/**
 * Financial and product constants. Single source of truth for rates and magic numbers.
 */

/** Months for "high rate" deposit phase before CB rate drop (3 years). */
export const DEPOSIT_PHASE_MONTHS = 36;

/** Tax & inflation drag on deposit yield after phase (e.g. 15% tax + inflation). */
export const TAX_DRAG_COEFFICIENT = 0.85;

/** Annual rent indexation (inflation), decimal (0.05 = 5%). */
export const RENT_INFLATION_RATE = 0.05;

/** Target deposit rate after phase, decimal (0.08 = 8%). */
export const TARGET_DEPOSIT_RATE_AFTER_PHASE = 0.08;

/** Default annual property appreciation for comparison, percent (6 = 6%). */
export const DEFAULT_APPRECIATION_PERCENT = 6;

/** Инфляция для индексации аренды в сценарии «Вклад» (0.05 = 5%). */
export const INFLATION_RATE_FOR_RENT = 0.05;

/** Налог на процентный доход по вкладам (13%). */
export const DEPOSIT_TAX_RATE = 0.13;

/** Необлагаемый лимит процентов по вкладам в год, ₽ (1 млн × ключевая ставка при 18% ≈ 180 000). */
export const DEPOSIT_INTEREST_EXEMPTION_PER_YEAR_RUB = 180_000;

/** Annual rate for rent FV in SmartInsights (capitalization), decimal. */
export const RENT_REINVEST_RATE = 0.08;

/** Default deposit rate when admin not set, decimal (0.18 = 18%). */
export const DEFAULT_DEPOSIT_RATE = 0.18;

/** Black Swan: падение цены недвижимости за первые 2 года, decimal (0.12 = 12%). */
export const STAGNATION_DROP_PERCENT = 0.12;

/** Black Swan: число месяцев фазы «стагнация» (2 года). */
export const STAGNATION_MONTHS = 24;

/** Black Swan: годовая индексация аренды в сценарии «гиперинфляция», decimal (0.15 = 15%). */
export const HYPERINFLATION_RENT_RATE = 0.15;
