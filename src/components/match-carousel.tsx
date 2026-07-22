'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LiveMatch } from '@/app/actions';
import MatchCard from './match-card';

interface MatchCarouselProps {
    matches: LiveMatch[];
    header?: 'series' | 'category' | 'none';
}

// Horizontal, snap-scrolling row of match cards with edge arrows that appear
// only when there's more to scroll in that direction. Extracted so the same
// dense row works under every SeriesDivider (Live / Recent / Upcoming) and on
// the Home dashboard.
export default function MatchCarousel({ matches, header = 'category' }: MatchCarouselProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const update = () => {
            setCanLeft(el.scrollLeft > 8);
            setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
        };
        update();
        el.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        return () => {
            el.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [matches.length]);

    const scroll = (dir: -1 | 1) => {
        const el = ref.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
    };

    const arrowClass =
        'flex absolute top-1/2 -translate-y-1/2 z-20 w-6 h-6 md:w-9 md:h-9 items-center justify-center rounded-full surface-card shadow-lg text-foreground hover:bg-muted transition-colors';

    // Single-match series: same card width the carousel uses, so it reads as
    // a normal card sitting at the start of the row instead of stretching
    // banner-style across the viewport.
    if (matches.length === 1) {
        const only = matches[0];
        return (
            <div
                className="stagger-in w-full sm:w-[300px] md:w-[320px]"
                style={{ '--stagger-index': 0 } as React.CSSProperties}
            >
                <MatchCard match={only} header={header} />
            </div>
        );
    }

    return (
        <div className="relative">
            <div
                ref={ref}
                className="flex items-start gap-3 md:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory"
            >
                {matches.map((m, i) => (
                    <div
                        key={m.matchId}
                        className="snap-start shrink-0 w-[280px] sm:w-[300px] md:w-[320px] stagger-in"
                        style={{ '--stagger-index': i } as React.CSSProperties}
                    >
                        <MatchCard match={m} header={header} />
                    </div>
                ))}
            </div>
            {canLeft && (
                <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" className={`${arrowClass} left-1`}>
                    <ChevronLeft className="w-3.5 h-3.5 md:w-5 md:h-5" />
                </button>
            )}
            {canRight && (
                <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" className={`${arrowClass} right-1`}>
                    <ChevronRight className="w-3.5 h-3.5 md:w-5 md:h-5" />
                </button>
            )}
        </div>
    );
}
