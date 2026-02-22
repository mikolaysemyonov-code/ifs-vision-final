# IFS Vision — Technical Passport (Senior Developer Handoff)

Документ для быстрого включения в роль ведущего разработчика. Содержит «подноготную» сервиса: ценность продукта, сложные узлы, стек, потоки данных, деплой, готовность фич и качество кода.

---

## 1. Product Essence

### Value Proposition
**IFS Vision** — симулятор сравнения «недвижимость vs банковский вклад» с единой точкой старта. Главная ценность: **снять эффект «депозитной ловушки»** — когда высокие ставки по вкладам создают иллюзию выгодности депозита и отталкивают от покупки недвижимости с плечом. Продукт даёт честное сравнение: *«10 млн в банк»* против *«10 млн в схему с ипотекой»* с учётом роста актива, индексированной аренды и цикла ставки ЦБ.

### User Journey (основной флоу)
1. **Вход на сайт** → главная страница (симулятор) или экспорт-вид по URL (`?export=1&ts=...&currency=...`).
2. **Настройка параметров**: цена, первоначальный взнос, ставка, срок, доходность аренды; опционально выбор пресета (Инвестиция / Семья / Старт) и альтернативы для сравнения.
3. **Просмотр результата**: график Net Equity vs Вклад, карточки (платёж, переплата, вычеты, ROI), блок AI-аналитики (SmartInsights), вердикт с выгодой.
4. **Действия**: скачать PDF (JPG отчёт через Screenshot API) и/или оставить лид (имя, телефон) с отправкой в Telegram и затем скачиванием PDF.
5. **Админка** (отдельный флоу): вход по паролю → `/studio-admin` → настройка брендинга, курсов, ставок, Telegram, безопасности; сохранение в localStorage и синхронизация с симулятором через событие `ifsVisionAdminUpdated`.

---

## 2. Complexity & Logic

### Самые сложные узлы кода

| Узел | Расположение | Описание |
|------|--------------|----------|
| **Расчёт графика «Недвижимость vs Вклад»** | `src/app/page.tsx` — `chartDataWithDeposit` (useMemo) | Единая точка старта (Zero-Point Sync), накопленная индексированная аренда (5% в год), рост цены (12%), фаза вклада 36 мес с последующим коэффициентом 0.85, слияние с альтернативным сценарием (`balanceCompare` → `netEquityCompare`). Зависит от `mergedChartData`, `price`, `downPercent`, `ratePercent`, `termYears`, `depositRate`, `appreciationRate`, `compareStrategy`, `rentalYieldPercent`. |
| **Финансовая математика** | `src/lib/engine.ts` | Аннуитет, график погашения (`getAmortizationSchedule`), налоговые вычеты, ROI, сравнение с арендой. Чистые функции, без side effects. |
| **Конфиг и состояние симулятора** | `src/store/useStore.ts` | Zustand-стор: параметры кредита/сценария, валюта, локаль, конфиг из админки. Селекторы (`useShallow`) для минимизации ре-рендеров. `getChartData` / `useChartData` — производные данные графика с отложенным обновлением через `requestAnimationFrame`. Слияние конфига из `config` (статика) и `getAdminSettings()` (localStorage). |
| **Админ-настройки и персистенция** | `src/lib/admin-storage.ts` | Чтение/запись `localStorage` под ключом `ifsVisionAdmin`. Сложная валидация и миграции (например `migrateFromBaseRates`) при изменении схемы. Типы: `AdminSettings`, `AdminBranding`, `AdminRates`, `AdminSecurity` и др. |
| **Админ-панель UI** | `src/app/studio-admin/page.tsx` | Крупная клиентская страница (~1600 строк): формы брендинга, курсов, ставок по профилям, Telegram, безопасность, смена пароля. Состояние формы и сохранение через `saveSettings()` → `setAdminSettings()` + `loadConfigFromStorage()` в сторе + `window.dispatchEvent(ifsVisionAdminUpdated)`. |
| **PDF и лиды** | `src/app/page.tsx` — `handleDownloadPDF`, `handlePdfWithLead` | Формирование URL с `export=1` и параметрами бренда/валюты/локали, запрос `POST /api/pdf` с телом `{ url }`. Сервер дергает внешний Screenshot API (Screenshot One), возвращает JPG. Лид: сначала `POST /api/telegram/send` с данными расчёта и magic link, затем вызов `handleDownloadPDF`. |

### Где реализована основная бизнес-логика
- **Серверные компоненты**: только `src/app/layout.tsx` (метаданные, шрифты, обёртка). Остальные страницы — `"use client"`.
- **Middleware**: `src/middleware.ts` — защита `/studio-admin` и вложенных путей; проверка cookie `admin_session`; редирект на `/studio-admin/login` при отсутствии.
- **Сложные хуки**: `useChartData()` (график с rAF), `useStore` + селекторы, кастомные хуки для переводов и валюты в `useStore`.
- **Фоновые задачи**: интервал обновления «текущего времени» в симуляторе (1 мин); при включённом `ratesAutoUpdate` — загрузка курсов с `/api/rates` при монтировании и по кнопке в админке. Cron/Edge Jobs в проекте **не используются**.

---

## 3. Tech Stack Deep Dive

| Слой | Технология | Связи и роль |
|------|------------|--------------|
| **Framework** | Next.js 16 (App Router) | Роутинг: `/`, `/studio-admin`, `/studio-admin/login`, `/admin` (редирект). API Routes в `src/app/api/*`. SSR только в `layout.tsx` (metadata, fonts). |
| **UI / стили** | React 19, Tailwind CSS v4, Framer Motion | Клиентские страницы; Tailwind через `globals.css` и утилитарные классы; Motion для анимаций карточек и модалок. |
| **Графики** | Recharts | `AreaChart`, `Line`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `ReferenceDot`, `ResponsiveContainer`. Данные — массив из `chartDataWithDeposit` (объекты с `month`, `netEquity`, `depositAccumulation`, опционально `netEquityCompare`, `propertyValueGrowth`, `savedRentIndexed`). |
| **Состояние** | Zustand | Один глобальный стор (`useStore`). Конфиг симулятора сливается с данными из `getAdminSettings()` (localStorage) при инициализации и по событию `ifsVisionAdminUpdated`. Курсы валют и локаль тоже в сторе; селекторы через `useShallow` для точечных подписок. |
| **Данные (персистенция)** | localStorage | Нет БД на сервере. Админ-настройки — ключ `ifsVisionAdmin`, модуль `admin-storage`. Симулятор читает через `getAdminSettings()` на клиенте. |
| **Аутентификация** | Cookie-based | Пароль только из `process.env.ADMIN_PASSWORD`. `POST /api/login` выставляет httpOnly cookie `admin_session` (1 ч). `POST /api/logout` сбрасывает. Middleware проверяет cookie для путей `/studio-admin*` (кроме `/studio-admin/login`). |
| **Внешние API** | Screenshot One, Telegram Bot API, ExchangeRate-API | PDF: `POST /api/pdf` → fetch к Screenshot One с `SCREENSHOT_API_KEY`. Лиды: `POST /api/telegram/send` → `https://api.telegram.org/bot{BOT_TOKEN}/sendMessage`. Курсы: `GET /api/rates` → `https://api.exchangerate-api.com/v4/latest/USD` (кэш 1 ч в памяти). |
| **Локализация и валюта** | Собственный слой | `src/lib/translations.ts` — словарь ru/en; `formatCurrency`, `toDisplayValue` в `src/lib/formatCurrency.ts`; курсы и символы валют из стора/конфига. |
| **Сборка** | Next.js build, React Compiler | `next.config.ts`: `reactCompiler: true`. Тестов (Jest/Vitest) и E2E в репозитории **нет**. |

---

## 4. Data Flow

### Модель данных (основные сущности)
- **Параметры симулятора**: `price`, `downPercent`, `ratePercent`, `termYears`, `rentalYieldPercent`, `currentScenario`, `compareStrategy` — живут в Zustand. Источники: дефолты из `config.defaults` и пресеты `config.scenarioPresets`; при наличии — переопределение из `getAdminSettings()` (branding, baseRates, depositRate и т.д.).
- **Админ-настройки**: один объект `AdminSettings` в localStorage (`ifsVisionAdmin`). Содержит branding, telegram, security, rates (investment/family/start), defaultCurrency, currencyRates, ratesAutoUpdate, usdtFeePercent, defaultLocale, depositRate. При сохранении в админке вызывается `setAdminSettings(settings)` и событие `ifsVisionAdminUpdated`; главная страница подписана и вызывает `loadConfigFromStorage()`, обновляя конфиг в сторе и currencyConfigs.
- **График**: цепочка `chartData` (useChartData) → `compareChartData` (при выбранном compareStrategy) → `mergedChartData` (merge по month) → `chartDataWithDeposit` (useMemo с формулами netEquity, deposit, индексация аренды). Данные только в памяти, не персистятся.
- **Лид**: ввод имени/телефона в модалке → `handlePdfWithLead` → тело запроса к `/api/telegram/send` (name, phone, strategy, roi, companyName, price, currency, benefit, magicLink). Сервер шлёт сообщение в Telegram; ответ не сохраняется в приложении. Затем вызывается `handleDownloadPDF`.

### Связи
- **config (lib/config)** — статический бренд и пресеты; используется в layout (metadata), в сторе для дефолтов и сценариев.
- **getAdminSettings()** — единственный «источник правды» для админ-переопределений на клиенте; вызывается из стора при `loadConfigFromStorage`, из page.tsx для depositRate, branding (contactPhone, logo), security (pdfButtonAccent, showTimestampInReport), ratesAutoUpdate.
- **Финансовые расчёты** — чистые функции в `FinancialEngine`; входы из стора и из конфига/админки.

---

## 5. Vercel & Deployment

- **CI/CD**: стандартный Vercel (git push → build). В репозитории нет отдельно описанных GitHub Actions или кастомного CI; сборка — `next build`.
- **Конфиг Vercel**: `vercel.json` содержит только `{"cleanUrls":true}`. Edge Functions и Cron в конфиге **не заданы**.
- **Переменные окружения** (без значений, см. `.env.example`): `NEXT_PUBLIC_SITE_URL`, `SCREENSHOT_API_KEY`, `ADMIN_PASSWORD`, `BOT_TOKEN`, `CHAT_ID`. Все секреты и ключи только из `process.env`; захардкоженных ключей нет.
- **Рантайм**: обычный Node.js server (Next.js); явного указания Edge Runtime для API routes нет — работают в стандартном серверном окружении Vercel.

---

## 6. Current State

| Функционал | Статус | Примечание |
|------------|--------|------------|
| Симулятор (слайдеры, график, вердикт, SmartInsights) | **100%** | Полный флоу, Zero-Point Sync, индексация аренды, приземление вклада 0.85 после 36 мес. |
| Сравнение с альтернативным сценарием | **100%** | Пресеты + линия netEquityCompare на графике и в тултипе. |
| Экспорт в PDF (JPG) | **100%** | При наличии `SCREENSHOT_API_KEY`; при localhost подмена URL на `NEXT_PUBLIC_SITE_URL`. |
| Захват лида + Telegram | **100%** | Модалка, отправка в Telegram, затем скачивание PDF. Работает при заданных `BOT_TOKEN` и `CHAT_ID`. |
| Админка (брендинг, курсы, ставки, безопасность) | **100%** | Сохранение в localStorage, синхронизация с симулятором. |
| Вход в админку по паролю | **100%** | Только `ADMIN_PASSWORD` из env; cookie, middleware. |
| Курсы валют (ручное / авто) | **100%** | GET /api/rates, кэш 1 ч; опция в админке. |
| White Label (лого, контакты, цвет) | **100%** | Через админку и/или URL-параметры в export-режиме. |
| Локализация (ru/en) | **100%** | Переключатель и сохранение в админке. |
| Digital Twin (визуализация планировки) | **Готово** | Компонент на главной; привязка к прогрессу (down payment / ROI). |
| Страница `/admin` | **Заглушка** | Редирект на `/studio-admin/login`. |
| Unit / E2E тесты | **Нет** | Тестовые файлы в проекте отсутствуют. |
| Хранение лидов в БД | **Нет** | Лиды только уходят в Telegram; в приложении не сохраняются. |

---

## 7. Code Quality

- **SOLID/DRY**: Финансовая логика вынесена в `FinancialEngine` (единая точка изменений). Конфиг и дефолты — в `config.ts` и `admin-storage`. Дублирование частично: длинные useMemo в `page.tsx` (chartDataWithDeposit, verdictBenefit, compare), часть логики вердикта и графика могла бы быть вынесена в хуки или утилиты.
- **Типизация**: TypeScript без `any`; используются интерфейсы и `Record<string, unknown>` где нужна гибкость. Типы графика: `ChartDataPoint` (engine), расширенный тип строки с deposit в page (netEquity, depositAccumulation, propertyValueGrowth, savedRentIndexed, netEquityCompare).
- **Магические числа**: Вынесены в константы (TAX_DRAG_COEFFICIENT, RENT_INFLATION_RATE, DEFAULT_APPRECIATION_PERCENT, TARGET_DEPOSIT_RATE_AFTER_PHASE, DEPOSIT_PHASE_MONTHS) в `page.tsx` и в engine.
- **Документация в коде**: JSDoc в engine.ts, краткие комментарии в ключевых useMemo (chartDataWithDeposit, SmartInsights). README и этот паспорт — основная внешняя документация.
- **Тесты**: Отсутствуют (0 тест-файлов). Для онбординга Senior Developer приоритетно покрыть хотя бы `FinancialEngine` и критичные формулы в `chartDataWithDeposit`.

---

## Краткая навигация по репозиторию

| Что искать | Где |
|------------|-----|
| Точка входа симулятора | `src/app/page.tsx` |
| Формулы графика и вердикта | `src/app/page.tsx` (useMemo chartDataWithDeposit, verdictBenefit, compare) |
| Финансовая математика | `src/lib/engine.ts` |
| Состояние и конфиг | `src/store/useStore.ts`, `src/lib/config.ts`, `src/lib/admin-storage.ts` |
| Защита админки | `src/middleware.ts`, `src/app/api/login/route.ts` |
| PDF и Telegram | `src/app/api/pdf/route.ts`, `src/app/api/telegram/send/route.ts` |
| Админ-панель UI | `src/app/studio-admin/page.tsx` |
| Переменные окружения | `.env.example` |
