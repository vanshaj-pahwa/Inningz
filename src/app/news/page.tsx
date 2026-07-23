'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Newspaper, Bookmark, Medal } from 'lucide-react';
import { getCricketNews, getCricketNewsMostRead } from '@/app/actions';
import type { NewsFeed, NewsItem, NewsArticle } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { buildNewsHref, toFaceCroppedThumb } from '@/lib/utils';

export default function NewsPage() {
    const router = useRouter();
    const [feed, setFeed] = useState<NewsFeed | null>(null);
    const [mostReadReal, setMostReadReal] = useState<NewsArticle['mostRead']>([]);
    const [bookmarks, setBookmarks] = useState<{ id: string; slug: string; title: string; imageUrl?: string; savedAt: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNews = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        const result = await getCricketNews();
        if (result.success && result.data) setFeed(result.data);
        else setError(result.error || 'Failed to fetch news');
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => { fetchNews(); }, []);

    // Load bookmarks — localStorage-only, no account required.
    useEffect(() => {
        try {
            const bm = localStorage.getItem('inningz:news:bookmarks');
            if (bm) setBookmarks(JSON.parse(bm));
            // Clean up any old continue-reading state from previous versions.
            localStorage.removeItem('inningz:news:continue');
        } catch { /* storage blocked */ }
    }, []);

    // Load the real "Most Read" list from the source's on-page widget.
    // Falls back to the "Editor's Picks" proxy below if this returns empty.
    useEffect(() => {
        (async () => {
            const result = await getCricketNewsMostRead();
            if (result.success && result.data) setMostReadReal(result.data);
        })();
    }, []);

    const [teamFilter, setTeamFilter] = useState<string>('all');
    const allItems = feed?.items ?? [];

    // Team filter — match a team's keyword against each story's title +
    // description. RSS doesn't tag stories per team, so this is a substring
    // match. Fast enough for 100 items, honest about what "India news" means.
    const teamFilters: { key: string; label: string; keywords: string[] }[] = [
        { key: 'all', label: 'All', keywords: [] },
        { key: 'india', label: 'India', keywords: ['india', ' indian ', 'ipl', 'bcci', 'ranji'] },
        { key: 'australia', label: 'Australia', keywords: ['australia', 'aussie', 'bbl', 'ashes'] },
        { key: 'england', label: 'England', keywords: ['england', 'english', 'the hundred', 'welsh fire', 'oval', 'trent bridge', 'headingley'] },
        { key: 'pakistan', label: 'Pakistan', keywords: ['pakistan', 'psl', 'pcb'] },
        { key: 'south-africa', label: 'S. Africa', keywords: ['south africa', 'proteas', 'sa20'] },
        { key: 'new-zealand', label: 'N. Zealand', keywords: ['new zealand', 'nz ', 'blackcaps'] },
        { key: 'west-indies', label: 'W. Indies', keywords: ['west indies', 'windies', 'cpl'] },
        { key: 'sri-lanka', label: 'Sri Lanka', keywords: ['sri lanka', 'lanka premier'] },
        { key: 'bangladesh', label: 'Bangladesh', keywords: ['bangladesh', 'bpl'] },
        { key: 'zimbabwe', label: 'Zimbabwe', keywords: ['zimbabwe'] },
        { key: 'afghanistan', label: 'Afghanistan', keywords: ['afghanistan'] },
        { key: 'ireland', label: 'Ireland', keywords: ['ireland', 'irish'] },
        { key: 'women', label: 'Women', keywords: ['women', 'wbbl', 'women\'s '] },
    ];
    const activeFilter = teamFilters.find(t => t.key === teamFilter) ?? teamFilters[0];
    const filteredItems = teamFilter === 'all'
        ? allItems
        : allItems.filter(item => {
            const hay = `${item.title} ${item.description ?? ''}`.toLowerCase();
            return activeFilter.keywords.some(k => hay.includes(k));
        });
    // Compute counts per team so the pills show what's available.
    const teamCounts: Record<string, number> = { all: allItems.length };
    teamFilters.slice(1).forEach(t => {
        teamCounts[t.key] = allItems.filter(item => {
            const hay = `${item.title} ${item.description ?? ''}`.toLowerCase();
            return t.keywords.some(k => hay.includes(k));
        }).length;
    });

    const featured = filteredItems[0];
    const rest = filteredItems.slice(1);
    // "Most Read" — real popularity data isn't in the RSS, so we surface the
    // stories that have been in circulation longest (12h+). Those have had
    // the most time to accumulate reads. Fall back to items 15-22 when no
    // timestamps are available.
    const mostRead = (() => {
        const all = feed?.items ?? [];
        if (all.length === 0) return [];
        const now = Date.now();
        const cutoff = 12 * 60 * 60 * 1000;
        const olderThanCutoff = all.filter(i => {
            if (!i.publishedAt) return false;
            const t = new Date(i.publishedAt).getTime();
            return Number.isFinite(t) && now - t > cutoff;
        });
        const pool = olderThanCutoff.length >= 5 ? olderThanCutoff : all.slice(15, 25);
        return pool.slice(0, 6);
    })();
    const fetchedRel = relativeTime(feed?.fetchedAt);

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-50 w-full glass-nav">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="flex items-center justify-between h-14 md:h-16">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-9 w-9"
                                onClick={() => router.back()}
                                aria-label="Back"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <Link href="/" aria-label="Inningz home">
                                <Image
                                    src="/logo-full-transparent.png"
                                    alt="Inningz"
                                    width={400}
                                    height={120}
                                    priority
                                    className="hidden dark:block h-9 md:h-11 w-auto"
                                />
                                <Image
                                    src="/logo-full-dark.png"
                                    alt="Inningz"
                                    width={400}
                                    height={120}
                                    priority
                                    className="block dark:hidden h-9 md:h-11 w-auto"
                                />
                            </Link>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-9 w-9"
                                onClick={() => fetchNews(true)}
                                aria-label="Refresh news"
                                disabled={refreshing}
                            >
                                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            </Button>
                            <Link
                                href="/rankings"
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <Medal className="w-4 h-4" />
                                <span className="hidden sm:inline">Rankings</span>
                            </Link>
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </header>

            {/* Page title — plain display heading to match the rest of the app
                (home, live, rankings, series all use the same shape). */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-4">
                <div className="flex items-end justify-between gap-4">
                    <h1 className="font-display text-2xl md:text-4xl tracking-tight">
                        Cricket News
                    </h1>
                    {fetchedRel && (
                        <p className="text-[11px] md:text-xs text-muted-foreground tabular-nums shrink-0 pb-1">
                            Updated {fetchedRel}
                        </p>
                    )}
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 md:px-6 pb-16">
                {loading && <NewsSkeleton />}

                {!loading && error && (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
                        <div className="p-4 rounded-full bg-muted mb-4">
                            <Newspaper className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-display mb-1">News unavailable</p>
                        <p className="text-sm text-muted-foreground mb-5 max-w-xs">{error}</p>
                        <Button onClick={() => fetchNews()} variant="outline" className="rounded-xl">
                            Try again
                        </Button>
                    </div>
                )}

                {!loading && !error && feed && feed.items.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
                        <p className="text-lg font-display text-muted-foreground">No news right now</p>
                        <p className="text-sm text-muted-foreground mt-1">Check back later</p>
                    </div>
                )}

                {!loading && !error && feed && feed.items.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-10">
                        {/* Main column */}
                        <div>
                            <BookmarksStrip items={bookmarks} feedItems={feed?.items ?? []} />

                            {/* Team filter — matches by keyword. Non-zero
                                categories only, so slow-news-day filters
                                don't clutter the row. */}
                            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mb-5 md:mb-6">
                                {teamFilters
                                    .filter(t => t.key === 'all' || (teamCounts[t.key] ?? 0) > 0)
                                    .map(t => {
                                        const active = teamFilter === t.key;
                                        const count = teamCounts[t.key] ?? 0;
                                        return (
                                            <button
                                                key={t.key}
                                                onClick={() => setTeamFilter(t.key)}
                                                aria-current={active ? 'page' : undefined}
                                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${
                                                    active
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                <span>{t.label}</span>
                                                <span className={`text-[11px] tabular-nums ${active ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                            </div>

                            {featured && <FeaturedStory item={featured} />}

                            {rest.length > 0 && (
                                <div className="mt-8 md:mt-10">
                                    <SectionRule label="Latest" />
                                    {/* Denser card grid after the hero — 2× the
                                        story density of a row list, and images
                                        as pacing signals. Mobile keeps rows. */}
                                    <ul className="grid grid-cols-2 gap-3 md:gap-5">
                                        {rest.map((item) => (
                                            <StoryCard key={item.id} item={item} />
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Sidebar (desktop only) — real Most Read when we can pull it
                            from the source's on-page widget; falls back to a chronological
                            "Editor's Picks" proxy otherwise. */}
                        <aside className="hidden lg:block">
                            <div className="sticky top-24">
                                {mostReadReal.length > 0 ? (
                                    <>
                                        <SectionRule label="Most Read" />
                                        <ol className="space-y-5">
                                            {mostReadReal.map((item, i) => (
                                                <SidebarItem
                                                    key={item.id}
                                                    item={{ id: item.id, slug: item.slug, title: item.title, description: item.description, imageUrl: item.imageUrl, link: '', publishedAt: item.publishedAt }}
                                                    index={i + 1}
                                                />
                                            ))}
                                        </ol>
                                    </>
                                ) : (
                                    <>
                                        <SectionRule label="Editor's Picks" />
                                        <ol className="space-y-5">
                                            {mostRead.map((item, i) => (
                                                <SidebarItem key={item.id} item={item} index={i + 1} />
                                            ))}
                                        </ol>
                                    </>
                                )}
                            </div>
                        </aside>
                    </div>
                )}
            </main>
        </div>
    );
}

function FeaturedStory({ item }: { item: NewsItem }) {
    const rel = relativeTime(item.publishedAt);
    return (
        <Link
            href={buildNewsHref(item.id, item.slug)}
            className="group block"
        >
            {item.imageUrl && (
                <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden bg-muted">
                    <Image
                        src={toFaceCroppedThumb(item.imageUrl, { width: 1400, aspect: '21:9' }) || item.imageUrl}
                        alt=""
                        width={1400}
                        height={800}
                        priority
                        unoptimized
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <span className="absolute top-3 left-3 md:top-4 md:left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground text-[10px] md:text-[11px] font-bold uppercase tracking-widest backdrop-blur">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Top story
                    </span>
                </div>
            )}
            <div className="mt-4 md:mt-5 max-w-3xl">
                <h2 className="font-display text-2xl md:text-4xl lg:text-5xl leading-[1.05] tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                </h2>
                {item.description && (
                    <p className="mt-3 md:mt-4 text-sm md:text-base leading-relaxed text-muted-foreground line-clamp-3 md:line-clamp-4">
                        {item.description}
                    </p>
                )}
                <div className="mt-3 md:mt-4 flex items-center gap-2 text-[11px] md:text-xs text-muted-foreground">
                    {rel && <span className="tabular-nums">{rel}</span>}
                    {rel && <span aria-hidden className="text-muted-foreground/50">·</span>}
                    <span className="uppercase tracking-widest font-semibold">Read story</span>
                </div>
            </div>
        </Link>
    );
}

function StoryCard({ item }: { item: NewsItem }) {
    const rel = relativeTime(item.publishedAt);
    return (
        <li>
            <Link
                href={buildNewsHref(item.id, item.slug)}
                className="group flex flex-col gap-3 h-full"
            >
                {item.imageUrl ? (
                    <div className="aspect-[4/3] md:aspect-[16/10] rounded-lg md:rounded-xl overflow-hidden bg-muted">
                        <Image
                            src={toFaceCroppedThumb(item.imageUrl, { width: 600, aspect: '4:3' }) || item.imageUrl}
                            alt=""
                            width={600}
                            height={450}
                            unoptimized
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    </div>
                ) : (
                    <div className="aspect-[4/3] md:aspect-[16/10] rounded-lg md:rounded-xl bg-muted/40 flex items-center justify-center">
                        <Newspaper className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                )}
                <div className="flex-1 flex flex-col">
                    <h3 className="font-display text-lg md:text-xl leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3">
                        {item.title}
                    </h3>
                    {item.description && (
                        <p className="hidden md:block text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                            {item.description}
                        </p>
                    )}
                    <div className="mt-auto pt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        {rel && <span className="tabular-nums">{rel}</span>}
                    </div>
                </div>
            </Link>
        </li>
    );
}


function BookmarksStrip({ items, feedItems }: { items: { id: string; slug: string; title: string; imageUrl?: string; savedAt: number }[]; feedItems: NewsItem[] }) {
    if (!items || items.length === 0) return null;
    return (
        <section className="mb-8 md:mb-10">
            <div className="flex items-center gap-3 mb-3 md:mb-4">
                <Bookmark className="w-3.5 h-3.5 text-primary fill-primary" />
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                    Saved for later
                </span>
                <span className="flex-1 h-px bg-border" />
                <span className="text-[10px] md:text-[11px] tabular-nums text-muted-foreground">
                    {items.length}
                </span>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-1">
                {items.slice(0, 8).map((item) => (
                    <Link
                        key={item.id}
                        href={buildNewsHref(item.id, item.slug)}
                        className="group shrink-0 w-56 md:w-64 flex gap-3 items-center rounded-xl border border-border/60 bg-card/40 hover:border-primary/40 hover:bg-muted/30 transition-colors p-2.5"
                    >
                        {item.imageUrl ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                                <Image src={toFaceCroppedThumb(item.imageUrl, { width: 120, aspect: '1:1' }) || item.imageUrl} alt="" width={80} height={80} unoptimized className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                                <Newspaper className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                        )}
                        <p className="flex-1 min-w-0 text-[13px] leading-snug font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {item.title}
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function StoryRow({ item }: { item: NewsItem }) {
    const rel = relativeTime(item.publishedAt);
    return (
        <li>
            <Link
                href={buildNewsHref(item.id, item.slug)}
                className="group flex gap-4 md:gap-5 py-4 md:py-5"
            >
                {item.imageUrl ? (
                    <div className="relative w-28 h-20 md:w-40 md:h-28 rounded-xl overflow-hidden shrink-0 bg-muted">
                        <Image
                            src={toFaceCroppedThumb(item.imageUrl, { width: 320, aspect: '4:3' }) || item.imageUrl}
                            alt=""
                            width={400}
                            height={280}
                            unoptimized
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    </div>
                ) : (
                    <div className="w-28 h-20 md:w-40 md:h-28 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                        <Newspaper className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col">
                    <h3 className="font-display text-base md:text-xl leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3 md:line-clamp-2">
                        {item.title}
                    </h3>
                    {item.description && (
                        <p className="hidden md:block text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                            {item.description}
                        </p>
                    )}
                    <div className="mt-auto pt-2 flex items-center gap-2 text-[11px] md:text-xs text-muted-foreground">
                        {rel && <span className="tabular-nums">{rel}</span>}
                    </div>
                </div>
            </Link>
        </li>
    );
}

function SidebarItem({ item, index }: { item: NewsItem; index: number }) {
    const rel = relativeTime(item.publishedAt);
    return (
        <li>
            <Link
                href={buildNewsHref(item.id, item.slug)}
                className="group flex gap-3 items-start"
            >
                <span className="font-display text-xl md:text-2xl leading-none tabular-nums text-muted-foreground/60 group-hover:text-primary transition-colors w-6 shrink-0 pt-0.5">
                    {String(index).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] leading-snug font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-3">
                        {item.title}
                    </h4>
                    {rel && (
                        <p className="mt-1 text-[10.5px] text-muted-foreground tabular-nums">
                            {rel}
                        </p>
                    )}
                </div>
            </Link>
        </li>
    );
}

function SectionRule({ label }: { label: string }) {
    // Match the rest of the app's section-heading treatment — a plain display
    // heading with no eyebrow or hairline rule. Home, rankings and series
    // all use this shape, so news reads as one product.
    return (
        <h2 className="font-display text-xl md:text-2xl tracking-tight text-foreground mb-4 md:mb-5">
            {label}
        </h2>
    );
}

function NewsSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-10">
            <div>
                <div className="aspect-[16/9] md:aspect-[21/9] rounded-2xl skeleton" />
                <div className="mt-5 space-y-3 max-w-3xl">
                    <div className="skeleton h-8 md:h-12 w-11/12 rounded" />
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-4 w-2/3 rounded" />
                </div>
                <div className="mt-10 space-y-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex gap-4 md:gap-5">
                            <div className="w-28 h-20 md:w-40 md:h-28 rounded-xl skeleton shrink-0" />
                            <div className="flex-1 space-y-2 py-1">
                                <div className="skeleton h-4 md:h-5 w-11/12 rounded" />
                                <div className="skeleton h-3 w-3/5 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="hidden lg:block space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                        <div className="skeleton h-6 w-6 rounded" />
                        <div className="flex-1 space-y-1.5">
                            <div className="skeleton h-3.5 w-full rounded" />
                            <div className="skeleton h-3 w-4/5 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function relativeTime(iso?: string): string | null {
    if (!iso) return null;
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return null;
    const diff = Date.now() - then;
    const min = Math.round(diff / 60_000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.round(hr / 24);
    if (day < 7) return `${day}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
