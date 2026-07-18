'use client';

import { useEffect, useRef, useState } from 'react';
import { formatScore } from '@/lib/utils';

interface AnimatedScoreProps {
    value?: string;
    className?: string;
}

// Animates the runs and the overs portions of a score string when they change.
// Supports score strings with or without a team prefix:
//   "153/9 (20.0 ov)", "284-8 (50 ov)", "421", "ZIM 249/2 (61.0 ov)".
export default function AnimatedScore({ value, className }: AnimatedScoreProps) {
    const parsed = parseScore(formatScore(value));

    if (parsed.runs === null) {
        return <span className={className}>{value ?? ''}</span>;
    }

    return (
        <span className={className}>
            {parsed.prefix}
            <AnimatedNumber value={parsed.runs} format={(n) => String(Math.round(n))} />
            {parsed.wktsText}
            {parsed.overs !== null && (
                <>
                    {' ('}
                    <AnimatedNumber value={parsed.overs} format={(n) => formatOvers(n, parsed.oversHasDecimal)} />
                    {' ov)'}
                </>
            )}
            {parsed.trailing}
        </span>
    );
}

// Snaps to the new value instantly, with a brief tick cue on increase (reduced-motion aware).
function AnimatedNumber({
    value,
    format,
}: {
    value: number;
    format: (n: number) => string;
}) {
    const [flash, setFlash] = useState(false);
    const prevRef = useRef(value);

    useEffect(() => {
        const prev = prevRef.current;
        if (value === prev) return;
        const increased = value > prev;
        prevRef.current = value;

        if (
            increased &&
            typeof window !== 'undefined' &&
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            setFlash(true);
            const t = setTimeout(() => setFlash(false), 500);
            return () => clearTimeout(t);
        }
    }, [value]);

    return <span className={`tabular-nums${flash ? ' score-tick' : ''}`}>{format(value)}</span>;
}

interface ParsedScore {
    prefix: string;
    runs: number | null;
    wickets: number;
    wktsText: string;
    overs: number | null;
    oversHasDecimal: boolean;
    trailing: string;
}

function parseScore(s?: string): ParsedScore {
    const empty: ParsedScore = {
        prefix: '', runs: null, wickets: 0, wktsText: '',
        overs: null, oversHasDecimal: false, trailing: '',
    };
    if (!s) return empty;

    // Match [team prefix] <runs>[/wkts | -wkts] [ (overs[.balls] ov) ] [trailing]
    const m = s.match(/^([A-Z][A-Za-z]+\s+)?(\d+)([\/-]\d+)?\s*(?:\(([\d.]+)\s*ov\))?(.*)$/);
    if (!m) return { ...empty, trailing: s };

    const prefix = m[1] ?? '';
    const runs = parseInt(m[2], 10);
    const wktsText = m[3] ?? '';
    const wickets = m[3] ? parseInt(m[3].slice(1), 10) : 0;
    const oversRaw = m[4];
    const trailing = m[5] ?? '';

    let overs: number | null = null;
    let oversHasDecimal = false;
    if (oversRaw) {
        overs = parseFloat(oversRaw);
        oversHasDecimal = oversRaw.includes('.');
    }

    return { prefix, runs, wickets, wktsText, overs, oversHasDecimal, trailing };
}

function formatOvers(n: number, hasDecimal: boolean): string {
    if (!hasDecimal) return String(Math.floor(n));
    // Cricket overs use a single decimal digit (21.4, not 21.40).
    // Floor the ball portion so 21.45 doesn't briefly display as 21.5.
    const overs = Math.floor(n);
    const balls = Math.min(5, Math.floor((n - overs) * 10));
    return `${overs}.${balls}`;
}
