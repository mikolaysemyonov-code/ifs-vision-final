import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = typeof body?.password === "string" ? body.password : "";
    const p = String(password).trim();
    const envPass = String(process.env.ADMIN_PASSWORD || "").trim();

    if (envPass && p === envPass) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
