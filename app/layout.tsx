import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Подобар Прилеп",
  description: "Граѓанска платформа за пријавување градски проблеми во Прилеп",
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
      <body className="h-full antialiased font-sans  text-slate-900">
        <div className=" mx-auto h-full">{children}</div>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
