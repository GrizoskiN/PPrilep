import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next"
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const SITE_URL = "https://mojprilep.mk";
const SITE_NAME = "Мој Прилеп";
const SITE_TITLE =
  "Мој Прилеп | Платформа за афирмација на граѓанските вредности";
const SITE_DESCRIPTION =
  "Граѓанска платформа за афирмација на граѓанските вредности преку реализација на проекти од јавен интерес";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Мој Прилеп",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Прилеп",
    "Мој Прилеп",
    "граѓанска платформа",
    "пријави проблем",
    "иницијативи",
    "комунални услуги",
    "Водовод Прилеп",
    "Комуналец Прилеп",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "mk_MK",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/logo/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo/app-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/logo/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mk" className={`${inter.variable} h-full`}>
      <body className="h-full bg-theme-canvas font-sans antialiased text-theme-body">
        <div className=" mx-auto h-full">{children}</div>
        <Toaster position="bottom-right" />
        < Analytics />
        < SpeedInsights />
      </body>
    </html>
  );
}
