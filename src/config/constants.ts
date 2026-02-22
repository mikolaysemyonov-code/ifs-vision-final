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

/** Default annual property appreciation, percent (12 = 12%). */
export const DEFAULT_APPRECIATION_PERCENT = 12;

/** Annual rate for rent FV in SmartInsights (capitalization), decimal. */
export const RENT_REINVEST_RATE = 0.08;

/** Default deposit rate when admin not set, decimal (0.18 = 18%). */
export const DEFAULT_DEPOSIT_RATE = 0.18;
