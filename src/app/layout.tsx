import type { Metadata, Viewport } from 'next';
import './globals.css';
import { TradingProvider } from '@/lib/context/trading-context';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { PWAInstallPrompt } from '@/components/layout/PWAInstallPrompt';

export const metadata: Metadata = {
  title: 'Trading Journal System (PWA)',
  description: 'ระบบบันทึกและวิเคราะห์การเทรด พัฒนากลยุทธ์ และติดตามผลตอบแทน (PWA)',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TradeJournal',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0f19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased flex flex-col md:flex-row selection:bg-brand-500 selection:text-white">
        <TradingProvider>
          {/* Desktop Left Sidebar */}
          <Sidebar />

          {/* Main App Layout */}
          <div className="flex-1 flex flex-col min-w-0 min-h-screen">
            {/* Top Header with Portfolio Selector */}
            <Header />

            {/* Page Content */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
              {children}
            </main>

            {/* Mobile Bottom Navigation Bar */}
            <BottomNav />

            {/* PWA Installation Prompt */}
            <PWAInstallPrompt />
          </div>
        </TradingProvider>
      </body>
    </html>
  );
}
