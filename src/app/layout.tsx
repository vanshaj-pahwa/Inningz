import type {Metadata, Viewport} from 'next';
import { DM_Serif_Display, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { DataLayerProvider } from '@/contexts/data-layer-context';
import { MatchesProvider } from '@/contexts/matches-context';
import { RecentHistoryProvider } from '@/contexts/recent-history-context';
import { DashboardPreferencesProvider } from '@/contexts/dashboard-preferences-context';
import AppShell from '@/components/app-shell';

const dmSerifDisplay = DM_Serif_Display({
    subsets: ['latin'],
    variable: '--font-display',
    weight: ['400']
});

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-sans',
    weight: ['400', '500', '600', '700']
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    weight: ['400', '500', '700']
});

export const metadata: Metadata = {
  title: 'Inningz',
  description: 'Live Cricket Scores & Analytics',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Inningz',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0A0E20',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          dmSerifDisplay.variable,
          dmSans.variable,
          jetbrainsMono.variable
        )}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            themes={['light', 'dark', 'midnight', 'pitch', 'sunset', 'sepia', 'system']}
            disableTransitionOnChange
        >
          <DataLayerProvider>
            <MatchesProvider>
              <RecentHistoryProvider>
                <DashboardPreferencesProvider>
                  <AppShell>
                    {children}
                  </AppShell>
                </DashboardPreferencesProvider>
              </RecentHistoryProvider>
            </MatchesProvider>
          </DataLayerProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
