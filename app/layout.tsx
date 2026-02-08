import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { ChessboardSettingsProvider } from "@/contexts/ChessboardSettingsContext";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeProvider } from "@/lib/theme-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chess Avatar - AI Chess Bot Builder",
  description: "Analyze your chess games and create custom AI bots based on your playing style",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // Identifiant de build — changez après chaque déploiement important pour vérifier la version en ligne
  const BUILD_ID = "2025-01-28-v2";

  return (
    <html lang="en" suppressHydrationWarning data-build={BUILD_ID}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <ChessboardSettingsProvider>
              <Navigation />
              {children}
            </ChessboardSettingsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
