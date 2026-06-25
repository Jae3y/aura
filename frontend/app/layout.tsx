import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { AppShell } from "@/components/layout/AppShell";
import { validateConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "AURA - Autonomous Utility & Response Assistant",
  description: "Military-grade IoT security system with blockchain verification",
  manifest: "/manifest.json",
  applicationName: "AURA",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    title: "AURA Command PWA",
    description: "Installable IoT security command center for mobile and desktop.",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AURA",
  },
};

export const viewport: Viewport = {
  themeColor: "#06B6D4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Validate configuration on server startup
if (typeof window === 'undefined') {
  validateConfig();
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-full flex flex-col bg-base text-text-primary font-sans antialiased">
        <ErrorBoundary>
          <QueryProvider>
            <WalletProvider>
              <RealtimeProvider>
                <AppShell>{children}</AppShell>
              </RealtimeProvider>
            </WalletProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
