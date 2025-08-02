import type {Metadata} from 'next';
import { Inter, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarProvider } from '@/components/ui/sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const bricolage = Bricolage_Grotesque({ 
    subsets: ['latin'], 
    variable: '--font-logo',
    weight: ['400', '700'] 
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
          inter.variable,
          bricolage.variable
        )}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <SidebarProvider>
            {children}
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
