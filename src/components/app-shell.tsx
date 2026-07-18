'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import SplashScreen from './splash-screen';
import OfflineBanner from './offline-banner';
import BottomNav from './bottom-nav';
import { recordNavigation } from '@/lib/nav-history';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Track in-app navigation synchronously during render so child useEffects
  // (e.g. the match page back button) see an up-to-date count when they mount.
  recordNavigation(pathname);

  const [showSplash, setShowSplash] = useState(false);

  const handleComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Show the branded splash only once per browser session — never on reloads or
  // return visits, so a live-scores app never blocks content behind it.
  useEffect(() => {
    try {
      if (!sessionStorage.getItem('inningz_splash_shown')) {
        sessionStorage.setItem('inningz_splash_shown', '1');
        setShowSplash(true);
      }
    } catch {
      /* storage blocked — skip the splash entirely */
    }
  }, []);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <>
      <OfflineBanner />
      {showSplash && <SplashScreen onComplete={handleComplete} />}
      {children}
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  );
}
