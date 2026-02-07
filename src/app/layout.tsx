import type {Metadata} from 'next';
import { DM_Serif_Display, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { MatchesProvider } from '@/contexts/matches-context';
import { RecentHistoryProvider } from '@/contexts/recent-history-context';

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
  description: 'Live Cricket Scores',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
            disableTransitionOnChange
        >
          <MatchesProvider>
            <RecentHistoryProvider>
              {children}
            </RecentHistoryProvider>
          </MatchesProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
