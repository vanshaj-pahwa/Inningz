'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useMatches } from '@/contexts/matches-context';
import { useRecentHistoryContext } from '@/contexts/recent-history-context';
import { getSeriesSchedule } from '@/app/actions';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type SeriesLite = { name: string; seriesId: string; dateRange: string; category: string };

const CommandPaletteContext = createContext<{ open: () => void } | null>(null);

export function useCommandPalette() {
    const ctx = useContext(CommandPaletteContext);
    if (!ctx) throw new Error('useCommandPalette must be used within CommandPaletteProvider');
    return ctx;
}

export function CommandPaletteTrigger({ className }: { className?: string }) {
    const { open } = useCommandPalette();
    return (
        <button
            type="button"
            onClick={open}
            aria-label="Search (press /)"
            className={cn(
                'inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 transition-colors px-3 h-9 text-muted-foreground',
                className
            )}
        >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Search</span>
            <kbd className="hidden sm:inline-flex items-center rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">
                /
            </kbd>
        </button>
    );
}

type Item = {
    id: string;
    kind: 'match' | 'series' | 'player' | 'recent-match' | 'recent-series' | 'recent-player';
    title: string;
    subtitle?: string;
    href: string;
    group: string;
};

export default function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const { liveMatches } = useMatches();
    const { history } = useRecentHistoryContext();
    const [series, setSeries] = useState<SeriesLite[]>([]);
    const seriesFetched = useRef(false);

    // Fetch all series on first palette open (cached for the session)
    useEffect(() => {
        if (!open || seriesFetched.current) return;
        seriesFetched.current = true;
        (async () => {
            try {
                const res = await getSeriesSchedule();
                if (res.success && res.data) {
                    const all: SeriesLite[] = [];
                    res.data.months.forEach((m) => {
                        m.series.forEach((s) => {
                            all.push({
                                name: s.name,
                                seriesId: s.seriesId,
                                dateRange: s.dateRange,
                                category: s.category,
                            });
                        });
                    });
                    setSeries(all);
                }
            } catch {
                seriesFetched.current = false;
            }
        })();
    }, [open]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                const target = e.target as HTMLElement | null;
                if (target) {
                    const tag = target.tagName;
                    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
                }
                e.preventDefault();
                setOpen(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIndex(0);
            // Skip auto-focus on touch devices so the soft keyboard doesn't pop up
            const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
            if (!isTouch) {
                requestAnimationFrame(() => inputRef.current?.focus());
            }
        }
    }, [open]);

    const items = useMemo<Item[]>(() => {
        const out: Item[] = [];

        // Live matches
        liveMatches.forEach((m) => {
            out.push({
                id: `live-${m.matchId}`,
                kind: 'match',
                title: m.title,
                subtitle: m.status,
                href: `/match/${m.matchId}`,
                group: 'Matches',
            });
        });

        // Series
        series.forEach((s) => {
            out.push({
                id: `series-${s.seriesId}`,
                kind: 'series',
                title: s.name,
                subtitle: `${s.dateRange} · ${s.category}`,
                href: `/series/${s.seriesId}/${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
                group: 'Series',
            });
        });

        // Recent history (skip matches that are already in live list)
        const liveIds = new Set(liveMatches.map((m) => m.matchId));
        history.forEach((h) => {
            if (h.type === 'match' && liveIds.has(h.id)) return;
            const kind =
                h.type === 'match' ? 'recent-match' :
                    h.type === 'series' ? 'recent-series' : 'recent-player';
            const href =
                h.type === 'match' ? `/match/${h.id}` :
                    h.type === 'series' ? `/series/${h.id}/${h.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` :
                        `/compare?p1=${encodeURIComponent(h.id)}&name1=${encodeURIComponent(h.title)}`;
            out.push({
                id: `hist-${h.type}-${h.id}`,
                kind,
                title: h.title,
                subtitle: h.subtitle,
                href,
                group: 'Recent',
            });
        });

        return out;
    }, [liveMatches, history, series]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((it) =>
            it.title.toLowerCase().includes(q) ||
            (it.subtitle?.toLowerCase().includes(q) ?? false)
        );
    }, [items, query]);

    // Group items while preserving filtered order
    const grouped = useMemo(() => {
        const map = new Map<string, Item[]>();
        filtered.forEach((it) => {
            if (!map.has(it.group)) map.set(it.group, []);
            map.get(it.group)!.push(it);
        });
        return Array.from(map.entries());
    }, [filtered]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    const select = (item: Item) => {
        setOpen(false);
        router.push(item.href);
    };

    const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = filtered[activeIndex];
            if (item) select(item);
        }
    };

    useEffect(() => {
        const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    // Index-lookup from grouped render
    let runningIdx = -1;

    return (
        <CommandPaletteContext.Provider value={{ open: () => setOpen(true) }}>
            {children}
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-xl p-0 rounded-2xl overflow-hidden gap-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>Command palette</DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-3 px-4 py-3 pr-12 border-b border-border/50">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onInputKeyDown}
                        placeholder="Search matches, series…"
                        className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                    />
                </div>
                <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                            <Search className="w-5 h-5" />
                            <p className="text-sm">No results for "{query}"</p>
                        </div>
                    )}
                    {grouped.map(([group, groupItems]) => (
                        <div key={group} className="mb-1">
                            <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                {group}
                            </div>
                            {groupItems.map((it) => {
                                runningIdx += 1;
                                const idx = runningIdx;
                                const active = idx === activeIndex;
                                return (
                                    <button
                                        key={it.id}
                                        data-idx={idx}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        onClick={() => select(it)}
                                        className={cn(
                                            'w-full flex flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors',
                                            active ? 'bg-muted/70' : 'hover:bg-muted/40'
                                        )}
                                    >
                                        <p className="text-sm font-medium truncate w-full">{it.title}</p>
                                        {it.subtitle && (
                                            <p className="text-xs text-muted-foreground truncate w-full">{it.subtitle}</p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 text-[10px] text-muted-foreground font-mono">
                    <div className="flex items-center gap-3">
                        <span>↑↓ navigate</span>
                        <span>↵ select</span>
                    </div>
                    <span>Press / to open</span>
                </div>
            </DialogContent>
            </Dialog>
        </CommandPaletteContext.Provider>
    );
}
