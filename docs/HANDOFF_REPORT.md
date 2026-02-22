# Технический отчёт / Handoff (v1.0)

**Роль:** Technical Lead / System Architect  
**Цель:** Передача статуса проекта другому специалисту.

---

## 1. Архитектура

- **Стек:** Next.js 16 (App Router), React 19, TypeScript. Сборка — Turbopack.
- **Состояние:** SPA-подобное приложение: главная страница и админка — client components (`"use client"`), API — Route Handlers в `src/app/api/`.
- **Ключевая структура:**
  - `src/app/` — страницы и API (App Router)
  - `src/app/page.tsx` — главная (симулятор)
  - `src/app/studio-admin/` — админка; `studio-admin/login/` — форма входа
  - `src/app/admin/` — редирект на `/studio-admin/login`
  - `src/app/api/` — login, logout, verify-password, telegram/send, pdf, rates
  - `src/middleware.ts` — защита маршрутов админки по cookie
  - `src/store/` — Zustand (конфиг, локаль, валюта)
  - `src/lib/` — движок расчётов, форматирование, переводы, admin-storage (localStorage)

---

## 2. Текущий этап (что реализовано)

- **Главная страница:** Симулятор недвижимости (слайдеры, стратегии, графики, вердикт, экспорт в «PDF»/скриншот).
- **Админка (`/studio-admin`):** Настройки брендинга, интеграции (Telegram), безопасность (пароль, авто-блокировка, приватность), пресеты ставок, режим презентации, Live ROI Preview. Сохранение в localStorage + опционально синхронизация с сервером (verify-password при смене пароля).
- **Бот Telegram:** `POST /api/telegram/send` — отправка лида (имя, телефон, стратегия, ROI, компания) в Telegram. Env: `BOT_TOKEN`, `CHAT_ID`.
- **API скриншотов:** `POST /api/pdf` — не PDF, а **скриншот** через ScreenshotOne (`https://api.screenshotone.com/take`). Селектор `#simulation-report`, JPG. Env: `SCREENSHOT_API_KEY`. Для localhost подставляется `NEXT_PUBLIC_SITE_URL`.
- **Курсы валют:** `GET /api/rates` — ревалидация/прокси курсов (используется админкой и симулятором).

---

## 3. Последние изменения (ключевые)

- **Авторизация и Env:**
  - **`src/app/api/login/route.ts`:** Вход по паролю: сравнение `String(password).trim()` с `String(process.env.ADMIN_PASSWORD ?? "").trim()` **или** с запасным паролем `"2026"`. При успехе выставляется cookie `admin_session` (1 час). Добавлен отладочный лог: `console.log('DEBUG: Введенный пароль:', password, 'Пароль из ENV:', process.env.ADMIN_PASSWORD)`.
  - **`src/app/api/verify-password/route.ts`:** Проверка текущего пароля при смене в админке — **без** `.trim()`/`String()` и без fallback `"2026"` (ожидается только `process.env.ADMIN_PASSWORD`). Возможная несогласованность с логином при пустом/неподставленном env на Vercel.
- **Удалены:** лишние `console.log` в `page.tsx`, JSX-комментарии; в login убрана проверка «пароль не настроен» (500), чтобы работал запасной ключ `2026`.
- **Middleware:** без изменений — защищает только `/studio-admin` (и подпути), кроме `/studio-admin/login`.

---

## 4. Механизм входа (ADMIN_PASSWORD)

- **Где проверяется:** `src/app/api/login/route.ts` (POST).
- **Как:**  
  - Тело запроса: `{ password }`.  
  - Нормализация: `p = String(password).trim()`, `envPass = String(process.env.ADMIN_PASSWORD ?? "").trim()`.  
  - Успех, если `p === envPass` **или** `p === "2026"`.  
  - Не JWT, не сессии на сервере — только **cookie**: при успехе выставляется `admin_session=1` (httpOnly, sameSite: lax, secure в production, path: `/`, maxAge: 1 час).
- **Защита маршрутов:** `src/middleware.ts` — для путей, начинающихся с `/studio-admin` (кроме `/studio-admin/login`), проверяется наличие cookie `admin_session`; при отсутствии — редирект 307 на `/studio-admin/login`.
- **Выход:** `POST /api/logout` — очистка cookie `admin_session` (maxAge: 0).

**Итог:** Вход — простая проверка пароля в API + установка cookie; доступ к админке — по наличию этой cookie в middleware.

---

## 5. Vercel Config

- **`vercel.json` в репозитории нет.** Rewrites/headers для API не заданы — используются дефолтные маршруты Next.js (например, `/api/login`, `/api/pdf` как Route Handlers).
- **Рекомендация:** При необходимости добавить `vercel.json` (например, для CORS или кэширования) — сохранить соответствие путям в `src/app/api/*/route.ts`. Для проблем с env на Vercel проверить: переменные заданы в Project → Settings → Environment Variables, пересобрать деплой после изменений.

---

## 6. Резюме для разработчика

- **Стек:** Next.js 16 (App Router), React 19, TypeScript, Zustand, Framer Motion, Recharts.
- **Реализовано:** Симулятор на главной, админка с настройками и презентацией, Telegram-лиды, «PDF» через ScreenshotOne, курсы валют.
- **Вход:** Cookie `admin_session` после проверки пароля в `/api/login`. Пароль берётся из `process.env.ADMIN_PASSWORD` или запасного `"2026"`; сравнение через `String(…).trim()`. Middleware защищает только `/studio-admin` (редирект на `/studio-admin/login` при отсутствии cookie).
- **Важно:** В `verify-password` логика не приведена к тому же правилу (нет trim/String/fallback) — при проблемах со входом после смены пароля в админке стоит унифицировать с login. Отладочный `console.log` в login перед проверкой — временный; после решения проблем с env на Vercel его и запасной пароль `"2026"` лучше убрать.
- **Vercel:** `vercel.json` отсутствует; env (ADMIN_PASSWORD, BOT_TOKEN, CHAT_ID, SCREENSHOT_API_KEY, NEXT_PUBLIC_SITE_URL) задаются в панели Vercel.
