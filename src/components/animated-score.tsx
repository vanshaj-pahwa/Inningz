'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface AnimatedScoreProps {
    value?: string;
    className?: string;
}

// Counts up the runs portion of a score string when it changes,
// and briefly flashes when a wicket is taken.
// Supports score strings with or without a team prefix:
//   "153/9 (20.0 ov)", "284-8 (50 ov)", "421", "ZIM 249/2 (61.0 ov)".
export default function AnimatedScore({ value, className }: AnimatedScoreProps) {
    const parsed = parseScore(value);
    const targetRuns = parsed.runs ?? 0;

    const [displayRuns, setDisplayRuns] = useState(targetRuns);
    const prevRunsRef = useRef(targetRuns);
    const prevWktsRef = useRef(parsed.wickets);
    const spanRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (parsed.runs === null) return;
        const prev = prevRunsRef.current;
        if (parsed.runs === prev) return;

        const obj = { n: prev };
        const tween = gsap.to(obj, {
            n: parsed.runs,
            duration: Math.min(1.2, Math.max(0.4, Math.abs(parsed.runs - prev) * 0.05)),
            ease: 'power2.out',
            snap: { n: 1 },
            onUpdate: () => setDisplayRuns(Math.round(obj.n)),
        });

        if (spanRef.current) {
            const isWicket = parsed.wickets > prevWktsRef.current;
            gsap.fromTo(
                spanRef.current,
                { textShadow: '0 0 0 rgba(0,0,0,0)', scale: 1 },
                {
                    textShadow: isWicket
                        ? '0 0 28px rgba(248,113,113,0.7)'
                        : '0 0 22px rgba(251,191,36,0.6)',
                    scale: 1.04,
                    duration: 0.18,
                    ease: 'power2.out',
                    yoyo: true,
                    repeat: 1,
                }
            );
        }

        prevRunsRef.current = parsed.runs;
        prevWktsRef.current = parsed.wickets;

        return () => { tween.kill(); };
    }, [parsed.runs, parsed.wickets]);

    // No numeric runs found (e.g. "Yet to bat", undefined) — render raw, no animation.
    if (parsed.runs === null) {
        return <span className={className}>{value ?? ''}</span>;
    }

    return (
        <span ref={spanRef} className={className} style={{ display: 'inline-block', willChange: 'transform' }}>
            {parsed.prefix}<span className="tabular-nums">{displayRuns}</span>{parsed.rest}
        </span>
    );
}

interface ParsedScore {
    prefix: string;
    runs: number | null;
    wickets: number;
    rest: string;
}

function parseScore(s?: string): ParsedScore {
    if (!s) return { prefix: '', runs: null, wickets: 0, rest: '' };
    // Optional team-prefix like "ZIM " or "BAN ", then runs, then optional /wkts or -wkts, then anything.
    const m = s.match(/^([A-Z][A-Za-z]+\s+)?(\d+)([/-](\d+))?(.*)$/);
    if (!m) return { prefix: '', runs: null, wickets: 0, rest: s };
    const prefix = m[1] ?? '';
    const runs = parseInt(m[2], 10);
    const wickets = m[4] ? parseInt(m[4], 10) : 0;
    const rest = (m[3] ?? '') + (m[5] ?? '');
    return { prefix, runs, wickets, rest };
}
