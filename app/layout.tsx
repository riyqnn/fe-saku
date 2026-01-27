import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/hooks/useAuth";
import MiniAppReady from "./miniapp-ready";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saku - Fast Payment",
  description: "Transfer money with just a phone number. Fast, secure, and walletless.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  other: {
    "base:app_id": "6978230488e3bac59cf3da96",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <MiniAppReady />
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
