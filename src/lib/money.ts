/**
 * Safe Money Logic — расчёты в минимальных единицах (копейках).
 * Все денежные операции в движке выполняются в целых копейках;
 * округление на каждом шаге исключает накопление погрешности float на горизонте 20+ лет.
 */

export const KOPEKS_PER_RUBLE = 100;

/** Рубли → целые копейки (для входа в расчётный слой). */
export function rublesToKopeks(rubles: number): number {
  return Math.round(rubles * KOPEKS_PER_RUBLE);
}

/**
 * Копейки → рубли для UI.
 * Возвращает число с не более чем двумя знаками после запятой (без float-шума).
 */
export function kopeksToRubles(kopeks: number): number {
  return Math.round(kopeks) / KOPEKS_PER_RUBLE;
}

/**
 * Округление до целых копеек (промежуточные вычисления могут давать float).
 */
export function roundKopeks(value: number): number {
  return Math.round(value);
}
