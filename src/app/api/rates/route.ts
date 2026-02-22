import { NextResponse } from "next/server";

/** Авто-курсы валют: кэш 1ч, fallback при ошибке, ?revalidate=1 для принудительного обновления. */
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK = { USD: 90, AED: 25 };

let cache: { data: { USD: number; AED: number }; ts: number } | null = null;

/**
 * GET /api/rates
 * Возвращает курсы к рублю: 1 USD = X RUB, 1 AED = Y RUB.
 * Кэш в памяти, обновление не чаще раза в час (stale-while-revalidate).
 * ?revalidate=1 — принудительное обновление (для кнопки "Обновить сейчас" в админке).
 */
export async function GET(req: Request) {
  const now = Date.now();
  const url = new URL(req.url);
  const forceRevalidate = url.searchParams.get("revalidate") === "1";
  if (!forceRevalidate && cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  try {
    const res = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("Rates API error");
    const json = (await res.json()) as { rates?: { RUB?: number; AED?: number } };
    const rates = json.rates;
    if (!rates || typeof rates.RUB !== "number" || typeof rates.AED !== "number") {
      throw new Error("Invalid rates shape");
    }
    const usdRub = rates.RUB;
    const aedPerUsd = rates.AED;
    const aedRub = aedPerUsd > 0 ? usdRub / aedPerUsd : FALLBACK.AED;
    const data = {
      USD: Math.round(usdRub * 100) / 100,
      AED: Math.round(aedRub * 100) / 100,
    };
    cache = { data, ts: now };
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    const data = cache?.data ?? FALLBACK;
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }
}
