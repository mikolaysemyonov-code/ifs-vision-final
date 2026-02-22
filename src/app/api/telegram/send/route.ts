import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TELEGRAM_API = "https://api.telegram.org/bot";

export interface TelegramSendBody {
  name?: string;
  phone?: string;
  strategy?: string;
  roi?: number;
  companyName?: string;
  price?: number;
  currency?: string;
  benefit?: number;
  magicLink?: string;
}

function buildMessage(p: TelegramSendBody): string {
  const name = (p.name && p.name.trim()) || "—";
  const phone = (p.phone && p.phone.trim()) || "—";
  const price = typeof p.price === "number" && Number.isFinite(p.price) ? p.price : 0;
  const currency = (p.currency && String(p.currency).trim()) || "RUB";
  const benefit = typeof p.benefit === "number" && Number.isFinite(p.benefit) ? p.benefit : 0;
  const link = (p.magicLink && p.magicLink.trim()) || "—";
  const formatNum = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
  return `🔥 НОВЫЙ ЛИД!\nИмя: ${name}\nТел: ${phone}\nОбъект: ${formatNum(price)} ${currency}\nВыгода над вкладом: ${formatNum(benefit)}\nMagic Link на его расчет: ${link}`;
}

export async function POST(req: NextRequest) {
  try {
    const token = process.env.BOT_TOKEN?.trim();
    const chatId = process.env.CHAT_ID?.trim();
    if (!token || !chatId) {
      return NextResponse.json(
        { error: "BOT_TOKEN or CHAT_ID not configured" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as unknown;
    const b = body as Record<string, unknown>;
    const name = typeof b.name === "string" ? b.name : "";
    const phone = typeof b.phone === "string" ? b.phone : "";
    const strategy = typeof b.strategy === "string" ? b.strategy : "";
    const roi = typeof b.roi === "number" ? b.roi : Number(b.roi) || 0;
    const companyName = typeof b.companyName === "string" ? b.companyName : undefined;
    const price = typeof b.price === "number" ? b.price : Number(b.price) || 0;
    const currency = typeof b.currency === "string" ? b.currency : "RUB";
    const benefit = typeof b.benefit === "number" ? b.benefit : Number(b.benefit) || 0;
    const magicLink = typeof b.magicLink === "string" ? b.magicLink : "";

    const payload: TelegramSendBody = {
      name,
      phone,
      strategy,
      roi,
      companyName,
      price,
      currency,
      benefit,
      magicLink,
    };
    const text = buildMessage(payload);

    const url = `${TELEGRAM_API}${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to send message to Telegram" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
