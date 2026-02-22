import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body && typeof body === "object" ? body : {};
    const passwordStr = typeof password === "string" ? password : "";
    const p = String(passwordStr).trim();
    const envPass = String(process.env.ADMIN_PASSWORD || "").trim();

    if (envPass && p === envPass) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set(COOKIE_NAME, "1", {
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return res;
    }
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
