import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import SiteMaintenanceOverlay from "@/components/SiteMaintenanceOverlay";
import { ChessboardSettingsProvider } from "@/contexts/ChessboardSettingsContext";
import { SiteConfigProvider } from "@/contexts/SiteConfigContext";
import { LanguageProvider } from "@/lib/language-context";
import { Toaster } from "sonner";
import MonitoringProviders from "@/components/MonitoringProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Chess Avatar - AI Chess Bot Builder",
    template: "%s | Chess Avatar",
  },
  description: "Analyze your chess games and create custom AI bots based on your playing style",
  icons: {
    icon: [
      { url: "/knight-logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/knight-logo.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const BUILD_ID =
    process.env.NEXT_PUBLIC_BUILD_ID ??
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    "dev";

  return (
    <html lang="en" className="dark" suppressHydrationWarning data-build={BUILD_ID}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <SiteConfigProvider>
            <ChessboardSettingsProvider>
              <Navigation />
              {children}
              <SiteMaintenanceOverlay />
              <MonitoringProviders />
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#0F2341',
                  border: '1px solid rgba(0, 255, 255, 0.2)',
                  color: '#E2E8F0',
                  fontFamily: 'var(--font-geist-sans)',
                },
                classNames: {
                  success: 'toast-success',
                  error: 'toast-error',
                },
              }}
            />
          </ChessboardSettingsProvider>
          </SiteConfigProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
