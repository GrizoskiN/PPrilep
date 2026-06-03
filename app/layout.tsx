import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Мој Прилеп | Платформа за афирмација на граѓанските вредности",
  description:
    "Граѓанска платформа за афирмација на граѓанските вредности преку реализација на проекти од јавен интерес",
  icons: {
    icon: [
      {
        url: "/logo/logo-black.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/logo/logo-white.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    shortcut: [
      {
        url: "/logo/logo-black.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/logo/logo-white.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
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
        <Analytics />
      </body>
    </html>
  );
}
