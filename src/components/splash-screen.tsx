'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'icon' | 'expand' | 'fade'>('icon');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('expand'), 1000);
    const t2 = setTimeout(() => setPhase('fade'), 2500);
    const t3 = setTimeout(() => onComplete(), 3000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        phase === 'fade' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#0A0E20' }}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Logo container - fixed position so "in" stays anchored */}
        <div className="relative flex items-center justify-center">
          {/* Phase 1: "in" icon centered */}
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: phase === 'icon' ? 1 : 0,
              transform: phase === 'icon' ? 'scale(1)' : 'scale(0.8)',
              position: phase === 'icon' ? 'relative' : 'absolute',
            }}
          >
            <Image
              src="/icon-512.png"
              alt="Inningz"
              width={100}
              height={100}
              className="rounded-2xl"
              priority
            />
          </div>

          {/* Phase 2: Full "inningz" logo - the "in" part aligns where the icon was */}
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: phase !== 'icon' ? 1 : 0,
              transform: phase !== 'icon' ? 'scale(1)' : 'scale(0.9)',
              position: phase !== 'icon' ? 'relative' : 'absolute',
            }}
          >
            {/* Reveal mask - clips from left to right like typing */}
            <div
              className="overflow-hidden transition-all duration-1000 ease-out"
              style={{
                width: phase !== 'icon' ? 260 : 0,
              }}
            >
              <Image
                src="/logo-full.png"
                alt="Inningz"
                width={260}
                height={78}
                className="object-contain"
                style={{ minWidth: 260 }}
                priority
              />
            </div>
          </div>
        </div>

        {/* Live indicator + tagline */}
        <div
          className={`flex items-center gap-2 transition-all duration-500 ${
            phase === 'icon'
              ? 'opacity-0 translate-y-3'
              : 'opacity-100 translate-y-0'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-white/50">
            Live Cricket Scores
          </span>
        </div>
      </div>
    </div>
  );
}
