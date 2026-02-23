import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { config } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ifs-vision.vercel.app";

const { brand } = config;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "IFS Vision — High-Precision Capital Efficiency Terminal",
  icons: {
    icon: brand.logoUrl || "/logo.png",
    apple: brand.logoUrl || "/logo.png",
  },
  description:
    "High-precision capital efficiency terminal. Mortgage, ROI, deposit comparison, zero-point sync. Ипотека, доходность, честное сравнение с вкладом.",
  openGraph: {
    title: "IFS Vision — High-Precision Capital Efficiency Terminal",
    description:
      "High-precision capital efficiency terminal. Mortgage, ROI, deposit comparison in real time.",
    url: siteUrl,
    siteName: brand.companyName,
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${brand.productName} Dashboard Preview`,
      },
    ],
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IFS Vision — High-Precision Capital Efficiency Terminal",
    description: "High-precision capital efficiency terminal. Mortgage, ROI, deposit comparison.",
    images: [`${siteUrl}/og-image.png`],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
