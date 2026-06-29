'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import SplashScreen from './splash-screen';
import { recordNavigation } from '@/lib/nav-history';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Track in-app navigation synchronously during render so child useEffects
  // (e.g. the match page back button) see an up-to-date count when they mount.
  recordNavigation(pathname);

  const [showSplash, setShowSplash] = useState(true);

  const handleComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleComplete} />}
      <div className={showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
        {children}
      </div>
    </>
  );
}
