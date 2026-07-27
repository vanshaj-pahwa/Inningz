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
import { PlayerProfileProvider } from '@/contexts/player-profile-context';

import AppShell from '@/components/app-shell';
import CommandPaletteProvider from '@/components/command-palette';
import { SITE_URL, SITE_NAME, SITE_TAGLINE, DEFAULT_DESCRIPTION } from '@/lib/seo';

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

// Pin serverless functions to Mumbai so scrapes
// skip the trans-continental round-trip. Single biggest report-tab latency fix.
export const preferredRegion = ['bom1'];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Per-page titles render as "England vs India, Live Score · Inningz"; the
  // home page (and anything without its own title) uses the default.
  title: {
    default: `${SITE_NAME}: ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'live cricket score', 'cricket scores', 'cricket commentary', 'scorecard',
    'points table', 'ICC rankings', 'cricket news', 'IPL', 'T20', 'ODI', 'Test cricket',
  ],
  authors: [{ name: 'Vanshaj' }],
  creator: 'Vanshaj',
  manifest: '/manifest.json',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
    shortcut: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Inningz',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
        {/* Refraction filter for the Liquid Glass theme's backdrop lens. */}
        <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
          <filter id="liquid-glass" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.011" numOctaves={2} seed={7} result="noise" />
            <feGaussianBlur in="noise" stdDeviation={1.6} result="soft" />
            <feDisplacementMap in="SourceGraphic" in2="soft" scale={30} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            themes={['light', 'dark', 'liquid-glass', 'system']}
            disableTransitionOnChange
        >
          <DataLayerProvider>
            <MatchesProvider>
              <RecentHistoryProvider>
                <DashboardPreferencesProvider>
                  <PlayerProfileProvider>
                    <CommandPaletteProvider>
                      <AppShell>
                        {children}
                      </AppShell>
                    </CommandPaletteProvider>
                  </PlayerProfileProvider>
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
