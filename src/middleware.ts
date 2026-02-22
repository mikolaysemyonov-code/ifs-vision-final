import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "admin_session";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!path.startsWith("/studio-admin")) return NextResponse.next();
  if (path === "/studio-admin/login") return NextResponse.next();
  if (!req.cookies.get(ADMIN_COOKIE)?.value) {
    return NextResponse.redirect(new URL("/studio-admin/login", req.url), 307);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/studio-admin", "/studio-admin/:path*"],
};
