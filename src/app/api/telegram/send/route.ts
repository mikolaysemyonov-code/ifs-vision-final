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
  /** ID партнёра (White Label); лид уходит в чат партнёра. */
  partnerId?: string;
  /** Telegram Chat ID — при наличии переопределяет CHAT_ID из env (чат партнёра). */
  chatId?: string;
}

function buildMessage(p: TelegramSendBody): string {
  const name = (p.name && p.name.trim()) || "—";
  const phone = (p.phone && p.phone.trim()) || "—";
  const price = typeof p.price === "number" && Number.isFinite(p.price) ? p.price : 0;
  const currency = (p.currency && String(p.currency).trim()) || "RUB";
  const benefit = typeof p.benefit === "number" && Number.isFinite(p.benefit) ? p.benefit : 0;
  const link = (p.magicLink && p.magicLink.trim()) || "—";
  const formatNum = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
  const partnerLine = p.partnerId ? `\nПартнёр (White Label): ${p.partnerId}` : "";
  return `🔥 НОВЫЙ ЛИД!${partnerLine}\nИмя: ${name}\nТел: ${phone}\nОбъект: ${formatNum(price)} ${currency}\nВыгода над вкладом: ${formatNum(benefit)}\nMagic Link на его расчет: ${link}`;
}

export async function POST(req: NextRequest) {
  try {
    const token = process.env.BOT_TOKEN?.trim();
    const defaultChatId = process.env.CHAT_ID?.trim();
    if (!token) {
      return NextResponse.json(
        { error: "BOT_TOKEN not configured" },
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
    const partnerChatId = typeof b.chatId === "string" ? b.chatId.trim() : "";
    const chatIdToUse = partnerChatId || defaultChatId;
    if (!chatIdToUse) {
      return NextResponse.json(
        { error: "CHAT_ID not configured and no partner chatId in request" },
        { status: 500 }
      );
    }

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
      partnerId: typeof b.partnerId === "string" ? b.partnerId : undefined,
      chatId: partnerChatId || undefined,
    };
    const text = buildMessage(payload);

    const url = `${TELEGRAM_API}${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatIdToUse,
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
