/**
 * Словарь переводов для мультиязычности (RU / EN).
 * Ключи — идентификаторы, значения — объект { ru, en }.
 */

export type Locale = "ru" | "en";

export const translations = {
  // Header & meta
  simulatorSubtitle: { ru: "Интеллектуальный финансовый симулятор недвижимости", en: "Intelligent real estate financial simulator" },

  // Strategy block
  baseStrategy: { ru: "Базовая стратегия", en: "Base strategy" },
  compareWith: { ru: "Сравнить с (альтернатива)", en: "Compare with (alternative)" },
  strategyInvestor: { ru: "Инвестиция", en: "Investment" },
  strategyFamily: { ru: "Семья", en: "Family" },
  strategyEntry: { ru: "Старт", en: "Entry" },
  currentScenario: { ru: "Текущий сценарий", en: "Current scenario" },
  currentScenarioGenitive: { ru: "текущий сценарий", en: "current scenario" },
  currentScenarioPrepositional: { ru: "текущем сценарии", en: "current scenario" },

  // Parameters
  parameters: { ru: "Параметры", en: "Parameters" },
  priceLabel: { ru: "Цена объекта", en: "Property price" },
  downPaymentLabel: { ru: "Первоначальный взнос", en: "Down payment" },
  rateLabel: { ru: "Ставка по кредиту", en: "Interest rate" },
  termLabel: { ru: "Срок кредита", en: "Loan term" },
  rentalYieldLabel: { ru: "Доходность аренды (ROI)", en: "Rental yield (ROI)" },

  // Result cards
  paymentPerMonth: { ru: "Платёж в месяц", en: "Monthly payment" },
  overpayment: { ru: "Переплата", en: "Overpayment" },
  taxRefunds: { ru: "Налоговые вычеты", en: "Tax deductions" },
  annualYield: { ru: "Годовая доходность (ROI)", en: "Annual yield (ROI)" },
  propertyDeduction: { ru: "Имущественный (до 260 000 ₽)", en: "Property (up to 260,000 ₽)" },
  interestDeduction: { ru: "По процентам (до 390 000 ₽)", en: "Interest (up to 390,000 ₽)" },

  // Chart
  chartTitle: { ru: "График погашения долга", en: "Debt repayment chart" },
  chartAxisYears: { ru: "Годы", en: "Years" },
  balanceRemaining: { ru: "Остаток долга", en: "Balance remaining" },
  mainStrategy: { ru: "Основная стратегия", en: "Main strategy" },
  alternative: { ru: "Альтернатива", en: "Alternative" },
  monthLabel: { ru: "Месяц", en: "Month" },
  yearsShort: { ru: "лет", en: "y" },

  // Verdict
  verdictTitle: { ru: "Вердикт Симулятора", en: "Simulator Verdict" },
  rentOverTerm: { ru: "Аренда за", en: "Rent over" },
  totalLoss: { ru: "общая сумма потерь", en: "total loss" },
  yourCapital: { ru: "Ваш Капитал (квартира)", en: "Your capital (property)" },
  valueAfterTerm: { ru: "стоимость через", en: "value in" },
  benefitNow: { ru: "Ваша выгода при покупке сейчас", en: "Your benefit if you buy now" },
  benefitDeltaTitle: { ru: "Разница выгоды", en: "Benefit difference" },
  youSaveMore: { ru: "Выбирая", en: "By choosing" },
  youSaveMoreSuffix: { ru: ", вы сохраняете на", en: ", you save" },
  moreThan: { ru: "больше, чем в", en: "more than" },

  // CTA & footer
  getPdfReport: { ru: "Получить детальный план в PDF", en: "Get detailed plan in PDF" },
  downloadPdfReport: { ru: "Скачать PDF-отчет", en: "Download PDF report" },
  leadModalTitle: { ru: "Отправить расчёт и скачать PDF", en: "Send lead and download PDF" },
  leadModalTitleFull: { ru: "Получить полный инвест-отчет на почту/WhatsApp", en: "Get full investment report by email/WhatsApp" },
  leadNamePlaceholder: { ru: "Ваше имя", en: "Your name" },
  leadPhonePlaceholder: { ru: "Телефон", en: "Phone" },
  leadSubmitAndDownload: { ru: "Отправить и скачать PDF", en: "Send and download PDF" },
  leadSubmitButton: { ru: "Получить отчет", en: "Get report" },
  leadSkipAndDownload: { ru: "Скачать без отправки", en: "Download without sending" },
  dataActual: { ru: "Данные актуальны на", en: "Data as of" },
  calculationDisclaimer: { ru: "Расчет произведен на основе текущих ставок ЦБ и прогноза инфляции", en: "Calculation based on current central bank rates and inflation forecast" },
  generatingReport: { ru: "Generating Digital Twin Report...", en: "Generating Digital Twin Report..." },
  officialCalculation: { ru: "Официальный расчет", en: "Official calculation" },
  generatedAt: { ru: "Сформировано", en: "Generated" },

  // Time
  year: { ru: "год", en: "year" },
  years: { ru: "лет", en: "years" },
  years2: { ru: "года", en: "years" },

  // SmartInsights
  insightComparisonLabel: { ru: "Сравнение доходности:", en: "Yield comparison:" },
  insightPaybackLabel: { ru: "Срок окупаемости:", en: "Payback period:" },
  insightRecommendationLabel: { ru: "Рекомендация:", en: "Recommendation:" },
  insightComparisonSentence: { ru: "Недвижимость выгоднее вклада в", en: "Property outperforms deposit by" },
  insightComparisonSuffix: { ru: "на дистанции", en: "over" },
  insightPaybackReached: { ru: "Все затраты по кредиту окупаются через", en: "Loan costs pay back in" },
  insightPaybackNotReached: { ru: "На выбранном сроке окупаемость не достигнута.", en: "Payback not reached within selected term." },
  insightOptimalExit: { ru: "Оптимальная точка выхода из актива —", en: "Optimal exit point —" },

  // Chart tooltip: advantage vs deposit
  tooltipGapVsDeposit: { ru: "Разрыв с вкладом:", en: "Gap vs deposit:" },
  tooltipNetBenefit: { ru: "Чистая выгода недвижимости:", en: "Property net benefit:" },
  tooltipCatchUpIn: { ru: "Обгон вклада через:", en: "Overtake deposit in:" },
  tooltipFormationStage: { ru: "Стадия формирования актива", en: "Asset formation stage" },
  tooltipAssetAccumulation: { ru: "Накопление актива", en: "Asset accumulation" },
  tooltipHorizonNote: { ru: "Прибыльность недвижимости раскрывается на горизонте 5–10 лет.", en: "Property profitability unfolds over a 5–10 year horizon." },
  tooltipCompareLimit: { ru: "Сравнение с вкладом — до 10 лет.", en: "Deposit comparison limited to 10 years." },
  tooltipForecastOvertake: { ru: "Прогноз: доходность объекта обгонит вклад на", en: "Forecast: property will overtake deposit in" },
  tooltipForecastOvertakeSuffix: { ru: "году за счёт снижения ключевой ставки.", en: "year due to key rate decline." },
  insightRatesForecast: { ru: "Учитывая прогноз снижения ставок ЦБ через 3 года, недвижимость становится доминирующим активом на дистанции от 5 лет.", en: "Given the forecast of CB rate cuts in 3 years, property becomes the dominant asset over 5+ year horizon." },
  insightDepositDisclaimer: { ru: "Внимание: Расчёт вклада не учитывает инфляционные риски и девальвацию валюты на горизонте 20 лет, в то время как недвижимость является твёрдым активом.", en: "Note: Deposit calculation does not account for inflation and currency devaluation over 20 years, while property is a hard asset." },
  insightRentCapitalization: { ru: "Внимание: расчет недвижимости не учитывает капитализацию арендного дохода. При реинвестировании аренды доходность объекта составит +", en: "Note: Property calculation does not account for rent capitalization. With rent reinvestment, property yield would be +" },
  insightRentCapitalizationSuffix: { ru: "%.", en: "%." },
  tooltipDifferentWeight: { ru: "Активы в разных весовых категориях (Твердый vs Ликвидный)", en: "Assets in different weight classes (Hard vs Liquid)" },
  tooltipPriceGrowth: { ru: "Рост цены объекта:", en: "Property price growth:" },
  tooltipRentAccumulated: { ru: "Накопленный доход от аренды:", en: "Accumulated rental income:" },
} as const;

export type TranslationKey = keyof typeof translations;

/** Возвращает перевод по ключу для данной локали. */
export function t(key: TranslationKey, locale: Locale): string {
  return translations[key][locale];
}

/** Слово «год» / «года» / «лет» (или year/years) в зависимости от числа и локали. */
export function yearsWord(n: number, locale: Locale): string {
  if (locale === "en") return n === 1 ? "year" : "years";
  if (n % 10 === 1 && n % 100 !== 11) return "год";
  if (n % 10 >= 2 && n % 10 <= 4 && (n < 10 || n > 20)) return "года";
  return "лет";
}

/** Слово «раз» / «раза» (или times) для оборота «в N раз». Для 2.5 — «раза». */
export function timesWord(n: number, locale: Locale): string {
  if (locale === "en") return "times";
  if (!Number.isFinite(n)) return "раз";
  if (n >= 2 && n < 5) return "раза";
  const int = Math.floor(n);
  if (int % 10 >= 2 && int % 10 <= 4 && (int < 10 || int > 20)) return "раза";
  return "раз";
}

/** Слово «месяц» / «месяца» / «месяцев» в зависимости от числа и локали. */
export function monthWord(n: number, locale: Locale): string {
  if (locale === "en") return n === 1 ? "month" : "months";
  if (n % 10 === 1 && n % 100 !== 11) return "месяц";
  if (n % 10 >= 2 && n % 10 <= 4 && (n < 10 || n > 20)) return "месяца";
  return "месяцев";
}
