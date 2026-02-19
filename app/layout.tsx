import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWARegister from "./pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RS Fisheries",
  description: "RS Fisheries Admin Dashboard",
  manifest: "/manifest.json",
  icons: {
    icon: "/assets/favicon.png",
    apple: "/icons/512.png",
  },
};

/* 🔥 NEW — required in Next 16 */
export const viewport: Viewport = {
  themeColor: "#139BC3",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="RS Fisheries" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
