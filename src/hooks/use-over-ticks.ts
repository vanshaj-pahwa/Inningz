'use client';

import { useEffect, useState } from 'react';

// Recharts' auto tick layout (`interval="preserveStartEnd"`) uses collision
// detection that can drop a lot of intermediate ticks on narrow viewports,
// which reads as "missing overs". We compute an explicit tick array so the
// axis density is predictable across breakpoints while every data point still
// renders in the series itself.
//
// When `showAll` is true (used inside the zoom modal where the chart is placed
// in a horizontally-scrollable container), every over gets a label.
export function useOverTicks(overs: number[], showAll = false): number[] {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const measure = () => setWidth(window.innerWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  if (overs.length === 0) return [];
  if (showAll) return overs;

  const target = width < 480 ? 10 : width < 900 ? 15 : Math.min(overs.length, 25);
  const stride = Math.max(1, Math.ceil(overs.length / target));
  const ticks: number[] = [];
  for (let i = 0; i < overs.length; i += stride) ticks.push(overs[i]);
  const last = overs[overs.length - 1];
  if (ticks[ticks.length - 1] !== last) ticks.push(last);
  return ticks;
}

// Preferred per-over width in the zoomed / scrollable view. 28px keeps labels
// legible without needing to rotate them, and 50 overs → ~1400px scroll width.
export const ZOOMED_OVER_WIDTH = 28;
