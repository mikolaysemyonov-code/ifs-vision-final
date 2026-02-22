# Pre-Deployment Audit (Vercel)

**Дата:** 21.02.2026  
**Проект:** ifs-vision

---

## 1. АВТОРИЗАЦИЯ И РОУТИНГ

### Что проверено

| Проверка | Статус | Детали |
|----------|--------|--------|
| Защита `/studio-admin` | ✅ РАБОТАЕТ | `src/middleware.ts`: matcher `["/studio-admin", "/studio-admin/:path*"]`, проверка cookie `admin_session`. При отсутствии cookie — редирект на `/studio-admin/login` (исправлено с редиректа на `/`). |
| Логика входа `/api/login` | ✅ РАБОТАЕТ | Пароль только из `process.env.ADMIN_PASSWORD`. При успехе выставляется HTTP-only cookie `admin_session` (path=/, maxAge=1h, sameSite=lax, secure в production). Зацикливания нет: успех → `router.replace("/studio-admin")`. |
| `/api/verify-2fa` | ⚪ НЕ РЕАЛИЗОВАНО | Отдельного роута 2FA в проекте нет. Вход только по паролю. |
| Захардкоженный пароль "2026" | ✅ НЕТ | Пароль берётся только из env: `src/app/api/login/route.ts`, `src/app/api/verify-password/route.ts` — везде `process.env.ADMIN_PASSWORD`. В клиенте передаётся только введённое пользователем значение в body запроса. |

### Рекомендации

- В Vercel задать переменную **ADMIN_PASSWORD** (обязательно для входа в админку).
- Редирект при неавторизованном доступе к админке изменён на `/studio-admin/login` (раньше был на `/`).

---

## 2. СОСТОЯНИЕ (Zustand + LocalStorage)

### Что проверено

| Проверка | Статус | Детали |
|----------|--------|--------|
| Подтягивание AdminSettings в симулятор | ✅ РАБОТАЕТ | `getAdminSettings()` в `src/lib/admin-storage.ts` читает `localStorage.getItem("ifsVisionAdmin")`. При пустом/невалидном хранилище возвращается `defaultSettings` — конфликта при первом запуске нет. |
| Первый запуск (пустой localStorage) | ✅ БЕЗ КОНФЛИКТОВ | `getAdminSettings()` при `!raw` возвращает `defaultSettings`. Store инициализируется через `getConfigFromStorage()` и `getCurrencyConfigs(getAdminSettings())` — везде дефолты. |
| Событие `ifsVisionAdminUpdated` | ✅ РАБОТАЕТ | В `setAdminSettings()` вызывается `window.dispatchEvent(new Event("ifsVisionAdminUpdated"))`. На главной странице (`src/app/page.tsx`) подписка `window.addEventListener("ifsVisionAdminUpdated", handler)` и вызов `loadConfigFromStorage()`, который перечитывает конфиг и курсы из localStorage. Синхронизация после сохранения в админке происходит без перезагрузки. |

### Файлы

- `src/lib/admin-storage.ts` — чтение/запись и диспатч события.
- `src/app/page.tsx` — подписка и `loadConfigFromStorage`.
- `src/store/useStore.ts` — `loadConfigFromStorage()` обновляет `config`, `currencyConfigs`, `currency`, `locale`.

---

## 3. ВАЛЮТЫ И КУРСЫ

### Что проверено

| Проверка | Статус | Детали |
|----------|--------|--------|
| Работоспособность `/api/rates` | ✅ РАБОТАЕТ | GET возвращает `{ USD: number, AED: number }` (рублей за 1 USD и за 1 AED). Источник: `https://api.exchangerate-api.com/v4/latest/USD`, кэш в памяти 1 час, `?revalidate=1` сбрасывает кэш. |
| Формат ответа | ✅ КОРРЕКТЕН | Симулятор и админка ожидают именно `USD` и `AED` (рублей за единицу валюты) — совпадает. |
| Недоступность API курсов | ✅ НЕ ПАДАЕТ | В `src/app/api/rates/route.ts` при ошибке используется `cache?.data ?? FALLBACK` (FALLBACK = `{ USD: 90, AED: 25 }`). Ответ 200 с дефолтными значениями, приложение не падает. |

### Файлы

- `src/app/api/rates/route.ts` — логика запроса, кэш, fallback.

---

## 4. 2FA И ТЕЛЕГРАМ

### Что проверено

| Проверка | Статус | Детали |
|----------|--------|--------|
| Отправка лидов / кодов 2FA в Telegram | ⚪ НЕ РЕАЛИЗОВАНО | В `src/app/api` нет роутов, которые отправляют сообщения в Telegram или используют `process.env.BOT_TOKEN`. |
| Использование BOT_TOKEN из env | ⚪ НЕТ | Переменная окружения `BOT_TOKEN` в коде не используется. В админке есть только поля `telegram.botToken` и `telegram.chatId` в настройках (localStorage) — серверный код их не читает и никуда не шлёт. |

### Рекомендации

- Если нужна отправка лидов/2FA в Telegram: добавить API route (например `POST /api/telegram/send`), брать токен из `process.env.BOT_TOKEN` (или из админских настроек с проверкой прав), не хранить токен в localStorage в production.
- Сейчас функция только зарезервирована в UI админки (поля для бота и чата).

---

## 5. PDF ЭКСПОРТ (Screenshot API)

### Что проверено

| Проверка | Статус | Детали |
|----------|--------|--------|
| Передача настроек в Screenshot API | ⚠️ ЧАСТИЧНО | В URL передаются: `export=1`, `ts`, `showTs` (дата/время в отчёте), `compare` (сценарий сравнения), `locale`, `currency`. Цвета бренда и курсы валют в URL **не** передаются. |
| Откуда берутся данные при открытии URL | ⚠️ РИСК | Screenshot One открывает переданный URL в своём браузере. У этого браузера **свой** localStorage (пустой или дефолтный). Поэтому при экспорте отчёт может отобразиться с дефолтным брендом (название, цвет) и дефолтными курсами, а не с теми, что настроены в админке у пользователя. |
| API-ключ Screenshot | ✅ ИСПРАВЛЕНО | Удалён захардкоженный ключ из кода. Используется только `process.env.SCREENSHOT_API_KEY`. Если переменная не задана — возвращается 401 с сообщением о необходимости настроить ключ в Vercel. |

### Рекомендации

- В Vercel задать **SCREENSHOT_API_KEY** (и при необходимости **NEXT_PUBLIC_SITE_URL** для подстановки вместо localhost в URL скриншота).
- Для полного совпадения отчёта с настройками админки: передавать критические параметры в URL (например `primaryColor`, `companyName`, `currencyRates`) и на странице при `export=1` читать их из query и применять, не полагаясь на localStorage.

---

## ИТОГОВАЯ ТАБЛИЦА

| Категория | Работает | Не дописано / исправить |
|-----------|----------|---------------------------|
| **Авторизация и роутинг** | Middleware, cookie, логин, нет пароля в коде | 2FA не реализован (по ТЗ может не требоваться) |
| **Zustand + localStorage** | Подтягивание настроек, первый запуск, событие синхронизации | — |
| **Валюты и курсы** | `/api/rates`, формат, fallback при ошибке | — |
| **2FA и Telegram** | — | Отправка лидов/кодов и использование BOT_TOKEN не реализованы |
| **PDF экспорт** | URL с locale/currency/compare/showTs, ключ только из env | Передать цвета/ставки в URL или смириться с дефолтами в скриншоте |

---

## Файлы, изменённые при аудите (исправления)

1. **`src/app/api/pdf/route.ts`**  
   - Удалён захардкоженный API-ключ.  
   - Используется только `process.env.SCREENSHOT_API_KEY`; при отсутствии — 401 и JSON с сообщением.  
   - Убраны отладочные `console.log` по ключу.

2. **`src/middleware.ts`**  
   - Редирект при отсутствии cookie изменён с `/` на `/studio-admin/login`.

---

## Переменные окружения для Vercel

| Переменная | Обязательность | Назначение |
|------------|-----------------|------------|
| `ADMIN_PASSWORD` | Обязательно | Пароль входа в админку |
| `SCREENSHOT_API_KEY` | Обязательно для PDF | Ключ Screenshot One API |
| `NEXT_PUBLIC_SITE_URL` | Рекомендуется | URL сайта (для подстановки вместо localhost при генерации PDF) |
| `BOT_TOKEN` | При реализации Telegram | Токен бота для отправки лидов/2FA (сейчас не используется) |
