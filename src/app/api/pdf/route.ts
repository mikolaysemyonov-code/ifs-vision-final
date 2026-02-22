import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.SCREENSHOT_API_KEY ?? "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key is missing in ENV" },
        { status: 401 }
      );
    }

    const body = await req.json();
    let url = typeof body?.url === "string" ? body.url : "";

    if (url.includes("localhost")) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (siteUrl) {
        try {
          const u = new URL(url);
          const base = new URL(siteUrl);
          u.protocol = base.protocol;
          u.host = base.host;
          url = u.toString();
        } catch {
          // keep original url if parse fails
        }
      }
    }

    const params = new URLSearchParams({
      access_key: apiKey,
      url,
      selector: "#simulation-report",
      full_page: "false",
      viewport_width: "1440",
      viewport_height: "900",
      device_scale_factor: "2",
      format: "jpg",
      block_ads: "true",
      delay: "2",
    });
    const apiUrl = `https://api.screenshotone.com/take?${params.toString()}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error("Failed to capture screenshot");
    }

    const imageBlob = await response.blob();
    return new NextResponse(imageBlob, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": 'attachment; filename="IFS-Vision-Report.jpg"',
      },
    });
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
