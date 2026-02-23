# PROJECT_DNA.md — Технический дайджест IFS Vision / Digital Twin Studio

Документ для AI-партнёра: полный контекст продукта, стека, архитектуры и зон сложности. Цель — обеспечить продолжение разработки без галлюцинаций и расхождений с кодовой базой.

---

## 1. Product Identity

| Поле | Значение |
|------|----------|
| **Название** | IFS Vision |
| **Концепция** | Интеллектуальный Digital Twin для финансов в недвижимости: симулятор «покупка vs аренда» с визуализацией планировки и white-label возможностями. |
| **Target Market** | B2B: агентства недвижимости, застройщики. White-label модель: бренд, лого, цвета, ставки настраиваются из админки без правки кода. |
| **Ценность** | Один интерфейс: слайдеры параметров → график погашения долга → вердикт выгоды → Digital Twin планировки → экспорт отчёта в PDF. Все расчёты в рублях (RUB как база); отображение — в выбранной валюте (RUB/USD/AED). |

---

## 2. Full Tech Stack

### Версии (из `package.json`)

| Пакет | Версия | Назначение |
|-------|--------|------------|
| **next** | 16.1.6 | App Router, RSC, API routes |
| **react** / **react-dom** | 19.2.3 | UI |
| **typescript** | ^5 | Типизация |
| **tailwindcss** | ^4 | Стили (PostCSS: `@tailwindcss/postcss`) |
| **zustand** | ^5.0.11 | Глобальное состояние симулятора |
| **framer-motion** | ^12.34.3 | Анимации, layoutId-переходы, режим презентации |
| **recharts** | ^3.7.0 | Графики (AreaChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer) |
| **lucide-react** | ^0.575.0 | Иконки |
| **clsx**, **tailwind-merge** | — | Утилиты классов |
| **@react-pdf/renderer**, **html2canvas**, **jspdf** | — | В проекте есть, но основной экспорт — через Screenshot API (JPG). |

### State Management

- **Zustand** — единственный глобальный store: `src/store/useStore.ts`.
- **Синхронизация с админкой:** Custom Event `ifsVisionAdminUpdated` + чтение из **localStorage** (ключ `ifsVisionAdmin`). При сохранении в админке диспатчится событие; главная страница подписана и вызывает `loadConfigFromStorage()`, который перечитывает `getAdminSettings()` и обновляет `config`, `currencyConfigs`, `currency` в store.
- **Админка:** локальный React state (`useState`) для полного объекта `AdminSettings`; персистенция только в localStorage через `setAdminSettings()` (который и диспатчит `ifsVisionAdminUpdated`). Серверной БД для настроек нет.

### UI и визуал

- **Tailwind v4** — утилитарные классы, кастомные переменные в `src/app/globals.css` (`--font-sans`, `--font-mono` и т.д.).
- **Framer Motion** — появление блоков (`variants`, `staggerChildren`), сегментированные контролы (`layoutId`: `activeTab`, `currencyTab`), режим презентации в админке (AnimatePresence, полноэкран).
- **Шрифты:** Geist Sans и Geist Mono (`next/font/google`), переменные `--font-geist-sans`, `--font-geist-mono`; в layout применяются через `className`. Цифры (AnimatedNumber, суммы) — **Geist Mono** для моноширинного отображения.

### Charts

- **Recharts:** один основной график — «График погашения долга» (остаток долга по месяцам). Данные: `useChartData()` из store (Zustand) → `FinancialEngine.getAmortizationSchedule()`. При включённом сравнении стратегий — вторая линия (Line, dashed, amber) по `balanceCompare` из объединённого `mergedChartData`. Ось Y форматируется в выбранной валюте через `valueToDisplay()`.

---

## 3. Current Features (Что уже работает)

### Симулятор (главная страница `/`)

- **Параметры:** цена объекта, первоначальный взнос %, ставка %, срок кредита, доходность аренды (ROI). Слайдеры управляют store; при изменении слайдеров сценарий переключается в `custom`.
- **Три пресета стратегий:** Инвестиция / Семья / Старт — сегментированный контрол. Выбор применяет `config.scenarioPresets[key]` (price, downPercent, ratePercent, termYears) к store через `setScenario(key)`.
- **Сравнение стратегий (Side-by-Side):**
  - Под блоком пресетов — строка «Сравнить с» с кнопками Инвестиция / Семья / Старт. Повторный клик снимает сравнение. Состояние: `compareWithScenario` (или из URL при экспорте).
  - На графике: вторая линия (Recharts `Line`, `strokeDasharray="6 4"`, amber) — остаток долга по выбранному пресету сравнения. Данные: `compareChartData` (useMemo от `FinancialEngine.getAmortizationSchedule` по пресету), объединённые с основным `chartData` в `mergedChartData` по полю `month`.
  - В блоке «ВЕРДИКТ СИМУЛЯТОРА»: поле **«Разница выгоды»** — дельта в рублях между текущим сценарием и сценарием сравнения (`verdictBenefit - verdictBenefitCompare`), с подписью «в пользу текущего сценария» или «в пользу «Инвестиция»/«Семья»/«Старт»». Отображается через `AnimatedNumber` и `formatCurrency` в выбранной валюте.
- **Мультивалютность (RUB / USD / AED):**
  - В шапке — Apple-style сегментированный контрол переключения валюты (`CurrencySwitcher`). Состояние в store: `currency`, `currencyConfigs` (symbol, locale, rateFromBase). Курсы задаются в админке (Глобальные настройки) или по умолчанию USD=90, AED=25 (рублей за 1 единицу).
  - Все расчёты внутри симулятора и в `FinancialEngine` — в **рублях**. Конвертация только при рендере: утилита `formatCurrency(valueInRub, currency, config)` и хук `useCurrencyDisplay()` (возвращает `formatCurrency`, `valueToDisplay`, `symbol`). Карточки сумм, график (ось Y, тултип), вердикт и «Разница выгоды» используют эти методы; `AnimatedNumber` получает `value={valueToDisplay(rub)}` и `suffix={symbol}`.
- **Вердикт симулятора:** «Ваша выгода при покупке сейчас» = (стоимость квартиры через N лет − все выплаты по кредиту + налоговые вычеты) − сумма аренды за N лет. Плюс при сравнении — «Разница выгоды» в выбранной валюте.
- **Digital Twin:** компонент `DigitalTwin` — SVG-планировка из `config.digitalTwin` (зоны, стены, мебель). Прогресс заливки зон привязан к параметрам (например, доля взноса). Цвет акцента из store `config.brand.primaryColor`.
- **Экспорт отчёта:** кнопка «Получить детальный план в PDF» формирует URL с `export=1`, `ts`, `showTs`, `compare` (если включено сравнение) и отправляет его в `POST /api/pdf`. Ответ — JPG (скриншот блока `#simulation-report` через Screenshotone API). На странице при `export=1` показывается упрощённый layout и при необходимости метка времени формирования отчёта (МСК).

### Админка (`/studio-admin`)

- **Защита:** доступ только с cookie `admin_session` (выставляется после успешного `POST /api/login` с `ADMIN_PASSWORD`). Middleware редиректит на `/` при отсутствии cookie (кроме `/studio-admin/login`).
- **Вкладки:** Настройки | Интеграции | Безопасность (сегментированный контрол).
- **Настройки:**
  - Брендинг: название компании, цвет (HEX), лого (URL).
  - Экономика: глобальная инфляция %.
  - **Глобальные настройки:** валюта по умолчанию (RUB/USD/AED), курсы 1 USD = N ₽ и 1 AED = M ₽. После сохранения симулятор подхватывает изменения по событию `ifsVisionAdminUpdated`.
  - Базовые ставки: три профиля — Инвестиция, Семья, Старт. В каждом: ставка банка %, налог %, рост цен %. Пресеты-кнопки для быстрой подстановки.
- **Live ROI Preview + Sparklines:** виджет с предпросмотром ROI по трём стратегиям и мини-графиками капитала (Sparklines) за 20 лет. Режим презентации — полноэкранный вид только этого виджета (Framer Motion).
- **Интеграции:** поля Telegram (botToken, chatId) — структура есть, отправка лидов не реализована.
- **Безопасность:** автоблокировка по таймеру неактивности (0/5/15/30 мин), опция показа времени в PDF-отчёте, pdfWatermark.

---

## 4. Architecture & "Under the Hood"

### Синхронизация Админка ↔ Симулятор

1. **Админка** хранит полный объект `AdminSettings` в React state и при «Сохранить» вызывает `setAdminSettings(settings)`.  
2. **`setAdminSettings`** (в `src/lib/admin-storage.ts`) пишет JSON в `localStorage.setItem("ifsVisionAdmin", ...)` и диспатчит `window.dispatchEvent(new Event("ifsVisionAdminUpdated"))`.  
3. **Главная страница** при монтировании вызывает `loadConfigFromStorage()` и подписывается на `ifsVisionAdminUpdated`:
   - В обработчике снова вызывается `loadConfigFromStorage()`.
   - В store: `loadConfigFromStorage()` читает `getAdminSettings()`, формирует `StoreConfig` через `getConfigFromStorage()` (бренд, инфляция, baseRates из `rates.family`), и обновляет `currencyConfigs` через `getCurrencyConfigs(s)`, а также `currency: s.defaultCurrency ?? "RUB"`.
4. Итог: бренд, ставки, валюта по умолчанию и курсы на главной совпадают с последними сохранёнными в админке без перезагрузки вкладки.

### Экспорт в PDF через URL-параметры

- Клиент строит URL текущей страницы и добавляет:
  - `export=1` — режим «для скриншота» (скрываются лишние элементы через классы/селекторы, при необходимости показывается метка времени).
  - `ts` — текущий timestamp (Date.now()).
  - `showTs` — 1/0 в зависимости от настройки «показывать время в отчёте».
  - `compare` — при включённом сравнении стратегий: `investor` | `family` | `entry`.
- Этот URL передаётся в `POST /api/pdf`; сервер отдаёт его во внешний Screenshot API (Screenshotone) с селектором `#simulation-report`. Страница, открытая по такому URL, рендерит тот же контент (включая вторую кривую и «Разницу выгоды» при `compare=...`), так как `compareStrategy` на главной берётся из `compareWithScenario` или из `searchParams.get("compare")` при `isExportView`.

### Структура AdminSettings и профилей стратегий

- **AdminSettings** (`src/lib/admin-storage.ts`):
  - `branding`: companyName, primaryColor, logoUrl.
  - `telegram`: botToken, chatId.
  - `inflationRate`: number (%).
  - `adminPassword`, `lastLogin`: для UI и отображения; проверка входа только через API по `ADMIN_PASSWORD`.
  - `security`: autoLockMinutes (0|5|15|30), showTimestampInReport, pdfWatermark.
  - `rates`: три профиля — `investment`, `family`, `start`. Каждый: `bankRate`, `taxRate`, `priceGrowth` (в %).
  - `defaultCurrency`: "RUB" | "USD" | "AED".
  - `currencyRates`: { USD: number, AED: number } — рублей за 1 USD и 1 AED.

- **Пресеты сценариев** в коде (`src/lib/config.ts`): `scenarioPresets.investor/family/entry` — фиксированные price, downPercent, ratePercent, termYears. На главной при выборе пресета эти значения мержатся в store через `setScenario`. Базовые ставки для расчётов (ratePercent, priceGrowthPercent) на главной берутся из профиля **family** через `getConfigFromStorage()` (store.config.baseRates). В админке все три профиля используются для Live ROI и Sparklines.

- **Store (Zustand):** помимо полей из пресетов и слайдеров хранит: `config` (StoreConfig), `currency`, `currencyConfigs`, `currentScenario`, и экшены setPrice, setDownPercent, setRatePercent, setTermYears, setRentalYieldPercent, setScenario, setCurrency, loadConfigFromStorage.

---

## 5. Complexity Analysis

### Реактивная модель данных

- **Сложность: средняя.** Один глобальный store (Zustand), плоская структура: цена, проценты, срок, сценарий, валюта, конфиг. Производные данные (график, вердикт, сравнение) считаются в компоненте главной страницы через `useMemo` и хуки (`useChartData`, `useDownPayment`, `useLoanAmount`, `useCurrencyDisplay`). Подписки точечные (селекторы), чтобы не дергать лишние ре-рендеры. График обновляется через `useChartData()`, внутри которого данные пересчитываются в useMemo от (price, downPercent, ratePercent, termYears), а отображение сглаживается через requestAnimationFrame. При смене валюты пересчитывается только отображение (formatCurrency, valueToDisplay), а не сами числа в store — это упрощает модель и избегает дублирования логики.

### Киллер-фича с точки зрения кода

- **Zustand + динамическое форматирование валют.** Вся «деньгоёмкая» логика живёт в рублях (FinancialEngine, вердикт, сравнение). Один слой отображения: `currency` + `currencyConfigs` в store, и утилита/хук `formatCurrency` / `useCurrencyDisplay`. Компоненты не знают о валюте напрямую — они вызывают `formatCurrency(valueRub)` или `valueToDisplay(valueRub)` и `symbol`. Это даёт:
  - единый источник правды для курсов (админка → localStorage → loadConfigFromStorage → currencyConfigs);
  - отсутствие конвертации в самих расчётах (меньше ошибок и дублирования);
  - простую подстановку в PDF/экспорт: та же страница с теми же параметрами URL рендерит суммы в выбранной валюте (на экспорте — валюта по умолчанию из админки, т.к. store инициализируется из getAdminSettings()).

### Риски и узкие места

- **Два источника дефолтов:** `config.ts` (defaults, scenarioPresets) и `admin-storage.ts` (defaultSettings). Добавление новых полей требует синхронизации и миграций при чтении старых данных из localStorage (пример: миграция baseRates → rates с тремя профилями).
- **Несколько вкладок:** до перезагрузки или повторного сохранения в админке возможна рассинхронизация между вкладками (localStorage общий, но событие получает только одна вкладка).
- **PDF:** зависимость от внешнего Screenshot API; при localhost нужен `NEXT_PUBLIC_SITE_URL` для подмены URL. Реальный вывод — JPG, не многостраничный PDF.

---

## 6. Future Roadmap

- **Переход на Supabase (облачная БД):** вынести настройки админки (и при необходимости сессии/пользователей) в Supabase; при загрузке главной и админки читать/писать настройки через API, сохраняя обратную совместиость с событием обновления (или аналог) для синхронизации симулятора.
- **Оптимизация под слабые машины (например Intel i5):** минимизация ре-рендеров за счёт более мелких селекторов Zustand, мемоизации тяжёлых вычислений (например, полный график сравнения), возможного выноса графика в отдельный под-компонент с жёсткой подпиской только на нужные поля; проверка отсутствия лишних зависимостей в useMemo/useCallback.
- **Локальная генерация PDF:** отказ от внешнего Screenshot API — рендер отчёта на клиенте (например html2canvas + jspdf или @react-pdf/renderer) с тем же блоком `#simulation-report` и передачей в blob для скачивания, чтобы не зависеть от внешнего сервиса и не раскрывать URL продакшена.

---

## Краткая навигация по коду

| Что искать | Где |
|------------|-----|
| Store, валюта, сценарии, loadConfigFromStorage | `src/store/useStore.ts` |
| Типы и дефолты админки, getAdminSettings, setAdminSettings, событие | `src/lib/admin-storage.ts` |
| Пресеты сценариев, Digital Twin конфиг, defaults | `src/lib/config.ts` |
| Расчёты ипотеки, вычеты, график погашения | `src/lib/engine.ts` |
| formatCurrency, toDisplayValue | `src/lib/formatCurrency.ts` |
| Главная страница симулятора, график, вердикт, сравнение, экспорт URL | `src/app/page.tsx` |
| Переключатель валюты | `src/components/CurrencySwitcher.tsx` |
| Анимированные числа (Geist Mono) | `src/components/AnimatedNumber.tsx` |
| Админка, Live ROI, Sparklines, Глобальные настройки | `src/app/studio-admin/page.tsx` |
| PDF (скриншот по URL) | `src/app/api/pdf/route.ts` |
| Защита маршрутов админки | `src/middleware.ts` |

---

*Документ актуален на момент создания. При значимых изменениях стека или архитектуры PROJECT_DNA.md следует обновлять.*
