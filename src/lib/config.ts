/**
 * White-label конфигурация приложения.
 * Все брендовые настройки, параметры по умолчанию и маппинг зон Digital Twin.
 */

/** Элемент стены: путь или линия/окружность для перегородок и окон */
export type DigitalTwinWallItem =
  | { type: "path"; d: string; strokeWidth?: number; strokeDasharray?: string; opacity?: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; strokeWidth?: number; strokeDasharray?: string; opacity?: number }
  | { type: "circle"; cx: number; cy: number; r: number; strokeWidth?: number; opacity?: number };

/** Элемент мебели/сантехники: rect, path, circle, ellipse, line */
export type DigitalTwinFurnitureItem =
  | { type: "rect"; x: number; y: number; width: number; height: number; rx?: number; ry?: number }
  | { type: "path"; d: string }
  | { type: "circle"; cx: number; cy: number; r: number }
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number };

/** Зона планировки: id, подпись, диапазон прогресса (0–100), путь заливки и позиция подписи */
export interface DigitalTwinZoneConfig {
  id: "hall" | "bath" | "kitchen" | "living";
  label: string;
  progressRange: [number, number];
  /** SVG path d для области заливки зоны */
  fillPath: string;
  /** Координаты подписи зоны в viewBox */
  labelPosition: { x: number; y: number };
}

export const config = {
  /** Бренд и оформление */
  brand: {
    /** Название компании / продукта */
    companyName: "Digital Twin Studio",
    /** Полное название для заголовков (например, "IFS Vision") */
    productName: "IFS Vision",
    /** Основной цвет (hex), используется в кнопках, градиентах, акцентах */
    primaryColor: "#007AFF",
    /** Ссылка на логотип (URL или путь в public) */
    logoUrl: "/logo.png",
    /** Контакты для PDF-отчёта (строка в подвале или на последней странице) */
    pdfContact: "Digital Twin Studio · contact@example.com",
  },

  /** Параметры недвижимости и кредита по умолчанию */
  defaults: {
    /** Стартовая цена объекта, ₽ */
    price: 10_000_000,
    /** Первоначальный взнос, % (0–100) */
    downPercent: 20,
    /** Годовая ставка по кредиту, % */
    ratePercent: 18,
    /** Срок кредита, лет */
    termYears: 20,
    /** Годовая доходность от аренды для ROI, % */
    rentalYieldPercent: 6,
    /** Годовая ставка по банковскому депозиту для сравнения на графике, % (0–100) */
    depositRatePercent: 18,
  },

  /** Коэффициенты для расчёта сравнения с арендой и роста капитала */
  economics: {
    /** Годовая инфляция (0.04 = 4%) — рост расходов на аренду */
    inflationRate: 0.04,
    /** Годовой рост стоимости недвижимости (0.05 = 5%) */
    propertyGrowthRate: 0.05,
  },

  /** Пресеты сценариев: Инвестиция / Семья / Старт */
  scenarioPresets: {
    investor: {
      price: 15_000_000,
      downPercent: 50,
      ratePercent: 18,
      termYears: 10,
    },
    family: {
      price: 12_000_000,
      downPercent: 15,
      ratePercent: 6,
      termYears: 30,
    },
    entry: {
      price: 8_000_000,
      downPercent: 10,
      ratePercent: 18,
      termYears: 25,
    },
  } as const,

  /**
   * Digital Twin: зоны, стены и мебель задаются данными из конфига.
   * Прогресс 0–100 определяет закрашивание: например при 30% заполняются первые зоны по progressRange.
   */
  digitalTwin: {
    viewBox: [0, 0, 200, 300] as [number, number, number, number],
    zones: [
      {
        id: "hall" as const,
        label: "HALL",
        progressRange: [0, 20] as [number, number],
        fillPath: "M 72 2 L 128 2 L 128 36 L 72 36 Z",
        labelPosition: { x: 100, y: 20 },
      },
      {
        id: "bath" as const,
        label: "BATH",
        progressRange: [20, 40] as [number, number],
        fillPath: "M 2 40 h 48 v 74 h -48 Z",
        labelPosition: { x: 26, y: 78 },
      },
      {
        id: "kitchen" as const,
        label: "KITCHEN",
        progressRange: [40, 70] as [number, number],
        fillPath: "M 2 118 h 48 v 80 h -48 Z",
        labelPosition: { x: 26, y: 158 },
      },
      {
        id: "living" as const,
        label: "LIVING",
        progressRange: [70, 100] as [number, number],
        fillPath: "M 54 40 L 198 40 L 198 300 L 54 300 Z",
        labelPosition: { x: 126, y: 170 },
      },
    ],
    /** Стены: контур, перегородки, окна. Легко заменить пути под другую планировку. */
    walls: [
      { type: "path" as const, d: "M 0 0 L 70 0 L 70 38 L 130 38 L 130 0 L 200 0 L 200 300 L 0 300 Z", strokeWidth: 0.5, strokeDasharray: "2 4", opacity: 0.6 },
      { type: "path" as const, d: "M 0 0 L 70 0 L 70 38 L 130 38 L 130 0 L 200 0 L 200 300 L 0 300 Z", strokeWidth: 2 },
      { type: "line" as const, x1: 0, y1: 38, x2: 52, y2: 38 },
      { type: "line" as const, x1: 0, y1: 116, x2: 52, y2: 116 },
      { type: "path" as const, d: "M 52 38 L 52 116 L 52 200 L 52 300" },
      { type: "path" as const, d: "M 52 85 L 52 70 L 35 70", strokeDasharray: "2 1" },
      { type: "circle" as const, cx: 52, cy: 70, r: 2 },
      { type: "line" as const, x1: 90, y1: 300, x2: 90, y2: 308, strokeWidth: 1.5 },
      { type: "line" as const, x1: 110, y1: 300, x2: 110, y2: 308, strokeWidth: 1.5 },
      { type: "line" as const, x1: 90, y1: 308, x2: 110, y2: 308, strokeWidth: 1.5 },
      { type: "line" as const, x1: 90, y1: 302, x2: 110, y2: 302, strokeWidth: 1.5 },
    ],
    /** Мебель и сантехника. Замена массива меняет оформление без правки компонента. */
    furniture: [
      { type: "rect", x: 60, y: 220, width: 44, height: 32, rx: 2 },
      { type: "ellipse", cx: 72, cy: 232, rx: 6, ry: 5 },
      { type: "ellipse", cx: 92, cy: 232, rx: 6, ry: 5 },
      { type: "circle", cx: 36, cy: 58, r: 6 },
      { type: "rect", x: 8, y: 52, width: 22, height: 28, rx: 2 },
      { type: "ellipse", cx: 26, cy: 95, rx: 8, ry: 10 },
      { type: "rect", x: 8, y: 128, width: 38, height: 28, rx: 2 },
      { type: "circle", cx: 16, cy: 142, r: 4 },
      { type: "circle", cx: 30, cy: 142, r: 4 },
      { type: "circle", cx: 16, cy: 152, r: 4 },
      { type: "circle", cx: 30, cy: 152, r: 4 },
      { type: "rect", x: 8, y: 168, width: 24, height: 18, rx: 1 },
      { type: "circle", cx: 20, cy: 177, r: 3 },
    ],
  },
} as const;

export type DigitalTwinZoneId = (typeof config.digitalTwin.zones)[number]["id"];
