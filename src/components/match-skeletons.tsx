import { Skeleton } from './ui/skeleton';

export function MatchPageSkeleton() {
    return (
        <div className="w-full mx-auto px-2 md:px-6 lg:px-8 animate-in fade-in duration-300">
            {/* Header: back + title + meta, tabs inline on desktop */}
            <div className="flex flex-col gap-2 mb-4 md:mb-6 py-3 md:py-4 gradient-border">
                <div className="flex items-start gap-2 md:gap-4">
                    <Skeleton className="shrink-0 h-8 w-8 md:h-9 md:w-9 rounded-xl mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-6 md:h-8 w-3/4 max-w-[420px] rounded-md" />
                        <div className="space-y-1 pt-0.5">
                            <Skeleton className="h-3 w-40 rounded-md" />
                            <Skeleton className="h-3 w-56 rounded-md" />
                            <Skeleton className="h-3 w-48 rounded-md" />
                        </div>
                    </div>
                    {/* Desktop: tabs */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-9 w-20 rounded-lg" />
                            ))}
                        </div>
                        <Skeleton className="h-9 w-20 rounded-xl" />
                        <Skeleton className="h-9 w-9 rounded-xl" />
                    </div>
                </div>
                {/* Mobile: tabs row */}
                <div className="flex md:hidden items-center gap-1 pt-1">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="flex-1 h-7 rounded-lg" />
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {/* Score Hero */}
                <div className="glass-card relative overflow-hidden">
                    <div className="p-5 md:p-7 space-y-4">
                        {/* Previous innings */}
                        <div className="flex items-baseline gap-2 opacity-50">
                            <Skeleton className="w-5 h-3.5 rounded" />
                            <Skeleton className="h-4 w-10 rounded-md" />
                            <Skeleton className="h-7 w-20 rounded-md" />
                        </div>
                        {/* Current score - the hero number */}
                        <Skeleton className="h-12 md:h-14 lg:h-16 w-56 md:w-72 rounded-md" />
                        {/* Status + rates row */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Skeleton className="w-2 h-2 rounded-full" />
                                <Skeleton className="h-4 w-40 rounded-md" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                        </div>
                    </div>
                    <div className="h-[2px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                </div>

                {/* Main grid: Scorecard left + Commentary right */}
                <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4 lg:gap-6">
                    {/* Left: mini scorecard table */}
                    <div className="glass-card overflow-hidden">
                        <div className="px-3 md:px-4 py-2 md:py-3 border-b border-border/40 flex items-center justify-between">
                            <Skeleton className="h-3 w-14 rounded-md" />
                            <div className="flex gap-3">
                                {['R', 'B', '4s', '6s', 'SR'].map((_, i) => (
                                    <Skeleton key={i} className="h-3 w-6 rounded-md" />
                                ))}
                            </div>
                        </div>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between border-b border-border/20 last:border-0">
                                <Skeleton className="h-4 w-28 rounded-md" />
                                <div className="flex gap-3">
                                    <Skeleton className="h-4 w-6 rounded-md" />
                                    <Skeleton className="h-4 w-6 rounded-md" />
                                    <Skeleton className="h-4 w-6 rounded-md" />
                                    <Skeleton className="h-4 w-6 rounded-md" />
                                    <Skeleton className="h-4 w-10 rounded-md" />
                                </div>
                            </div>
                        ))}
                        <div className="px-3 md:px-4 py-2 md:py-3 border-t border-border/40 flex items-center justify-between">
                            <Skeleton className="h-3 w-14 rounded-md" />
                            <div className="flex gap-3">
                                <Skeleton className="h-3 w-6 rounded-md" />
                                <Skeleton className="h-3 w-6 rounded-md" />
                                <Skeleton className="h-3 w-8 rounded-md" />
                            </div>
                        </div>
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between border-b border-border/20 last:border-0">
                                <Skeleton className="h-4 w-32 rounded-md" />
                                <div className="flex gap-3">
                                    <Skeleton className="h-4 w-6 rounded-md" />
                                    <Skeleton className="h-4 w-6 rounded-md" />
                                    <Skeleton className="h-4 w-10 rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: commentary column */}
                    <div className="glass-card p-4 md:p-5 space-y-4">
                        <Skeleton className="h-4 w-24 rounded-md" />
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="flex items-center gap-2 shrink-0">
                                    <Skeleton className="h-3 w-8 rounded-md" />
                                    <Skeleton className="h-7 w-7 rounded-lg" />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3.5 w-full rounded-md" />
                                    <Skeleton className="h-3.5 w-11/12 rounded-md" />
                                    <Skeleton className="h-3.5 w-8/12 rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function GraphsSkeleton() {
    return (
        <div className="animate-in fade-in duration-300">
            {/* Innings selector */}
            <div className="flex gap-1.5 px-4 pt-4 pb-1">
                <Skeleton className="h-7 w-28 rounded-lg" />
                <Skeleton className="h-7 w-28 rounded-lg" />
            </div>
            {/* Chart area */}
            <div className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-14 rounded-md" />
                        <Skeleton className="h-6 w-14 rounded-md" />
                    </div>
                </div>
                <div className="relative h-56 md:h-64">
                    {/* Y-axis gridlines */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-px bg-border/30" />
                        ))}
                    </div>
                    {/* Bars */}
                    <div className="absolute inset-0 flex items-end gap-1.5 px-2">
                        {[...Array(16)].map((_, i) => (
                            <Skeleton
                                key={i}
                                className="flex-1 rounded-t-md"
                                style={{ height: `${25 + ((i * 41) % 70)}%` }}
                            />
                        ))}
                    </div>
                </div>
                {/* X-axis labels */}
                <div className="flex justify-between mt-2 px-2">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-3 w-6 rounded-md" />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function PlayerProfileSkeleton() {
    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-48 rounded-md" />
                    <Skeleton className="h-4 w-32 rounded-md" />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-border/50 p-3 space-y-2">
                        <Skeleton className="h-3 w-16 rounded-md" />
                        <Skeleton className="h-6 w-12 rounded-md" />
                    </div>
                ))}
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-11/12 rounded-md" />
                <Skeleton className="h-4 w-10/12 rounded-md" />
            </div>
        </div>
    );
}

export function ScorecardSkeleton() {
    return (
        <div className="max-w-7xl mx-auto space-y-3 md:space-y-8 animate-in fade-in duration-300">
            {/* Match header */}
            <div className="text-center space-y-2 md:space-y-4 py-3 md:py-6 gradient-border px-2 md:px-4 flex flex-col items-center">
                <Skeleton className="h-6 md:h-10 w-3/4 max-w-[500px] rounded-md" />
                <Skeleton className="h-5 md:h-8 w-40 rounded-full" />
            </div>

            {/* Accordion of innings */}
            <div className="w-full px-0 md:px-4 space-y-2 md:space-y-4">
                {[...Array(2)].map((_, inningsIdx) => (
                    <div key={inningsIdx} className="border border-border/50 rounded-none md:rounded-2xl">
                        {/* Accordion header: innings name + score */}
                        <div className="px-2 md:px-6 py-2.5 md:py-4 flex items-center justify-between gap-2 md:gap-4">
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-5 md:h-7 w-48 md:w-64 rounded-md" />
                                <Skeleton className="h-4 md:h-5 w-32 md:w-40 rounded-md" />
                            </div>
                            <Skeleton className="hidden md:block h-4 w-28 rounded-md" />
                        </div>

                        {inningsIdx === 0 && (
                            <div className="px-0 md:px-6 pb-3 md:pb-6">
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 md:gap-8">
                                    <div className="lg:col-span-3 space-y-3 md:space-y-8">
                                        {/* Batting card */}
                                        <div className="glass-card rounded-none md:rounded-lg overflow-hidden">
                                            <div className="border-b border-border/50 p-2 md:p-6">
                                                <Skeleton className="h-4 md:h-5 w-32 md:w-40 rounded-md" />
                                            </div>
                                            <div className="overflow-hidden">
                                                {/* Table header */}
                                                <div className="flex items-center px-1 md:px-3 py-2 md:py-3 border-b border-border/30">
                                                    <Skeleton className="h-3 w-14 md:w-20 rounded-md" />
                                                    <div className="flex-1" />
                                                    <div className="flex gap-2 md:gap-4">
                                                        {['R', 'B', '4s', '6s', 'SR'].map((_, i) => (
                                                            <Skeleton key={i} className="h-3 w-6 md:w-8 rounded-md" />
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Rows */}
                                                {[...Array(7)].map((_, i) => (
                                                    <div key={i} className="flex items-center px-1 md:px-3 py-2 md:py-3 border-b border-border/20 last:border-0">
                                                        <div className="space-y-1 w-[80px] md:w-[200px]">
                                                            <Skeleton className="h-4 w-24 md:w-32 rounded-md" />
                                                            <Skeleton className="h-3 w-16 md:w-24 rounded-md" />
                                                        </div>
                                                        <div className="flex-1" />
                                                        <div className="flex gap-2 md:gap-4">
                                                            <Skeleton className="h-4 w-6 md:w-8 rounded-md" />
                                                            <Skeleton className="h-4 w-6 md:w-8 rounded-md" />
                                                            <Skeleton className="h-4 w-6 md:w-8 rounded-md" />
                                                            <Skeleton className="h-4 w-6 md:w-8 rounded-md" />
                                                            <Skeleton className="h-4 w-8 md:w-12 rounded-md" />
                                                        </div>
                                                    </div>
                                                ))}
                                                {/* Extras + total */}
                                                <div className="space-y-2 px-2 md:px-6 py-2 md:py-4 border-t border-border/40">
                                                    <div className="flex justify-between items-center">
                                                        <Skeleton className="h-4 w-14 rounded-md" />
                                                        <Skeleton className="h-4 w-20 rounded-md" />
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <Skeleton className="h-5 w-12 rounded-md" />
                                                        <Skeleton className="h-5 w-16 rounded-md" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bowling card */}
                                        <div className="glass-card rounded-none md:rounded-lg overflow-hidden">
                                            <div className="border-b border-border/50 p-2 md:p-6">
                                                <Skeleton className="h-4 md:h-5 w-32 md:w-40 rounded-md" />
                                            </div>
                                            <div>
                                                <div className="flex items-center px-1 md:px-3 py-2 md:py-3 border-b border-border/30">
                                                    <Skeleton className="h-3 w-14 md:w-20 rounded-md" />
                                                    <div className="flex-1" />
                                                    <div className="flex gap-2 md:gap-3">
                                                        {['O', 'M', 'R', 'W', 'NB', 'WD', 'ECO'].map((_, i) => (
                                                            <Skeleton key={i} className="h-3 w-5 md:w-7 rounded-md" />
                                                        ))}
                                                    </div>
                                                </div>
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className="flex items-center px-1 md:px-3 py-2 md:py-3 border-b border-border/20 last:border-0">
                                                        <Skeleton className="h-4 w-24 md:w-32 rounded-md" />
                                                        <div className="flex-1" />
                                                        <div className="flex gap-2 md:gap-3">
                                                            {[...Array(7)].map((_, j) => (
                                                                <Skeleton key={j} className="h-4 w-5 md:w-7 rounded-md" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right column: fall of wickets + partnerships */}
                                    <div className="lg:col-span-2 space-y-3 md:space-y-8">
                                        <div className="glass-card rounded-none md:rounded-lg overflow-hidden">
                                            <div className="border-b border-border/50 p-2 md:p-6">
                                                <Skeleton className="h-4 md:h-5 w-32 rounded-md" />
                                            </div>
                                            <div className="p-2 md:p-4 space-y-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className="flex justify-between items-center">
                                                        <Skeleton className="h-4 w-28 rounded-md" />
                                                        <Skeleton className="h-4 w-14 rounded-md" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SquadsSkeleton() {
    return (
        <div className="max-w-7xl mx-auto space-y-3 md:space-y-6 animate-in fade-in duration-300">
            {/* Team headers row */}
            <div className="flex justify-between bg-muted p-2 md:p-4 rounded-2xl">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-6 md:w-10 md:h-7 rounded" />
                    <Skeleton className="h-5 md:h-6 w-12 rounded-md" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-5 md:h-6 w-12 rounded-md" />
                    <Skeleton className="w-8 h-6 md:w-10 md:h-7 rounded" />
                </div>
            </div>

            {/* Playing XI banner */}
            <div className="pb-3 md:pb-5">
                <div className="p-2 bg-muted flex items-center justify-center">
                    <Skeleton className="h-4 md:h-5 w-24 rounded-md" />
                </div>
                {/* Two-column mirrored player list */}
                <div className="w-full flex">
                    <div className="w-1/2">
                        {[...Array(11)].map((_, i) => (
                            <div key={i} className="flex gap-2 p-2 md:p-3 border-b border-border/40 items-center h-[70px] md:h-[80px] border-r-2">
                                <Skeleton className="w-10 h-10 md:w-12 md:h-12 rounded-full shrink-0" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton className="h-3.5 md:h-4 w-28 md:w-36 rounded-md" />
                                    <Skeleton className="h-3 w-20 md:w-24 rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="w-1/2">
                        {[...Array(11)].map((_, i) => (
                            <div key={i} className="flex gap-2 p-2 md:p-3 border-b border-border/40 items-center h-[70px] md:h-[80px] justify-end">
                                <div className="flex-1 space-y-1 flex flex-col items-end">
                                    <Skeleton className="h-3.5 md:h-4 w-28 md:w-36 rounded-md" />
                                    <Skeleton className="h-3 w-20 md:w-24 rounded-md" />
                                </div>
                                <Skeleton className="w-10 h-10 md:w-12 md:h-12 rounded-full shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function HighlightsSkeleton() {
    return (
        <div className="p-4 space-y-2 animate-in fade-in duration-300">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 px-2">
                    <Skeleton className="h-4 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 flex-1 rounded-md" />
                </div>
            ))}
        </div>
    );
}
